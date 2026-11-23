#!/usr/bin/env -S npx tsx
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadSuite } from "./config";
import { compare, makeReceipt, type Receipt } from "./receipt";
import { runSuite } from "./run";

type Env = Record<string, string | undefined>;
type Latest = { date: string; receipts: { project: string; eval: string; passed: number; total: number; commit: string; file: string }[] };

const USAGE = `answer-checker --config checks.yml [--receipts checks/receipts] [--fail-on any|regression] [--date YYYY-MM-DD]`;

function args(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key?.startsWith("--")) throw new Error(`unexpected "${key}"\n${USAGE}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${key} needs a value\n${USAGE}`);
    out[key.slice(2)] = value;
    i += 1;
  }
  return out;
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function summary(receipt: Receipt, diff: ReturnType<typeof compare>): string {
  const lines = [
    `### answer-checker: ${receipt.eval}`,
    "",
    `${receipt.passed} of ${receipt.total} cases as expected.`,
    "",
    "| Case | Verdict | Failed checks | As expected |",
    "| --- | --- | --- | --- |",
    ...receipt.cases.map((c) => `| ${c.id} | ${c.verdict} | ${c.error ? `error: ${c.error}` : c.failed.join(", ") || "none"} | ${c.ok ? "yes" : "**no**"} |`),
  ];
  if (diff.regressed.length) lines.push("", `Got worse since the last receipt: ${diff.regressed.join(", ")}`);
  if (diff.newFailures.length) lines.push("", `New failures: ${diff.newFailures.join(", ")}`);
  if (diff.fixed.length) lines.push("", `Fixed since the last receipt: ${diff.fixed.join(", ")}`);
  return lines.join("\n") + "\n";
}

export async function main(argv: string[], env: Env): Promise<number> {
  let options: Record<string, string>;
  try {
    options = args(argv);
  } catch (error) {
    console.error((error as Error).message);
    return 2;
  }
  const failOn = options["fail-on"] ?? "any";
  if (failOn !== "any" && failOn !== "regression") {
    console.error(`--fail-on must be any or regression\n${USAGE}`);
    return 2;
  }
  const suite = loadSuite(resolve(options.config ?? "checks.yml"));
  const dir = resolve(options.receipts ?? "checks/receipts");
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const commit = (env.GITHUB_SHA ?? "").slice(0, 7);

  const latestPath = join(dir, "latest.json");
  const latest = readJson<Latest>(latestPath);
  const previous = latest?.receipts.find((r) => r.project === "answer-checker" && r.eval === suite.name);
  const baseline = previous ? readJson<Receipt>(join(dir, previous.file)) : null;

  const results = await runSuite(suite);
  const receipt = makeReceipt(suite.name, results, { date, commit });
  const diff = compare(baseline, receipt);

  mkdirSync(dir, { recursive: true });
  const file = `${date}-${suite.name}.json`;
  writeFileSync(join(dir, file), JSON.stringify(receipt, null, 2) + "\n");
  const others = (latest?.receipts ?? []).filter((r) => !(r.project === "answer-checker" && r.eval === suite.name));
  const entry = { project: "answer-checker", eval: suite.name, passed: receipt.passed, total: receipt.total, commit, file };
  writeFileSync(latestPath, JSON.stringify({ date, receipts: [...others, entry] }, null, 2) + "\n");

  const text = summary(receipt, diff);
  console.log(text);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, text);
  if (env.GITHUB_OUTPUT) {
    appendFileSync(env.GITHUB_OUTPUT, `passed=${receipt.passed}\ntotal=${receipt.total}\nreceipt=${join(dir, file)}\n`);
  }

  const broken = failOn === "any" ? receipt.failures.length > 0 : diff.regressed.length + diff.newFailures.length > 0;
  return broken ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2), process.env).then(
    (code) => process.exit(code),
    (error: Error) => {
      console.error(error.message);
      process.exit(2);
    },
  );
}
