#!/usr/bin/env python3
"""Local bridge between Claude and the "Claude Local Bridge" Figma desktop plugin.

Lets Claude run Plugin API scripts inside Figma desktop, where local fonts
(fonts installed only on this Mac) load. The Figma MCP runs in Figma's cloud and
can't see those fonts.

  bridge.py serve                 start the server (127.0.0.1:7337)
  bridge.py run script.js [-d "what it does"] [-t seconds]
  bridge.py status                is the server up, is the plugin polling

Scripts use use_figma style: top-level await and `return`.
Only requests that carry the token in ~/.figma-bridge-token can submit code.
"""
import json
import os
import secrets
import sys
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 7337
TOKEN_PATH = os.path.expanduser("~/.figma-bridge-token")
ALLOWED_HOSTS = {f"localhost:{PORT}", f"127.0.0.1:{PORT}"}


def token():
    if not os.path.exists(TOKEN_PATH):
        fd = os.open(TOKEN_PATH, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(secrets.token_hex(24))
    with open(TOKEN_PATH) as f:
        return f.read().strip()


class State:
    lock = threading.Lock()
    queue = []
    results = {}
    events = {}
    last_poll = 0.0


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _send(self, code, body=None):
        data = b"" if body is None else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def _host_ok(self):
        # Blocks DNS-rebinding pages from reaching the server.
        return self.headers.get("Host") in ALLOWED_HOSTS

    def do_OPTIONS(self):
        self._send(204)

    def do_GET(self):
        if not self._host_ok():
            return self._send(403)
        if self.path == "/next":
            State.last_poll = time.time()
            with State.lock:
                job = State.queue.pop(0) if State.queue else None
            return self._send(200, job) if job else self._send(204)
        if self.path == "/status":
            return self._send(200, {"plugin_seen_seconds_ago": round(time.time() - State.last_poll, 1) if State.last_poll else None,
                                    "queued": len(State.queue)})
        self._send(404)

    def do_POST(self):
        if not self._host_ok():
            return self._send(403)
        if self.path == "/result":
            msg = self._body()
            with State.lock:
                State.results[msg["id"]] = msg["payload"]
                ev = State.events.get(msg["id"])
            if ev:
                ev.set()
            return self._send(200, {"ok": True})
        if self.path == "/job":
            if not secrets.compare_digest(self.headers.get("X-Bridge-Token", ""), token()):
                return self._send(401, {"error": "bad token"})
            msg = self._body()
            job = {"id": secrets.token_hex(6), "code": msg["code"], "description": msg.get("description", "")}
            ev = threading.Event()
            with State.lock:
                State.events[job["id"]] = ev
                State.queue.append(job)
            if not ev.wait(float(msg.get("timeout", 120))):
                with State.lock:
                    State.queue = [j for j in State.queue if j["id"] != job["id"]]
                    State.events.pop(job["id"], None)
                return self._send(504, {"ok": False, "error": "timed out: is the Claude Local Bridge plugin open in Figma desktop?"})
            with State.lock:
                State.events.pop(job["id"], None)
                payload = State.results.pop(job["id"])
            return self._send(200, payload)
        self._send(404)


def serve():
    token()
    print(f"Figma local bridge on http://127.0.0.1:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


def request(path, body=None, timeout=130):
    req = urllib.request.Request(f"http://127.0.0.1:{PORT}{path}",
                                 data=None if body is None else json.dumps(body).encode(),
                                 headers={"X-Bridge-Token": token(), "Content-Type": "application/json",
                                          "Host": f"127.0.0.1:{PORT}"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return json.loads(e.read() or b"null")


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    if argv[0] == "serve":
        serve()
    elif argv[0] == "status":
        print(json.dumps(request("/status"), indent=2))
    elif argv[0] == "run":
        path, desc, wait = argv[1], "", 120
        if "-d" in argv:
            desc = argv[argv.index("-d") + 1]
        if "-t" in argv:
            wait = float(argv[argv.index("-t") + 1])
        with open(path) as f:
            code = f.read()
        out = request("/job", {"code": code, "description": desc, "timeout": wait}, timeout=wait + 10)
        print(json.dumps(out, indent=2))
        return 0 if out and out.get("ok") else 1
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
