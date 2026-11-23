import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkClaims, claimPrompt, parseClaims, summarizeClaims, type ClaimSummary } from "../src/claims/verify";

// Recorded verifier outputs from CiteBot (tests/fixtures/verify-cases.json there).
type VerifyCase = {
  name: string;
  raw: string;
  citationIds: string[];
  summary: ClaimSummary;
  claims: number;
  citationKept: boolean;
};

const cases = JSON.parse(fs.readFileSync(path.join(process.cwd(), "test/fixtures/verify-cases.json"), "utf8")) as VerifyCase[];
const sourceIds = ["pto-and-leave-1"];

describe("claim mode: recorded verifier outputs", () => {
  it("treats an empty claim list as ungrounded", () => {
    expect(summarizeClaims([])).toBe("ungrounded");
  });

  for (const row of cases) {
    it(row.name, () => {
      const claims = parseClaims(row.raw, sourceIds);
      expect(claims.length).toBe(row.claims);
      expect(summarizeClaims(claims)).toBe(row.summary);
      if (row.claims > 0) expect(claims.some((claim) => Boolean(claim.sourceId))).toBe(row.citationKept);
    });
  }

  it("keeps at most 8 claims", () => {
    const claims = Array.from({ length: 10 }, (_, i) => ({ claim: `Claim ${i}`, verdict: "pass", evidence: "ok" }));
    expect(parseClaims(JSON.stringify({ claims }), []).length).toBe(8);
  });
});

describe("claim mode: the check itself", () => {
  const sources = [{ id: "pto-and-leave-1", text: "Full-time employees receive 30 days of paid vacation per calendar year." }];
  const question = "How many paid vacation days do full-time employees get?";

  it("catches the planted 25-day draft when the model says so", async () => {
    const recorded = JSON.stringify({
      claims: [{ claim: "Full-time employees receive 25 days.", verdict: "fail", evidence: "The source says 30 days.", sourceId: "pto-and-leave-1" }],
    });
    const report = await checkClaims(
      { question, answer: "Full-time employees receive 25 days of paid vacation per calendar year.", sources },
      async () => recorded,
    );
    expect(report.summary).toBe("ungrounded");
    expect(report.claims[0]?.verdict).toBe("fail");
    expect(report.claims[0]?.sourceId).toBe("pto-and-leave-1");
  });

  it("reports unavailable when the model can't be reached, instead of guessing", async () => {
    const report = await checkClaims({ question, answer: "Anything.", sources }, async () => {
      throw new Error("timeout");
    });
    expect(report.summary).toBe("unavailable");
  });

  it("puts every source and its id in the prompt", () => {
    const prompt = claimPrompt(question, "x", sources);
    expect(prompt).toContain("id=pto-and-leave-1");
    expect(prompt).toContain("30 days of paid vacation");
  });
});
