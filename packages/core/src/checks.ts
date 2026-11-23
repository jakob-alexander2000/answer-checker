import { contentTokens, relevantSentences, sentenceSpans, splitSentences, SUPPORT_MIN } from "./text";
import { meaningCoverage, negations, normTokens, quantities, sameQuantity, type Bound, type Quantity } from "./normalize";

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
  /\bunless\b(?:[^.]|(?<=\d)\.)*/gi,
  /\bexcept\b(?:[^.]|(?<=\d)\.)*/gi,
  /\bprovided that\b(?:[^.]|(?<=\d)\.)*/gi,
  /\bsubject to\b(?:[^.]|(?<=\d)\.)*/gi,
  /\bonly if\b(?:[^.]|(?<=\d)\.)*/gi,
  /\bonly when\b(?:[^.]|(?<=\d)\.)*/gi,
  /\bare not eligible\b(?:[^.]|(?<=\d)\.)*/gi,
  // German
  /\bes sei denn\b(?:[^.]|(?<=\d)\.)*/giu,
  /\baußer(?: wenn)?\b(?:[^.]|(?<=\d)\.)*/giu,
  /\bsofern\b(?:[^.]|(?<=\d)\.)*/giu,
  /\bvorausgesetzt\b(?:[^.]|(?<=\d)\.)*/giu,
  /\bausgenommen\b(?:[^.]|(?<=\d)\.)*/giu,
  /\bnur wenn\b(?:[^.]|(?<=\d)\.)*/giu,
  /\bnicht berechtigt\b(?:[^.]|(?<=\d)\.)*/giu,
  /\bsoweit\b(?:[^.,;]|(?<=\d)\.)*/giu,
  /\bwenn\b(?:[^.,;]|(?<=\d)\.)*/giu,
  /\bfalls\b(?:[^.,;]|(?<=\d)\.)*/giu,
  /\bohne da(?:ss|ß)(?!\p{L})(?:[^.,;]|(?<=\d)\.)*/giu,
  // A condition written verb-first, closed by "so": "hat der Arbeitnehmer Anspruch auf ..., so muss ...".
  /\b(?:hat|haben|ist|sind|wird|werden|kann|können|besteht|bestehen)\s+(?:der|die|das|ein|eine|einer|dem|den)\s[^,.]*(?=,\s*so\b)/giu,
  /\bsolange\b(?:[^.,;]|(?<=\d)\.)*/giu,
  /\bkeinen anspruch\b(?:[^.]|(?<=\d)\.)*/giu,
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
    .map((passage, index) => ({ index, score: meaningCoverage(answer, passage) }))
    .filter((row) => row.score >= SUPPORT_MIN)
    .map((row) => row.index);
  if (indexes.length > 0) return indexes;
  return passages.length > 0 ? [0] : [];
}

function clauses(text: string): string[] {
  return text
    .split(/[,;:]|\s(?:und|aber|sondern|and|but)\s/u)
    .map((part) => part.trim())
    .filter((part) => normTokens(part).length >= 2);
}

/**
 * A clause of the answer that says the same thing as a clause of a passage, with the negation flipped:
 * "ist zulässig" against "ist unzulässig". Compared clause by clause, so a "nicht" in a part of the
 * passage the answer does not talk about is left alone.
 */
function reversedClause(sentence: string, passages: string[], question: string): boolean {
  const theirs = passages.flatMap((passage) => sentenceSpans(passage).flatMap((span) => clauses(span.text)));
  for (const mine of clauses(sentence)) {
    if (normTokens(mine).length < 2) continue;
    let best: string | null = null;
    let bestScore = 0;
    for (const clause of theirs) {
      const score = Math.min(meaningCoverage(mine, `${clause}\n${question}`), meaningCoverage(clause, mine) + 0.2);
      if (score > bestScore) {
        best = clause;
        bestScore = score;
      }
    }
    if (!best || bestScore < 0.6) continue;
    if (negations(mine, best) % 2 !== negations(best, mine) % 2) return true;
  }
  return false;
}

