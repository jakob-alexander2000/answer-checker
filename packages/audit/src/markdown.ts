import { fixList, type Audit } from "./audit";
import { explain, strings } from "./i18n";

function mark(text: string, spans: { start: number; end: number }[]): string {
  const sorted = [...spans].filter((s) => s.end > s.start).sort((a, b) => b.start - a.start);
  let out = text;
  for (const s of sorted) out = `${out.slice(0, s.start)}**${out.slice(s.start, s.end)}**${out.slice(s.end)}`;
  return out.replace(/\n+/g, " ");
}

/** The same report as plain Markdown, for tickets and pull requests. */
export function renderMarkdown(audit: Audit): string {
  const t = strings(audit.config.lang);
  const s = audit.summary;
  const c = audit.config;
  const engine = `${audit.engine.name} ${audit.engine.version}`;
  const lines: string[] = [
    `# ${t.kind}: ${c.title}`,
    "",
    `${t.client}: ${c.client} · ${t.bot}: ${c.bot} · ${t.date}: ${c.date} · ${t.engine}: ${engine}`,
    "",
    `## ${t.summary}`,
    "",
    `| | |`,
    `| --- | --- |`,
    `| ${t.answers} | ${s.answers} |`,
    `| ${t.passed} | ${s.passed} |`,
    `| ${t.flagged} | ${s.flagged} (${t.severity.high} ${s.high}, ${t.severity.medium} ${s.medium}) |`,
    `| ${t.confirmed} | ${s.confirmed} |`,
    `| ${t.dismissed} | ${s.dismissed} |`,
    `| ${t.pending} | ${s.pending} |`,
    `| ${t.missed} | ${s.missed} |`,
    "",
    t.reviewNote(s.precision, s.confirmed + s.dismissed),
    "",
    `## ${t.fixes}`,
    "",
  ];
  const fixes = fixList(audit);
  if (fixes.length === 0) lines.push(t.noFindings, "");
  fixes.forEach((f, i) => {
    lines.push(`${i + 1}. **${t.fix[f.kind].title}** (${t.severity[f.severity]}). ${t.fix[f.kind].action} ${t.affects(f.entries.length)}: ${f.entries.join(", ")}`);
  });
  lines.push("", `## ${t.findings}`, "");
  for (const f of audit.findings) {
    const checks = f.checks.map((ch) => (ch === "support" && f.reversed ? t.check.reversed : t.check[ch])).join(", ");
    lines.push(`### ${f.id} · ${f.entryId} · ${t.severity[f.severity]} · ${checks} · ${t.status[f.review.status]}`, "");
    lines.push(`- ${t.question}: ${f.question}`);
    lines.push(`- ${t.answer}: ${mark(f.answer, f.answerSpans)}`);
    f.sources.forEach((src, i) => lines.push(`- ${t.source}: ${mark(src, f.sourceSpans.filter((sp) => sp.passageIndex === i))}`));
    for (const d of explain(t, f.details, f.reversed)) lines.push(`- ${t.engine}: ${d}`);
    if (f.review.note) lines.push(`- ${t.review}: ${f.review.note}`);
    lines.push("");
  }
  if (audit.missed.length > 0) {
    lines.push(`### ${t.missedTitle}`, "");
    for (const m of audit.missed) lines.push(`- ${m.entry}: ${m.question ?? ""} ${m.note}`);
    lines.push("");
  }
  lines.push(`## ${t.method}`, "", ...t.methodText(engine).flatMap((p) => [p, ""]));
  if (c.benchmark) {
    lines.push(
      t.benchmarkText({ name: c.benchmark.name, questions: c.benchmark.questions, caught: c.benchmark.caught, drifted: c.benchmark.drifted, precision: c.benchmark.failPrecision }) +
        (c.benchmark.url ? ` ${c.benchmark.url}` : ""),
      "",
    );
  }
  lines.push(`## ${t.limits}`, "", ...t.limitsText.map((p) => `- ${p}`), "");
  return lines.join("\n");
}
