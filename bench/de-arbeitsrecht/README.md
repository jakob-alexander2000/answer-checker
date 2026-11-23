# Bench: German labour law (de-arbeitsrecht)

70 questions a chatbot on an HR or public-service site would get, each with three answers:

- **faithful**: says what the passage says, close to its wording. Should pass.
- **paraphrase**: says the same thing in plain words. Should pass.
- **drifted**: wrong in one way that matters (a changed number, a dropped condition, a reversed rule). Should fail, ideally on the check named in `drift`.

The current numbers are in [results/RESULTS.md](results/RESULTS.md). They are not good yet, and they are published anyway: this bench exists to measure the checker, not to advertise it.

## Sources

Seven federal laws: BUrlG, EntgFG, ArbZG, TzBfG, KSchG, MuSchG (2018) and NachwG, in `sources/`. The texts come from the [bundestag/gesetze](https://github.com/bundestag/gesetze) mirror. That mirror is not kept up to date (for example NachwG predates the 2022 reform), so treat these files as **test documents, not current law**. Nothing here is legal advice. German statutes are official works and not protected by copyright (§ 5 UrhG).

## Method

- Every `passage` is checked to appear word for word in its source file (whitespace ignored). The loader refuses a case that does not.
- The whole law is passed as `document`, so the Scope check can see the full text.
- Answers were written by hand with Claude's help and reviewed against the passage. Each drifted answer carries a `note` saying what was changed.
- No model is called. The run is deterministic, and CI fails if the committed results differ from a fresh run.

## Run it

```sh
npm run bench
```

## Add a case

Add an entry to a file in `cases/` with `id`, `question`, `passage`, `faithful`, `paraphrase`, `drifted`, `drift` (support, scope, qualifier or omission) and `note`. Avoid values that start with a double quote; use single quotes around the whole value instead.

## Known gaps this bench shows

- Correct paraphrases almost always fail Support, which only measures word overlap.
- Numbers written as words ("acht", "zwölf", "drei Monate") are not compared, so many changed durations pass.
- Conditions introduced by a bare "wenn" or "soweit" are not tracked by Omission.
- No case drifts on Scope yet.
