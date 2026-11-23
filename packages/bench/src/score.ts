import { checkAnswer, type CheckId } from "@answer-checker/core";
import type { BenchCase } from "./load";

export type Kind = "faithful" | "paraphrase" | "drifted";
export type Row = { id: string; law: string; kind: Kind; verdict: "pass" | "fail"; failed: CheckId[]; drift: CheckId };

export type Summary = {
  cases: number;
  drifted: { caught: number; caughtByIntended: number; total: number };
  faithful: { passed: number; total: number };
  paraphrase: { passed: number; total: number };
  /** Of all "fail" verdicts, the share that were on a drifted answer. */
  failPrecision: number;
  byDrift: Record<CheckId, { caught: number; total: number }>;
  /** How often each check failed a correct answer (faithful or paraphrase). */
  falseAlarms: Record<CheckId, number>;
};

const IDS: CheckId[] = ["support", "scope", "qualifier", "omission"];

export function runBench(cases: BenchCase[]): Row[] {
  const rows: Row[] = [];
  for (const c of cases) {
    for (const kind of ["faithful", "paraphrase", "drifted"] as const) {
      const out = checkAnswer({ question: c.question, answer: c[kind], sources: [c.passage], document: c.document });
      rows.push({ id: c.id, law: c.law, kind, verdict: out.verdict, failed: out.failed, drift: c.drift });
    }
  }
  return rows;
}

export function summarize(rows: Row[]): Summary {
  const of = (kind: Kind) => rows.filter((r) => r.kind === kind);
  const drifted = of("drifted");
  const correct = rows.filter((r) => r.kind !== "drifted");
  const fails = rows.filter((r) => r.verdict === "fail");
  const byDrift = Object.fromEntries(
    IDS.map((id) => {
      const set = drifted.filter((r) => r.drift === id);
      return [id, { caught: set.filter((r) => r.verdict === "fail").length, total: set.length }];
    }),
  ) as Summary["byDrift"];
  const falseAlarms = Object.fromEntries(IDS.map((id) => [id, correct.filter((r) => r.failed.includes(id)).length])) as Summary["falseAlarms"];
  return {
    cases: drifted.length,
    drifted: {
      caught: drifted.filter((r) => r.verdict === "fail").length,
      caughtByIntended: drifted.filter((r) => r.failed.includes(r.drift)).length,
      total: drifted.length,
    },
    faithful: { passed: of("faithful").filter((r) => r.verdict === "pass").length, total: of("faithful").length },
    paraphrase: { passed: of("paraphrase").filter((r) => r.verdict === "pass").length, total: of("paraphrase").length },
    failPrecision: fails.length ? fails.filter((r) => r.kind === "drifted").length / fails.length : 1,
    byDrift,
    falseAlarms,
  };
}
