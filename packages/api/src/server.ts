import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname } from "node:path";
import { createHandler } from "./handler";
import { staticFile, TYPES } from "./static";

const port = Number(process.env.PORT ?? 8787);
const handle = createHandler({
  ratePerMinute: Number(process.env.RATE_PER_MINUTE ?? 60),
  corsOrigin: process.env.CORS_ORIGIN,
});

/** When set, the playground's built files are served from here next to the API. */
const staticDir = process.env.STATIC_DIR;

/** Adapt node:http to the fetch-style handler. */
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    if (staticDir && req.method === "GET" && path !== "/health" && !path.startsWith("/v1/")) {
      const file = staticFile(staticDir, path);
      const body = file ? await readFile(file).catch(() => null) : null;
      if (!file || !body) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        "cache-control": path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
        "x-content-type-options": "nosniff",
      });
      res.end(body);
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
    }
    if (!headers.has("x-forwarded-for") && req.socket.remoteAddress) headers.set("x-forwarded-for", req.socket.remoteAddress);
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(`http://localhost${req.url ?? "/"}`, {
      method: req.method,
      headers,
      body: hasBody ? Buffer.concat(chunks) : undefined,
    });
    const response = await handle(request);
    const out: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      out[key] = value;
    });
    res.writeHead(response.status, out);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "internal" }));
  }
});

server.listen(port, () => {
  console.log(`answer-checker on http://localhost:${port}${staticDir ? "" : "/v1/check"}`);
});
