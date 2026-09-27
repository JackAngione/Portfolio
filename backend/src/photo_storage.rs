//! Confirm both copies are flushed and byte-for-byte verified before acknowledging upload.
use std::{
    fs::{self, File, OpenOptions},
    io::{self, Read, Write},
    path::{Path, PathBuf},
};

struct PendingPair {
    created: Vec<PathBuf>,
    committed: bool,
}

impl Drop for PendingPair {
    fn drop(&mut self) {
        if !self.committed {
            for path in self.created.iter().rev() {
                if let Err(error) = fs::remove_file(path) {
                    tracing::error!(?path, %error, "Could not clean up incomplete photo upload");
                }
            }
        }
    }
}

// Preserve the error kind for conflict handling, while identifying the failing
// operation in the authenticated upload response. Full paths stay in server logs.
fn storage_error(operation: &str, copy: &str, path: &Path, error: io::Error) -> io::Error {
    tracing::error!(operation, copy, ?path, raw_os_error = ?error.raw_os_error(), %error, "Photo storage operation failed");
    io::Error::new(error.kind(), format!("{operation} {copy}: {error}"))
}

// Compare the persisted file without allocating another full image-sized buffer.
// A final read detects data appended after the expected bytes.
fn persisted_matches(path: &Path, expected: &[u8]) -> io::Result<bool> {
    const CHUNK_SIZE: usize = 64 * 1024;
    let mut file = File::open(path)?;
    let mut buffer = [0u8; CHUNK_SIZE];
    for chunk in expected.chunks(CHUNK_SIZE) {
        match file.read_exact(&mut buffer[..chunk.len()]) {
            Ok(()) if &buffer[..chunk.len()] == chunk => {}
            Ok(()) => return Ok(false),
            Err(error) if error.kind() == io::ErrorKind::UnexpectedEof => return Ok(false),
            Err(error) => return Err(error),
        }
    }
    let mut extra = [0u8; 1];
    loop {
        match file.read(&mut extra) {
            Err(error) if error.kind() == io::ErrorKind::Interrupted => continue,
            result => return result.map(|bytes_read| bytes_read == 0),
        }
    }
}

pub(crate) fn save_pair(
    high: &Path,
    high_bytes: &[u8],
    low: &Path,
    low_bytes: &[u8],
) -> io::Result<()> {
    let mut pair = PendingPair {
        created: Vec::new(),
        committed: false,
    };
    // Create originals first, so the gallery copy is only written after its original.
    // create_new prevents concurrent uploads from overwriting an existing photo.
    for (copy, path, bytes) in [
        ("high-res file", high, high_bytes),
        ("low-res file", low, low_bytes),
    ] {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(path)
            .map_err(|error| storage_error("Could not create", copy, path, error))?;
        pair.created.push(path.to_owned());
        file.write_all(bytes)
            .map_err(|error| storage_error("Could not write", copy, path, error))?;
        file.sync_all()
            .map_err(|error| storage_error("Could not sync", copy, path, error))?;
    }
    // Check the persisted files, not merely the in-memory upload buffers.
    for (copy, path, expected) in [
        ("high-res file", high, high_bytes),
        ("low-res file", low, low_bytes),
    ] {
        if !persisted_matches(path, expected)
            .map_err(|error| storage_error("Could not read back", copy, path, error))?
        {
            return Err(storage_error(
                "Could not verify",
                copy,
                path,
                io::Error::other("saved photo did not match uploaded data"),
            ));
        }
        // Persist each new directory entry as well as the file contents.
        File::open(
            path.parent()
                .ok_or_else(|| io::Error::other("missing photo directory"))?,
        )
        .map_err(|error| storage_error("Could not open parent directory of", copy, path, error))?
        .sync_all()
        .map_err(|error| storage_error("Could not sync parent directory of", copy, path, error))?;
    }
    pair.committed = true;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TestDir(PathBuf);
    impl TestDir {
        fn new() -> Self {
            let path = std::env::temp_dir()
                .join(format!("photo-save-test-{:032x}", rand::random::<u128>()));
            fs::create_dir_all(path.join("high")).unwrap();
            fs::create_dir_all(path.join("low")).unwrap();
            Self(path)
        }
        fn high(&self) -> PathBuf {
            self.0.join("high/photo.avif")
        }
        fn low(&self) -> PathBuf {
            self.0.join("low/photo.avif")
        }
    }
    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn success_saves_both_exact_copies() {
        let dir = TestDir::new();
        save_pair(&dir.high(), b"original", &dir.low(), b"preview").unwrap();
        assert_eq!(fs::read(dir.high()).unwrap(), b"original");
        assert_eq!(fs::read(dir.low()).unwrap(), b"preview");
    }

    #[test]
    fn second_save_failure_removes_first_copy() {
        let dir = TestDir::new();
        fs::remove_dir(dir.0.join("low")).unwrap();
        let error = save_pair(&dir.high(), b"original", &dir.low(), b"preview").unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::NotFound);
        assert!(error.to_string().contains("Could not create low-res file"));
        assert!(!error.to_string().contains(&dir.0.display().to_string()));
        assert!(!dir.high().exists());
        assert!(!dir.low().exists());
    }

    #[test]
    fn existing_files_are_never_overwritten_or_removed() {
        let dir = TestDir::new();
        fs::write(dir.low(), b"existing preview").unwrap();
        assert_eq!(
            save_pair(&dir.high(), b"original", &dir.low(), b"preview")
                .unwrap_err()
                .kind(),
            io::ErrorKind::AlreadyExists
        );
        assert!(!dir.high().exists());
        assert_eq!(fs::read(dir.low()).unwrap(), b"existing preview");
        fs::write(dir.high(), b"existing original").unwrap();
        assert_eq!(
            save_pair(&dir.high(), b"original", &dir.low(), b"preview")
                .unwrap_err()
                .kind(),
            io::ErrorKind::AlreadyExists
        );
        assert_eq!(fs::read(dir.high()).unwrap(), b"existing original");
        assert_eq!(fs::read(dir.low()).unwrap(), b"existing preview");
    }

    #[test]
    fn persisted_verification_handles_chunk_boundaries_and_mismatch() {
        let dir = TestDir::new();
        let mut expected = vec![0x5a; 64 * 1024 + 17];
        fs::write(dir.high(), &expected).unwrap();
        assert!(persisted_matches(&dir.high(), &expected).unwrap());

        expected[64 * 1024] ^= 1;
        assert!(!persisted_matches(&dir.high(), &expected).unwrap());
    }

    #[test]
    fn persisted_verification_rejects_truncation_and_extra_data() {
        let dir = TestDir::new();
        fs::write(dir.high(), b"short").unwrap();
        assert!(!persisted_matches(&dir.high(), b"shorter").unwrap());
        assert!(!persisted_matches(&dir.high(), b"shor").unwrap());
        assert!(persisted_matches(&dir.high(), b"short").unwrap());
    }
}
