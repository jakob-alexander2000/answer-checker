/**
 * Offline normalisation so the checks compare meaning a little more than spelling:
 * number words become numbers, inflected forms share a stem, a few plain-language
 * words map to the statute word, and negation is counted rather than matched.
 * No model, no network, deterministic.
 */
import { STOP } from "./text";

export function fold(text: string): string {
  return text.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");
}

/** Function words that carry no claim of their own, folded. Bound words are left to the Qualifier check. */
const EXTRA_STOP = [
  "ihnen", "ihre", "ihrem", "ihren", "ihrer", "ihres", "sein", "seine", "seinen", "seinem", "seiner", "seines",
  "sich", "dass", "daß", "schon", "noch", "erst", "dann", "dafur", "dazu", "dabei", "dagegen", "sowie", "bei",
  "nach", "vor", "ab", "um", "durch", "gegen", "zwischen", "wahrend", "wegen", "pro", "je", "gibt", "geben",
  "werden", "wurde", "worden", "wird", "lang", "lange", "jeder", "jede", "jedes", "jeden", "jedem", "dem", "denen",
  "deren", "dessen", "welche", "welcher", "hier", "dort", "also", "zwar", "aber", "jedoch", "sondern", "nur",
  "mindestens", "wenigstens", "zumindest", "hochstens", "maximal", "spatestens", "fruhestens", "mehr", "weniger",
  "langer", "kurzer", "innerhalb", "bis", "uber", "unter", "als", "insgesamt", "jeweils", "mal",
  "wenn", "falls", "soweit", "sofern", "solange", "sobald", "ausser", "es", "sei", "denn",
  "ihn", "ihm", "uns", "euch", "mir", "mich", "dir", "dich", "selbst", "selber", "vorher", "zuvor", "bereits", "at", "least", "most", "up", "more", "less", "than", "within", "only", "unless", "except", "if",
];
export const STOP_FOLDED = new Set([...[...STOP].map(fold), ...EXTRA_STOP]);

const ZU_INFIX = /^(ab|an|auf|aus|bei|ein|fest|frei|her|hin|mit|nach|uber|um|vor|weiter|zuruck|zu)zu(\p{L}{4,})$/u;

/** A light German stemmer (in the spirit of CISTEM). It also leaves most English words comparable. */
export function stem(word: string): string {
  let w = fold(word);
  if (/^\d/.test(w)) return w;
  const infix = w.match(ZU_INFIX);
  if (infix?.[1] && infix[2]) w = infix[1] + infix[2];
  for (let i = 0; i < 3; i += 1) {
    if (w.length > 6 && w.endsWith("ung")) w = w.slice(0, -3);
    else if (w.length > 5 && /(?:em|er|nd|en|es)$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 4 && /[enst]$/.test(w)) w = w.slice(0, -1);
    else break;
  }
  return w;
}

// ---------------------------------------------------------------- numbers

const ONES: Record<string, number> = {
  null: 0, eins: 1, zwei: 2, drei: 3, vier: 4, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9,
  zehn: 10, elf: 11, zwolf: 12, dreizehn: 13, vierzehn: 14, funfzehn: 15, sechzehn: 16,
  siebzehn: 17, achtzehn: 18, neunzehn: 19,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  zwanzig: 20, dreissig: 30, vierzig: 40, funfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const ORDINALS: Record<string, number> = {
  erst: 1, zweit: 2, dritt: 3, viert: 4, funft: 5, sechst: 6, siebt: 7, acht: 8, neunt: 9, zehnt: 10,
  elft: 11, zwolft: 12, first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, twelfth: 12,
};
const ARTICLE_ONE = new Set(["ein", "eine", "einen", "einem", "einer", "eines", "a", "an", "one"]);

/** The value of a folded number word, or null. "vierundzwanzig" → 24. */
export function wordValue(folded: string): number | null {
  if (folded in ONES) return ONES[folded] ?? null;
  if (folded in TENS) return TENS[folded] ?? null;
  if (folded === "hundert" || folded === "hundred") return 100;
  const compound = folded.match(/^(\w+?)und(\w+)$/);
  if (compound?.[1] && compound[2]) {
    const one = compound[1] === "ein" ? 1 : ONES[compound[1]];
    const ten = TENS[compound[2]];
    if (one !== undefined && ten !== undefined) return one + ten;
  }
  return null;
}

function digitValue(raw: string): number | null {
  if (!/^\d/.test(raw)) return null;
  let text = raw;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text)) text = text.replace(/\./g, "").replace(",", ".");
  else if (/^\d+,\d+$/.test(text)) text = text.replace(",", ".");
  else if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text)) text = text.replace(/,/g, "");
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export type Bound = "min" | "max" | "gt" | "lt" | "deadline";

