import { ENGINE } from "@answer-checker/core";
import type { CaseResult } from "./run";

/** Same shape as the studio receipts, plus the per-case results. */
export type Receipt = {
  project: "answer-checker";
  eval: string;
  what: string;
  date: string;
  commit: string;
  model: string;
  passed: number;
  total: number;
  cost_per_task: null;
  p95_ms: null;
  failures: string[];
  judge_agreement: null;
  engine: string;
  cases: CaseResult[];
};

export function makeReceipt(name: string, results: CaseResult[], meta: { date: string; commit: string }): Receipt {
  return {
    project: "answer-checker",
    eval: name,
    what: `${results.length} answers checked against their sources: support, scope, qualifier, omission`,
    date: meta.date,
    commit: meta.commit,
    model: "",
    passed: results.filter((r) => r.ok).length,
    total: results.length,
    cost_per_task: null,
    p95_ms: null,
    failures: results.filter((r) => !r.ok).map((r) => r.id),
    judge_agreement: null,
    engine: `${ENGINE.name} ${ENGINE.version}`,
    cases: results,
  };
}

export type Comparison = { regressed: string[]; newFailures: string[]; fixed: string[] };

/** Regressed: passed in the baseline, fails now. New failures: not in the baseline, fails now. */
export function compare(baseline: Receipt | null, next: Receipt): Comparison {
  const before = new Map((baseline?.cases ?? []).map((c) => [c.id, c.ok]));
  const regressed: string[] = [];
  const newFailures: string[] = [];
  const fixed: string[] = [];
  for (const item of next.cases) {
    const was = before.get(item.id);
    if (!item.ok && was === true) regressed.push(item.id);
    if (!item.ok && was === undefined && baseline) newFailures.push(item.id);
    if (item.ok && was === false) fixed.push(item.id);
  }
  if (!baseline) newFailures.push(...next.failures);
  return { regressed, newFailures, fixed };
}
