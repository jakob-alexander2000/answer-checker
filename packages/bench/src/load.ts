import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { CheckId } from "@answer-checker/core";

export type BenchCase = {
  id: string;
  law: string;
  question: string;
  passage: string;
  faithful: string;
  paraphrase: string;
  drifted: string;
  drift: CheckId;
  note: string;
  document: string;
  /** "dev" cases may be looked at while tuning the engine. "holdout" cases may not. */
  split: Split;
};

export type Split = "dev" | "holdout";

const CHECKS = new Set(["support", "scope", "qualifier", "omission"]);

export function squash(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Load every case file of a bench folder. Throws on a malformed case or a passage that isn't in its source. */
export function loadBench(dir: string): BenchCase[] {
  const out: BenchCase[] = [];
  const seen = new Set<string>();
  for (const file of readdirSync(join(dir, "cases")).filter((f) => f.endsWith(".yml")).sort()) {
    const raw = parse(readFileSync(join(dir, "cases", file), "utf8")) as { law: string; source: string; split?: string; cases: Record<string, string>[] };
    const split = raw.split ?? "dev";
    if (split !== "dev" && split !== "holdout") throw new Error(`${file}: split must be dev or holdout`);
    const document = squash(readFileSync(join(dir, "sources", raw.source), "utf8"));
    for (const item of raw.cases) {
      const where = `${file}: ${item.id ?? "?"}`;
      for (const key of ["id", "question", "passage", "faithful", "paraphrase", "drifted", "drift", "note"]) {
        if (typeof item[key] !== "string" || !item[key]!.trim()) throw new Error(`${where}: ${key} is missing`);
      }
      if (seen.has(item.id!)) throw new Error(`${where}: id used twice`);
      seen.add(item.id!);
      if (!CHECKS.has(item.drift!)) throw new Error(`${where}: drift must be a check id`);
      const passage = squash(item.passage!);
      if (!document.includes(passage)) throw new Error(`${where}: passage is not in ${raw.source}`);
      out.push({
        id: item.id!,
        law: raw.law,
        question: item.question!,
        passage,
        faithful: item.faithful!,
        paraphrase: item.paraphrase!,
        drifted: item.drifted!,
        drift: item.drift as CheckId,
        note: item.note!,
        document,
        split,
      });
    }
  }
  return out;
}
