# Sample audit

[report.html](report.html) is what an audit report looks like. Open it in a browser, or print it to PDF.

It is not an audit of a real chatbot. The "bot" is a log built from the public [German bench](../../bench/de-arbeitsrecht): for each of the 70 questions, one of the three hand-written answers (faithful, paraphrased, or with a planted mistake) was picked with a fixed seed. The review was filled in from the bench's answer key, where a real audit has a person.

44 of the 70 questions were used to tune the checker, so it does better here than it would on someone else's bot. The held-out numbers in the [bench results](../../bench/de-arbeitsrecht/results/RESULTS.md) are the fair ones.

Rebuild with:

```sh
npm run sample-audit --workspace @answer-checker/bench
```
