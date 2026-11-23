import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Span } from "@answer-checker/core";
import { fixList, type Audit, type Finding } from "./audit";
import { explain, strings } from "./i18n";

export function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Escape the text and wrap each span in a <mark>. Overlapping spans are merged. */
export function highlight(text: string, spans: { start: number; end: number }[], cls = "fault"): string {
  const sorted = spans
    .filter((s) => s.start >= 0 && s.end <= text.length && s.end > s.start)
    .sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else merged.push({ start: s.start, end: s.end });
  }
  let out = "";
  let cursor = 0;
  for (const s of merged) {
    out += escape(text.slice(cursor, s.start));
    out += `<mark class="${cls}">${escape(text.slice(s.start, s.end))}</mark>`;
    cursor = s.end;
  }
  return out + escape(text.slice(cursor));
}

function fontFaces(): string {
  try {
    const require = createRequire(import.meta.url);
    const read = (id: string) => readFileSync(require.resolve(id)).toString("base64");
    const archivo = read("@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2");
    const mono = read("@fontsource/martian-mono/files/martian-mono-latin-400-normal.woff2");
    return `@font-face{font-family:"Archivo Variable";font-style:normal;font-display:swap;font-weight:100 900;font-stretch:62% 125%;src:url(data:font/woff2;base64,${archivo}) format("woff2-variations")}
@font-face{font-family:"Martian Mono";font-style:normal;font-display:swap;font-weight:400;src:url(data:font/woff2;base64,${mono}) format("woff2")}`;
  } catch {
    return ""; // fall back to system fonts
  }
}

const CSS = `
:root{--ground:#f2f2f0;--sheet:#fff;--ink:#0b0b0b;--grey:#5f5f5d;--rule:#d4d4d1;--fault:#c4161c;--sans:"Archivo Variable","Archivo","Helvetica Neue",Arial,sans-serif;--mono:"Martian Mono",Menlo,monospace;color-scheme:light}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font:15px/1.55 var(--sans)}
.sheet{max-width:820px;margin:32px auto;background:var(--sheet);padding:56px 64px}
@media (max-width:720px){.sheet{margin:0;padding:32px 16px}}
.label,.mono{font-family:var(--mono);font-size:11px;letter-spacing:0}
.label{text-transform:uppercase}
.label{display:block;color:var(--grey);margin:0 0 6px}
header.cover{border-top:3px solid var(--ink);padding-top:16px;margin-bottom:40px}
h1{font-size:40px;line-height:1.05;font-weight:800;font-stretch:112%;margin:8px 0 24px;letter-spacing:-0.01em}
h2{font-size:20px;font-weight:700;font-stretch:112%;margin:48px 0 16px;padding-top:12px;border-top:1px solid var(--ink)}
h3{font-size:15px;font-weight:700;margin:0}
dl.meta{display:grid;grid-template-columns:max-content 1fr;gap:4px 24px;margin:0}
dl.meta dt{font-family:var(--mono);font-size:11px;text-transform:uppercase;color:var(--grey);padding-top:3px}
dl.meta dd{margin:0}
.figures{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);margin:16px 0}
.figures div{padding:12px 12px 12px 0}
.figures b{display:block;font-size:32px;font-weight:800;font-stretch:112%;line-height:1.1}
.figures .bad b{color:var(--fault)}
@media (max-width:720px){.figures{grid-template-columns:repeat(2,1fr)}}
table{width:100%;border-collapse:collapse;margin:8px 0}
td,th{text-align:left;vertical-align:top;padding:6px 8px 6px 0;border-bottom:1px solid var(--rule)}
th{font-family:var(--mono);font-size:11px;font-weight:400;text-transform:uppercase;color:var(--grey)}
td.n{text-align:right;font-variant-numeric:tabular-nums}
.finding{border-top:1px solid var(--rule);padding:20px 0;break-inside:avoid}
.finding .head{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline;margin-bottom:12px}
.tag{font-family:var(--mono);font-size:11px;text-transform:uppercase;border:1px solid var(--ink);padding:1px 6px}
.tag.high{background:var(--ink);color:var(--sheet)}
.tag.dismissed{border-color:var(--rule);color:var(--grey)}
.row{display:grid;grid-template-columns:96px 1fr;gap:12px;margin:6px 0}
@media (max-width:720px){.row{grid-template-columns:1fr;gap:2px}}
.row .label{margin:3px 0 0}
blockquote{margin:0;padding:0 0 0 12px;border-left:1px solid var(--rule)}
mark.fault{background:none;color:var(--fault);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
mark.dropped{background:none;color:var(--ink);text-decoration:underline wavy var(--fault);text-underline-offset:3px}
ul.details{margin:4px 0 0;padding:0;list-style:none;color:var(--grey)}
.dismissed-finding{color:var(--grey)}
.dismissed-finding mark{color:var(--grey)}
ol.fixes{padding-left:20px}
ol.fixes li{margin:0 0 16px}
.muted{color:var(--grey)}
footer{margin-top:48px;padding-top:12px;border-top:1px solid var(--ink)}
@page{size:A4;margin:16mm}
@media print{body{background:#fff;font-size:10.5pt}.sheet{margin:0;padding:0;max-width:none}h2{break-after:avoid}}
`;

