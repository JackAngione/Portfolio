//! Resize on the server: browser canvas would discard HDR precision/signalling.
use axum::http::StatusCode;
use std::{path::PathBuf, time::Duration};
use tokio::{process::Command, sync::Semaphore};

static ENCODER: Semaphore = Semaphore::const_new(1);

struct Scratch(PathBuf);
impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

pub(crate) async fn downscale(
    bytes: &[u8],
    extension: &str,
) -> Result<Vec<u8>, (StatusCode, String)> {
    let failure = || {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Could not generate low-res image. Try uploading a low-res copy manually.".to_string(),
        )
    };
    // Reject excess work instead of retaining large uploads in an unbounded queue.
    let _permit = ENCODER.try_acquire().map_err(|_| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            "Another photo is being resized. Please try again shortly.".to_string(),
        )
    })?;
    let directory =
        std::env::temp_dir().join(format!("photo-resize-{:032x}", rand::random::<u128>()));
    std::fs::create_dir(&directory).map_err(|_| failure())?;
    let scratch = Scratch(directory);
    let input = scratch.0.join(format!("input.{extension}"));
    let output = scratch.0.join(format!("output.{extension}"));
    let resized_rgb = scratch.0.join("resized.ppm");
    tokio::fs::write(&input, bytes)
        .await
        .map_err(|_| failure())?;

    // >= handles square images; min prevents upscaling. -2 keeps chroma dimensions even.
    let dimensions =
        "w=if(gte(iw\\,ih)\\,min(1200\\,iw)\\,-2):h=if(gt(ih\\,iw)\\,min(1200\\,ih)\\,-2)";
    let mut command = Command::new("ffmpeg");
    command
        .kill_on_drop(true)
        .args(["-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i"])
        .arg(&input)
        .args(["-map", "0:v:0", "-frames:v", "1", "-an"]);
    if extension == "avif" {
        // Leave pixel format, transfer, primaries and range inherited from the input.
        // No tone mapping or forced 8-bit format. Encode the preview at CRF 14.
        command.args([
            "-vf",
            &format!("zscale={dimensions}:filter=spline36"),
            "-c:v",
            "libaom-av1",
            "-lossless",
            "0",
            "-crf",
            "14",
            "-cpu-used",
            "0",
            "-still-picture",
            "1",
            "-tune-content",
            "still-image",
            "-aq-mode",
            "0",
        ]);
    } else {
        command.args([
            "-vf",
            &format!("scale={dimensions}:flags=lanczos"),
            "-c:v",
            "ppm",
            "-pix_fmt",
            "rgb24",
            "-update",
            "1",
        ]);
    }
    command.arg(if extension == "avif" {
        &output
    } else {
        &resized_rgb
    });
    let result = tokio::time::timeout(Duration::from_secs(300), command.output()).await;
    match result {
        Ok(Ok(result)) if result.status.success() => {}
        Ok(Ok(result)) => {
            tracing::warn!(stderr = %String::from_utf8_lossy(&result.stderr), "Photo resize failed");
            return Err(failure());
        }
        other => {
            tracing::warn!(?other, "Photo resize could not finish");
            return Err(failure());
        }
    }
    if extension == "jpg" {
        // FFmpeg qscale is not a percentage. Encode the resized RGB pixels with
        // libjpeg's actual 0–100 quality scale, avoiding an intermediate lossy JPEG.
        let mut jpeg = Command::new("cjpeg");
        jpeg.kill_on_drop(true)
            .args(["-quality", "75", "-optimize", "-outfile"])
            .arg(&output)
            .arg(&resized_rgb);
        match tokio::time::timeout(Duration::from_secs(30), jpeg.output()).await {
            Ok(Ok(result)) if result.status.success() => {}
            result => {
                tracing::warn!(?result, "JPEG quality-75 encoding failed");
                return Err(failure());
            }
        }
    }
    tokio::fs::read(&output).await.map_err(|_| failure())
}

#[cfg(test)]
mod tests {
    use super::*;

