import { checkAnswer, ENGINE, type CheckInput, type SourceInput } from "@answer-checker/core";
import { createLimiter } from "./rate-limit";

export const LIMITS = {
  maxBody: 200_000,
  maxQuestion: 2_000,
  maxAnswer: 20_000,
  maxSources: 20,
  maxSourceText: 20_000,
  maxVoiceRefs: 20,
} as const;

export type HandlerOptions = {
  /** Requests per minute per client address. Default 60. */
  ratePerMinute?: number;
  /** Origin allowed to call from a browser. Default none. */
  corsOrigin?: string;
};

type Problem = { error: string; detail?: string };

function json(body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("cf-connecting-ip") || "local";
}

function isString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

/** Validate an unknown body into a CheckInput, or say what is wrong with it. */
export function parseInput(payload: unknown): CheckInput | Problem {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { error: "bad_request", detail: "body must be an object" };
  const body = payload as Record<string, unknown>;
  if (!isString(body.question, LIMITS.maxQuestion) || !body.question.trim()) {
    return { error: "bad_request", detail: `question: non-empty string, at most ${LIMITS.maxQuestion} characters` };
  }
  if (!isString(body.answer, LIMITS.maxAnswer) || !body.answer.trim()) {
    return { error: "bad_request", detail: `answer: non-empty string, at most ${LIMITS.maxAnswer} characters` };
  }
  if (!Array.isArray(body.sources) || body.sources.length === 0 || body.sources.length > LIMITS.maxSources) {
    return { error: "bad_request", detail: `sources: 1 to ${LIMITS.maxSources} items` };
  }
  const sources: SourceInput[] = [];
  for (const item of body.sources as unknown[]) {
    if (isString(item, LIMITS.maxSourceText)) {
      sources.push(item);
      continue;
    }
    const source = item as Record<string, unknown> | null;
    if (!source || typeof source !== "object" || !isString(source.text, LIMITS.maxSourceText)) {
      return { error: "bad_request", detail: "sources: each a string or { id?, text, title? }" };
    }
    sources.push({
      text: source.text,
      ...(isString(source.id, 200) ? { id: source.id } : {}),
      ...(isString(source.title, 500) ? { title: source.title } : {}),
    });
  }
  const input: CheckInput = { question: body.question, answer: body.answer, sources };
  if (body.document !== undefined) {
    if (!isString(body.document, LIMITS.maxBody)) return { error: "bad_request", detail: "document: string" };
    input.document = body.document;
  }
  if (body.voice !== undefined) {
    const voice = body.voice as Record<string, unknown> | null;
    const reference = voice && typeof voice === "object" ? voice.reference : undefined;
    if (
      !Array.isArray(reference) ||
      reference.length > LIMITS.maxVoiceRefs ||
      !reference.every((page) => isString(page, LIMITS.maxSourceText))
    ) {
      return { error: "bad_request", detail: "voice.reference: list of strings" };
    }
    const language = voice?.language === "de" ? "de" : "en";
    input.voice = { reference: reference as string[], language };
  }
  return input;
}

/**
 * A fetch-style handler: (Request) => Response. Runs on Node 18+, Workers, Deno and Bun.
 * Routes: POST /v1/check, GET /health.
 */
export function createHandler(options: HandlerOptions = {}) {
  const limiter = createLimiter(options.ratePerMinute ?? 60);
  const cors: Record<string, string> = options.corsOrigin
    ? {
        "access-control-allow-origin": options.corsOrigin,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      }
    : {};

  return async function handle(request: Request, now = Date.now()): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/health") return json({ ok: true, engine: ENGINE }, 200, cors);
    if (pathname !== "/v1/check") return json({ error: "not_found" }, 404, cors);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST", ...cors });
    if (!limiter.allow(clientKey(request), now)) return json({ error: "rate_limited" }, 429, { "retry-after": "60", ...cors });

    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > LIMITS.maxBody) return json({ error: "too_large" }, 413, cors);
    const raw = await request.text();
    if (raw.length > LIMITS.maxBody) return json({ error: "too_large" }, 413, cors);

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: "bad_json" }, 400, cors);
    }
    const input = parseInput(payload);
    if ("error" in input) return json(input, 400, cors);
    return json(checkAnswer(input), 200, cors);
  };
}
