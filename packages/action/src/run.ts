import { spawn } from "node:child_process";
import { checkAnswer, type CheckId } from "@answer-checker/core";
import type { Case, Suite } from "./config";

export type CaseResult = {
  id: string;
  /** True when the checks said what the case expected. */
  ok: boolean;
  verdict: "pass" | "fail";
  failed: CheckId[];
  answer: string;
  error?: string;
};

export type Answerer = (item: Case) => Promise<string>;

/** Run a shell command per case: the case goes in as JSON on stdin, the answer comes out on stdout (text or {"answer": ...}). */
export function commandAnswerer(command: string, timeoutMs = 60_000): Answerer {
  return (item) =>
    new Promise((resolve, reject) => {
      const child = spawn(command, { shell: true, stdio: ["pipe", "pipe", "pipe"], timeout: timeoutMs });
      let out = "";
      let err = "";
      child.stdout.on("data", (chunk) => (out += chunk));
      child.stderr.on("data", (chunk) => (err += chunk));
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) return reject(new Error(`answer_command exited ${code}: ${err.trim().slice(0, 300)}`));
        const text = out.trim();
        try {
          const parsed = JSON.parse(text) as { answer?: unknown };
          if (parsed && typeof parsed.answer === "string") return resolve(parsed.answer);
        } catch {
          // plain text answer
        }
        resolve(text);
      });
      child.stdin.end(JSON.stringify({ id: item.id, question: item.question, sources: item.sources }));
    });
}

export async function runSuite(suite: Suite, answerer?: Answerer): Promise<CaseResult[]> {
  const ask = answerer ?? (suite.answerCommand ? commandAnswerer(suite.answerCommand) : undefined);
  const results: CaseResult[] = [];
  for (const item of suite.cases) {
    let answer = item.answer;
    try {
      if (answer === undefined) {
        if (!ask) throw new Error("no answer and no answer_command");
        answer = await ask(item);
      }
      if (!answer.trim()) throw new Error("empty answer");
      const out = checkAnswer({ question: item.question, answer, sources: item.sources, document: item.document });
      const ok =
        item.expect === "pass"
          ? out.verdict === "pass"
          : out.verdict === "fail" && item.expectFailed.every((check) => out.failed.includes(check));
      results.push({ id: item.id, ok, verdict: out.verdict, failed: out.failed, answer });
    } catch (error) {
      results.push({ id: item.id, ok: false, verdict: "fail", failed: [], answer: answer ?? "", error: (error as Error).message });
    }
  }
  return results;
}
