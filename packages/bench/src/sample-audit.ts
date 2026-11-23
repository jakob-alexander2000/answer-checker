/**
 * Builds the sample audit in examples/sample-audit from the public bench.
 * The "bot" is not a real chatbot: for each question one of the three hand-written answers is
 * picked with a fixed seed, and the review is filled in from the bench's answer key.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runAudit, type LogEntry } from "@answer-checker/audit";
import type { CheckId } from "@answer-checker/core";
import { loadBench } from "./load";

const BENCH = resolve(import.meta.dirname, "../../../bench/de-arbeitsrecht");
const OUT = resolve(import.meta.dirname, "../../../examples/sample-audit");
const SEED = 7;

// mulberry32: a small seeded generator, so the sample is the same on every run.
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Kind = "faithful" | "paraphrase" | "drifted";
const next = random(SEED);
const pick = (): Kind => {
  const r = next();
  return r < 0.55 ? "faithful" : r < 0.8 ? "paraphrase" : "drifted";
};

const cases = loadBench(BENCH);
const kinds = new Map<string, { kind: Kind; drift: CheckId }>();
const log: LogEntry[] = cases.map((c) => {
  const kind = pick();
  kinds.set(c.id, { kind, drift: c.drift });
  // The whole law is left out of the log to keep it small; no case in this bench depends on Scope.
  return { id: c.id, question: c.question, answer: c[kind], sources: [c.passage] };
});

const WHY: Record<CheckId, string> = {
  qualifier: "Eine Zahl, Frist oder Grenze weicht von der Quelle ab.",
  omission: "Eine Bedingung oder Ausnahme der Quelle fehlt.",
  support: "Die Aussage steht so nicht in der Quelle.",
  scope: "Der Geltungsbereich ist erweitert.",
};

const audit = runAudit(log, { title: "", client: "", bot: "", date: "", lang: "de" });
const review: string[] = ["# Filled in from the bench answer key, not by a person. See README.md.", "findings:"];
for (const f of audit.findings) {
  const k = kinds.get(f.entryId)!;
  const confirmed = k.kind === "drifted";
  const note = confirmed ? WHY[k.drift] : `Fehlalarm: Die Antwort gibt die Quelle richtig wieder (${k.kind === "faithful" ? "wörtlich" : "umformuliert"}).`;
  review.push(`  ${f.id}:`, `    status: ${confirmed ? "confirmed" : "dismissed"}`, `    note: "${note}"`);
}
const flagged = new Set(audit.findings.map((f) => f.entryId));
const missed = [...kinds.entries()].filter(([id, k]) => k.kind === "drifted" && !flagged.has(id));
review.push(missed.length ? "missed:" : "missed: []");
for (const [id, k] of missed) review.push(`  - entry: ${id}`, `    note: "${WHY[k.drift]}"`);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "log.jsonl"), log.map((e) => JSON.stringify(e)).join("\n") + "\n");
writeFileSync(join(OUT, "review.yml"), review.join("\n") + "\n");
const counts = { faithful: 0, paraphrase: 0, drifted: 0 };
for (const k of kinds.values()) counts[k.kind] += 1;
console.log(`Sample log: ${log.length} answers (${counts.faithful} faithful, ${counts.paraphrase} paraphrased, ${counts.drifted} with a planted mistake).`);