function tagsFor(f: Finding, t: ReturnType<typeof strings>): string {
  const checks = f.checks.map((c) => (c === "support" && f.reversed ? t.check.reversed : t.check[c]));
  const review = f.review.status === "pending" ? "" : `<span class="tag ${f.review.status}">${escape(t.status[f.review.status])}</span>`;
  return `<span class="tag ${f.severity}">${escape(t.severity[f.severity])}</span>${checks.map((c) => `<span class="tag">${escape(c)}</span>`).join("")}${review}`;
}

function findingHtml(f: Finding, t: ReturnType<typeof strings>): string {
  const sources = f.sources
    .map((text, i) => {
      const spans = f.sourceSpans.filter((s: Span) => s.passageIndex === i);
      return `<blockquote>${highlight(text, spans, "dropped")}</blockquote>`;
    })
    .join("");
  const note = f.review.note ? escape(f.review.note) : "";
  return `<article class="finding${f.review.status === "dismissed" ? " dismissed-finding" : ""}" id="${escape(f.id)}">
<div class="head"><h3><span class="mono">${escape(f.id)}</span> · <span class="mono">${escape(f.entryId)}</span></h3>${tagsFor(f, t)}</div>
<div class="row"><span class="label">${t.question}</span><div>${escape(f.question)}</div></div>
<div class="row"><span class="label">${t.answer}</span><div>${highlight(f.answer, f.answerSpans)}</div></div>
<div class="row"><span class="label">${t.source}</span><div>${sources}</div></div>
<div class="row"><span class="label">${t.engine}</span><ul class="details">${explain(t, f.details, f.reversed).map((d) => `<li>${escape(d)}</li>`).join("")}</ul></div>
${f.review.status !== "pending" || note ? `<div class="row"><span class="label">${t.review}</span><div><b>${escape(t.status[f.review.status])}.</b> ${note}</div></div>` : ""}
</article>`;
}

