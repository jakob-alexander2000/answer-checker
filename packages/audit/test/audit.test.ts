import { describe, expect, it } from "vitest";
import { applyReview, fixList, reviewTemplate, runAudit, type AuditConfig, type LogEntry } from "../src/audit";
import { renderHtml } from "../src/html";
import { renderMarkdown } from "../src/markdown";

// Synthetic statute-style passages. Not quoted from a real law.
const URLAUB = "Der Urlaub beträgt jährlich mindestens 24 Werktage.";
const PAUSE = "Die Arbeit ist durch Ruhepausen von mindestens 30 Minuten zu unterbrechen, es sei denn, die Arbeitszeit beträgt weniger als sechs Stunden.";
const KUENDIGUNG = "Eine Kündigung während der Elternzeit ist unzulässig.";

const LOG: LogEntry[] = [
  { question: "Wie viel Urlaub habe ich?", answer: "Der Urlaub beträgt jährlich mindestens 24 Werktage.", sources: [URLAUB] },
  { question: "Wie viel Urlaub habe ich?", answer: "Der Urlaub beträgt jährlich 20 Werktage.", sources: [URLAUB] },
  { question: "Wie lange ist die Pause?", answer: "Die Arbeit ist durch Ruhepausen von mindestens 30 Minuten zu unterbrechen.", sources: [PAUSE] },
  { id: "elternzeit", question: "Darf mir in der Elternzeit gekündigt werden?", answer: "Eine Kündigung während der Elternzeit ist zulässig.", sources: [KUENDIGUNG] },
  { question: "Gibt es einen Dienstwagen?", answer: "Zusätzlich bekommen alle <b>einen Firmenwagen</b>.", sources: ["Beschäftigte erhalten einen Zuschuss zum Mittagessen."] },
];

const CONFIG: AuditConfig = { title: "Test audit", client: "Muster GmbH", bot: "HR-Bot", date: "2026-11-23", lang: "de" };

describe("runAudit", () => {
  const audit = runAudit(LOG, CONFIG);

  it("checks every answer and gives each one an id", () => {
    expect(audit.entries.map((e) => e.id)).toEqual(["q-001", "q-002", "q-003", "elternzeit", "q-005"]);
    expect(audit.entries[0]?.verdict).toBe("pass");
  });

  it("turns each failed answer into one finding, high severity first", () => {
    expect(audit.findings.map((f) => f.entryId).sort()).toEqual(["elternzeit", "q-002", "q-003", "q-005"]);
    const severities = audit.findings.map((f) => f.severity);
    expect(severities.indexOf("medium")).toBeGreaterThan(severities.lastIndexOf("high"));
  });

  it("marks a reversed statement as high severity", () => {
    const f = audit.findings.find((x) => x.entryId === "elternzeit");
    expect(f?.severity).toBe("high");
    expect(f?.reversed).toBe(true);
  });

  it("keeps the spans that show what went wrong", () => {
    const f = audit.findings.find((x) => x.entryId === "q-003");
    expect(f?.checks).toContain("omission");
    expect(f?.sourceSpans.some((s) => s.text.includes("es sei denn"))).toBe(true);
  });
});

describe("review", () => {
  const audit = runAudit(LOG, CONFIG);

  it("writes a template with every finding pending", () => {
    const text = reviewTemplate(audit);
    for (const f of audit.findings) expect(text).toContain(`${f.id}:`);
    expect(text).toContain("status: pending");
  });

  it("applies confirmed, dismissed and missed entries", () => {
    const [first, second] = audit.findings;
    const reviewed = applyReview(audit, {
      findings: { [first!.id]: { status: "confirmed", note: "Wrong number." }, [second!.id]: { status: "dismissed" } },
      missed: [{ entry: "q-001", note: "Found on spot check." }],
    });
    expect(reviewed.summary.confirmed).toBe(1);
    expect(reviewed.summary.dismissed).toBe(1);
    expect(reviewed.summary.pending).toBe(audit.findings.length - 2);
    expect(reviewed.missed).toHaveLength(1);
    expect(reviewed.summary.precision).toBe(0.5);
  });

  it("rejects a review that names an unknown finding", () => {
    expect(() => applyReview(audit, { findings: { "f-999": { status: "confirmed" } } })).toThrow(/f-999/);
  });
});

describe("fix list", () => {
  it("leaves out dismissed findings and names the answers each fix is for", () => {
    const audit = runAudit(LOG, CONFIG);
    const dismissed = audit.findings.find((f) => f.entryId === "q-005")!;
    const reviewed = applyReview(audit, { findings: { [dismissed.id]: { status: "dismissed" } } });
    const fixes = fixList(reviewed);
    expect(fixes.length).toBeGreaterThan(0);
    expect(fixes.flatMap((f) => f.entries)).not.toContain("q-005");
    expect(fixes.find((f) => f.kind === "qualifier")?.entries).toContain("q-002");
  });
});

describe("rendering", () => {
  const audit = runAudit(LOG, CONFIG);

  it("renders a self-contained HTML report with no script and escaped text", () => {
    const html = renderHtml(audit);
    expect(html).toContain("<!doctype html>");
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toContain("<b>einen Firmenwagen</b>");
    expect(html).toContain("&lt;b&gt;einen Firmenwagen&lt;/b&gt;");
    expect(html).toContain("Muster GmbH");
    expect(html).toContain("<mark");
  });

  it("renders the same findings as Markdown", () => {
    const md = renderMarkdown(audit);
    for (const f of audit.findings) expect(md).toContain(f.id);
  });

  it("writes English labels when asked", () => {
    const en = runAudit(LOG, { ...CONFIG, lang: "en" });
    expect(renderHtml(en)).toContain("Findings");
    expect(renderHtml(audit)).toContain("Befunde");
  });
});
