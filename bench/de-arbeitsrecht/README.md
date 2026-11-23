# Bench: German labour law (de-arbeitsrecht)

70 questions a chatbot on an HR or public-service site would get, each with three answers:

- **faithful**: says what the passage says, close to its wording. Should pass.
- **paraphrase**: says the same thing in plain words. Should pass.
- **drifted**: wrong in one way that matters (a changed number, a dropped condition, a reversed rule). Should fail, ideally on the check named in `drift`.

The current numbers are in [results/RESULTS.md](results/RESULTS.md). They are not good yet, and they are published anyway: this bench exists to measure the checker, not to advertise it.

## Sources

Seven federal laws: BUrlG, EntgFG, ArbZG, TzBfG, KSchG, MuSchG (2018) and NachwG, in `sources/`. The texts come from the [bundestag/gesetze](https://github.com/bundestag/gesetze) mirror. That mirror is not kept up to date (for example NachwG predates the 2022 reform), so treat these files as **test documents, not current law**. Nothing here is legal advice. German statutes are official works and not protected by copyright (§ 5 UrhG).

## Method

- The questions are split by law. **Dev** (BUrlG, EntgFG, ArbZG, TzBfG, 44 questions) may be looked at while tuning the engine. **Held-out** (KSchG, MuSchG, NachwG, 26 questions) may not: only the headline numbers were seen. The held-out number is the one to quote. All 70 were written by the same author in the same session, before any tuning, so the held-out set is fairer than the dev set but not fully independent.
- Once an engine version is published, its held-out set counts as seen. The next round of tuning gets new held-out questions, written before it starts.
- `results/baseline.json` holds the numbers of the engine before tuning (0.1.0), so every report shows the change.
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

Engine 0.1.0 had three: paraphrases almost always failed, numbers written as words were not compared, and conditions with a bare "wenn" or "soweit" were not tracked. 0.2.0 addresses all three ([how it judges](../../docs/how-it-judges.md)). What is left:

- Paraphrases with new vocabulary ("Ersatztag" for "Ersatzruhetag", "Leute" for "Arbeitnehmer") still fail Support.
- A wrong answer that changes one verb and keeps every other word ("verfällt" for "ist abzugelten") passes.
- A range in the source ("mehr als sechs bis zu neun Stunden") is not matched by a single value inside it ("acht Stunden").
- The gap between dev and held-out numbers shows some tuning to the dev wording.
- No case drifts on Scope yet.