/** Why a sentence is not supported, or null when it is. */
function unsupported(sentence: string, passages: string[], question: string): "words" | "reversed" | null {
  // Words the user used in the question count as grounded: restating the question is not a claim.
  const covered = passages.some((passage) => meaningCoverage(sentence, `${passage}\n${question}`) >= SUPPORT_MIN);
  if (!covered) return "words";
  return reversedClause(sentence, passages, question) ? "reversed" : null;
}

function checkSupport(answer: string, passages: string[], question: string): CheckResult {
  const sentences = splitSentences(answer);
  if (answer.trim() === "" || sentences.length === 0) {
    return {
      id: "support",
      status: "fail",
      detail: "There is no answer to check.",
      spans: [],
    };
  }
  const missing = sentences
    .map((sentence) => ({ sentence, why: unsupported(sentence, passages, question) }))
    .filter((row) => row.why !== null);
  if (missing.length === 0) {
    return {
      id: "support",
      status: "pass",
      detail: "Every sentence says what a retrieved passage says.",
      spans: [],
    };
  }
  const spans: Span[] = [];
  let from = 0;
  for (const { sentence } of missing) {
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
  const reversed = missing.every((row) => row.why === "reversed");
  return {
    id: "support",
    status: "fail",
    detail: reversed ? "A sentence says the opposite of the passage." : "A sentence is not in the retrieved passages.",
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

function passageSpan(passage: string, index: number, start: number, end: number): Span {
  return { where: "passage", passageIndex: index, start, end, text: passage.slice(start, end) };
}

/** A bound in the answer keeps the passage's bound unless it says the opposite. */
function boundKept(want: Bound | null, have: Bound | null): boolean {
  if (want === null) return true;
  if (have === null) return false;
  // "spätestens" and "innerhalb" read as either side ("spätestens einen Monat vorher" is "mindestens einen Monat vorher").
  return want === have || want === "deadline" || have === "deadline";
}

/** Non-numeric qualifiers ("nach der Probezeit", "full-time employees only") are kept if their meaning is. */
function phraseKept(answer: string, phrase: string): boolean {
  return containsPhrase(answer, phrase) || meaningCoverage(phrase, answer) >= 0.99;
}

function checkQualifier(question: string, passages: string[], answer: string): CheckResult {
  const indexes = sourceIndexes(answer, passages);
  const missing: Span[] = [];
  const said = quantities(answer);
  for (const index of indexes) {
    const passage = passages[index] ?? "";
    for (const sentence of relevantSentences(question, passage)) {
      for (const span of findSpans(sentence.text, QUALIFIER_PATTERNS)) {
        if (/\d/.test(span.text)) continue; // numbers are compared as quantities below
        if (phraseKept(answer, span.text)) continue;
        missing.push(passageSpan(passage, index, sentence.start + span.start, sentence.start + span.end));
      }
      // A sentence that lists cases ("30 Minuten bei ... und 45 Minuten bei ...") is split into clauses.
      // When the answer talks about some clauses, only their limits are required; otherwise all of them.
      const found = quantities(sentence.text);
      const cuts = [...sentence.text.matchAll(/[,;]| und | oder | and | or /g)].map((m) => m.index ?? 0);
      const clauseOf = (q: Quantity) => cuts.filter((cut) => cut < q.start).length;
      const touched = new Set(found.filter((q) => said.some((a) => sameQuantity(a, q) && boundKept(q.bound, a.bound))).map(clauseOf));
      // Limits inside a condition ("hat er Anspruch auf mehr als zwölf Werktage, so ...") are always required.
      const conditions = findSpans(sentence.text, OMISSION_PATTERNS);
      const inCondition = (q: Quantity) => conditions.some((c) => q.start >= c.start && q.end <= c.end);
      const required = touched.size > 0 ? found.filter((q) => touched.has(clauseOf(q)) || inCondition(q)) : found;
      for (const q of required) {
        const match = said.filter((a) => sameQuantity(a, q));
        if (match.length > 0 && match.some((a) => boundKept(q.bound, a.bound))) continue;
        missing.push(passageSpan(passage, index, sentence.start + q.start, sentence.start + q.end));
      }
    }
  }
  // A number the answer gives that no passage or the question gives is a changed limit.
  const known: Quantity[] = [...passages.flatMap((p) => quantities(p)), ...quantities(question)];
  const invented: Span[] = said
    .filter((a) => !known.some((k) => sameQuantity(a, k)))
    .map((a) => ({ where: "answer", passageIndex: -1, start: a.start, end: a.end, text: a.text }));
  if (missing.length === 0 && invented.length === 0) {
    return { id: "qualifier", status: "pass", detail: "The limits in the passage are still in the answer.", spans: [] };
  }
  const detail =
    missing.length > 0
      ? `The answer drops ${quoteList(missing)}.`
      : `The answer gives ${quoteList(invented)}, which no passage says.`;
  return { id: "qualifier", status: "fail", detail, spans: [...missing, ...invented] };
}

const CONDITION_MARKERS =
  /\b(?:unless|except|provided|subject to|only|if|as long as|not|es sei denn|außer|ausser|sofern|soweit|vorausgesetzt|ausgenommen|nur|wenn|falls|solange|nicht|kein\w*)\b/iu;
const MARKER_WORDS =
  /\b(?:ohne da(?:ss|ß)(?!\p{L})|hat|haben|ist|sind|wird|werden|kann|können|besteht|bestehen|unless|except|provided that|subject to|only if|only when|es sei denn|daß(?!\p{L})|dass|außer(?: wenn)?|sofern|soweit|vorausgesetzt|ausgenommen|nur wenn|wenn|falls|solange)\b/giu;

/** A condition is kept if the answer still states a condition and most of what it is about. */
/** German puts the verb first in a condition without a conjunction: "Sind Sie krank, ...". */
const VERB_FIRST = /(?:^|[.!?]\s+)(?:ist|sind|hat|haben|wird|werden|kann|können|muss|müssen|darf|dürfen|soll|sollen|steht|stehen|besteht|bestehen|gibt|liegt|liegen|dauert)\s[^.?!]*,/iu;

const VERB_FIRST_CONDITION = /^(?:hat|haben|ist|sind|wird|werden|kann|können|besteht|bestehen)\s/iu;

function conditionKept(answer: string, condition: string): boolean {
  if (containsPhrase(answer, condition)) return true;
  const body = condition.replace(MARKER_WORDS, " ");
  if (normTokens(body).length === 0) return true; // a cut-off "wenn" with nothing after it
  // A verb-first condition names the situation; restating the situation in any form keeps it.
  if (VERB_FIRST_CONDITION.test(condition.trim())) return meaningCoverage(body, answer) >= 0.5;
  if (!CONDITION_MARKERS.test(answer) && !VERB_FIRST.test(answer) && !/\bun\p{L}{5,}/u.test(answer)) return false;
  return meaningCoverage(body, answer) >= 0.4;
}

function checkOmission(question: string, passages: string[], answer: string): CheckResult {
  const indexes = sourceIndexes(answer, passages);
  const missing: Span[] = [];
  for (const index of indexes) {
    const passage = passages[index] ?? "";
    for (const sentence of relevantSentences(question, passage)) {
      for (const span of findSpans(sentence.text, OMISSION_PATTERNS)) {
        if (conditionKept(answer, span.text)) continue;
        missing.push(passageSpan(passage, index, sentence.start + span.start, sentence.start + span.end));
      }
    }
  }
  if (missing.length === 0) {
    return { id: "omission", status: "pass", detail: "No condition that would change the result was dropped.", spans: [] };
  }
  return { id: "omission", status: "fail", detail: `The answer drops ${quoteList(missing)}.`, spans: missing };
}

export function scoreAnswer(input: ScoreInput): ScoreCard {
  const { document, question, passages, answer } = input;
  return {
    checks: [
      checkSupport(answer, passages, question),
      checkScope(document, answer, passages),
      checkQualifier(question, passages, answer),
      checkOmission(question, passages, answer),
    ],
  };
}

export function checkById(card: ScoreCard, id: CheckId): CheckResult {
  const found = card.checks.find((check) => check.id === id);
  if (!found) throw new Error(`Missing check ${id}`);
  return found;
}
