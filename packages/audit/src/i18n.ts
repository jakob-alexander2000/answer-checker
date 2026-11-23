import type { CheckId } from "@answer-checker/core";
import type { FixKind, Lang, ReviewStatus, Severity } from "./audit";

type Strings = {
  kind: string;
  summary: string;
  findings: string;
  fixes: string;
  method: string;
  limits: string;
  client: string;
  bot: string;
  date: string;
  engine: string;
  reviewer: string;
  answers: string;
  passed: string;
  flagged: string;
  confirmed: string;
  dismissed: string;
  pending: string;
  missed: string;
  precision: string;
  question: string;
  answer: string;
  source: string;
  review: string;
  affects: (n: number) => string;
  noFindings: string;
  missedTitle: string;
  severity: Record<Severity, string>;
  status: Record<ReviewStatus, string>;
  check: Record<CheckId | "reversed", string>;
  fix: Record<FixKind, { title: string; action: string }>;
  methodText: (engine: string) => string[];
  benchmarkText: (b: { name: string; questions: number; caught: number; drifted: number; precision: number }) => string;
  limitsText: string[];
  reviewNote: (precision: number | null, reviewed: number) => string;
  /** One line per failed check, in the report's language. */
  explain: {
    support: string;
    reversed: string;
    scope: string;
    dropped: (quotes: string) => string;
    invented: (quotes: string) => string;
  };
  quote: (text: string) => string;
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

const DE: Strings = {
  explain: {
    support: "Ein Satz steht in keiner abgerufenen Passage.",
    reversed: "Ein Satz sagt das Gegenteil der Quelle.",
    scope: "Die Antwort erweitert, für wen die Regel gilt.",
    dropped: (q) => `Die Antwort lässt ${q} weg.`,
    invented: (q) => `Die Antwort nennt ${q}, das in keiner Quelle steht.`,
  },
  quote: (text) => `„${text}“`,
  kind: "Antwort-Audit",
  summary: "Ergebnis",
  findings: "Befunde",
  fixes: "Was zu ändern ist",
  method: "Methode",
  limits: "Grenzen",
  client: "Auftraggeber",
  bot: "System",
  date: "Datum",
  engine: "Prüfwerkzeug",
  reviewer: "Geprüft von",
  answers: "Antworten geprüft",
  passed: "ohne Befund",
  flagged: "vom Werkzeug markiert",
  confirmed: "bestätigt",
  dismissed: "verworfen (Fehlalarm)",
  pending: "noch nicht geprüft",
  missed: "in der Stichprobe gefunden",
  precision: "Trefferquote der Markierungen",
  question: "Frage",
  answer: "Antwort",
  source: "Quelle",
  review: "Prüfung",
  affects: (n) => (n === 1 ? "1 Antwort" : `${n} Antworten`),
  noFindings: "Keine Antwort wurde markiert.",
  missedTitle: "Vom Werkzeug übersehen, bei der Prüfung gefunden",
  severity: { high: "Hoch", medium: "Mittel" },
  status: { pending: "offen", confirmed: "bestätigt", dismissed: "verworfen" },
  check: {
    support: "Ohne Quelle",
    reversed: "Widerspricht der Quelle",
    scope: "Geltungsbereich",
    qualifier: "Grenze oder Zahl",
    omission: "Bedingung fehlt",
  },
  fix: {
    reversed: {
      title: "Antworten, die der Quelle widersprechen",
      action:
        "Die Antwort sagt das Gegenteil der Quelle. Verneinungen wie „nicht“, „kein“ oder „unzulässig“ gehen beim Umformulieren verloren. Im System-Prompt verlangen, dass Ge- und Verbote im Wortlaut der Quelle wiedergegeben werden, und diese Fragen nach der Änderung erneut prüfen.",
    },
    qualifier: {
      title: "Zahlen, Fristen und Grenzen",
      action:
        "Zahlen und ihre Grenzwörter („mindestens“, „bis zu“, „spätestens“) wörtlich aus der Quelle übernehmen lassen. Wo das System rechnet oder rundet, die Zahl der Quelle mit angeben.",
    },
    omission: {
      title: "Weggelassene Bedingungen und Ausnahmen",
      action:
        "Regeln nur zusammen mit ihrer Bedingung ausgeben („es sei denn“, „soweit“, „wenn“). Wenn Antworten kurz sein sollen, lieber auf die Quelle verweisen als die Bedingung streichen.",
    },
    scope: {
      title: "Geltungsbereich erweitert",
      action:
        "Der Abschnitt, für wen eine Regel gilt, steht oft nicht in der abgerufenen Passage. Ihn bei jedem Abruf aus diesem Dokument mitgeben, und breite Formulierungen wie „alle“ prüfen.",
    },
    support: {
      title: "Sätze ohne Quelle",
      action:
        "Diese Sätze stehen in keiner abgerufenen Passage. Entweder findet der Abruf die richtige Stelle nicht, oder das Modell ergänzt. Abruf für diese Fragen prüfen und das System anweisen, bei fehlender Quelle das zu sagen statt zu ergänzen.",
    },
    missed: {
      title: "Bei der Prüfung gefunden",
      action: "Diese Antworten hat das Werkzeug nicht markiert. Sie werden in den Testsatz für die nächste Prüfung aufgenommen.",
    },
  },
  methodText: (engine) => [
    `Jede Antwort wurde mit ${engine} gegen die Passagen geprüft, aus denen das System geantwortet hat. Das Werkzeug läuft ohne Sprachmodell und ohne Netz, das Ergebnis ist bei gleicher Eingabe immer gleich.`,
    "Vier Prüfungen: Steht jeder Satz in einer Quelle (und sagt er nicht das Gegenteil)? Bleibt der Geltungsbereich gleich? Sind Zahlen, Fristen und Grenzen erhalten? Fehlt keine Bedingung oder Ausnahme?",
    "Jeder markierte Befund wurde danach von einem Menschen gelesen und bestätigt oder als Fehlalarm verworfen. Nur bestätigte und offene Befunde gehen in die Liste der Änderungen ein.",
  ],
  benchmarkText: (b) =>
    `Auf dem öffentlichen Testsatz „${b.name}“ (${b.questions} zurückgehaltene Fragen) erkennt das Werkzeug ${b.caught} von ${b.drifted} falschen Antworten. Eine Markierung ist dort in ${pct(b.precision)} der Fälle richtig. Deshalb wird jeder Befund von einem Menschen geprüft.`,
  limitsText: [
    "Geprüft wird, ob die Antwort zu ihren Quellen passt. Ob die Quellen selbst richtig, aktuell oder die besten sind, wird nicht geprüft.",
    "Das Werkzeug vergleicht normalisierte Wörter, nicht Bedeutung. Eine falsche Antwort, die nur ein Verb austauscht, kann unbemerkt bleiben. Die Stichprobe fängt einen Teil davon auf, nicht alles.",
    "Dieser Bericht ist keine Rechtsberatung.",
  ],
  reviewNote: (precision, reviewed) =>
    reviewed === 0
      ? "Die Befunde sind noch nicht von einem Menschen geprüft."
      : `Von ${reviewed} geprüften Markierungen waren ${pct(precision ?? 0)} echte Probleme.`,
};

const EN: Strings = {
  explain: {
    support: "A sentence is in no retrieved passage.",
    reversed: "A sentence says the opposite of the source.",
    scope: "The answer widens who the rule is for.",
    dropped: (q) => `The answer drops ${q}.`,
    invented: (q) => `The answer gives ${q}, which no source says.`,
  },
  quote: (text) => `“${text}”`,
  kind: "Answer audit",
  summary: "Result",
  findings: "Findings",
  fixes: "What to change",
  method: "Method",
  limits: "Limits",
  client: "Client",
  bot: "System",
  date: "Date",
  engine: "Checker",
  reviewer: "Reviewed by",
  answers: "answers checked",
  passed: "passed",
  flagged: "flagged by the checker",
  confirmed: "confirmed",
  dismissed: "dismissed (false alarm)",
  pending: "not reviewed yet",
  missed: "found on spot check",
  precision: "flags that were right",
  question: "Question",
  answer: "Answer",
  source: "Source",
  review: "Review",
  affects: (n) => (n === 1 ? "1 answer" : `${n} answers`),
  noFindings: "No answer was flagged.",
  missedTitle: "Missed by the checker, found in review",
  severity: { high: "High", medium: "Medium" },
  status: { pending: "open", confirmed: "confirmed", dismissed: "dismissed" },
  check: {
    support: "No source",
    reversed: "Contradicts the source",
    scope: "Scope",
    qualifier: "Limit or number",
    omission: "Condition dropped",
  },
  fix: {
    reversed: {
      title: "Answers that contradict the source",
      action:
        "The answer says the opposite of the source. Negations such as \"not\", \"no\" or \"prohibited\" get lost in rephrasing. Ask in the system prompt for rules and prohibitions in the source's wording, and recheck these questions after the change.",
    },
    qualifier: {
      title: "Numbers, deadlines and limits",
      action:
        "Have numbers and their bound words (\"at least\", \"up to\", \"no later than\") taken word for word from the source. Where the system calculates or rounds, give the source's number too.",
    },
    omission: {
      title: "Dropped conditions and exceptions",
      action:
        "Give a rule only with its condition (\"unless\", \"provided that\", \"if\"). If answers must be short, point to the source rather than cut the condition.",
    },
    scope: {
      title: "Scope widened",
      action:
        "The section saying who a rule is for is often not in the retrieved passage. Pass it along with every retrieval from that document, and check broad wording such as \"everyone\".",
    },
    support: {
      title: "Sentences with no source",
      action:
        "These sentences are in no retrieved passage. Either retrieval misses the right place, or the model fills in. Check retrieval for these questions and tell the system to say so when it has no source, instead of filling in.",
    },
    missed: {
      title: "Found in review",
      action: "The checker did not flag these answers. They go into the test set for the next audit.",
    },
  },
  methodText: (engine) => [
    `Every answer was checked with ${engine} against the passages the system answered from. The checker uses no language model and no network, and gives the same result for the same input.`,
    "Four checks: is every sentence in a source (and not its opposite)? Does the scope stay the same? Are numbers, deadlines and limits kept? Is no condition or exception dropped?",
    "A person then read every flagged finding and confirmed it or dismissed it as a false alarm. Only confirmed and open findings go into the list of changes.",
  ],
  benchmarkText: (b) =>
    `On the public test set "${b.name}" (${b.questions} held-out questions) the checker catches ${b.caught} of ${b.drifted} wrong answers. A flag there is right ${pct(b.precision)} of the time, which is why a person reviews every finding.`,
  limitsText: [
    "This checks that answers match their sources. It does not check that the sources are right, current or the best ones.",
    "The checker compares normalised words, not meaning. A wrong answer that only swaps one verb can pass. The spot check catches some of these, not all.",
    "This report is not legal advice.",
  ],
  reviewNote: (precision, reviewed) =>
    reviewed === 0
      ? "The findings have not been reviewed by a person yet."
      : `Of ${reviewed} reviewed flags, ${pct(precision ?? 0)} were real problems.`,
};

export function strings(lang: Lang): Strings {
  return lang === "en" ? EN : DE;
}

/** The finding's checks explained in the report's language, built from the spans rather than the engine's English text. */
export function explain(
  t: Strings,
  details: { check: CheckId; detail: string; spans: { where: string; text: string }[] }[],
  reversed: boolean,
): string[] {
  const join = (items: string[]) => items.map((x) => t.quote(x.trim())).join(", ");
  const lines: string[] = [];
  for (const d of details) {
    if (d.check === "support") lines.push(reversed ? t.explain.reversed : t.explain.support);
    else if (d.check === "scope") lines.push(t.explain.scope);
    else {
      const dropped = d.spans.filter((s) => s.where !== "answer").map((s) => s.text);
      const invented = d.spans.filter((s) => s.where === "answer").map((s) => s.text);
      if (dropped.length) lines.push(t.explain.dropped(join(dropped)));
      if (invented.length) lines.push(t.explain.invented(join(invented)));
    }
  }
  return lines;
}