export function renderHtml(audit: Audit, options: { fonts?: boolean } = {}): string {
  const t = strings(audit.config.lang);
  const s = audit.summary;
  const c = audit.config;
  const engine = `${audit.engine.name} ${audit.engine.version}`;
  const reviewed = s.confirmed + s.dismissed;
  const fixes = fixList(audit);
  const figure = (n: number, label: string, bad = false) => `<div${bad ? ' class="bad"' : ""}><b>${n}</b><span class="label">${escape(label)}</span></div>`;
  const meta: [string, string][] = [
    [t.client, c.client],
    [t.bot, c.bot],
    [t.date, c.date],
    [t.engine, engine],
    ...(c.reviewer ? ([[t.reviewer, c.reviewer]] as [string, string][]) : []),
  ];
  const visible = audit.findings;
  const body = `<main class="sheet">
<header class="cover">
<span class="label">${escape(t.kind)}</span>
<h1>${escape(c.title)}</h1>
<dl class="meta">${meta.map(([k, v]) => `<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`).join("")}</dl>
${c.scope ? `<p>${escape(c.scope)}</p>` : ""}
</header>

<section>
<h2>${t.summary}</h2>
<div class="figures">
${figure(s.answers, t.answers)}
${figure(s.passed, t.passed)}
${figure(s.flagged, t.flagged)}
${figure(reviewed > 0 ? s.confirmed : s.flagged, reviewed > 0 ? t.confirmed : t.pending, true)}
</div>
<table>
<tr><th>${t.severity.high}</th><td class="n">${s.high}</td><th>${t.confirmed}</th><td class="n">${s.confirmed}</td></tr>
<tr><th>${t.severity.medium}</th><td class="n">${s.medium}</td><th>${t.dismissed}</th><td class="n">${s.dismissed}</td></tr>
<tr><th>${t.pending}</th><td class="n">${s.pending}</td><th>${t.missed}</th><td class="n">${s.missed}</td></tr>
</table>
<p class="muted">${escape(t.reviewNote(s.precision, reviewed))}</p>
</section>

<section>
<h2>${t.fixes}</h2>
${
  fixes.length === 0
    ? `<p>${t.noFindings}</p>`
    : `<ol class="fixes">${fixes
        .map(
          (f) =>
            `<li><h3>${escape(t.fix[f.kind].title)} <span class="tag ${f.severity}">${escape(t.severity[f.severity])}</span></h3><p>${escape(t.fix[f.kind].action)}</p><p class="mono">${escape(t.affects(f.entries.length))}: ${f.entries.map(escape).join(", ")}</p></li>`,
        )
        .join("")}</ol>`
}
</section>

<section>
<h2>${t.findings}</h2>
${visible.length === 0 ? `<p>${t.noFindings}</p>` : visible.map((f) => findingHtml(f, t)).join("\n")}
${
  audit.missed.length > 0
    ? `<h3 style="margin-top:32px">${escape(t.missedTitle)}</h3><table><tr><th>ID</th><th>${t.question}</th><th>${t.review}</th></tr>${audit.missed
        .map((m) => `<tr><td class="mono">${escape(m.entry)}</td><td>${escape(m.question ?? "")}</td><td>${escape(m.note)}</td></tr>`)
        .join("")}</table>`
    : ""
}
</section>

<section>
<h2>${t.method}</h2>
${t.methodText(engine).map((p) => `<p>${escape(p)}</p>`).join("")}
${
  c.benchmark
    ? `<p>${escape(
        t.benchmarkText({
          name: c.benchmark.name,
          questions: c.benchmark.questions,
          caught: c.benchmark.caught,
          drifted: c.benchmark.drifted,
          precision: c.benchmark.failPrecision,
        }),
      )}${c.benchmark.url ? ` <a href="${escape(c.benchmark.url)}">${escape(c.benchmark.url)}</a>` : ""}</p>`
    : ""
}
<h2>${t.limits}</h2>
<ul>${t.limitsText.map((p) => `<li>${escape(p)}</li>`).join("")}</ul>
</section>
<footer class="mono">${escape(t.kind)} · ${escape(c.client)} · ${escape(c.date)} · ${escape(engine)}</footer>
</main>`;
  const fonts = options.fonts === false ? "" : fontFaces();
  return `<!doctype html>
<html lang="${c.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(`${t.kind}: ${c.client}`)}</title>
<style>${fonts}${CSS}</style>
</head>
<body>
${body}
</body>
</html>
`;
}
