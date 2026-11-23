# API reference

One endpoint does the work. It is deterministic: the same request always gets the same response.

## POST /v1/check

### Request

```json
{
  "question": "Wie viele Urlaubstage bekommen Vollzeitbeschäftigte?",
  "answer": "Vollzeitbeschäftigte erhalten 30 Urlaubstage pro Kalenderjahr.",
  "sources": [
    { "id": "handbuch-4.2", "text": "Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage pro Kalenderjahr." }
  ],
  "document": "optional: the whole document",
  "voice": { "reference": ["page in your house voice", "another page"], "language": "de" }
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `question` | string | yes | At most 2,000 characters. Used to find the sentences in a passage that matter. |
| `answer` | string | yes | At most 20,000 characters. The chatbot's answer. |
| `sources` | list | yes | 1 to 20 items, each a string or `{ id?, text, title? }`, at most 20,000 characters each. The passages the bot answered from. Strings get the ids `s1`, `s2` and so on. |
| `document` | string | no | The whole document. The Scope check looks here for "applies only to" or "gilt nur für". Defaults to the sources joined. |
| `voice.reference` | list of strings | no | Two or more pages in your house voice. Turns on the voice reading. |
| `voice.language` | `"en"` or `"de"` | no | Default `"en"`. |

The whole body may be at most 200 kB.

### Response

```json
{
  "verdict": "fail",
  "failed": ["qualifier"],
  "checks": [
    { "id": "support", "status": "pass", "detail": "Every sentence is made of words from a retrieved passage.", "spans": [] },
    { "id": "scope", "status": "pass", "detail": "The answer stays inside who the handbook is for.", "spans": [] },
    {
      "id": "qualifier",
      "status": "fail",
      "detail": "The answer drops “nach der Probezeit”.",
      "spans": [{ "where": "passage", "passageIndex": 0, "start": 30, "end": 48, "text": "nach der Probezeit" }]
    },
    { "id": "omission", "status": "pass", "detail": "No condition that would change the result was dropped.", "spans": [] }
  ],
  "claims": [
    { "text": "Vollzeitbeschäftigte erhalten 30 Urlaubstage pro Kalenderjahr.", "start": 0, "end": 62, "sourceIndex": 0, "sourceId": "handbuch-4.2", "coverage": 1, "supported": true }
  ],
  "voice": null,
  "engine": { "name": "answer-checker", "version": "0.1.0" }
}
```

- `verdict` is `fail` when any check fails.
- `spans` point at the text behind a result. `where` is `passage` (offsets into `sources[passageIndex].text`), `answer` (offsets into the answer) or `document`.
- `claims` has one entry per answer sentence: the source that covers most of its words, the share covered (0 to 1), and `supported` when that share is at least 0.72.
- `voice` is `null` unless you sent two or more reference pages. Then it is `{ delta, reading, words }`, where `reading` is `close`, `drifting` or `off-voice` and `words` are the five words that moved the distance most.

### Errors

| Status | `error` | When |
| --- | --- | --- |
| 400 | `bad_json` | The body isn't JSON. |
| 400 | `bad_request` | A field is missing or too long. `detail` says which. |
| 404 | `not_found` | Any other path. |
| 405 | `method_not_allowed` | Anything but POST (and OPTIONS when CORS is on). |
| 413 | `too_large` | Body over 200 kB. |
| 429 | `rate_limited` | Over the per-address limit. Retry after 60 seconds. |

## GET /health

`{ "ok": true, "engine": { "name": "answer-checker", "version": "0.1.0" } }`

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | 8787 | Port to listen on. |
| `RATE_PER_MINUTE` | 60 | Requests a minute per client address. Kept in memory, so it is per process. |
| `CORS_ORIGIN` | none | One browser origin allowed to call the API. |
| `STATIC_DIR` | none (set in Docker) | Serve the playground from this folder next to the API. |

The client address comes from the first `x-forwarded-for` entry. Only expose the server behind a proxy that sets that header, or the limit can be dodged.

## As a library

```ts
import { checkAnswer } from "@answer-checker/core";
const result = checkAnswer({ question, answer, sources });
```

`createHandler()` from `packages/api/src/handler.ts` is a plain `(Request) => Response`, so the same endpoint runs on Node, Cloudflare Workers, Deno or Bun.
