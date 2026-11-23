import { checkAnswer, ENGINE, normalizeSources, type CheckId, type SourceInput, type Span } from "@answer-checker/core";

export type Lang = "de" | "en";

export type AuditConfig = {
  title: string;
  client: string;
  /** The chatbot or assistant under audit. */
  bot: string;
  /** ISO date the answers were collected or checked. */
  date: string;
  lang: Lang;
  /** One paragraph on what was audited and how the answers were collected. */
  scope?: string;
  /** Who reviewed the findings. Shown on the report. */
  reviewer?: string;
  /** Measured accuracy of the engine on a public bench, shown in the method section. */
  benchmark?: Benchmark;
};

export type Benchmark = { name: string; url?: string; questions: number; caught: number; drifted: number; failPrecision: number };

export type LogEntry = {
  id?: string;
  question: string;
  answer: string;
  sources: SourceInput[];
  document?: string;
};

export type Severity = "high" | "medium";
export type ReviewStatus = "pending" | "confirmed" | "dismissed";
export type Review = { status: ReviewStatus; note?: string };

export type EntryResult = { id: string; question: string; verdict: "pass" | "fail"; failed: CheckId[] };

export type Finding = {
  id: string;
  entryId: string;
  severity: Severity;
  checks: CheckId[];
  /** Support failed because the answer says the opposite of the source. */
  reversed: boolean;
  question: string;
  answer: string;
  answerSpans: Span[];
  sources: string[];
  sourceSpans: Span[];
  /** What each failed check found, with its spans: in the passage (left out) or in the answer (not in a source). */
  details: { check: CheckId; detail: string; spans: Span[] }[];
  review: Review;
};

export type Missed = { entry: string; note: string; question?: string; answer?: string };

export type Summary = {
  answers: number;
  passed: number;
  flagged: number;
  high: number;
  medium: number;
  confirmed: number;
  dismissed: number;
  pending: number;
  missed: number;
  /** Confirmed share of reviewed findings, or null before review. */
  precision: number | null;
};

export type Audit = {
  config: AuditConfig;
  engine: typeof ENGINE;
  entries: EntryResult[];
  findings: Finding[];
  missed: Missed[];
  summary: Summary;
};

export type ReviewFile = {
  findings?: Record<string, Review>;
  missed?: { entry: string; note: string }[];
};

const HIGH: CheckId[] = ["qualifier", "omission", "scope"];
const REVERSED = "says the opposite";

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

function summarize(entries: EntryResult[], findings: Finding[], missed: Missed[]): Summary {
  const count = (status: ReviewStatus) => findings.filter((f) => f.review.status === status).length;
  const confirmed = count("confirmed");
  const dismissed = count("dismissed");
  return {
    answers: entries.length,
    passed: entries.filter((e) => e.verdict === "pass").length,
    flagged: findings.length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    confirmed,
    dismissed,
    pending: count("pending"),
    missed: missed.length,
    precision: confirmed + dismissed > 0 ? confirmed / (confirmed + dismissed) : null,
  };
}

