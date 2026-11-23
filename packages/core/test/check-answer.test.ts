import { describe, expect, it } from "vitest";
import { checkAnswer, ENGINE } from "../src/index";

const DE_SOURCE =
  "Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage im Jahr. Teilzeitkräfte erhalten Urlaub anteilig.";

describe("checkAnswer", () => {
  it("fails a German answer that drops the probation condition", () => {
    const out = checkAnswer({
      question: "Wie viele Urlaubstage gibt es?",
      answer: "Vollzeitbeschäftigte erhalten 30 Urlaubstage im Jahr.",
      sources: [{ id: "hb-4", text: DE_SOURCE }],
    });
    expect(out.verdict).toBe("fail");
    expect(out.failed).toContain("qualifier");
    expect(out.engine).toEqual(ENGINE);
  });

  it("passes the faithful German answer and maps each claim to its source", () => {
    const out = checkAnswer({
      question: "Wie viele Urlaubstage gibt es?",
      answer: "Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage im Jahr.",
      sources: ["Unrelated text about parking.", DE_SOURCE],
    });
    expect(out.verdict).toBe("pass");
    expect(out.claims).toHaveLength(1);
    expect(out.claims[0]).toMatchObject({ sourceIndex: 1, sourceId: "s2", supported: true });
    expect(out.voice).toBeNull();
  });

  it("only reads the voice with at least two reference pages", () => {
    const one = checkAnswer({ question: "Q?", answer: "Some answer.", sources: ["Some answer."], voice: { reference: ["Page."] } });
    expect(one.voice).toBeNull();
  });
});
