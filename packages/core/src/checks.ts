import { contentTokens, coverage, relevantSentences, splitSentences, SUPPORT_MIN } from "./text";

export type CheckId = "support" | "scope" | "qualifier" | "omission";
export type CheckStatus = "pass" | "fail";

export type Span = {
  where: "passage" | "answer" | "document";
  passageIndex: number;
  start: number;
  end: number;
  text: string;
};

export type CheckResult = {
  id: CheckId;
  status: CheckStatus;
  detail: string;
  spans: Span[];
};

export type ScoreCard = {
  checks: CheckResult[];
};

export type ScoreInput = {
  document: string;
  question: string;
  passages: string[];
  answer: string;
};

export const QUALIFIER_PATTERNS: readonly RegExp[] = [
  /full-time employees only/gi,
  /part-time employees only/gi,
  /after the probation period/gi,
  /during the probation period/gi,
  /€\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?/gi,
  /\b\d+(?:\.\d+)?\s+times\b/gi,
  /\bat least\s+\d+(?:\.\d+)?/gi,
  /\bno more than\s+\d+(?:\.\d+)?/gi,
  /\bup to\s+\d+(?:\.\d+)?/gi,
  /\b\d+(?:st|nd|rd|th)?\s+working\s+days?\b/gi,
  /\b\d+(?:\.\d+)?\s+(?:working\s+|calendar\s+)?(?:days|months|weeks|hours)\b/gi,
  /\b(?:[\p{L}-]+ )?(?:employees|staff|members|customers|users|workers) only\b/giu,
  // German
  /\bnach (?:der|dem|Ablauf der) Probezeit\b/giu,
  /\bwährend der Probezeit\b/giu,
  /\b(?:nur|ausschließlich) (?:für |an )?(?:die |den |der )?\p{Lu}[\p{L}-]*/gu,
  /\b(?:mindestens|höchstens|maximal|bis zu|spätestens|frühestens) \d+(?:[.,]\d+)?/giu,
  /\b\d{1,3}(?:\.\d{3})*(?:,\d+)?\s?(?:€|\bEuro\b|\bEUR\b)/gu,
  /\b\d+(?:,\d+)?\s+(?:Arbeitstage|Werktage|Urlaubstage|Kalendertage|Tage|Tagen|Wochen|Monate|Monaten|Stunden|Jahre|Jahren)\b/gu,
];

export const OMISSION_PATTERNS: readonly RegExp[] = [
  /\bunless\b[^.]*/gi,
  /\bexcept\b[^.]*/gi,
  /\bprovided that\b[^.]*/gi,
  /\bsubject to\b[^.]*/gi,
  /\bonly if\b[^.]*/gi,
  /\bonly when\b[^.]*/gi,
  /\bare not eligible\b[^.]*/gi,
  // German
  /\bes sei denn\b[^.]*/giu,
  /\baußer(?: wenn)?\b[^.]*/giu,
  /\bsofern\b[^.]*/giu,
  /\bvorausgesetzt\b[^.]*/giu,
  /\bausgenommen\b[^.]*/giu,
  /\bnur wenn\b[^.]*/giu,
  /\bnicht berechtigt\b[^.]*/giu,
  /\bkeinen anspruch\b[^.]*/giu,
];

const BROAD_PHRASES = [
  "everyone",
  "every employee",
  "every worker",
  "all employees",
  "all workers",
  "all staff",
  "alle mitarbeitenden",
  "alle mitarbeiter",
  "alle mitarbeiterinnen",
  "alle beschäftigten",
  "jeder mitarbeiter",
  "jede mitarbeiterin",
  "jede person",
];

type RawSpan = { text: string; start: number; end: number };

function fresh(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}

export function findSpans(text: string, patterns: readonly RegExp[]): RawSpan[] {
  const found: RawSpan[] = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(fresh(pattern))) {
      const value = match[0];
      const start = match.index ?? -1;
      if (!value || start < 0) continue;
      found.push({ text: value, start, end: start + value.length });
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: RawSpan[] = [];
  let cursor = -1;
  for (const span of found) {
    if (span.start < cursor) continue;
    kept.push(span);
    cursor = span.end;
  }
  return kept;
}

function containsPhrase(answer: string, phrase: string): boolean {
  return answer.toLowerCase().includes(phrase.toLowerCase());
}

function quoteList(spans: RawSpan[]): string {
  return spans.map((span) => `“${span.text.trim()}”`).join(" and ");
}

function sourceIndexes(answer: string, passages: string[]): number[] {
  const indexes = passages
    .map((passage, index) => ({ index, score: coverage(answer, passage) }))
    .filter((row) => row.score >= SUPPORT_MIN)
    .map((row) => row.index);
  if (indexes.length > 0) return indexes;
  return passages.length > 0 ? [0] : [];
}

function checkSupport(answer: string, passages: string[]): CheckResult {
  const sentences = splitSentences(answer);
  if (answer.trim() === "" || sentences.length === 0) {
    return {
      id: "support",
      status: "fail",
      detail: "There is no answer to check.",
      spans: [],
    };
  }
  const missing = sentences.filter(
    (sentence) => !passages.some((passage) => coverage(sentence, passage) >= SUPPORT_MIN),
  );
  if (missing.length === 0) {
    return {
      id: "support",
      status: "pass",
      detail: "Every sentence is made of words from a retrieved passage.",
      spans: [],
    };
  }
  const spans: Span[] = [];
  let from = 0;
  for (const sentence of missing) {
    const start = answer.indexOf(sentence, from);
    if (start < 0) continue;
    spans.push({
      where: "answer",
      passageIndex: -1,
      start,
      end: start + sentence.length,
      text: sentence,
    });
    from = start + sentence.length;
  }
  return {
    id: "support",
    status: "fail",
    detail: "A sentence is not in the retrieved passages.",
    spans,
  };
}