/** Check every logged answer and turn each failed one into a finding. Offline and deterministic. */
export function runAudit(log: LogEntry[], config: AuditConfig): Audit {
  const entries: EntryResult[] = [];
  const findings: Omit<Finding, "id">[] = [];
  const seen = new Set<string>();
  log.forEach((item, index) => {
    const id = item.id ?? `q-${pad(index + 1)}`;
    if (seen.has(id)) throw new Error(`Entry id ${id} is used twice`);
    seen.add(id);
    const out = checkAnswer({ question: item.question, answer: item.answer, sources: item.sources, document: item.document });
    entries.push({ id, question: item.question, verdict: out.verdict, failed: out.failed });
    if (out.verdict === "pass") return;
    const failed = out.checks.filter((c) => c.status === "fail");
    const reversed = failed.some((c) => c.id === "support" && c.detail.includes(REVERSED));
    const spans = failed.flatMap((c) => c.spans);
    findings.push({
      entryId: id,
      severity: reversed || out.failed.some((c) => HIGH.includes(c)) ? "high" : "medium",
      checks: out.failed,
      reversed,
      question: item.question,
      answer: item.answer,
      answerSpans: spans.filter((s) => s.where === "answer"),
      sources: normalizeSources(item.sources).map((s) => s.text),
      sourceSpans: spans.filter((s) => s.where === "passage"),
      details: failed.map((c) => ({ check: c.id, detail: c.detail, spans: c.spans })),
      review: { status: "pending" },
    });
  });
  const ordered = [...findings.filter((f) => f.severity === "high"), ...findings.filter((f) => f.severity === "medium")];
  const numbered: Finding[] = ordered.map((f, i) => ({ ...f, id: `f-${pad(i + 1)}` }));
  return { config, engine: ENGINE, entries, findings: numbered, missed: [], summary: summarize(entries, numbered, []) };
}

/** A review file with every finding pending, for a person to fill in. */
export function reviewTemplate(audit: Audit): string {
  const lines = [
    "# Review each finding: confirmed (a real problem) or dismissed (a false alarm). Add a note for the report.",
    "# Under missed, add answers the engine passed that a person found wrong on spot check.",
    "findings:",
  ];
  for (const f of audit.findings) {
    lines.push(`  ${f.id}: # ${f.entryId}, ${f.checks.join(", ")}`);
    lines.push("    status: pending");
    lines.push('    note: ""');
  }
  lines.push("missed: []");
  return lines.join("\n") + "\n";
}

export function applyReview(audit: Audit, review: ReviewFile): Audit {
  const byId = new Map(audit.findings.map((f) => [f.id, f]));
  for (const id of Object.keys(review.findings ?? {})) {
    if (!byId.has(id)) throw new Error(`The review names ${id}, which is not a finding of this audit`);
  }
  const findings = audit.findings.map((f) => {
    const r = review.findings?.[f.id];
    if (!r) return f;
    if (!["pending", "confirmed", "dismissed"].includes(r.status)) throw new Error(`${f.id}: status must be pending, confirmed or dismissed`);
    return { ...f, review: { status: r.status, note: r.note?.trim() || undefined } };
  });
  const entries = new Map(audit.entries.map((e) => [e.id, e]));
  const missed: Missed[] = (review.missed ?? []).map((m) => {
    const entry = entries.get(m.entry);
    if (!entry) throw new Error(`The review names entry ${m.entry} under missed, which is not in the log`);
    return { entry: m.entry, note: m.note, question: entry.question };
  });
  return { ...audit, findings, missed, summary: summarize(audit.entries, findings, missed) };
}

export type FixKind = "qualifier" | "omission" | "scope" | "reversed" | "support" | "missed";
export type Fix = { kind: FixKind; severity: Severity; entries: string[] };

/** What to change, ordered by severity and then by how many answers it touches. Dismissed findings are left out. */
export function fixList(audit: Audit): Fix[] {
  const live = audit.findings.filter((f) => f.review.status !== "dismissed");
  const groups = new Map<FixKind, Set<string>>();
  const add = (kind: FixKind, entry: string) => {
    if (!groups.has(kind)) groups.set(kind, new Set());
    groups.get(kind)!.add(entry);
  };
  for (const f of live) {
    for (const check of f.checks) {
      if (check === "support") add(f.reversed ? "reversed" : "support", f.entryId);
      else add(check, f.entryId);
    }
  }
  for (const m of audit.missed) add("missed", m.entry);
  const severity = (kind: FixKind): Severity => (kind === "support" ? "medium" : "high");
  return [...groups.entries()]
    .map(([kind, set]) => ({ kind, severity: severity(kind), entries: [...set] }))
    .sort((a, b) => (a.severity === b.severity ? b.entries.length - a.entries.length : a.severity === "high" ? -1 : 1));
}
