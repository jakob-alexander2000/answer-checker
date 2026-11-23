# Running an audit

An audit checks a set of real answers from a chatbot, has a person review every flag, and ends in a report with a list of changes. The tool is in `packages/audit`. A finished example is in [examples/sample-audit](../examples/sample-audit/report.html).

## 1. Collect a log

One JSON object per line (`log.jsonl`), as the chatbot answered:

```json
{"id": "q-017", "question": "Wie lange ist die Probezeit?", "answer": "…", "sources": ["the passages the bot retrieved"], "document": "optional: the whole document"}
```

`id` is optional (`q-001`, `q-002`, … by default). Send `document` when a rule's scope ("gilt nur für …") sits outside the retrieved passages.

## 2. Write the config

```yaml
title: HR-Assistent, Antworten vom November
client: Muster GmbH
bot: HR-Assistent (Produktion)
date: 2026-11-23
lang: de            # or en
reviewer: Name of the person who reviews
scope: One paragraph on what was audited and how the answers were collected.
log: log.jsonl
review: review.yml
out: report
benchmark: ../../bench/de-arbeitsrecht/results/latest.json   # optional: its held-out numbers go into the method section
benchmark_name: de-arbeitsrecht
```

## 3. Run, review, run again

```sh
npm run audit --workspace @answer-checker/audit -- path/to/audit.yml
```

The first run writes `review.yml` with every finding `pending`. A person reads each finding and sets it to `confirmed` (a real problem) or `dismissed` (a false alarm), with a note for the report. Under `missed`, add answers the checker passed but the person found wrong on a spot check. Run again to render the reviewed report.

## Output

- `report.html`: one self-contained page with fonts inlined and no scripts. It prints to A4.
- `report.md`: the same report as Markdown, for a ticket or pull request.
- `audit.json`: everything, for your own tooling.

The report has a summary, a list of changes ordered by severity (dismissed findings left out), every finding with the answer, the source and what is missing, and the method and limits. A finding is **high** when a limit, condition or scope is lost or the answer contradicts the source, and **medium** when a sentence has no source.

## Why a person reviews

On the held-out questions of the [German bench](../bench/de-arbeitsrecht/results/RESULTS.md), about half of the checker's flags are real problems. That is useful for finding where to look, and not good enough to hand over unread. The review turns flags into findings, and the report says how many flags were dismissed.