export type Quantity = {
  value: number;
  /** Stem of the unit word ("woche", "stund", "werktag", "euro", "mal", "uhr"), or null. */
  unit: string | null;
  bound: Bound | null;
  start: number;
  end: number;
  text: string;
};

const BOUNDS: [RegExp, Bound][] = [
  [/(?:mindestens|wenigstens|zumindest|minimum|at least|no less than|not less than|nicht weniger als)$/, "min"],
  [/(?:hochstens|maximal|bis zu|up to|no more than|not more than|at most|nicht mehr als|nicht langer als|allenfalls)$/, "max"],
  [/(?:mehr als|langer als|uber|more than|longer than|over)$/, "gt"],
  [/(?:weniger als|kurzer als|unter|less than|fewer than|under)$/, "lt"],
  // "innerhalb von" is left out on purpose: "innerhalb von vier Wochen" and "vier Wochen" read the same.
  [/(?:spatestens|fruhestens|no later than)$/, "deadline"],
];
const FILLER = new Set(["ein", "eine", "einen", "einem", "einer", "aber", "jedoch", "insgesamt", "jeweils", "auch", "nur", "noch", "nach", "der", "die", "das", "den", "dem", "des", "but", "only", "of", "the"]);
const REF_WORDS = new Set(["§", "abs", "absatz", "nr", "nummer", "satz", "art", "artikel", "buchst", "kapitel", "section", "article", "§§"]);
const NOT_A_UNIT = new Set(["und", "oder", "als", "bis", "statt", "pro", "je", "and", "or", "than", "to", "per", "a", "an", "the", "for", "fur"]);

const TIME_UNITS: Record<string, { unit: string; factor: number }> = {
  minut: { unit: "stund", factor: 1 / 60 },
  minute: { unit: "stund", factor: 1 / 60 },
  minuten: { unit: "stund", factor: 1 / 60 },
  minutes: { unit: "stund", factor: 1 / 60 },
  hour: { unit: "stund", factor: 1 },
  hours: { unit: "stund", factor: 1 },
  stund: { unit: "stund", factor: 1 },
  tag: { unit: "tag", factor: 1 },
  day: { unit: "tag", factor: 1 },
  days: { unit: "tag", factor: 1 },
  woch: { unit: "woche", factor: 1 },
  week: { unit: "woche", factor: 1 },
  weeks: { unit: "woche", factor: 1 },
  monat: { unit: "monat", factor: 1 },
  month: { unit: "monat", factor: 1 },
  months: { unit: "monat", factor: 1 },
  jahr: { unit: "monat", factor: 12 },
  year: { unit: "monat", factor: 12 },
  years: { unit: "monat", factor: 12 },
  times: { unit: "mal", factor: 1 },
  "€": { unit: "euro", factor: 1 },
  eur: { unit: "euro", factor: 1 },
  euro: { unit: "euro", factor: 1 },
  "%": { unit: "prozent", factor: 1 },
  prozent: { unit: "prozent", factor: 1 },
  percent: { unit: "prozent", factor: 1 },
};

