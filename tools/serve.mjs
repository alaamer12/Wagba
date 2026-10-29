#!/usr/bin/env bun
// Zero-dependency static server for the built SPA. The gate runs the app this way
// because the same bundle is what ships inside the APK.
import { existsSync, statSync } from "node:fs";
import { join, normalize } from "node:path";

const root = normalize(join(import.meta.dir, "..", "dist", "spa"));
const port = Number(process.argv[2] ?? 9100);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) return new Response("forbidden", { status: 403 });
    if (existsSync(file) && statSync(file).isFile()) {
      const ext = file.slice(file.lastIndexOf("."));
      return new Response(Bun.file(file), {
        headers: { "content-type": TYPES[ext] ?? "application/octet-stream" },
      });
    }
    return new Response(Bun.file(join(root, "index.html")), {
      headers: { "content-type": TYPES[".html"] },
    });
  },
});

console.log(`serving dist/spa on http://127.0.0.1:${server.port}`);
