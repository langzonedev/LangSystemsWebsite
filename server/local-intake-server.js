"use strict";

const http = require("http");
const { Readable } = require("stream");
const fs = require("fs/promises");
const path = require("path");
const { createIntakeEndpoint } = require("./intake-endpoint.js");

const port = Number(process.env.PORT || 8787);
const handle = createIntakeEndpoint();
const publicRoot = path.resolve(__dirname, "..");
const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon" };

async function serveStatic(incoming, outgoing) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(incoming.url, `http://127.0.0.1:${port}`).pathname); } catch (_error) { pathname = ""; }
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filename = path.resolve(publicRoot, relative);
  const firstPart = relative.split(/[\\/]/)[0];
  const extension = path.extname(filename).toLowerCase();
  if (!filename.startsWith(`${publicRoot}${path.sep}`) || ["server", "tests", "docs"].includes(firstPart) || firstPart.startsWith(".") || !contentTypes[extension]) {
    outgoing.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    outgoing.end("Not found");
    return;
  }
  try {
    const body = await fs.readFile(filename);
    outgoing.writeHead(200, { "Content-Type": contentTypes[extension], "X-Content-Type-Options": "nosniff" });
    outgoing.end(incoming.method === "HEAD" ? undefined : body);
  } catch (_error) {
    outgoing.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    outgoing.end("Not found");
  }
}

http.createServer(async (incoming, outgoing) => {
  if (incoming.url !== "/api/project-submissions" && ["GET", "HEAD"].includes(incoming.method)) {
    await serveStatic(incoming, outgoing);
    return;
  }
  if (incoming.url !== "/api/project-submissions") {
    outgoing.writeHead(404, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    outgoing.end(JSON.stringify({ success: false, code: "not_found" }));
    return;
  }
  const request = new Request(`http://localhost:${port}${incoming.url}`, {
    method: incoming.method,
    headers: incoming.headers,
    body: ["GET", "HEAD"].includes(incoming.method) ? undefined : Readable.toWeb(incoming),
    duplex: "half"
  });
  const response = await handle(request);
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Lang Systems website and intake API listening on http://127.0.0.1:${port}\nEmail mode: ${process.env.INTAKE_EMAIL_MODE || "mock (development default)"}\n`);
});
