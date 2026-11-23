# Quickstart

Three ways in. None needs an API key, and none sends your text anywhere.

## 1. Try it in the playground (2 minutes)

```sh
git clone https://github.com/jakob-alexander2000/answer-checker
cd answer-checker
docker build -t answer-checker .
docker run --rm -p 8787:8787 answer-checker
```

Open http://localhost:8787. Pick a sample, or paste a passage from your own handbook and an answer your chatbot gave. The verdict, the marked answer and the marked source update as you type.

No Docker? Run the playground with Node 22 instead:

```sh
npm install
npm run dev --workspace @answer-checker/web
```

## 2. Call the API (5 minutes)

The same container serves `POST /v1/check`:

```sh
curl -s localhost:8787/v1/check -H 'content-type: application/json' -d '{
  "question": "How many days of annual leave do employees get?",
  "answer": "Employees receive 30 days of paid annual leave.",
  "sources": ["Full-time employees receive 30 days of paid annual leave after the probation period."]
}'
```

You get `"verdict": "fail"` with `"failed": ["qualifier"]`, and the check names the two phrases the answer dropped. Add them back and it passes. The full request and response are in [api.md](api.md).

## 3. Check your bot on every pull request (10 minutes)

Write a `checks.yml` with questions your bot should get right:

```yaml
name: handbook
answer_command: node scripts/ask-bot.mjs   # gets each case as JSON on stdin, prints the answer
cases:
  - id: leave
    question: How many days of annual leave do employees get?
    source_files: [docs/handbook/leave.md]
  - id: telework
    question: May I work from home for 2 days a week?
    source_files: [docs/handbook/telework.md]
```

Add the action to a workflow:

```yaml
- uses: actions/checkout@v4
- uses: jakob-alexander2000/answer-checker@main
  with:
    config: checks.yml
```

Each run writes a dated receipt and fails the build when an answer stops passing. The details are in [action.md](action.md).

## Next

- [How it judges](how-it-judges.md): what each check looks for, in English and German.
- [Limits](limits.md): what it misses. Read this before you rely on it.
