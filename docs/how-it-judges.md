# How it judges

The checks read words, not meaning. Each one looks for a specific way an answer goes wrong, and each failure points at the text behind it. Everything below is in `packages/core/src/checks.ts` and `text.ts`.

First, the answer is split into sentences, and every sentence is matched to the passage that covers most of its content words. Stopwords in English and German are left out, and so is case. That match is a **claim**, with a coverage share from 0 to 1.

## Support

**Fails when** a sentence in the answer has under 72% of its content words in any one passage.

It catches invented sentences, like "Zusätzlich gibt es einen Bonus für alle Abteilungen." added to an answer about leave. A single changed word usually stays above 72%, so a wrong number is left to Qualifier.

## Scope

**Fails when** the document says who a rule is for ("applies only to …", "gilt nur für …") and the answer widens that:

- It uses a broad phrase like "everyone", "all employees", "alle Mitarbeitenden" or "jede Person". A "not" or "nicht" right before it is fine.
- It restates "applies to" or "gilt für" without "only" or "nur", and leaves out part of who the rule is for.
- It says a group the document excludes ("does not apply to contractors", "gilt nicht für Leiharbeitskräfte") receives the thing.

Scope reads the whole `document` if you send one, so send it when the restriction sits in an opening section that isn't among the passages.

## Qualifier

**Fails when** a limit in the relevant part of the source is missing from the answer.

It only looks at the passages the answer leans on, and inside those at the sentences closest to the question. Then it lists the qualifiers in those sentences and checks each one is still in the answer:

| | English | German |
| --- | --- | --- |
| Who | "full-time employees only", "staff only" | "nur für Vollzeitbeschäftigte", "ausschließlich …" |
| When | "after the probation period", "during …" | "nach der Probezeit", "während der Probezeit" |
| How much | "€1,200", "1.5 times", "up to 2", "at least 10" | "1.200 €", "bis zu 2", "mindestens 10", "höchstens …" |
| How long | "30 days", "6 weeks", "4th working day" | "30 Urlaubstage", "6 Wochen", "10 Arbeitstage" |

An answer that changes a number fails too, since the source's number is no longer in it.

## Omission

**Fails when** an exception in the relevant source sentences is missing from the answer. It looks for the clause that starts with:

- English: unless, except, provided that, subject to, only if, only when, are not eligible
- German: es sei denn, außer (wenn), sofern, vorausgesetzt, ausgenommen, nur wenn, nicht berechtigt, keinen Anspruch

The whole clause up to the full stop has to survive, not just the word.

## Voice (optional)

Burrows' Delta over the 150 most frequent words of your reference pages, compared with the answer. The cut-offs come from a calibration on public-domain novels: at or under 0.785 is **close**, at or over 1.272 is **off-voice**, and anything between is **drifting**. The TypeScript matches a Python reference implementation to 1e-9, and a test runs both.

## Claim mode (optional)

When you pass your own model call, each claim goes to the model with the sources and comes back as pass, fail or unsupported, with the passage it relied on. The prompt is `claimPrompt` in `packages/core/src/claims/verify.ts`. The engine never calls a model by itself and holds no keys.
