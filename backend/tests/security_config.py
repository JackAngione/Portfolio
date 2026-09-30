#!/usr/bin/env python3
"""Check local-only Compose publications and the supplied nginx login boundary.

Uses a disposable nginx container, test certificates and a stub upstream only.
Never connects to the configured production upstreams.
"""
import json
from pathlib import Path
import ssl
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[2]


def command(*args):
    return subprocess.check_output(args, text=True).strip()


def main():
    config = json.loads(command("docker", "compose", "-f", str(ROOT / "dev/docker-compose.dev.yml"), "config", "--format", "json"))
    for service in ("mongodb", "meilisearch"):
        assert all(port["host_ip"] == "127.0.0.1" for port in config["services"][service]["ports"])
    name = "knowledge-security-nginx-" + uuid.uuid4().hex[:12]
    with tempfile.TemporaryDirectory(prefix="knowledge-nginx-test-") as directory:
        scratch = Path(directory)
        subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost", "-keyout", str(scratch / "key.pem"), "-out", str(scratch / "cert.pem")], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["openssl", "dhparam", "-dsaparam", "-out", str(scratch / "dh.pem"), "2048"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        (scratch / "ssl-options.conf").write_text("ssl_protocols TLSv1.2 TLSv1.3;\n")
        site = (ROOT / "production/portfolio").read_text()
        site = site.replace("192.168.0.2:3000", "127.0.0.1:8081").replace("192.168.0.2:7700", "127.0.0.1:8081")
        for original, fixture in [("/etc/letsencrypt/live/jackangione.com/fullchain.pem", "cert.pem"), ("/etc/letsencrypt/live/jackangione.com/privkey.pem", "key.pem"), ("/etc/letsencrypt/options-ssl-nginx.conf", "ssl-options.conf"), ("/etc/letsencrypt/ssl-dhparams.pem", "dh.pem")]:
            site = site.replace(original, "/test/" + fixture)
        # Echo the overwritten header from an in-container stub upstream.
        stub = 'server { listen 127.0.0.1:8081; location / { add_header X-Seen-Real-IP $http_x_real_ip always; return 204; } }'
        (scratch / "nginx.conf").write_text("events {}\nhttp {\n" + site + "\n" + stub + "\n}\n")
        command("docker", "run", "--rm", "--mount", f"type=bind,source={scratch},target=/test,readonly", "nginx:stable-alpine", "nginx", "-t", "-c", "/test/nginx.conf")
        try:
            command("docker", "run", "-d", "--name", name, "-p", "127.0.0.1::443", "--mount", f"type=bind,source={scratch},target=/test,readonly", "nginx:stable-alpine", "nginx", "-c", "/test/nginx.conf", "-g", "daemon off;")
            port = command("docker", "port", name, "443/tcp").rsplit(":", 1)[1]
            context = ssl._create_unverified_context()  # Disposable self-signed fixture.

            def request(path, method="GET"):
                req = urllib.request.Request(f"https://127.0.0.1:{port}" + path, method=method, headers={"Host": "jackangione.com", "X-Real-IP": "198.51.100.99", "X-Forwarded-For": "198.51.100.99"})
                try:
                    with urllib.request.urlopen(req, context=context, timeout=5) as response:
                        return response.status, response.headers
                except urllib.error.HTTPError as error:
                    return error.code, error.headers

            for _ in range(50):
                try:
                    if request("/api/session")[0] == 204:
                        break
                except OSError:
                    time.sleep(0.1)
            else:
                raise AssertionError("nginx did not start")
            responses = [request("/api/session?attempt=" + str(i), "POST") for i in range(12)]
            assert any(status == 204 for status, _ in responses)
            assert any(status == 429 for status, _ in responses)
            assert all(headers.get("Strict-Transport-Security") == "max-age=31536000" for _, headers in responses)
            assert all(headers.get("X-Seen-Real-IP") != "198.51.100.99" for status, headers in responses if status == 204)
            assert request("/api/categories", "POST")[0] == 204
            assert request("/api/session", "DELETE")[0] == 204
            print("PASS: loopback Compose publications, nginx syntax/TLS, login 429, forwarded-header overwrite, HSTS, unaffected non-login routes")
        finally:
            subprocess.run(["docker", "rm", "-fv", name], check=True, stdout=subprocess.DEVNULL)


if __name__ == "__main__":
    main()
