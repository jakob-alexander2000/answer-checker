import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSuite, parseSuite } from "../src/config";
import { compare, makeReceipt, type Receipt } from "../src/receipt";
import { commandAnswerer, runSuite } from "../src/run";
import { main } from "../src/cli";

const FIXTURES = join(__dirname, "fixtures");

describe("config", () => {
  it("loads cases with inline sources and source files", () => {
    const suite = loadSuite(join(FIXTURES, "checks.yml"));
    expect(suite.name).toBe("handbook");
    expect(suite.cases.map((c) => c.id)).toEqual(["leave-faithful", "leave-drifted", "inline"]);
    expect(suite.cases[0]?.sources[0]).toContain("after the probation period");
    expect(suite.cases[1]?.expect).toBe("fail");
    expect(suite.cases[2]?.expect).toBe("pass");
  });

  it("says which case is broken", () => {
    expect(() => parseSuite("cases:\n  - id: a\n    question: Q?\n", FIXTURES)).toThrow(/case "a": sources/);
    expect(() => parseSuite("cases:\n  - id: a\n    question: Q?\n    sources: [S.]\n", FIXTURES)).toThrow(/case "a": answer/);
    expect(() => parseSuite("cases: []\n", FIXTURES)).toThrow(/at least one case/);
  });

  it("allows a missing answer when the suite has an answer command", () => {
    const suite = parseSuite("answer_command: echo hi\ncases:\n  - id: a\n    question: Q?\n    sources: [S.]\n", FIXTURES);
    expect(suite.answerCommand).toBe("echo hi");
  });
});

describe("runSuite", () => {
  it("scores each case against what it expects", async () => {
    const results = await runSuite(loadSuite(join(FIXTURES, "checks.yml")));
    expect(results.map((r) => [r.id, r.ok])).toEqual([
      ["leave-faithful", true],
      ["leave-drifted", true],
      ["inline", true],
    ]);
  });

  it("fails a case whose answer drops a condition", async () => {
    const suite = parseSuite(
      "cases:\n  - id: a\n    question: Q?\n    sources: [Full-time employees receive 30 days after the probation period.]\n    answer: Employees receive 30 days.\n",
      FIXTURES,
    );
    const [result] = await runSuite(suite);
    expect(result?.ok).toBe(false);
    expect(result?.failed).toContain("qualifier");
  });

  it("gets answers from a command, one JSON case on stdin each", async () => {
    const suite = parseSuite(
      "answer_command: replaced-below\ncases:\n  - id: a\n    question: Q?\n    sources: [Part-time staff receive a share.]\n",
      FIXTURES,
    );
    const answerer = commandAnswerer(
      `node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=JSON.parse(s);process.stdout.write(c.sources[0])})"`,
    );
    const [result] = await runSuite(suite, answerer);
    expect(result?.answer).toBe("Part-time staff receive a share.");
    expect(result?.ok).toBe(true);
  });
});

describe("receipts", () => {
  const base: Receipt = makeReceipt("handbook", [
    { id: "a", ok: true, failed: [], answer: "x", verdict: "pass" },
    { id: "b", ok: true, failed: [], answer: "y", verdict: "pass" },
  ], { date: "2026-11-23", commit: "abc1234" });

  it("matches the studio receipt shape", () => {
    expect(base).toMatchObject({ project: "answer-checker", eval: "handbook", passed: 2, total: 2, commit: "abc1234", failures: [] });
  });

  it("names the cases that got worse", () => {
    const next = makeReceipt("handbook", [
      { id: "a", ok: false, failed: ["qualifier"], answer: "x", verdict: "fail" },
      { id: "b", ok: true, failed: [], answer: "y", verdict: "pass" },
      { id: "c", ok: false, failed: ["support"], answer: "z", verdict: "fail" },
    ], { date: "2026-11-24", commit: "def5678" });
    expect(compare(base, next)).toEqual({ regressed: ["a"], newFailures: ["c"], fixed: [] });
    expect(compare(null, next).regressed).toEqual([]);
  });
});

describe("cli", () => {
  it("writes a dated receipt and latest.json, and exits 1 on a regression", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ac-"));
    const config = join(dir, "checks.yml");
    writeFileSync(join(dir, "source.md"), readFileSync(join(FIXTURES, "source.md")));
    writeFileSync(config, readFileSync(join(FIXTURES, "checks.yml")));
    const receipts = join(dir, "receipts");
    const env = { GITHUB_SHA: "1234567890" };

    expect(await main(["--config", config, "--receipts", receipts, "--date", "2026-11-23"], env)).toBe(0);
    const latest = JSON.parse(readFileSync(join(receipts, "latest.json"), "utf8"));
    expect(latest.receipts[0]).toMatchObject({ project: "answer-checker", eval: "handbook", passed: 3, total: 3, commit: "1234567" });
    expect(JSON.parse(readFileSync(join(receipts, "2026-11-23-handbook.json"), "utf8")).passed).toBe(3);

    writeFileSync(config, readFileSync(config, "utf8").replace("Full-time employees receive 30 days of paid annual leave after the probation period.", "Employees receive 30 days of paid annual leave."));
    mkdirSync(receipts, { recursive: true });
    expect(await main(["--config", config, "--receipts", receipts, "--date", "2026-11-24"], env)).toBe(1);
  });

  it("exits 0 on failures that were already failing unless fail-on is any", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ac-"));
    const config = join(dir, "checks.yml");
    writeFileSync(config, "name: s\ncases:\n  - id: a\n    question: Q?\n    sources: [Full-time employees receive 30 days after the probation period.]\n    answer: Employees receive 30 days.\n");
    const receipts = join(dir, "r");
    expect(await main(["--config", config, "--receipts", receipts, "--date", "2026-11-23"], {})).toBe(1);
    expect(await main(["--config", config, "--receipts", receipts, "--date", "2026-11-24", "--fail-on", "regression"], {})).toBe(0);
  });
});
