#!/usr/bin/env python3
"""Exercise the real API against disposable local MongoDB/Meilisearch containers.

Requires Docker, Cargo and FFmpeg. Never reads .env or existing server_files.
Run from any directory: python3 backend/tests/local_api_smoke.py
"""

import concurrent.futures
import json
import math
import os
from pathlib import Path
import socket
import struct
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid
import wave


BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent


def command(*args):
    return subprocess.check_output(args, text=True).strip()


def request(url, method="GET", data=None, token=None, headers=None):
    headers = dict(headers or {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if isinstance(data, (dict, list)):
        data = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, response.read(), {key.lower(): value for key, value in response.headers.items()}
    except urllib.error.HTTPError as error:
        return error.code, error.read(), {key.lower(): value for key, value in error.headers.items()}


def wait_until(check, timeout=30):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            if check():
                return
        except (OSError, ValueError):
            pass
        time.sleep(0.1)
    raise AssertionError("Timed out waiting for a local test service")


def test_api(api, search, files, mongo):
    status, _, _ = request(api + "/session")
    assert status == 401
    status, _, _ = request(api + "/session", "POST", {"username": "admin", "password": "wrong"})
    assert status == 401
    status, body, _ = request(api + "/session", "POST", {"username": "admin", "password": "devpassword"})
    assert status == 200, body
    token = json.loads(body)["token"]
    assert request(api + "/session", token=token)[0] == 200

    for path in ("/artists", "/songs", "/categories"):
        status, body, _ = request(api + path)
        assert status == 200 and isinstance(json.loads(body), list), (path, status, body)

    # The category and tutorial exist only in the disposable test database.
    assert request(api + "/categories", "POST", {"title": "Audit", "subCategories": ["Test"]}, token)[0] == 201
    tutorial = {"title": "Audit fixture", "description": "integration check", "source": "https://example.com/audit", "category": "Audit", "subCategories": ["Test"], "keywords": ["auditfixture"]}
    status, body, _ = request(api + "/tutorials", "POST", tutorial, token)
    assert status == 201, (status, body)
    status, body, _ = request(api + "/tutorials?searchQuery=auditfixture")
    assert status == 200
    results = json.loads(body)
    assert len(results) == 1
    tutorial = results[0]
    resource_id = tutorial["resource_id"]

    def indexed_title():
        status, body, _ = request(search + "/indexes/resources/documents/" + resource_id, token="dev_master_key")
        return json.loads(body).get("title") if status == 200 else None

    wait_until(lambda: indexed_title() == "Audit fixture")
    tutorial["title"] = "Audit edited"
    tutorial["subCategories"] = []
    tutorial["keywords"] = []
    assert request(api + "/tutorials/" + resource_id, "PUT", tutorial, token)[0] == 200
    wait_until(lambda: indexed_title() == "Audit edited")
    assert request(api + "/search-index/rebuild", "POST", token=token)[0] == 200
    assert indexed_title() == "Audit edited"

    # Rebuilds must not prune documents created concurrently with their scan.
    def concurrent_write(i):
        if i < 2:
            return request(api + "/search-index/rebuild", "POST", token=token)[0], 200
        item = {**tutorial, "title": f"Concurrent {i}", "keywords": ["auditbatch"], "resource_id": ""}
        return request(api + "/tutorials", "POST", item, token)[0], 201

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        assert all(actual == expected for actual, expected in pool.map(concurrent_write, range(10)))
    concurrent_tutorials = json.loads(request(api + "/tutorials?searchQuery=auditbatch")[1])
    assert len(concurrent_tutorials) == 8
    for item in concurrent_tutorials:
        url = search + "/indexes/resources/documents/" + item["resource_id"]
        assert request(url, token="dev_master_key")[0] == 200
        assert request(api + "/tutorials/" + item["resource_id"], "DELETE", token=token)[0] == 204
    assert request(api + "/tutorials/" + resource_id, "DELETE", token=token)[0] == 204
    wait_until(lambda: indexed_title() is None)
    assert request(api + "/categories/Audit", "DELETE", token=token)[0] == 200

    # A new file created after startup tests actual concurrent cold requests.
    audio = files / "artists" / "audit" / "track.wav"
    audio.parent.mkdir(parents=True)
    with wave.open(str(audio), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(44100)
        output.writeframes(b"".join(struct.pack("<h", int(12000 * math.sin(i * 0.1))) for i in range(44100)))
    waveform_url = api + "/artists/audit/songs/track/waveform"
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        waveforms = list(pool.map(lambda _: request(waveform_url), range(12)))
    assert all(status == 200 for status, _, _ in waveforms)
    data = json.loads(waveforms[0][1])
    assert data["duration"] == 1.0 and max(data["peaks"]) == 1.0
    assert all(json.loads(body) == data for _, body, _ in waveforms)
    assert json.loads(audio.with_suffix(".waveform.json").read_text()) == data
    assert json.loads(request(waveform_url)[1]) == data
    status, body, headers = request(api + "/artists/audit/songs/track/stream", headers={"Range": "bytes=0-15"})
    assert status == 206 and body == audio.read_bytes()[:16]
    assert headers["content-range"].startswith("bytes 0-15/")
    assert request(api + "/artists/audit/songs/missing/waveform")[0] == 404

    original = files.parent / "photo.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=64x32", "-frames:v", "1", "-update", "1", str(original)], check=True)
    jpeg = original.read_bytes()
    boundary = "audit-multipart-boundary"
    multipart = []
    for name, filename, value in [("category", None, b"Audit"), ("highRes", "photo.jpg", jpeg), ("lowRes", "preview.jpg", jpeg)]:
        disposition = f'Content-Disposition: form-data; name="{name}"'
        if filename:
            disposition += f'; filename="{filename}"\r\nContent-Type: image/jpeg'
        multipart.append(f"--{boundary}\r\n{disposition}\r\n\r\n".encode() + value + b"\r\n")
    payload = b"".join(multipart) + f"--{boundary}--\r\n".encode()
    content_type = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
    assert request(api + "/photos", "POST", payload, headers=content_type)[0] == 401
    status, body, _ = request(api + "/photos", "POST", payload, token, content_type)
    assert status == 201, (status, body)
    for size in ("high", "low"):
        assert (files / "hdrImages" / "Audit" / size / "photo.jpg").read_bytes() == jpeg
    assert request(api + "/photos", "POST", payload, token, content_type)[0] == 409

    # Exercise the real Mongo/SDK adapters across several upload/delete pages.
    command("docker", "exec", mongo, "mongosh", "KNOWLEDGE", "--quiet", "--eval",
            'db.tutorials.insertMany(Array.from({length:1003},(_,i)=>({resource_id:"batch-"+i,title:"Batch "+i,description:"",source:"https://example.com",category:"",subCategories:[],keywords:[]})));')
    stale = [{"resource_id": f"stale-{i}", "title": "stale"} for i in range(1007)]
    assert request(search + "/indexes/resources/documents", "POST", stale, "dev_master_key")[0] == 202
    assert request(api + "/search-index/rebuild", "POST", token=token)[0] == 200
    indexed = json.loads(request(search + "/indexes/resources/documents?limit=2000", token="dev_master_key")[1])
    indexed_ids = {item["resource_id"] for item in indexed["results"]}
    assert {f"batch-{i}" for i in range(1003)} <= indexed_ids
    assert not any(item.startswith("stale-") for item in indexed_ids)

    # An empty source must prune an existing index and initialize a missing one.
    command("docker", "exec", mongo, "mongosh", "KNOWLEDGE", "--quiet", "--eval", "db.tutorials.deleteMany({});")
    assert request(api + "/search-index/rebuild", "POST", token=token)[0] == 200
    assert json.loads(request(search + "/indexes/resources/documents", token="dev_master_key")[1])["total"] == 0
    status, body, _ = request(search + "/indexes/resources", "DELETE", token="dev_master_key")
    assert status == 202
    task_id = json.loads(body)["taskUid"]
    wait_until(lambda: json.loads(request(search + f"/tasks/{task_id}", token="dev_master_key")[1])["status"] == "succeeded")
    assert request(api + "/search-index/rebuild", "POST", token=token)[0] == 200
    assert json.loads(request(search + "/indexes/resources/documents", token="dev_master_key")[1])["total"] == 0
    assert request(api + "/session", "DELETE", token=token)[0] == 200
    assert request(api + "/session", token=token)[0] == 401


def main():
    subprocess.run(["cargo", "build", "--locked"], cwd=BACKEND, check=True)
    containers = []
    process = None
    with tempfile.TemporaryDirectory(prefix="knowledge-api-test-") as directory:
        scratch = Path(directory)
        log_path = scratch / "backend.log"
        try:
            suffix = uuid.uuid4().hex[:12]
            mongo = f"knowledge-audit-mongo-{suffix}"
            search = f"knowledge-audit-search-{suffix}"
            command("docker", "run", "-d", "--name", mongo, "-p", "127.0.0.1::27017", "--mount", f"type=bind,source={ROOT / 'dev/mongo-init'},target=/docker-entrypoint-initdb.d,readonly", "mongo:7")
            containers.append(mongo)
            command("docker", "run", "-d", "--name", search, "-p", "127.0.0.1::7700", "-e", "MEILI_MASTER_KEY=dev_master_key", "-e", "MEILI_ENV=development", "getmeili/meilisearch:v1.15")
            containers.append(search)
            mongo_port = command("docker", "port", mongo, "27017/tcp").rsplit(":", 1)[1]
            search_port = command("docker", "port", search, "7700/tcp").rsplit(":", 1)[1]
            search_url = f"http://127.0.0.1:{search_port}"
            wait_until(lambda: request(search_url + "/health")[0] == 200)
            # Init scripts finish before the final mongod starts. Its log marks
            # that transition; the backend driver waits for that server.
            wait_until(lambda: "MongoDB init process complete" in command("docker", "logs", mongo), timeout=60)
            with socket.socket() as listener:
                listener.bind(("127.0.0.1", 0))
                api_port = listener.getsockname()[1]
            env = os.environ.copy()
            env.update({"APP_ENV": "test", "MONGODB_CONNECTION_STRING": f"mongodb://127.0.0.1:{mongo_port}/?serverSelectionTimeoutMS=3000", "JWT_KEY": "test-only-key", "MEILISEARCH_HOST": search_url, "MEILISEARCH_MASTER_KEY": "dev_master_key", "BIND_ADDRESS": f"127.0.0.1:{api_port}"})
            with log_path.open("w") as log:
                process = subprocess.Popen([str(BACKEND / "target/debug/backend")], cwd=scratch, env=env, stdout=log, stderr=log)
            api = f"http://127.0.0.1:{api_port}"
            wait_until(lambda: request(api + "/artists")[0] == 200)
            test_api(api, search_url, scratch / "server_files", mongo)
            print("PASS: auth, catalog, tutorial CRUD/search/reindex, concurrent writes/rebuilds, multi-page search batches, empty index initialization, concurrent waveform/cache, range streaming, photo persistence/conflicts, logout")
        except Exception:
            if log_path.exists():
                print(log_path.read_text())
            raise
        finally:
            if process is not None:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
            for container in reversed(containers):
                subprocess.run(["docker", "rm", "-fv", container], stdout=subprocess.DEVNULL, check=True)


if __name__ == "__main__":
    main()