    // Requires the same FFmpeg build as production plus ffprobe.
    #[tokio::test]
    #[ignore = "requires ffmpeg with libaom-av1/zscale, ffprobe and cjpeg"]
    async fn jpeg_and_hdr_avif_previews() {
        let directory =
            std::env::temp_dir().join(format!("photo-test-{:032x}", rand::random::<u128>()));
        std::fs::create_dir(&directory).unwrap();
        let scratch = Scratch(directory);
        for (extension, size, transfer, expected) in [
            ("jpg", "1600x900", "", (1200, 676)),
            ("jpg", "900x1600", "", (676, 1200)),
            ("jpg", "1400x1400", "", (1200, 1200)),
            ("jpg", "600x400", "", (600, 400)),
            ("avif", "1600x900", "smpte2084", (1200, 676)),
            ("avif", "900x1600", "arib-std-b67", (676, 1200)),
            ("avif", "1400x1400", "smpte2084", (1200, 1200)),
        ] {
            let source = scratch.0.join(format!("source.{extension}"));
            let mut command = Command::new("ffmpeg");
            command.args([
                "-v",
                "error",
                "-y",
                "-f",
                "lavfi",
                "-i",
                &format!("color=c=red:s={size}"),
                "-frames:v",
                "1",
            ]);
            if extension == "avif" {
                command.args([
                    "-vf",
                    &format!("format=yuv420p10le,setparams=color_primaries=bt2020:color_trc={transfer}:colorspace=bt2020nc"),
                    "-c:v",
                    "libaom-av1",
                    "-cpu-used",
                    "8",
                    "-still-picture",
                    "1",
                    "-color_primaries",
                    "bt2020",
                    "-color_trc",
                    transfer,
                    "-colorspace",
                    "bt2020nc",
                ]);
            } else {
                command.args(["-c:v", "mjpeg", "-update", "1"]);
            }
            let generated = command.arg(&source).output().await.unwrap();
            assert!(
                generated.status.success(),
                "{}",
                String::from_utf8_lossy(&generated.stderr)
            );
            let bytes = std::fs::read(&source).unwrap();
            let preview = downscale(&bytes, extension).await.unwrap();
            assert_eq!(std::fs::read(&source).unwrap(), bytes);
            if extension == "jpg" {
                // Standard quality-75 luminance quantization table in zigzag order.
                let luminance = [
                    8, 6, 6, 7, 6, 5, 8, 7, 7, 7, 9, 9, 8, 10, 12, 20, 13, 12, 11, 11, 12, 25, 18,
                    19, 15, 20, 29, 26, 31, 30, 29, 26, 28, 28, 32, 36, 46, 39, 32, 34, 44, 35, 28,
                    28, 40, 55, 41, 44, 48, 49, 52, 52, 52, 31, 39, 57, 61, 56, 50, 60, 46, 51, 52,
                    50,
                ];
                let marker = preview
                    .windows(5)
                    .position(|v| v == [0xff, 0xdb, 0, 67, 0])
                    .expect("JPEG luminance quantization table");
                assert_eq!(&preview[marker + 5..marker + 69], &luminance);
            }
            let output = scratch.0.join(format!("preview.{extension}"));
            std::fs::write(&output, preview).unwrap();
            let probe = Command::new("ffprobe")
                .args(["-v", "error", "-show_streams", "-of", "json"])
                .arg(output)
                .output()
                .await
                .unwrap();
            assert!(probe.status.success());
            let metadata: serde_json::Value = serde_json::from_slice(&probe.stdout).unwrap();
            let stream = &metadata["streams"][0];
            assert_eq!(stream["width"], expected.0);
            assert_eq!(stream["height"], expected.1);
            if extension == "avif" {
                assert_eq!(stream["pix_fmt"], "yuv420p10le");
                assert_eq!(stream["color_primaries"], "bt2020");
                assert_eq!(stream["color_transfer"], transfer);
                assert_eq!(stream["color_space"], "bt2020nc");
                assert_eq!(stream["color_range"], "tv");
            }
        }
        assert!(downscale(b"invalid image", "avif").await.is_err());
        // A failed decode releases the encoding slot.
        assert!(ENCODER.try_acquire().is_ok());
    }
}
