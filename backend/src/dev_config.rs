use std::{env, net::SocketAddr, path::PathBuf};

fn development() -> bool {
    env::var("APP_ENV").is_ok_and(|value| value == "development")
}

fn listener(development: bool, configured: Option<String>) -> Result<String, String> {
    let address = configured.unwrap_or_else(|| {
        if development {
            "127.0.0.1:3000"
        } else {
            "0.0.0.0:3000"
        }
        .into()
    });
    if development
        && !address
            .parse::<SocketAddr>()
            .is_ok_and(|addr| addr.ip().is_loopback())
    {
        return Err("APP_ENV=development requires a loopback BIND_ADDRESS; shared credentials must stay local".into());
    }
    Ok(address)
}

pub(crate) fn bind_address() -> Result<String, String> {
    listener(development(), env::var("BIND_ADDRESS").ok())
}

pub(crate) fn photo_root() -> PathBuf {
    photo_directory(development())
}

fn photo_directory(development: bool) -> PathBuf {
    PathBuf::from(if development {
        "./dev_server_files/hdrImages"
    } else {
        "./server_files/hdrImages"
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn development_is_local_even_with_an_override() {
        assert_eq!(listener(true, None).unwrap(), "127.0.0.1:3000");
        for address in [
            "0.0.0.0:3000",
            "[::]:3000",
            "192.168.0.2:3000",
            "localhost:3000",
        ] {
            assert!(listener(true, Some(address.into())).is_err());
        }
        for address in ["127.0.0.1:4000", "[::1]:4000"] {
            assert_eq!(listener(true, Some(address.into())).unwrap(), address);
        }
        assert_eq!(listener(false, None).unwrap(), "0.0.0.0:3000");
        assert_ne!(photo_directory(true), photo_directory(false));
    }
}
