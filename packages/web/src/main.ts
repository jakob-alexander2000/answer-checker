import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/martian-mono/400.css";
import "./styles.css";
import { checkAnswer, ENGINE, SAMPLES, type CheckOutput, type Sample } from "@answer-checker/core";
import { marksFor, segments, type Mark } from "./segments";

const NAMES: Record<string, string> = { support: "Support", scope: "Scope", qualifier: "Qualifier", omission: "Omission" };

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} missing`);
  return element as T;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const form = {
  question: byId<HTMLInputElement>("question"),
  sources: byId<HTMLTextAreaElement>("sources"),
  answer: byId<HTMLTextAreaElement>("answer"),
  document: byId<HTMLTextAreaElement>("document"),
};
const swapRow = byId<HTMLDivElement>("swap-row");
const swap = byId<HTMLButtonElement>("swap");
const result = byId<HTMLElement>("result");
byId("engine").textContent = `${ENGINE.name} ${ENGINE.version}`;

let current: Sample | null = null;
let showingFaithful = false;

function splitPassages(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function marked(text: string, marks: readonly Mark[]): HTMLElement {
  const block = el("p", "marked");
  for (const part of segments(text, marks)) {
    if (!part.kind) block.append(part.text);
    else block.append(el("mark", `m-${part.kind}`, part.text));
  }
  return block;
}

function render(out: CheckOutput, sources: string[], answer: string): void {
  const marks = marksFor(out, sources.length);
  const failed = out.failed.map((id) => NAMES[id] ?? id);
  result.replaceChildren();

  const verdict = el("div", `verdict ${out.verdict === "fail" ? "is-fault" : ""}`);
  verdict.append(el("span", "verdict-word", out.verdict === "fail" ? "Fail" : "Pass"));
  verdict.append(el("span", "verdict-note mono", failed.length ? failed.join(", ") : "All four checks pass"));
  result.append(verdict);

  const grid = el("div", "panes");
  const answerPane = el("section", "pane");
  answerPane.append(el("h2", "label", "Answer"), marked(answer, marks.answer));
  grid.append(answerPane);
  sources.forEach((text, index) => {
    const pane = el("section", "pane");
    pane.append(el("h2", "label", `Source s${index + 1}`), marked(text, marks.sources[index] ?? []));
    grid.append(pane);
  });
  result.append(grid);

  const checks = el("ol", "rows");
  for (const check of out.checks) {
    const row = el("li", `row ${check.status === "fail" ? "is-fault" : ""}`);
    row.append(el("span", "row-name", NAMES[check.id] ?? check.id));
    row.append(el("span", "row-status mono", check.status));
    row.append(el("span", "row-detail", check.detail));
    checks.append(row);
  }
  const checksPane = el("section", "block");
  checksPane.append(el("h2", "label", "Checks"), checks);
  result.append(checksPane);

  const claims = el("ol", "rows");
  out.claims.forEach((claim, index) => {
    const row = el("li", `row claim ${claim.supported ? "" : "is-fault"}`);
    row.append(el("span", "row-name mono", String(index + 1).padStart(2, "0")));
    row.append(el("span", "row-detail", claim.text));
    row.append(
      el(
        "span",
        "row-status mono",
        `${claim.sourceId ?? "no source"} · ${Math.round(claim.coverage * 100)}%`,
      ),
    );
    claims.append(row);
  });
  const claimsPane = el("section", "block");
  claimsPane.append(el("h2", "label", "Claims"), claims);
  result.append(claimsPane);
}

function run(): void {
  const sources = splitPassages(form.sources.value);
  const question = form.question.value.trim();
  const answer = form.answer.value.trim();
  if (!sources.length || !answer || !question) {
    result.replaceChildren(el("p", "empty mono", "Add a question, a source and an answer, or load a sample."));
    return;
  }
  const out = checkAnswer({
    question,
    answer,
    sources,
    document: form.document.value.trim() || undefined,
  });
  render(out, sources, answer);
}

function swapLabel(): void {
  swap.textContent = showingFaithful ? "Show the drifted answer" : "Show the faithful answer";
}

function load(sample: Sample, faithful = false): void {
  current = sample;
  showingFaithful = faithful;
  form.question.value = sample.question;
  form.sources.value = sample.sources.join("\n\n");
  form.answer.value = faithful ? sample.faithful : sample.drifted;
  form.document.value = sample.document;
  swapRow.hidden = false;
  swapLabel();
  document.querySelectorAll<HTMLButtonElement>(".sample").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.id === sample.id));
  });
  run();
}

const list = byId<HTMLOListElement>("samples");
SAMPLES.forEach((sample, index) => {
  const item = el("li");
  const button = el("button", "sample");
  button.type = "button";
  button.dataset.id = sample.id;
  button.setAttribute("aria-pressed", "false");
  button.append(
    el("span", "mono", String(index + 1).padStart(2, "0")),
    el("span", "sample-title", sample.title),
    el("span", "mono sample-meta", `${sample.language.toUpperCase()} · ${NAMES[sample.catches]}`),
  );
  button.addEventListener("click", () => load(sample));
  item.append(button);
  list.append(item);
});

swap.addEventListener("click", () => {
  if (current) load(current, !showingFaithful);
});

let timer: ReturnType<typeof setTimeout> | undefined;
for (const field of Object.values(form)) {
  field.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  });
}

const first = SAMPLES[0];
if (first) load(first);
