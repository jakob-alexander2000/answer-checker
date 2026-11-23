import { describe, expect, it } from "vitest";
import { createHandler, LIMITS } from "../src/handler";
import { allow } from "../src/rate-limit";

const SOURCE =
  "Full-time employees receive 30 days of paid annual leave after the probation period. Part-time staff receive leave in proportion to their hours.";

function post(body: unknown, ip = "203.0.113.5", path = "/v1/check"): Request {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("rate limit", () => {
  it("allows the max calls in a window and blocks the next", () => {
    let hits: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const decision = allow(1_000 + i, hits, 60_000, 8);
      expect(decision.ok).toBe(true);
      hits = decision.hits;
    }
    expect(allow(1_100, hits, 60_000, 8).ok).toBe(false);
    expect(allow(61_100, hits, 60_000, 8).ok).toBe(true);
  });
});

describe("POST /v1/check", () => {
  it("fails an answer that drops the conditions", async () => {
    const handle = createHandler();
    const response = await handle(
      post({
        question: "How many days of leave do employees get?",
        answer: "Employees receive 30 days of paid annual leave.",
        sources: [SOURCE],
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { verdict: string; failed: string[]; claims: unknown[] };
    expect(body.verdict).toBe("fail");
    expect(body.failed).toContain("qualifier");
    expect(body.claims).toHaveLength(1);
  });

  it("passes an answer that keeps them", async () => {
    const handle = createHandler();
    const response = await handle(
      post({
        question: "How many days of leave do employees get?",
        answer: "Full-time employees receive 30 days of paid annual leave after the probation period.",
        sources: [{ id: "handbook-4.2", text: SOURCE }],
      }),
    );
    const body = (await response.json()) as { verdict: string; claims: { sourceId: string }[] };
    expect(body.verdict).toBe("pass");
    expect(body.claims[0]?.sourceId).toBe("handbook-4.2");
  });

  it("rejects bad JSON, a bad body and other methods", async () => {
    const handle = createHandler();
    expect((await handle(post("{nope"))).status).toBe(400);
    const bad = await handle(post({ question: "Q?", answer: "", sources: [] }));
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: string }).error).toBe("bad_request");
    expect((await handle(new Request("https://example.test/v1/check"))).status).toBe(405);
    expect((await handle(post({}, "203.0.113.9", "/v2/nothing"))).status).toBe(404);
  });

  it("rejects a body over the size limit", async () => {
    const handle = createHandler();
    const huge = "a".repeat(LIMITS.maxBody + 1);
    expect((await handle(post({ question: "Q?", answer: huge, sources: [SOURCE] }))).status).toBe(413);
  });

  it("rate limits a single address", async () => {
    const handle = createHandler({ ratePerMinute: 3 });
    const body = { question: "Q?", answer: "Employees receive 30 days.", sources: [SOURCE] };
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) statuses.push((await handle(post(body, "198.51.100.20"), 5_000 + i)).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
    expect((await handle(post(body, "198.51.100.21"), 5_010)).status).toBe(200);
  });

  it("answers health checks", async () => {
    const response = await createHandler()(new Request("https://example.test/health"));
    expect(response.status).toBe(200);
    expect(((await response.json()) as { ok: boolean }).ok).toBe(true);
  });
});
