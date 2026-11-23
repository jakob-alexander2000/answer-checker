/**
 * Claim mode: a model splits the answer into claims and marks each one pass, fail or unsupported
 * against the sources. Ported from CiteBot's verify step. The model is injected, so the package
 * makes no network calls of its own and works with any provider.
 */

export type ClaimVerdict = "pass" | "fail" | "unsupported";

export type ModelClaim = {
  claim: string;
  verdict: ClaimVerdict;
  /** A short quote from a source, or why the claim failed. */
  evidence: string;
  /** The id of the source that backs or contradicts it, when the model named a real one. */
  sourceId?: string;
};

export type ClaimSummary = "grounded" | "mixed" | "ungrounded" | "unavailable";

export type ClaimReport = { summary: ClaimSummary; claims: ModelClaim[] };

export type Source = { id: string; text: string; title?: string };

/** Any function that takes a prompt and returns the model's text. Ask it for JSON at temperature 0. */
export type Complete = (prompt: string) => Promise<string>;

export const MAX_CLAIMS = 8;
const VERDICTS = new Set<ClaimVerdict>(["pass", "fail", "unsupported"]);

export function summarizeClaims(claims: readonly ModelClaim[]): ClaimSummary {
  if (claims.length === 0) return "ungrounded";
  const passes = claims.filter((c) => c.verdict === "pass").length;
  const fails = claims.filter((c) => c.verdict === "fail").length;
  if (passes === claims.length) return "grounded";
  if (fails === claims.length || passes === 0) return "ungrounded";
  return "mixed";
}

/** Parse the model's JSON (or a blob that contains it). Unknown verdicts and invented source ids are dropped. */
export function parseClaims(raw: string, sourceIds: readonly string[]): ModelClaim[] {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  const list =
    parsed && typeof parsed === "object" && Array.isArray((parsed as { claims?: unknown }).claims)
      ? (parsed as { claims: unknown[] }).claims
      : [];
  const known = new Set(sourceIds);
  return list
    .map((item): ModelClaim | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const claim = typeof row.claim === "string" ? row.claim.trim() : "";
      const verdict = typeof row.verdict === "string" ? row.verdict.toLowerCase() : "";
      const evidence = typeof row.evidence === "string" ? row.evidence.trim() : "";
      const rawId = row.sourceId ?? row.citationId;
      const id = typeof rawId === "string" ? rawId.trim() : undefined;
      if (!claim || !VERDICTS.has(verdict as ClaimVerdict)) return null;
      return {
        claim,
        verdict: verdict as ClaimVerdict,
        evidence: evidence || "No evidence note returned.",
        sourceId: id && known.has(id) ? id : undefined,
      };
    })
    .filter((c): c is ModelClaim => c !== null)
    .slice(0, MAX_CLAIMS);
}

export function claimPrompt(question: string, answer: string, sources: readonly Source[]): string {
  const context = sources
    .map((s, i) => `[${i + 1}] id=${s.id}${s.title ? ` title=${s.title}` : ""}\n${s.text}`)
    .join("\n\n");
  return `You check an answer that a chatbot wrote from the sources below.
Split the ANSWER into atomic factual claims (1 to 6). Check each claim ONLY against the SOURCES.
Write claim and evidence in the language of the answer. Verdict values stay pass, fail or unsupported.

Verdict rules:
- "pass": a source directly supports the claim. Quote a short phrase as evidence and set sourceId.
- "fail": a source contradicts the claim. Say how, and set sourceId to the contradicting source.
- "unsupported": no source backs the claim, including invented facts. If the answer correctly says the sources do not cover the question, that claim is "pass".

Do not use outside knowledge. Do not invent source ids.

Return JSON only:
{"claims":[{"claim":"...","verdict":"pass"|"fail"|"unsupported","evidence":"...","sourceId":"optional-id"}]}

QUESTION: ${question}

ANSWER:
${answer}

SOURCES:
${context || "(no sources)"}`;
}

export async function checkClaims(
  input: { question: string; answer: string; sources: readonly Source[] },
  complete: Complete,
): Promise<ClaimReport> {
  if (!input.answer.trim()) {
    return { summary: "ungrounded", claims: [{ claim: "(empty answer)", verdict: "unsupported", evidence: "No answer text to check." }] };
  }
  let text: string;
  try {
    text = await complete(claimPrompt(input.question, input.answer, input.sources));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The model could not be reached.";
    return { summary: "unavailable", claims: [{ claim: "Claim mode could not run.", verdict: "unsupported", evidence: message }] };
  }
  const claims = parseClaims(text, input.sources.map((s) => s.id));
  if (claims.length === 0) {
    return {
      summary: "ungrounded",
      claims: [{ claim: "The model's claim list could not be read.", verdict: "unsupported", evidence: "Empty or invalid JSON." }],
    };
  }
  return { summary: summarizeClaims(claims), claims };
}
