"""Dev helper: POST /save?name=x.png writes the body to docs/. Used to pull renders out of the browser."""
import os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs')
os.makedirs(ROOT, exist_ok=True)

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        name = os.path.basename(parse_qs(urlparse(self.path).query).get('name', [''])[0])
        n = int(self.headers.get('Content-Length', 0))
        data = self.rfile.read(n)
        if name and n:
            with open(os.path.join(ROOT, name), 'wb') as f: f.write(data)
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass

HTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8092), H).serve_forever()
