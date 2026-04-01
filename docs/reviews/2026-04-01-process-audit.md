# Process Audit: Why Critical Issues Slipped Through Multiple Reviews

**Date:** 2026-04-01
**Trigger:** AI Engineer audit found 2 critical issues (category bypass, platform bypass) that passed through 2 code review rounds, 1 test plan review, 5 specialist test writers, and 1 final code review — 14 review agents total.

---

## What Slipped Through

| Issue | Impact | First Introduced | Detected By |
|-------|--------|-----------------|-------------|
| C1: All apps `category: 'utility'` on regex path | Breaks ALL category-based insights and recommendations | The TDD implementation of `preprocess-ocr.ts` + `extract-from-text.ts` | AI Engineer (agent #15) |
| C2: `platform: 'unknown'` on regex path | Breaks all platform-specific fix steps | Same commit | AI Engineer (agent #15) |

---

## Root Cause Analysis

### 1. The bugs were introduced AFTER all reviews completed

The preprocessing layer was built via TDD in the last implementation cycle. The 5-agent code review swarm reviewed the code BEFORE preprocessing existed. The test plan + test writers also ran BEFORE preprocessing was added. The preprocessing TDD cycle had no review stage — it went straight from "tests pass" to "done."

**Lesson: Code written after the review cycle is unreviewed code, no matter how many reviews preceded it.**

### 2. TDD tested the preprocessor in isolation, not the integration

The 26 TDD tests verified:
- Regex extracts correct app names ✓
- Regex extracts correct minutes ✓
- Regex extracts total screen time ✓
- Cleanup works ✓

But no test verified: "When the preprocessor output feeds into the insight engine, do the insights actually work?"

The preprocessor returned `category: 'utility'` for every app. The insight engine branches on `category === 'social'`, `'gaming'`, etc. These are different modules, tested independently, never tested together.

**Lesson: Unit tests prove components work in isolation. They do NOT prove the system works. Integration tests at the seam between preprocessor → insight engine would have caught this instantly.**

### 3. The reviews focused on the wrong layer

Both code review swarms (10 agents total) reviewed:
- API route structure ✓
- Security (prompt injection, zip bombs) ✓
- DB schema ✓
- Frontend components ✓
- Type safety ✓

None reviewed: "Does the data flowing through this pipeline produce correct business outcomes?" The reviews were structural, not behavioral. They checked "does the code do what it says?" not "does what it says actually produce useful results?"

**Lesson: Code reviews catch structural bugs (missing validation, type errors, race conditions). They don't catch semantic bugs (wrong category assigned). Semantic bugs require domain-aware review or integration tests.**

### 4. The AI Engineer persona wasn't included in the implementation cycle

The AI Engineer agent was only used for the final OCR audit — the one that caught the bugs. It was never part of:
- The preprocessing TDD cycle
- The code review swarms
- The test writing swarm

The AI Engineer is the only persona that thinks about "does this data quality produce good downstream results?" The other personas think about code quality, security, performance, and accessibility — important, but orthogonal to data semantics.

**Lesson: For any pipeline that processes data → AI → business output, include the AI Engineer persona in every review cycle, not just audits.**

---

## Systemic Failures

### A. No integration test between preprocessor and insight engine
There is no test that says: "Given this OCR text, the final insight should mention Instagram is a social app." The preprocessor tests check regex. The insight engine tests check logic. Nobody checks the handoff.

### B. The "regex shortcut" was a premature optimization
Skipping the AI call when regex extracts 3+ apps saves $0.003 per call. But it introduced a code path with zero AI categorization, zero platform detection, and zero confidence calibration. The optimization was correct for cost but catastrophic for quality. Nobody asked "what do we lose by skipping the AI?"

### C. Review agents don't share context across phases
Each review swarm starts fresh. The Phase 1 code review found issues. Phase 2 code review found different issues. But Phase 2 agents didn't know what Phase 1 found. The test plan agent didn't know what the code reviewers found. The test writers didn't know what the evaluator grilled. Each wave is isolated.

---

## Prevention Measures

### Immediate (implement now)

1. **Add integration test: OCR text → preprocessor → extract → insight engine**
   - File: `test/integration/preprocessing-to-insights.test.ts`
   - Uses real messy OCR text from test fixtures
   - Asserts: "Instagram is categorized as social", "platform is ios", "social dominance insight is generated"

2. **Add a "semantic assertion" to every data pipeline test**
   - Not just "does it return 200?" but "does the response contain the right category for Instagram?"
   - Not just "does the tool_use parse?" but "does the recommended app make sense for this user?"

3. **Mandatory AI Engineer review on any data pipeline change**
   - Add to the review checklist: "Does the data flowing through this pipeline produce correct business outcomes?"

### Structural (implement when convenient)

4. **Post-implementation review gate**
   - After TDD cycle, before marking done, run a focused review on the NEW code only
   - The review should include at least one domain-aware persona (AI Engineer for data pipelines, Frontend Dev for UX changes)

5. **Cross-phase context document**
   - Maintain a running `docs/reviews/known-issues.md` that persists across review cycles
   - Each review swarm reads it first and adds to it
   - Prevents the same issue from being found independently by 5 agents

6. **Integration test requirement for pipeline changes**
   - Any change to the data pipeline (parsers, extractors, analysis) MUST include an integration test that verifies downstream behavior, not just the changed function
   - Enforce via a PR checklist item

---

## Summary

The criticals slipped through because:
1. They were introduced after all reviews completed (no review on TDD output)
2. Unit tests proved isolation, not integration
3. Reviews were structural, not semantic
4. The AI Engineer persona was excluded from the implementation cycle

The fix is not "more reviews" — it's "the right reviews at the right time" + integration tests that verify business outcomes, not just code structure.
