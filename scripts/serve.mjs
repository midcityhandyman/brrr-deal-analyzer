// Tiny static file server for the single page UI. No dependencies.
// Serves web/ at the root and the compiled engine at /dist/.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT) || 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function resolvePath(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^([/\\])+/, "");
  const relative = clean === "" || clean === "." ? "index.html" : clean;
  const base = relative.startsWith("dist" + sep) ? root : join(root, "web");
  const full = resolve(base, relative);
  return full.startsWith(base + sep) ? full : null;
}

const server = createServer(async (req, res) => {
  const file = resolvePath(req.url ?? "/");
  const type = file ? types[extname(file)] : undefined;
  if (!file || !type) {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" }).end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`BRRR deal analyzer UI: http://localhost:${port}`);
});
