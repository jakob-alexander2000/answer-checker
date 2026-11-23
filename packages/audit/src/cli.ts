#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parse } from "yaml";
import { applyReview, reviewTemplate, runAudit, type AuditConfig, type Benchmark, type LogEntry, type ReviewFile } from "./audit";
import { renderHtml } from "./html";
import { renderMarkdown } from "./markdown";

type ConfigFile = Omit<AuditConfig, "benchmark"> & {
  /** JSON Lines: one {id?, question, answer, sources, document?} per line. */
  log: string;
  /** Review file. Written with every finding pending if it does not exist. */
  review?: string;
  out?: string;
  /** A bench results file (latest.json); its held-out numbers go into the method section. */
  benchmark?: string;
  benchmark_name?: string;
  benchmark_url?: string;
};

const path = process.argv[2];
if (!path) {
  console.error("Usage: answer-checker-audit <audit.yml>");
  process.exit(2);
}
const configPath = resolve(path);
const base = dirname(configPath);
const raw = parse(readFileSync(configPath, "utf8")) as ConfigFile;
for (const key of ["title", "client", "bot", "date", "log"] as const) {
  if (!raw[key]) throw new Error(`${path}: ${key} is missing`);
}
const at = (p: string) => resolve(base, p);

const log: LogEntry[] = readFileSync(at(raw.log), "utf8")
  .split("\n")
  .filter((line) => line.trim())
  .map((line, i) => {
    const entry = JSON.parse(line) as LogEntry;
    if (!entry.question || !entry.answer || !Array.isArray(entry.sources)) throw new Error(`${raw.log}:${i + 1}: needs question, answer and sources`);
    return entry;
  });

let benchmark: Benchmark | undefined;
if (raw.benchmark) {
  const bench = JSON.parse(readFileSync(at(raw.benchmark), "utf8")) as {
    summary: { holdout: { cases: number; drifted: { caught: number; total: number }; failPrecision: number } };
  };
  const h = bench.summary.holdout;
  benchmark = { name: raw.benchmark_name ?? "bench", url: raw.benchmark_url, questions: h.cases, caught: h.drifted.caught, drifted: h.drifted.total, failPrecision: h.failPrecision };
}

const config: AuditConfig = {
  title: raw.title,
  client: raw.client,
  bot: raw.bot,
  date: String(raw.date),
  lang: raw.lang === "en" ? "en" : "de",
  scope: raw.scope,
  reviewer: raw.reviewer,
  benchmark,
};

let audit = runAudit(log, config);
const out = at(raw.out ?? "report");
mkdirSync(out, { recursive: true });
const reviewPath = at(raw.review ?? join(raw.out ?? "report", "review.yml"));
if (existsSync(reviewPath)) {
  audit = applyReview(audit, (parse(readFileSync(reviewPath, "utf8")) ?? {}) as ReviewFile);
} else {
  writeFileSync(reviewPath, reviewTemplate(audit));
  console.log(`Wrote ${reviewPath}. Review each finding, then run again.`);
}
writeFileSync(join(out, "audit.json"), JSON.stringify(audit, null, 2) + "\n");
writeFileSync(join(out, "report.html"), renderHtml(audit));
writeFileSync(join(out, "report.md"), renderMarkdown(audit));
const s = audit.summary;
console.log(`${s.answers} answers, ${s.flagged} flagged, ${s.confirmed} confirmed, ${s.dismissed} dismissed, ${s.pending} pending. Report in ${out}.`);
