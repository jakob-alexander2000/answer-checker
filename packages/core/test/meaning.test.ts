import { describe, expect, it } from "vitest";
import { scoreAnswer } from "../src/checks";
import { negations, normTokens, quantities } from "../src/normalize";

// Synthetic passages in the style of German statutes. None is quoted from a real law.

function card(question: string, passage: string, answer: string) {
  return scoreAnswer({ document: passage, question, passages: [passage], answer });
}

function status(question: string, passage: string, answer: string) {
  const result = card(question, passage, answer);
  return Object.fromEntries(result.checks.map((check) => [check.id, check.status]));
}

describe("normalising German", () => {
  it("reads number words as numbers", () => {
    const found = quantities("Die Frist beträgt sechs Wochen und danach einen Monat.");
    expect(found.map((q) => [q.value, q.unit])).toEqual([
      [6, "woche"],
      [1, "monat"],
    ]);
  });

  it("reads half and quarter hours as hours", () => {
    expect(quantities("eine halbe Stunde").map((q) => q.value)).toEqual([0.5]);
    expect(quantities("eine Viertelstunde").map((q) => q.value)).toEqual([0.25]);
    expect(quantities("30 Minuten").map((q) => [q.value, q.unit])).toEqual([[0.5, "stund"]]);
  });

  it("reads the bound in front of a number", () => {
    expect(quantities("mindestens 24 Werktage")[0]?.bound).toBe("min");
    expect(quantities("wenigstens 24 Werktage")[0]?.bound).toBe("min");
    expect(quantities("bis zu zwölf Monate")[0]?.bound).toBe("max");
    expect(quantities("länger als sechs Monate")[0]?.bound).toBe("gt");
    expect(quantities("zwölf Monate")[0]?.bound).toBeNull();
  });

  it("does not read an article as a number", () => {
    expect(quantities("Ein Arbeitnehmer kann eine Verringerung verlangen.")).toEqual([]);
  });

  it("matches inflected forms", () => {
    expect(normTokens("Kündigungen")).toEqual(normTokens("Kündigung"));
    expect(normTokens("beschäftigt")).toEqual(normTokens("beschäftigen"));
  });

  it("counts negation, ignoring a leading Ja or Nein", () => {
    expect(negations("Eine Kündigung ist unzulässig.")).toBe(1);
    expect(negations("Nein, eine Kündigung ist nicht zulässig.")).toBe(1);
    expect(negations("Eine Kündigung ist zulässig.")).toBe(0);
  });
});

describe("Support reads meaning, not only words", () => {
  const PASSAGE = "Der Arbeitgeber hat dem Arbeitnehmer den Erholungsurlaub zusammenhängend zu gewähren.";
  const Q = "Muss ich meinen Urlaub am Stück nehmen?";

  it("passes an inflected, rephrased answer", () => {
    expect(status(Q, PASSAGE, "Ihr Arbeitgeber muss Ihnen den Urlaub zusammenhängend gewähren.").support).toBe("pass");
  });

  it("fails an answer that reverses the passage", () => {
    const passage = "Eine Kündigung während der Elternzeit ist unzulässig.";
    const q = "Darf mir in der Elternzeit gekündigt werden?";
    expect(status(q, passage, "Eine Kündigung während der Elternzeit ist zulässig.").support).toBe("fail");
    expect(status(q, passage, "Nein, eine Kündigung während der Elternzeit ist nicht zulässig.").support).toBe("pass");
  });
});

describe("Qualifier compares numbers, including number words", () => {
  const PASSAGE = "Die tägliche Arbeitszeit darf acht Stunden nicht überschreiten.";
  const Q = "Wie lange darf ich am Tag arbeiten?";

  it("fails a changed number written as a word", () => {
    expect(status(Q, PASSAGE, "Die tägliche Arbeitszeit darf zehn Stunden nicht überschreiten.").qualifier).toBe("fail");
  });

  it("passes the same number written as digits", () => {
    expect(status(Q, PASSAGE, "Die tägliche Arbeitszeit darf 8 Stunden nicht überschreiten.").qualifier).toBe("pass");
  });

  it("passes a different word for the same bound", () => {
    const passage = "Der Urlaub beträgt jährlich mindestens 24 Werktage.";
    expect(status("Wie viel Urlaub?", passage, "Der Urlaub beträgt jährlich wenigstens 24 Werktage.").qualifier).toBe("pass");
  });

  it("fails a dropped upper bound", () => {
    const passage = "Die Entschädigung beträgt höchstens 10 Tagesgehälter.";
    expect(status("Wie hoch ist die Entschädigung?", passage, "Die Entschädigung beträgt 10 Tagesgehälter.").qualifier).toBe("fail");
  });
});

describe("Omission tracks wenn and soweit, by meaning", () => {
  const PASSAGE = "Der Arbeitgeber hat dem Wunsch zuzustimmen, soweit betriebliche Gründe nicht entgegenstehen.";
  const Q = "Muss der Arbeitgeber zustimmen?";

  it("fails when the soweit condition is dropped", () => {
    expect(status(Q, PASSAGE, "Der Arbeitgeber hat dem Wunsch zuzustimmen.").omission).toBe("fail");
  });

  it("passes when the condition is kept in other words", () => {
    expect(status(Q, PASSAGE, "Der Arbeitgeber hat zuzustimmen, außer betriebliche Gründe stehen entgegen.").omission).toBe("pass");
  });

  it("fails when a wenn condition is dropped", () => {
    const passage = "Die Frist kann auf zwölf Wochen verlängert werden, wenn der Betriebsrat zustimmt.";
    expect(status("Kann die Frist verlängert werden?", passage, "Die Frist kann auf zwölf Wochen verlängert werden.").omission).toBe("fail");
  });
});