function isBroadened(answer: string): boolean {
  const lowered = answer.toLowerCase();
  for (const phrase of BROAD_PHRASES) {
    let start = 0;
    while (start < lowered.length) {
      const index = lowered.indexOf(phrase, start);
      if (index < 0) break;
      const before = lowered.slice(0, index);
      if (!before.endsWith("not ") && !before.endsWith("nicht ")) return true;
      start = index + phrase.length;
    }
  }
  return false;
}

function checkScope(document: string, answer: string, passages: string[]): CheckResult {
  const pass: CheckResult = {
    id: "scope",
    status: "pass",
    detail: "The answer stays inside who the handbook is for.",
    spans: [],
  };
  const only = document.match(/(?:applies only to|gilt nur für) [^.]+\./i);
  if (!only || only.index === undefined) return pass;
  const who = only[0].replace(/^(?:applies only to|gilt nur für)\s+/i, "").replace(/\.$/, "");
  const required = contentTokens(who);
  const answerTokens = new Set(contentTokens(answer));
  const restated = /\b(?:applies to|gilt für)\b/i.test(answer) && !/\b(?:only|nur)\b/i.test(answer);
  const widened = isBroadened(answer) || (restated && required.some((tok) => !answerTokens.has(tok)));
  const excluded = excludedClaim(document, answer);
  if (!widened && !excluded) return pass;
  const located = locate(passages, only[0]);
  const span: Span = located
    ? {
        where: "passage",
        passageIndex: located.passageIndex,
        start: located.start,
        end: located.end,
        text: passages[located.passageIndex]?.slice(located.start, located.end) ?? only[0],
      }
    : {
        where: "document",
        passageIndex: -1,
        start: only.index,
        end: only.index + only[0].length,
        text: only[0],
      };
  return {
    id: "scope",
    status: "fail",
    detail: "The answer widens who this is for.",
    spans: [span],
  };
}

function excludedClaim(document: string, answer: string): boolean {
  const match = document.match(/(?:does not apply to|gilt nicht für) ([^.]+)/i);
  if (!match?.[1]) return false;
  if (/\b(not eligible|not entitled|not included|not covered|does not apply|are not|is not|nicht|kein|keine|keinen)\b/i.test(answer)) {
    return false;
  }
  const groups = match[1]
    .split(/,|\bor\b|\boder\b|\bund\b/i)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 2);
  const lowered = answer.toLowerCase();
  return groups.some((group) => {
    if (!lowered.includes(group)) return false;
    return /\b(eligible|entitled|included|covered|receive|receives|get|gets|erhalten|erhält|bekommen|bekommt|berechtigt|anspruch)\b/i.test(answer);
  });
}

function locate(
  passages: string[],
  needle: string,
): { passageIndex: number; start: number; end: number } | null {
  const wanted = needle.toLowerCase();
  for (let index = 0; index < passages.length; index += 1) {
    const hay = passages[index]?.toLowerCase() ?? "";
    const start = hay.indexOf(wanted);
    if (start >= 0) return { passageIndex: index, start, end: start + needle.length };
  }
  return null;
}

function checkKept(
  id: "qualifier" | "omission",
  question: string,
  passages: string[],
  answer: string,
  patterns: readonly RegExp[],
  passDetail: string,
): CheckResult {
  const indexes = sourceIndexes(answer, passages);
  const missing: Span[] = [];
  for (const index of indexes) {
    const passage = passages[index] ?? "";
    for (const sentence of relevantSentences(question, passage)) {
      for (const span of findSpans(sentence.text, patterns)) {
        if (containsPhrase(answer, span.text)) continue;
        const start = sentence.start + span.start;
        const end = sentence.start + span.end;
        missing.push({
          where: "passage",
          passageIndex: index,
          start,
          end,
          text: passage.slice(start, end),
        });
      }
    }
  }
  if (missing.length === 0) {
    return { id, status: "pass", detail: passDetail, spans: [] };
  }
  return {
    id,
    status: "fail",
    detail: `The answer drops ${quoteList(missing)}.`,
    spans: missing,
  };
}

export function scoreAnswer(input: ScoreInput): ScoreCard {
  const { document, question, passages, answer } = input;
  return {
    checks: [
      checkSupport(answer, passages),
      checkScope(document, answer, passages),
      checkKept(
        "qualifier",
        question,
        passages,
        answer,
        QUALIFIER_PATTERNS,
        "The limits in the passage are still in the answer.",
      ),
      checkKept(
        "omission",
        question,
        passages,
        answer,
        OMISSION_PATTERNS,
        "No condition that would change the result was dropped.",
      ),
    ],
  };
}

export function checkById(card: ScoreCard, id: CheckId): CheckResult {
  const found = card.checks.find((check) => check.id === id);
  if (!found) throw new Error(`Missing check ${id}`);
  return found;
}
