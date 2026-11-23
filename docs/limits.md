# Limits

Read this before you put it in front of anything that matters.

**It reads words, not meaning.** A correct answer in very different words can fail. "Full-time staff get thirty days off once probation is over." is right, and fails Support and Qualifier against "Full-time employees receive 30 days of paid annual leave after the probation period." A wrong answer that reuses the source's words can pass Support. Claim mode helps with paraphrase, at the cost of a model call.

**Qualifiers and exceptions come from a fixed list.** The patterns in [how-it-judges.md](how-it-judges.md) cover common handbook and policy wording. A condition phrased some other way ("once you've been here six months", "solange …") isn't seen, so dropping it won't fail. The list grows from real cases. Please open an issue with any condition it missed.

**German is newer than English.** The English checks came with 17 tests and a planted-trap test set. The German patterns have 7 tests on a synthetic handbook so far, and no real company's documents yet.

**It trusts your sources.** It checks that an answer matches its passages. It does not check that the passages are right, current or the best ones to retrieve.

**Scope needs the restriction in the text.** It only knows who a rule is for when the document says "applies only to" or "gilt nur für". Restrictions stated another way are missed.

**The voice reading is weak on short answers.** The cut-offs were calibrated on passages of 400 words and more, from novels, in English. A two-sentence answer gives a noisy number. Treat it as a hint on long answers and ignore it on short ones.

**Rate limiting is per process.** The built-in limiter keeps counts in memory. Behind several instances, put a shared limiter in front.

**It is version 0.1.** The response shape may change before 1.0. Pin a commit if you depend on it.
