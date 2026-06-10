#!/usr/bin/env python3
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class ToolsHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description="Serve tools with cross-origin isolation headers")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8190)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), ToolsHTTPRequestHandler)
    print(f"Serving tools at http://{args.host}:{args.port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
