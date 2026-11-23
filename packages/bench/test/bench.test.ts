import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadBench } from "../src/load";
import { runBench, summarize } from "../src/score";

const DIR = join(__dirname, "../../../bench/de-arbeitsrecht");

describe("German employment-law bench", () => {
  const cases = loadBench(DIR);

  it("loads, with every passage found word for word in its law", () => {
    expect(cases.length).toBeGreaterThanOrEqual(12);
  });

  it("scores three answers per case", () => {
    const summary = summarize(runBench(cases));
    expect(summary.drifted.total).toBe(cases.length);
    expect(summary.faithful.total + summary.paraphrase.total).toBe(cases.length * 2);
  });
});
