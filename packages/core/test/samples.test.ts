import { describe, expect, it } from "vitest";
import { checkAnswer } from "../src/index";
import { SAMPLES } from "../src/samples";

describe("playground samples", () => {
  it("covers both languages and all four checks", () => {
    expect(new Set(SAMPLES.map((s) => s.language))).toEqual(new Set(["en", "de"]));
    expect(new Set(SAMPLES.map((s) => s.catches))).toEqual(new Set(["support", "scope", "qualifier", "omission"]));
  });

  for (const sample of SAMPLES) {
    it(`${sample.id}: the faithful answer passes`, () => {
      const out = checkAnswer({ question: sample.question, answer: sample.faithful, sources: sample.sources, document: sample.document });
      expect(out.failed).toEqual([]);
    });

    it(`${sample.id}: the drifted answer fails ${sample.catches}`, () => {
      const out = checkAnswer({ question: sample.question, answer: sample.drifted, sources: sample.sources, document: sample.document });
      expect(out.failed).toContain(sample.catches);
    });
  }
});
