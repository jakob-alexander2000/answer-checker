# GitHub Action

Runs your bot over a fixed set of questions on every change, checks each answer against its sources, writes a receipt and fails the build when something gets worse. It runs on the GitHub runner. Nothing is sent to a service.

## checks.yml

```yaml
name: handbook                       # names the receipt
answer_command: node scripts/ask.mjs # optional; asked for every case without a fixed answer
cases:
  - id: leave
    question: How many days of annual leave do employees get?
    source_files: [docs/handbook/leave.md]   # paths relative to checks.yml
  - id: telework
    question: May I work from home for 2 days a week?
    sources:
      - Staff may telework for up to 2 days each week, unless they are in the probation period.
  - id: known-bad
    question: How many days of annual leave do employees get?
    sources: [Full-time employees receive 30 days after the probation period.]
    answer: Employees receive 30 days.      # a fixed answer: no command is run
    expect: fail                            # this case proves the checker catches it
    expect_failed: [qualifier]
```

| Key | Meaning |
| --- | --- |
| `id` | Unique per case. Receipts compare cases by id. |
| `question` | Required. |
| `sources`, `source_files` | At least one between them. Files are read whole. |
| `answer` | A fixed answer. Leave it out to ask `answer_command`. |
| `document`, `document_file` | Optional whole document, for the Scope check. |
| `expect` | `pass` (default) or `fail`. |
| `expect_failed` | With `expect: fail`, the checks that must be among the failures. |

### answer_command

A shell command run once per case. It gets `{"id", "question", "sources"}` as JSON on stdin and prints the answer on stdout, as plain text or as `{"answer": "..."}`. A non-zero exit or an empty answer fails that case. Each call may take up to 60 seconds.

This is where your own bot gets called. If it needs a key, pass the key to the step as a secret; the action never sees it.

## Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `config` | `checks.yml` | Path to the suite. |
| `receipts` | `checks/receipts` | Where receipts and `latest.json` go. |
| `fail-on` | `any` | `any` fails on every case that isn't as expected. `regression` fails only on cases that passed in the last receipt and fail now, or are new and fail. |

Outputs: `passed`, `total`, `receipt` (the path of this run's receipt).

## Receipts

Each run writes `<receipts>/<date>-<name>.json` and updates `<receipts>/latest.json`. The receipt holds the date, the commit, `passed` of `total`, the failing case ids, and every case's verdict, failed checks and answer.

To get regression checks across runs, commit the receipts folder. With nothing committed, every run starts fresh, so use `fail-on: any`. A run also writes a table to the job summary.

## Example

```yaml
name: answers
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - uses: jakob-alexander2000/answer-checker@main
        with:
          config: checks.yml
          fail-on: regression
        env:
          BOT_API_KEY: ${{ secrets.BOT_API_KEY }}
```

This repo runs the action on its own samples in CI: see `examples/handbook/checks.yml`.
