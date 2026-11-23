# answer-checker

Checks a document chatbot's answer against the passages it answered from, claim by claim. English and German. Runs offline: no model, no keys, the same result every time.

A support bot reads the handbook and says "Employees get 30 days of leave." The handbook says full-time employees get 30 days after the probation period. Every word of the answer is in the source and it is still wrong. This catches that.

## The checks

| Check | Fails when the answer |
| --- | --- |
| Support | has a sentence no source covers |
| Scope | widens who a rule applies to ("all employees" for a full-time rule) |
| Qualifier | drops a limit, number or amount ("after the probation period", "bis zu 1.200 €") |
| Omission | drops an exception ("unless", "es sei denn", "außer", "sofern") |

Optional extras:

- **Claims**: each answer sentence is mapped to the source that covers it, with a coverage score.
- **Voice**: give two or more pages in your house voice and the answer gets a Burrows' Delta reading (close, drifting, off-voice). The TypeScript matches a Python reference to 1e-9.
- **Claim mode**: pass your own model call (`complete(prompt) => Promise<string>`) and each claim gets a pass, fail or unsupported verdict with the evidence quoted. The engine never calls a model by itself.

## Use it as a library

```ts
import { checkAnswer } from "@answer-checker/core";

const result = checkAnswer({
  question: "Wie viele Urlaubstage gibt es?",
  answer: "Vollzeitbeschäftigte erhalten 30 Urlaubstage im Jahr.",
  sources: [{ id: "handbuch-4.2", text: "Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage im Jahr." }],
});

result.verdict; // "fail"
result.failed;  // ["qualifier"]
```

## Use it over HTTP

```sh
npm install
npm start --workspace @answer-checker/api   # http://localhost:8787
```

```sh
curl -s localhost:8787/v1/check -H 'content-type: application/json' -d '{
  "question": "How many days of leave do employees get?",
  "answer": "Employees receive 30 days of paid annual leave.",
  "sources": ["Full-time employees receive 30 days of paid annual leave after the probation period."]
}'
```

`POST /v1/check` takes `question`, `answer`, `sources` (strings or `{ id, text, title }`), and optionally `document` and `voice: { reference, language }`. It returns `verdict`, `failed`, `checks`, `claims`, `voice` and `engine`. Limits: 200 kB body, 20 sources, 60 requests a minute per address (`RATE_PER_MINUTE`). `CORS_ORIGIN` allows one browser origin. `GET /health` for probes.

The handler is a plain `(Request) => Response`, so it also runs on Workers, Deno and Bun.

## Layout

```
packages/core   checks, retrieval helpers, voice, claim mode, tests
packages/api    POST /v1/check, rate limit, node server
```

## Where it came from

The checks started as [Retrieval Autopsy](https://github.com/jakob-alexander2000/retrieval-autopsy), the voice reading as [Style Distance](https://github.com/jakob-alexander2000/style-distance) and claim mode as [CiteBot](https://github.com/jakob-alexander2000/citebot). Their test sets came along.

## Limits

The checks are lexical. They catch dropped conditions and unsupported sentences well and paraphrase poorly: a correct answer in very different words can fail Support. Claim mode is the answer to that, at the cost of a model call.

MIT licensed.
