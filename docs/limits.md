# Limits

Read this before you put it in front of anything that matters.

**It reads normalised words, not meaning.** Stemming, number words and a short synonym list close part of the gap, and on the German bench 42% of correct paraphrases pass on held-out questions (64% on the questions it was tuned on) ([results](../bench/de-arbeitsrecht/results/RESULTS.md)). The rest fail. "Full-time staff get thirty days off once probation is over." is right, and still fails Qualifier against "… after the probation period." A wrong answer that swaps one verb ("verfällt" for "ist abzugelten") can pass. Claim mode helps with paraphrase, at the cost of a model call.

**Qualifiers and exceptions come from a fixed list.** The patterns in [how-it-judges.md](how-it-judges.md) cover common handbook, policy and statute wording. A condition phrased some other way ("once you've been here six months") isn't seen, so dropping it won't fail. The list grows from real cases. Please open an issue with any condition it missed.

**German is measured, English less so.** The German checks are measured on 70 questions from seven federal labour laws, with a held-out split ([bench](../bench/de-arbeitsrecht/README.md)). The English checks have unit tests and a planted-trap test set, but no comparable bench yet. Neither has been run on a real company's documents.

**It trusts your sources.** It checks that an answer matches its passages. It does not check that the passages are right, current or the best ones to retrieve.

**Scope needs the restriction in the text.** It only knows who a rule is for when the document says "applies only to" or "gilt nur für". Restrictions stated another way are missed.

**The voice reading is weak on short answers.** The cut-offs were calibrated on passages of 400 words and more, from novels, in English. A two-sentence answer gives a noisy number. Treat it as a hint on long answers and ignore it on short ones.

**Rate limiting is per process.** The built-in limiter keeps counts in memory. Behind several instances, put a shared limiter in front.

**It is version 0.2.** The response shape may change before 1.0. Pin a commit if you depend on it.
