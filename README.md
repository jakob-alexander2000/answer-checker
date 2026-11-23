# answer-checker

Checks a document chatbot's answer against the passages it answered from, claim by claim. English and German. Runs offline: no model, no keys, the same result every time.

A support bot reads the handbook and says "Employees get 30 days of leave." The handbook says full-time employees get 30 days after the probation period. Everything the answer says is in the source, and it is still wrong. This catches that.

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

## Try it

- **Playground**: `docker build -t answer-checker . && docker run --rm -p 8787:8787 answer-checker`, then open http://localhost:8787. Six samples in English and German, or paste your own.
- **API**: `POST /v1/check` on the same port. See [docs/api.md](docs/api.md).
- **GitHub Action**: run your bot over a fixed set of questions on every pull request and fail the build when an answer gets worse. See [docs/action.md](docs/action.md).
- **Audit**: check a log of real answers, have a person review every flag, and get a report with a list of changes. See [docs/audit.md](docs/audit.md) and the [sample report](examples/sample-audit/report.html).
- **Library**: `checkAnswer({ question, answer, sources })` from `@answer-checker/core`.

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

Start with the [quickstart](docs/quickstart.md). [How it judges](docs/how-it-judges.md) explains each check, and [limits](docs/limits.md) says what it misses.

## Layout

```
packages/core     checks, voice, claim mode, samples, tests
packages/api      POST /v1/check, rate limit, node server
packages/web      the playground
packages/action   the GitHub Action (action.yml at the root)
packages/audit    audit reports: log in, reviewed HTML and Markdown report out
packages/bench    runs the benches in bench/ and writes their results
bench/            de-arbeitsrecht: 70 questions from German labour law, with results
examples/         a checks.yml built from the samples, and a sample audit
docs/             quickstart, API, action, audit, how it judges, limits
```

## Where it came from

The checks started as [Retrieval Autopsy](https://github.com/jakob-alexander2000/retrieval-autopsy), the voice reading as [Style Distance](https://github.com/jakob-alexander2000/style-distance) and claim mode as [CiteBot](https://github.com/jakob-alexander2000/citebot). Their test sets came along.

## Limits

The checks compare normalised words, not meaning, so some correct paraphrases still fail. The [bench results](bench/de-arbeitsrecht/results/RESULTS.md) show how often, and [docs/limits.md](docs/limits.md) has the full list.

MIT licensed.
