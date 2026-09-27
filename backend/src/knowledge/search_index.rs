use serde_json::Value;
use std::collections::HashSet;

pub(super) const BATCH_SIZE: usize = 500;

pub(super) struct IndexDocument {
    pub id: String,
    pub title: String,
    pub payload: Value,
}

pub(super) struct IndexPage {
    pub ids: Vec<String>,
}

pub(super) trait DocumentSource {
    async fn next_document(&mut self) -> Result<Option<IndexDocument>, String>;
}

pub(super) trait SearchIndex {
    async fn upload(&mut self, documents: &[Value]) -> Result<(), String>;
    async fn list(&mut self, offset: usize, limit: usize) -> Result<IndexPage, String>;
    async fn delete(&mut self, ids: &[String]) -> Result<(), String>;
}

// The source of truth is scanned once. Only IDs grow with catalog size; full
// documents are dropped after each completed upload task. Stale IDs are all
// listed before deletion so a failed listing cannot leave a partially pruned
// index, and forward pagination never skips entries shifted by deletion.
pub(super) async fn rebuild<S: DocumentSource, I: SearchIndex>(
    source: &mut S,
    index: &mut I,
) -> Result<(), String> {
    let mut documents = Vec::with_capacity(BATCH_SIZE);
    let mut live_ids = HashSet::new();
    let mut uploaded_any = false;
    while let Some(document) = source.next_document().await? {
        if document.id.is_empty() {
            println!("skipping tutorial with no resource_id: {}", document.title);
            continue;
        }
        live_ids.insert(document.id);
        documents.push(document.payload);
        if documents.len() == BATCH_SIZE {
            index.upload(&documents).await?;
            uploaded_any = true;
            documents.clear();
        }
    }
    if !documents.is_empty() {
        index.upload(&documents).await?;
        uploaded_any = true;
    }
    if !uploaded_any {
        // The previous rebuild submitted an empty upload. Keep that behavior:
        // Meilisearch may need it to create an index on an empty installation.
        index.upload(&[]).await?;
    }

    let mut stale_ids = Vec::new();
    let mut offset = 0;
    loop {
        let page = index.list(offset, BATCH_SIZE).await?;
        let count = page.ids.len();
        stale_ids.extend(page.ids.into_iter().filter(|id| !live_ids.contains(id)));
        if count < BATCH_SIZE {
            break;
        }
        offset += count;
    }
    for ids in stale_ids.chunks(BATCH_SIZE) {
        println!("reindex removing {} stale documents", ids.len());
        index.delete(ids).await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Source {
        documents: std::vec::IntoIter<IndexDocument>,
        fail_after: Option<usize>,
        read: usize,
    }

    impl Source {
        fn new(ids: impl IntoIterator<Item = String>) -> Self {
            Self {
                documents: ids
                    .into_iter()
                    .map(|id| IndexDocument {
                        title: id.clone(),
                        payload: serde_json::json!({"resource_id": id}),
                        id,
                    })
                    .collect::<Vec<_>>()
                    .into_iter(),
                fail_after: None,
                read: 0,
            }
        }
    }

    impl DocumentSource for Source {
        async fn next_document(&mut self) -> Result<Option<IndexDocument>, String> {
            if self.fail_after == Some(self.read) {
                return Err("source failed".into());
            }
            self.read += 1;
            Ok(self.documents.next())
        }
    }

    #[derive(Default)]
    struct Index {
        existing: Vec<String>,
        uploads: Vec<Vec<String>>,
        deletions: Vec<Vec<String>>,
        list_offsets: Vec<usize>,
        fail_upload_at: Option<usize>,
        fail_list_at: Option<usize>,
        fail_delete_at: Option<usize>,
    }

    impl SearchIndex for Index {
        async fn upload(&mut self, docs: &[Value]) -> Result<(), String> {
            if self.fail_upload_at == Some(self.uploads.len()) {
                return Err("upload failed".into());
            }
            self.uploads.push(
                docs.iter()
                    .map(|doc| doc["resource_id"].as_str().unwrap().to_owned())
                    .collect(),
            );
            Ok(())
        }

        async fn list(&mut self, offset: usize, limit: usize) -> Result<IndexPage, String> {
            if self.fail_list_at == Some(self.list_offsets.len()) {
                return Err("list failed".into());
            }
            self.list_offsets.push(offset);
            Ok(IndexPage {
                ids: self
                    .existing
                    .iter()
                    .skip(offset)
                    .take(limit)
                    .cloned()
                    .collect(),
            })
        }

        async fn delete(&mut self, ids: &[String]) -> Result<(), String> {
            if self.fail_delete_at == Some(self.deletions.len()) {
                return Err("delete failed".into());
            }
            self.deletions.push(ids.to_vec());
            self.existing.retain(|id| !ids.contains(id));
            Ok(())
        }
    }

    fn ids(count: usize) -> Vec<String> {
        (0..count).map(|i| format!("id-{i}")).collect()
    }

    #[tokio::test]
    async fn uploads_full_batches_and_skips_legacy_ids() {
        let mut source = Source::new(ids(BATCH_SIZE * 2 + 1).into_iter().chain([String::new()]));
        let mut index = Index::default();
        rebuild(&mut source, &mut index).await.unwrap();
        assert_eq!(
            index.uploads.iter().map(Vec::len).collect::<Vec<_>>(),
            [BATCH_SIZE, BATCH_SIZE, 1]
        );
        assert!(index.uploads.iter().flatten().all(|id| !id.is_empty()));
        assert!(index.deletions.is_empty());
    }

    #[tokio::test]
    async fn empty_catalog_keeps_empty_upload_and_removes_stale_ids() {
        let mut source = Source::new([]);
        let mut index = Index {
            existing: ids(3),
            ..Default::default()
        };
        rebuild(&mut source, &mut index).await.unwrap();
        assert_eq!(index.uploads, [Vec::<String>::new()]);
        assert_eq!(index.deletions.len(), 1);
        assert!(index.existing.is_empty());
    }

    #[tokio::test]
    async fn lists_all_pages_before_deleting_in_batches() {
        let mut source = Source::new(ids(2));
        let mut index = Index {
            existing: ids(BATCH_SIZE * 2 + 5),
            ..Default::default()
        };
        rebuild(&mut source, &mut index).await.unwrap();
        assert_eq!(index.list_offsets, [0, BATCH_SIZE, BATCH_SIZE * 2]);
        assert_eq!(
            index.deletions.iter().map(Vec::len).collect::<Vec<_>>(),
            [BATCH_SIZE, BATCH_SIZE, 3]
        );
        assert_eq!(index.existing, ids(2));
    }

    #[tokio::test]
    async fn failures_stop_before_unsafe_following_phases() {
        let mut source = Source::new(ids(BATCH_SIZE + 1));
        let mut index = Index {
            fail_upload_at: Some(1),
            ..Default::default()
        };
        assert_eq!(
            rebuild(&mut source, &mut index).await.unwrap_err(),
            "upload failed"
        );
        assert!(index.list_offsets.is_empty());

        let mut source = Source::new(ids(1));
        let mut index = Index {
            existing: ids(BATCH_SIZE + 1),
            fail_list_at: Some(1),
            ..Default::default()
        };
        assert_eq!(
            rebuild(&mut source, &mut index).await.unwrap_err(),
            "list failed"
        );
        assert!(index.deletions.is_empty());

        let mut source = Source::new([]);
        let mut index = Index {
            existing: ids(BATCH_SIZE + 1),
            fail_delete_at: Some(1),
            ..Default::default()
        };
        assert_eq!(
            rebuild(&mut source, &mut index).await.unwrap_err(),
            "delete failed"
        );
        assert_eq!(index.deletions.len(), 1);
        assert_eq!(index.existing.len(), 1);

        let mut source = Source::new(ids(2));
        source.fail_after = Some(1);
        let mut index = Index::default();
        assert_eq!(
            rebuild(&mut source, &mut index).await.unwrap_err(),
            "source failed"
        );
        assert!(index.uploads.is_empty());
    }
}