function unitOf(word: string | undefined): { unit: string; factor: number } | null {
  if (!word) return null;
  const folded = fold(word);
  if (NOT_A_UNIT.has(folded) || STOP.has(word.toLowerCase())) return null;
  if (!/^[\p{L}€%]/u.test(word)) return null;
  const s = folded === "€" || folded === "%" ? folded : stem(folded);
  const known = TIME_UNITS[s] ?? TIME_UNITS[folded];
  if (known) return known;
  // Any other noun can be a unit ("15 Arbeitnehmer", "24 Werktage"); German nouns are capitalised.
  if (/^\p{Lu}/u.test(word)) return { unit: canon(s), factor: 1 };
  return null;
}

/** Units match if they share a stem or one is a compound ending in the other ("schwangerschaftswoch" and "woch"). */
export function sameUnit(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return true;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 3 && (long.endsWith(short) || long.startsWith(short));
}

function sameValue(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

export function sameQuantity(a: Quantity, b: Quantity): boolean {
  return sameValue(a.value, b.value) && sameUnit(a.unit, b.unit);
}

type Word = { raw: string; folded: string; start: number; end: number };

function words(text: string): Word[] {
  const out: Word[] = [];
  for (const m of text.matchAll(/\d+(?:[.,]\d+)*|[\p{L}]+|€|%|§§?/gu)) {
    const start = m.index ?? 0;
    out.push({ raw: m[0], folded: fold(m[0]), start, end: start + m[0].length });
  }
  return out;
}

const FRACTION_WORDS: Record<string, number> = { halbe: 0.5, halben: 0.5, halber: 0.5, halbes: 0.5, half: 0.5 };
const COMPOUND_NUMBER = /^(\p{L}+?)(mal|malig\p{L}*|monatig\p{L}*|wochig\p{L}*|tagig\p{L}*|jahrig\p{L}*|stundig\p{L}*)$/u;

/** Every number in the text, with the unit after it and any bound word before it. */
export function quantities(text: string): Quantity[] {
  const list = words(text);
  const found: Quantity[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const word = list[i]!;
    const prev = list[i - 1];
    if (prev && REF_WORDS.has(prev.folded)) continue;
    let value: number | null = null;
    let unitWord: string | undefined;
    let last = i;
    let unit: { unit: string; factor: number } | null = null;

    const viertel = word.folded.match(/^(drei)?viertelstunde\p{L}*$/u);
    if (viertel) {
      value = viertel[1] ? 0.75 : 0.25;
      unit = { unit: "stund", factor: 1 };
    } else if (/^\d/.test(word.folded) && !word.folded.includes(":")) {
      value = digitValue(word.folded);
    } else if (wordValue(word.folded) !== null) {
      value = wordValue(word.folded);
    } else if (ARTICLE_ONE.has(word.folded)) {
      const next = list[i + 1];
      if (next && FRACTION_WORDS[next.folded] !== undefined) {
        value = FRACTION_WORDS[next.folded]!;
        last = i + 1;
      } else {
        const u = unitOf(next?.raw);
        if (!next || !u || !(u.unit in UNIT_NAMES)) continue;
        value = 1;
      }
    } else {
      const compound = word.folded.match(COMPOUND_NUMBER);
      const head = compound?.[1];
      const tail = compound?.[2];
      const n = head ? (wordValue(head) ?? (head === "ein" ? 1 : null)) : null;
      // "noch einmal", "nicht einmal" are idioms; "einmal täglich" is a count.
      const countWord = /^(?:taglich|wochentlich|monatlich|jahrlich|pro|je|im|in|am)$/;
      if (n !== null && tail && head === "ein" && tail === "mal" && !countWord.test(list[i + 1]?.folded ?? "")) continue;
      if (n !== null && tail) {
        value = n;
        const key = tail.startsWith("mal") ? "mal" : tail.replace(/ig\p{L}*$/u, "");
        unit = key === "mal" ? { unit: "mal", factor: 1 } : (TIME_UNITS[key === "wochig" || key === "woch" ? "woch" : key] ?? { unit: key, factor: 1 });
      } else {
        const ord = Object.entries(ORDINALS).find(([k]) => new RegExp(`^${k}(?:e|en|er|es|em)?$`).test(word.folded));
        const next = list[i + 1];
        const u = ord ? unitOf(next?.raw) : null;
        if (!ord || !u || u.unit === "mal") continue;
        value = ord[1];
        unit = { unit: `#${u.unit}`, factor: 1 };
        last = i + 1;
      }
    }
    if (value === null) continue;
    if (!unit) {
      unitWord = list[last + 1]?.raw;
      unit = unitOf(unitWord);
      if (unit) last += 1;
      else if (unitWord && /^\p{Ll}/u.test(unitWord) && !NOT_A_UNIT.has(fold(unitWord)) && /^\p{Lu}/u.test(list[last + 2]?.raw ?? "")) {
        // An adjective between number and noun: "zwölf aufeinanderfolgende Werktage".
        unit = unitOf(list[last + 2]?.raw);
        if (unit) last += 2;
      }
    }
    const begin = word.start;
    let boundStart = begin;
    let bound: Bound | null = null;
    // Look back over up to four words, skipping fillers, for a bound such as "mindestens".
    const back = list.slice(Math.max(0, i - 4), i);
    const tail = back.map((w) => w.folded).join(" ");
    const negated = tail.match(/nicht (mehr|langer|weniger|kurzer) als$/);
    if (negated?.[1]) {
      bound = ["mehr", "langer"].includes(negated[1]) ? "max" : "min";
      boundStart = back[back.length - 3]?.start ?? begin;
    }
    for (let k = back.length - 1; k >= 0 && !bound; k -= 1) {
      const phrase = back.slice(k).map((w) => w.folded).filter((w) => !FILLER.has(w)).join(" ");
      const hit = phrase ? BOUNDS.find(([re]) => re.test(phrase)) : undefined;
      if (hit) {
        bound = hit[1];
        boundStart = back[k]!.start;
        break;
      }
    }
    // "acht Stunden nicht überschreiten" is an upper bound written after the number.
    // "einen halben Tag oder mehr" is a lower bound written after the number.
    if (!bound && list[last + 1]?.folded === "oder" && /^(?:mehr|langer)$/.test(list[last + 2]?.folded ?? "")) bound = "min";
    if (!bound && list[last + 1]?.folded === "or" && list[last + 2]?.folded === "more") bound = "min";
    if (!bound) {
      for (let k = last + 1; k <= last + 4 && k + 1 < list.length; k += 1) {
        if (list[k]?.folded === "nicht" && /^(?:uberschr|ubersteig)/.test(list[k + 1]?.folded ?? "")) {
          bound = "max";
          break;
        }
        if (/^[.,;]$/.test(text.slice(list[k]!.end, list[k]!.end + 1))) break;
      }
    }
    const end = list[last]!.end;
    found.push({
      value: value * (unit?.factor ?? 1),
      unit: unit?.unit ?? null,
      bound,
      start: boundStart,
      end,
      text: text.slice(boundStart, end),
    });
    i = last;
  }
  return found;
}

const UNIT_NAMES: Record<string, true> = { stund: true, tag: true, woche: true, monat: true, jahr: true, euro: true, prozent: true, mal: true };

// ---------------------------------------------------------------- words

/**
 * Plain-language words that mean the same as the statute word. Kept short and general;
 * every group was added for a failure on the dev split of the bench, never the held-out split.
 */
export const SYNONYMS: readonly string[][] = [
  ["zulassig", "erlaubt", "statthaft", "gestattet", "allowed", "permitted"],
  ["erhalten", "bekommen", "gewahren", "kriegen"],
  ["arbeitsentgelt", "entgelt", "lohn", "gehalt", "vergutung", "bezahlung", "arbeitslohn"],
  ["entgeltfortzahlung", "lohnfortzahlung", "gehaltsfortzahlung"],
  ["unverzuglich", "sofort", "umgehend"],
  ["mitteilen", "sagen", "informieren", "melden"],
  ["bescheinigung", "attest", "krankschreibung"],
  ["arbeitsunfahig", "krank", "krankgeschrieben"],
  ["abgelten", "auszahlen", "ausbezahlen", "abgeltung", "auszahlung"],
  ["arbeitnehmer", "mitarbeiter", "mitarbeiterin", "mitarbeitende", "beschaftigte", "employee", "staff"],
  ["berufsausbildung", "ausbildung", "auszubildende", "azubi", "lehrling"],
  ["erforderlich", "notig", "notwendig", "erfordern"],
  ["beginn", "start", "anfang"],
  ["beendigung", "ende"],
];

/** Phrases replaced before tokenising, folded. */
const PHRASES: [RegExp, string][] = [
  [/\bam stuck\b|\bhintereinander\b|\bununterbrochen\b|\bohne unterbrechung\b/g, " zusammenhangend "],
  [/\barztliche[sn]? (?:attest|bescheinigung)\b|\barbeitsunfahigkeitsbescheinigung\b/g, " bescheinigung "],
  [/\bdreiviertelstunde\w*/g, " minuten "],
  [/\bviertelstunde\w*/g, " minuten "],
  [/\bhalbe stunde\b/g, " minuten "],
  [/\b(?:ein|zwei|drei|vier|funf|sechs|sieben|acht|neun|zehn|elf|zwolf)(monat|woch|tag|jahr|stund)ig\w*/g, " $1 "],
];

/** Words that flip a statement. Counted, not matched, so "nicht zulässig" equals "unzulässig". */
const NEGATORS = new Set(["nicht", "kein", "keine", "keinen", "keinem", "keiner", "keines", "nie", "niemals", "not", "never", "cannot", "no", "none", "nor"]);
/** Words that carry a negation and a meaning: "unzulässig" is "nicht" plus "zulässig". */
const NEGATED: Record<string, string> = {
  unzulassig: "zulassig",
  verboten: "zulassig",
  untersagt: "zulassig",
  ausgeschlossen: "zulassig",
  prohibited: "zulassig",
  forbidden: "zulassig",
};
/** Answer particles at the start of a sentence say yes or no to the question, not to the passage. */
const PARTICLE = /^\s*(?:ja|nein|yes|no|grundsatzlich|generell)\b[\s,.!:;-]*/i;

const CANON = new Map<string, string>();
for (const group of SYNONYMS) {
  const head = stem(group[0]!);
  for (const word of group) CANON.set(stem(word), head);
}

function canon(stemmed: string): string {
  return CANON.get(stemmed) ?? stemmed;
}

/**
 * How many negations the text carries (a leading Ja or Nein is ignored). With `about`, a "nicht" or "kein"
 * only counts when one of the next three content words is also in `about`, so a negation in a clause
 * the other text does not talk about is left out. Words like "unzulässig" always count.
 */
export function negations(text: string, about?: string): number {
  const list = words(fold(text).replace(PARTICLE, ""));
  const other = about === undefined ? null : normTokens(about);
  const otherSet = other ? new Set(other) : null;
  let count = 0;
  list.forEach((w, i) => {
    if (w.folded in NEGATED) {
      count += 1;
      return;
    }
    if (!NEGATORS.has(w.folded)) return;
    // "nicht mehr als", "nicht länger als", "nicht überschreiten" state a limit, which Qualifier compares.
    const after = list[i + 1]?.folded ?? "";
    if (/^(?:mehr|weniger|langer|kurzer|uber|unter|uberschreit\w*|ubersteig\w*)$/.test(after)) return;
    if (!other || !otherSet) {
      count += 1;
      return;
    }
    const next = list
      .slice(i + 1)
      .map((x) => x.folded)
      .filter((f) => !STOP_FOLDED.has(f) && !NEGATORS.has(f) && !ARTICLE_ONE.has(f))
      .slice(0, 3)
      .map((f) => canon(stem(f)));
    if (next.some((tok) => otherSet.has(tok) || compoundCovered(tok, otherSet, other))) count += 1;
  });
  return count;
}

/** Content tokens after folding, number words, synonyms and stemming. Negators are dropped. */
export function normTokens(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (tok: string) => {
    if (seen.has(tok)) return;
    seen.add(tok);
    out.push(tok);
  };
  let stripped = fold(text).replace(PARTICLE, "");
  for (const [re, to] of PHRASES) stripped = stripped.replace(re, to);
  for (const w of words(stripped)) {
    const f = w.folded;
    if (STOP_FOLDED.has(f) || NEGATORS.has(f) || ARTICLE_ONE.has(f)) continue;
    if (f.length < 2 && !/^\d/.test(f)) continue;
    if (f in NEGATED) {
      add(NEGATED[f]!);
      continue;
    }
    // Numbers are left to the Qualifier check, which compares them with their units and bounds.
    if (/^\d/.test(f) || wordValue(f) !== null) continue;
    add(canon(stem(f)));
  }
  return out;
}

function compoundCovered(tok: string, hay: Set<string>, hayList: string[]): boolean {
  if (/^\d/.test(tok) || tok.length < 4) return false;
  // Past participles ("geteil" for "teil") and un- adjectives ("unverschuld" for "verschuld").
  if ((tok.startsWith("ge") || tok.startsWith("un")) && tok.length > 5) {
    const bare = tok.slice(2);
    if (hay.has(bare) || hayList.some((h) => h.length >= 4 && (h.startsWith(bare) || bare.startsWith(h)))) return true;
  }
  // The answer word is part of a longer passage word ("pause" in "ruhepaus").
  if (hayList.some((h) => h.length > tok.length && h.length >= 6 && (h.endsWith(tok) || h.startsWith(tok)))) return true;
  // The answer word is a compound of passage words ("schwangerschaftsuntersuchung").
  // A linking s at the end: "vertrags" in "arbeitsvertrag".
  if (tok.endsWith("s") && tok.length > 5 && hayList.some((h) => h === tok.slice(0, -1) || (h.length > 5 && h.endsWith(tok.slice(0, -1))))) return true;
  for (let i = 4; i <= tok.length - 3; i += 1) {
    const left = tok.slice(0, i);
    let right = tok.slice(i);
    const leftOk = hayList.some(
      (h) => h.length >= 4 && (h === left || h.startsWith(left) || (left.startsWith(h) && left.length - h.length <= 2) || (left.length >= 5 && h.endsWith(left))),
    );
    if (!leftOk) continue;
    if (right.startsWith("s") && !hay.has(right)) right = right.slice(1);
    if (right.length < 3) continue;
    if (hay.has(right) || hayList.some((h) => h.length >= 4 && (h.startsWith(right) || h.endsWith(right) || right.startsWith(h)))) return true;
  }
  return false;
}

/** The needle's normalised tokens that the haystack does not cover. */
export function uncovered(needle: string, haystack: string): string[] {
  const hayList = normTokens(haystack);
  const hay = new Set(hayList);
  return normTokens(needle).filter((tok) => !hay.has(tok) && !compoundCovered(tok, hay, hayList));
}

/** Share of the needle's normalised tokens found in the haystack, 0 to 1. */
export function meaningCoverage(needle: string, haystack: string): number {
  const total = normTokens(needle).length;
  if (total === 0) return 1;
  return (total - uncovered(needle, haystack).length) / total;
}
