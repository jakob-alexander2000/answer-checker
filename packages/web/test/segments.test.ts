import { describe, expect, it } from "vitest";
import { checkAnswer, SAMPLES } from "@answer-checker/core";
import { marksFor, segments } from "../src/segments";

describe("segments", () => {
  it("splits text around marks and keeps every character", () => {
    const parts = segments("abcdefgh", [{ start: 2, end: 4, kind: "fault" }]);
    expect(parts).toEqual([
      { text: "ab", kind: null },
      { text: "cd", kind: "fault" },
      { text: "efgh", kind: null },
    ]);
  });

  it("lets a fault win where marks overlap and clamps out-of-range marks", () => {
    const parts = segments("abcdef", [
      { start: 0, end: 4, kind: "claim" },
      { start: 2, end: 99, kind: "fault" },
    ]);
    expect(parts.map((p) => p.text).join("")).toBe("abcdef");
    expect(parts).toEqual([
      { text: "ab", kind: "claim" },
      { text: "cdef", kind: "fault" },
    ]);
  });
});

describe("marksFor", () => {
  it("marks the dropped condition in the source and the claim in the answer", () => {
    const sample = SAMPLES.find((s) => s.id === "leave")!;
    const out = checkAnswer({ question: sample.question, answer: sample.drifted, sources: sample.sources, document: sample.document });
    const marks = marksFor(out, sample.sources.length);
    const source = sample.sources[0]!;
    const faults = marks.sources[0]!.filter((m) => m.kind === "fault").map((m) => source.slice(m.start, m.end));
    expect(faults).toEqual(["full-time employees only", "after the probation period"]);
    expect(marks.answer.map((m) => m.kind)).toEqual(["claim"]);
  });

  it("marks an unsupported sentence in the answer as a fault", () => {
    const sample = SAMPLES.find((s) => s.id === "bonus")!;
    const out = checkAnswer({ question: sample.question, answer: sample.drifted, sources: sample.sources, document: sample.document });
    const marks = marksFor(out, 1);
    const faults = segments(sample.drifted, marks.answer).filter((p) => p.kind === "fault").map((p) => p.text);
    expect(faults).toEqual(["Zusätzlich gibt es einen Bonus für alle Abteilungen."]);
  });
});
