import type { CheckOutput } from "@answer-checker/core";

export type MarkKind = "claim" | "kept" | "fault";
export type Mark = { start: number; end: number; kind: MarkKind };
export type Segment = { text: string; kind: MarkKind | null };

const RANK: Record<MarkKind, number> = { claim: 1, kept: 2, fault: 3 };

/** Cut text into runs, each with the strongest mark that covers it. */
export function segments(text: string, marks: readonly Mark[]): Segment[] {
  const kinds: (MarkKind | null)[] = new Array(text.length).fill(null);
  for (const mark of marks) {
    const from = Math.max(0, mark.start);
    const to = Math.min(text.length, mark.end);
    for (let i = from; i < to; i += 1) {
      const current = kinds[i] ?? null;
      if (!current || RANK[mark.kind] > RANK[current]) kinds[i] = mark.kind;
    }
  }
  const out: Segment[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const kind = kinds[i] ?? null;
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text[i];
    else out.push({ text: text[i]!, kind });
  }
  return out;
}

/** Turn a check result into marks on the answer and on each source passage. */
export function marksFor(out: CheckOutput, sourceCount: number): { answer: Mark[]; sources: Mark[][] } {
  const answer: Mark[] = out.claims.map((claim) => ({
    start: claim.start,
    end: claim.end,
    kind: claim.supported ? "claim" : "fault",
  }));
  const sources: Mark[][] = Array.from({ length: sourceCount }, () => []);
  for (const check of out.checks) {
    const kind: MarkKind = check.status === "fail" ? "fault" : "kept";
    for (const span of check.spans) {
      if (span.where === "answer") answer.push({ start: span.start, end: span.end, kind });
      if (span.where === "passage") sources[span.passageIndex]?.push({ start: span.start, end: span.end, kind });
    }
  }
  return { answer, sources };
}
