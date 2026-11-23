import { describe, expect, it } from "vitest";
import { checkById, scoreAnswer } from "../src/checks";

// A synthetic German handbook in the style of real HR policies. It is not a real company's policy.
const HANDBUCH = [
  "Geltungsbereich. Diese Richtlinie gilt nur für Beschäftigte der Muster GmbH in Deutschland. Sie gilt nicht für Leiharbeitskräfte oder freie Mitarbeitende.",
  "Urlaub. Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage pro Kalenderjahr. Teilzeitkräfte erhalten einen Anteil, der ihrer vertraglichen Arbeitszeit entspricht.",
  "Mobiles Arbeiten. Mobiles Arbeiten ist an bis zu 2 Tagen pro Woche möglich, es sei denn, die Rolle erfordert Anwesenheit beim Kunden.",
  "Weiterbildung. Das Weiterbildungsbudget beträgt 1.200 € pro Jahr.",
].join("\n\n");

function card(question: string, passage: string, answer: string) {
  return scoreAnswer({ document: HANDBUCH, question, passages: [passage], answer });
}

const URLAUB = "Urlaub. Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage pro Kalenderjahr.";
const MOBIL = "Mobiles Arbeiten. Mobiles Arbeiten ist an bis zu 2 Tagen pro Woche möglich, es sei denn, die Rolle erfordert Anwesenheit beim Kunden.";
const BUDGET = "Weiterbildung. Das Weiterbildungsbudget beträgt 1.200 € pro Jahr.";

describe("German answers", () => {
  it("passes a faithful answer", () => {
    const result = card(
      "Wie viele Urlaubstage bekommen Vollzeitbeschäftigte?",
      URLAUB,
      "Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage pro Kalenderjahr.",
    );
    for (const id of ["support", "scope", "qualifier", "omission"] as const) {
      expect(checkById(result, id).status, id).toBe("pass");
    }
  });

  it("fails Qualifier when nach der Probezeit is dropped", () => {
    const result = card(
      "Wie viele Urlaubstage bekommen Vollzeitbeschäftigte?",
      URLAUB,
      "Vollzeitbeschäftigte erhalten 30 Urlaubstage pro Kalenderjahr.",
    );
    const qualifier = checkById(result, "qualifier");
    expect(qualifier.status).toBe("fail");
    expect(qualifier.spans.map((span) => span.text)).toContain("nach der Probezeit");
  });

  it("fails Omission when es sei denn is dropped, and keeps bis zu 2", () => {
    const result = card(
      "Wie viele Tage darf ich mobil arbeiten?",
      MOBIL,
      "Mobiles Arbeiten ist an bis zu 2 Tagen pro Woche möglich.",
    );
    const omission = checkById(result, "omission");
    expect(omission.status).toBe("fail");
    expect(omission.spans[0]?.text.toLowerCase()).toContain("es sei denn");
    expect(checkById(result, "qualifier").status).toBe("pass");
  });

  it("fails Qualifier when an amount changes", () => {
    const result = card(
      "Wie hoch ist das Weiterbildungsbudget?",
      BUDGET,
      "Das Weiterbildungsbudget beträgt 1.000 € pro Jahr.",
    );
    const qualifier = checkById(result, "qualifier");
    expect(qualifier.status).toBe("fail");
    expect(qualifier.spans.map((span) => span.text.trim())).toContain("1.200 €");
  });

  it("fails Scope when the answer says alle Mitarbeitenden", () => {
    const result = card(
      "Wer bekommt diese Leistungen?",
      "Geltungsbereich. Diese Richtlinie gilt nur für Beschäftigte der Muster GmbH in Deutschland.",
      "Alle Mitarbeitenden erhalten diese Leistungen.",
    );
    const scope = checkById(result, "scope");
    expect(scope.status).toBe("fail");
    expect(scope.spans[0]?.text.toLowerCase()).toContain("gilt nur für");
  });

  it("fails Scope when an excluded group is said to be included", () => {
    const result = card(
      "Bekommen Leiharbeitskräfte Urlaub?",
      URLAUB,
      "Leiharbeitskräfte erhalten 30 Urlaubstage.",
    );
    expect(checkById(result, "scope").status).toBe("fail");
  });

  it("fails Support for an invented German sentence", () => {
    const result = card(
      "Wie viele Urlaubstage bekommen Vollzeitbeschäftigte?",
      URLAUB,
      "Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage pro Kalenderjahr. Zusätzlich gibt es einen Bonus für alle Abteilungen.",
    );
    const support = checkById(result, "support");
    expect(support.status).toBe("fail");
    expect(support.spans[0]?.text).toContain("Bonus");
  });
});
