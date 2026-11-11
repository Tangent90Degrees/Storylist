#!/usr/bin/env python3
"""Dev server with no-cache headers for ES modules.

Usage:  python3 serve.py
Then open http://localhost:8080
"""

import http.server
import socketserver

PORT = 8080
DIR = 'assets/srcs'


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
        print(f'Serving {DIR}/ at http://localhost:8080  (no-cache mode)')
        httpd.serve_forever()
