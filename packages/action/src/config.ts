import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";
import type { CheckId } from "@answer-checker/core";

export type Case = {
  id: string;
  question: string;
  sources: string[];
  /** A fixed answer. Without one, the suite's answer_command is asked. */
  answer?: string;
  document?: string;
  /** What the checks should say about this answer. Default "pass". */
  expect: "pass" | "fail";
  /** When expect is fail, the checks that must be among the failures. */
  expectFailed: CheckId[];
};

export type Suite = { name: string; answerCommand?: string; cases: Case[] };

const CHECK_IDS = new Set(["support", "scope", "qualifier", "omission"]);

function strings(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return null;
  return value as string[];
}

/** Parse a checks.yml. File paths are read relative to `baseDir`. */
export function parseSuite(text: string, baseDir: string): Suite {
  const raw = parse(text) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") throw new Error("checks.yml: expected a mapping with cases");
  const answerCommand = typeof raw.answer_command === "string" ? raw.answer_command : undefined;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "checks";
  if (!Array.isArray(raw.cases) || raw.cases.length === 0) throw new Error("checks.yml: needs at least one case");

  const seen = new Set<string>();
  const cases = raw.cases.map((item: unknown, index: number): Case => {
    const entry = (item ?? {}) as Record<string, unknown>;
    const id = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : `case-${index + 1}`;
    const fail = (what: string) => new Error(`checks.yml: case "${id}": ${what}`);
    if (seen.has(id)) throw fail("id is used twice");
    seen.add(id);
    if (typeof entry.question !== "string" || !entry.question.trim()) throw fail("question is missing");

    const inline = strings(entry.sources);
    const files = strings(entry.source_files);
    if (!inline || !files) throw fail("sources and source_files must be lists of strings");
    const sources = [...inline, ...files.map((file) => readFileSync(resolve(baseDir, file), "utf8").trim())];
    if (sources.length === 0) throw fail("sources or source_files is missing");

    if (entry.answer !== undefined && typeof entry.answer !== "string") throw fail("answer must be a string");
    if (entry.answer === undefined && !answerCommand) throw fail("answer is missing and there is no answer_command");

    const expected = entry.expect ?? "pass";
    if (expected !== "pass" && expected !== "fail") throw fail('expect must be "pass" or "fail"');
    const expectFailed = strings(entry.expect_failed);
    if (!expectFailed || !expectFailed.every((check) => CHECK_IDS.has(check))) {
      throw fail("expect_failed must list support, scope, qualifier or omission");
    }
    let document: string | undefined;
    if (typeof entry.document_file === "string") document = readFileSync(resolve(baseDir, entry.document_file), "utf8");
    else if (typeof entry.document === "string") document = entry.document;

    return {
      id,
      question: entry.question.trim(),
      sources,
      answer: entry.answer as string | undefined,
      document,
      expect: expected,
      expectFailed: expectFailed as CheckId[],
    };
  });
  return { name, answerCommand, cases };
}

export function loadSuite(path: string): Suite {
  return parseSuite(readFileSync(path, "utf8"), dirname(resolve(path)));
}
