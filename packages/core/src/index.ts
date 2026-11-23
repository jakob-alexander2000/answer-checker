import { checkById, scoreAnswer, type CheckId, type CheckResult } from "./checks";
import { coverage, splitSentences, SUPPORT_MIN } from "./text";
import { deltaBetween, readingFor, type Reading } from "./voice/delta";
import { VOICE_THRESHOLDS } from "./voice/lexicon";

export { checkById, findSpans, OMISSION_PATTERNS, QUALIFIER_PATTERNS, scoreAnswer } from "./checks";
export type { CheckId, CheckResult, CheckStatus, ScoreCard, Span } from "./checks";
export { checkClaims, claimPrompt, parseClaims, summarizeClaims } from "./claims/verify";
export type { ClaimReport, ClaimSummary, ClaimVerdict, Complete, ModelClaim } from "./claims/verify";
export { keywordHits, runKeyword } from "./run";
export { draftAnswer, toNaive as stripConditions } from "./strip";
export { deltaBetween, readingFor } from "./voice/delta";
export { VOICE_THRESHOLDS } from "./voice/lexicon";

export const ENGINE = { name: "answer-checker", version: "0.1.0" } as const;

export type Language = "en" | "de";
export type SourceInput = string | { id?: string; text: string; title?: string };

export type CheckInput = {
  question: string;
  answer: string;
  /** The passages the chatbot answered from. */
  sources: readonly SourceInput[];
  /** The whole document, if you have it. Used to find who a policy applies to. Defaults to the sources. */
  document?: string;
  /** Pages in the house voice. When given, the answer also gets a voice reading. */
  voice?: { reference: readonly string[]; language?: Language };
};

export type Claim = {
  text: string;
  start: number;
  end: number;
  /** The source that covers most of the claim's words, or -1. */
  sourceIndex: number;
  sourceId: string | null;
  /** Share of the claim's content words found in that source, 0 to 1. */
  coverage: number;
  supported: boolean;
};

export type VoiceReading = { delta: number; reading: Reading; words: string[] };

export type CheckOutput = {
  verdict: "pass" | "fail";
  failed: CheckId[];
  checks: CheckResult[];
  claims: Claim[];
  voice: VoiceReading | null;
  engine: typeof ENGINE;
};

export type NormalizedSource = { id: string; text: string; title?: string };

export function normalizeSources(sources: readonly SourceInput[]): NormalizedSource[] {
  return sources.map((source, index) =>
    typeof source === "string"
      ? { id: `s${index + 1}`, text: source }
      : { id: source.id ?? `s${index + 1}`, text: source.text, title: source.title },
  );
}

/** Split the answer into sentence claims and find the source that best covers each one. */
export function claimsFor(answer: string, sources: readonly NormalizedSource[]): Claim[] {
  const claims: Claim[] = [];
  let from = 0;
  for (const sentence of splitSentences(answer)) {
    const start = answer.indexOf(sentence, from);
    from = start < 0 ? from : start + sentence.length;
    let best = -1;
    let bestScore = 0;
    sources.forEach((source, index) => {
      const score = coverage(sentence, source.text);
      if (score > bestScore) {
        best = index;
        bestScore = score;
      }
    });
    claims.push({
      text: sentence,
      start: Math.max(start, 0),
      end: Math.max(start, 0) + sentence.length,
      sourceIndex: best,
      sourceId: best >= 0 ? (sources[best]?.id ?? null) : null,
      coverage: Math.round(bestScore * 1000) / 1000,
      supported: bestScore >= SUPPORT_MIN,
    });
  }
  return claims;
}

/**
 * Check an answer against the sources it came from. Offline and deterministic: no model, no network.
 * The four checks: Support (every sentence is in a source), Scope (no widening of who it applies to),
 * Qualifier (limits, numbers and amounts kept), Omission (no dropped "unless", "es sei denn" and the like).
 */
export function checkAnswer(input: CheckInput): CheckOutput {
  const sources = normalizeSources(input.sources);
  const passages = sources.map((source) => source.text);
  const document = input.document ?? passages.join("\n\n");
  const card = scoreAnswer({ document, question: input.question, passages, answer: input.answer });
  const failed = card.checks.filter((check) => check.status === "fail").map((check) => check.id);
  let voice: VoiceReading | null = null;
  if (input.voice && input.voice.reference.length >= 2 && input.answer.trim()) {
    const result = deltaBetween([...input.voice.reference], [input.answer], VOICE_THRESHOLDS.n, input.voice.language ?? "en");
    voice = {
      delta: Math.round(result.delta * 1000) / 1000,
      reading: readingFor(result.delta, VOICE_THRESHOLDS.closeMax, VOICE_THRESHOLDS.offVoiceMin),
      words: result.contributions.slice(0, 5).map((item) => item.word),
    };
  }
  return {
    verdict: failed.length === 0 ? "pass" : "fail",
    failed,
    checks: card.checks,
    claims: claimsFor(input.answer, sources),
    voice,
    engine: ENGINE,
  };
}

export { checkById as getCheck };
