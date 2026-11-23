import { createServer } from "node:http";
import { createHandler } from "./handler";

const port = Number(process.env.PORT ?? 8787);
const handle = createHandler({
  ratePerMinute: Number(process.env.RATE_PER_MINUTE ?? 60),
  corsOrigin: process.env.CORS_ORIGIN,
});

/** Adapt node:http to the fetch-style handler. */
const server = createServer(async (req, res) => {
  try {
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
  console.log(`answer-checker api on http://localhost:${port}/v1/check`);
});
