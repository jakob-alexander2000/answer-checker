# How it judges

The checks read words, normalised so that the same meaning in different spelling still matches. Each check looks for a specific way an answer goes wrong, and each failure points at the text behind it. Everything below is in `packages/core/src/checks.ts`, `text.ts` and `normalize.ts`. There is no model and no network call.

Before comparing, both the answer and the passages are normalised:

- **Inflection.** A light stemmer folds "Kündigungen", "Kündigung" and "kündigen" together, and splits compounds, so "Ruhepause" covers "Pause" and "Schwangerschaftsuntersuchung" is covered by "Untersuchung" plus "Schwangerschaft".
- **Numbers.** "acht", "8", "vierundzwanzig" and "24" are the same number. "eine halbe Stunde", "eine Viertelstunde" and "30 Minuten" become hours, and years become months, so "ein halbes Jahr" equals "sechs Monate".
- **A short synonym list** for plain-language words ("Gehalt" for "Arbeitsentgelt", "erlaubt" for "zulässig", "sofort" for "unverzüglich"). It lives in `SYNONYMS` in `normalize.ts`.
- **Negation is counted, not matched.** "nicht zulässig" and "unzulässig" both carry one negation. A leading "Ja" or "Nein" answers the question and is ignored.

Then the answer is split into sentences, and every sentence is matched to the passage that covers most of its normalised words. That match is a **claim**, with a coverage share from 0 to 1.

## Support

**Fails when** a sentence in the answer has under 60% of its normalised words in any one passage (words from the question count too, since restating the question is not a claim), or when a clause says the opposite of the matching passage clause.

It catches invented sentences, like "Zusätzlich gibt es einen Bonus für alle Abteilungen." added to an answer about leave, and reversals, like "Eine Kündigung ist zulässig." against "Eine Kündigung ist unzulässig." Numbers are left out of Support and compared by Qualifier.

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

Numbers are compared as quantities: value, unit and bound. "wenigstens 24 Werktage" keeps "mindestens 24 Werktage". "zehn Stunden" for "acht Stunden" fails, and so does "10 Tagesgehälter" for "höchstens 10 Tagesgehälter", because the upper bound is gone. A number in the answer that no passage or the question gives fails as a changed limit.

When a source sentence lists cases ("30 Minuten bei mehr als sechs Stunden und 45 Minuten bei mehr als neun Stunden"), an answer about one case only needs that case's limits. Limits inside a condition are always needed.

## Omission

**Fails when** an exception in the relevant source sentences is missing from the answer. It looks for the clause that starts with:

- English: unless, except, provided that, subject to, only if, only when, are not eligible
- German: es sei denn, außer (wenn), sofern, soweit, wenn, falls, solange, ohne dass, vorausgesetzt, ausgenommen, nur wenn, nicht berechtigt, keinen Anspruch, and verb-first conditions closed by "so" ("Hat der Arbeitnehmer Anspruch auf …, so …")

A condition is kept when the answer still states a condition (any of the words above, or a verb-first clause such as "Sind Sie krank, …") and keeps at least 40% of what the condition is about. So "außer betriebliche Gründe stehen entgegen" keeps "soweit betriebliche Gründe nicht entgegenstehen".

## Voice (optional)

Burrows' Delta over the 150 most frequent words of your reference pages, compared with the answer. The cut-offs come from a calibration on public-domain novels: at or under 0.785 is **close**, at or over 1.272 is **off-voice**, and anything between is **drifting**. The TypeScript matches a Python reference implementation to 1e-9, and a test runs both.

## Claim mode (optional)

When you pass your own model call, each claim goes to the model with the sources and comes back as pass, fail or unsupported, with the passage it relied on. The prompt is `claimPrompt` in `packages/core/src/claims/verify.ts`. The engine never calls a model by itself and holds no keys.
