# FAQ Section Review

> Evaluating current FAQ against real user fears from twitter-ai-pain.md research.

---

## Current State

6 questions, accordion-style, positioned second-to-last (after TrustSection, before FinalCta). Title: "Questions people ask."

### Current Questions

1. Do I need to know how to code?
2. What does it cost?
3. Is my data safe?
4. What if I want to stop?
5. I tried AI tools before and failed. Why is this different?
6. What can it build for me?

---

## Evaluation

### What's working

- **Q1 (coding)** -- directly addresses Pain Point 4 ("this stuff isn't made for me"). Good instinct.
- **Q4 (stop/lock-in)** -- smart to include. Vendor lock-in is a real fear. Answer is honest.
- **Q5 (tried before and failed)** -- addresses Pain Points 1 and 2 (articulation barrier, tool fatigue). This is the most important question on the list.

### What needs fixing

**Q2 (cost):** The "$5-20 a month" answer buries the free part. Lead with free. The "like a phone bill" analogy is clever but might backfire -- phone bills are the thing people hate paying. Keep the usage-based framing but drop the analogy.

**Q3 (data safety):** Overlaps heavily with TrustSection that sits directly above the FAQ. The TrustSection already says "European privacy law protects everything" and "you can delete it all, anytime." The FAQ answer repeats almost the same words. Either make the FAQ answer shorter (one sentence pointing to the trust section) or replace with a different question.

**Q6 (what can it build):** Answer is generic. "Sorting files, writing emails, cleaning spreadsheets" -- this could be any AI tool's marketing page. The research says people hate generic. Tie it to the discovery phase: "We look at YOUR day first, then suggest what's worth automating."

### What's missing

The research reveals fears the current FAQ doesn't touch:

1. **"What if it doesn't work?"** -- Pain Point 3 (trust/hallucination). People's #1 fear is trying something, getting burned, and wasting time. The current FAQ has no answer for "what happens when the AI makes a mistake."

2. **"Can I talk to a human?"** -- Pain Point 4. Non-technical people want a safety net. Every SaaS FAQ needs this. Its absence feels like the company is hiding behind automation.

3. **"What AI does this use?"** -- People have strong opinions about ChatGPT vs Claude vs others. Transparency builds trust. Hiding it feels evasive.

### Answer honesty check

- Q1 answer: Honest. Good.
- Q2 answer: Slightly evasive -- "small convenience fee" is vague. What percentage? Being specific builds trust.
- Q3 answer: Honest but redundant with TrustSection.
- Q4 answer: Very honest. Best answer on the page.
- Q5 answer: Slightly oversells. "Starts from zero" and "figures out what's worth automating" are strong claims for an MVP. Tone it down slightly.
- Q6 answer: Not evasive, just generic. Needs personalization angle.

### Answer length check

Most answers are 2-3 sentences -- good length. Q1 is slightly long (4 sentences). Q2 is slightly long (the analogy adds a sentence that doesn't earn its space). The rest are fine.

### Title evaluation

"Questions people ask" is fine -- casual, unpretentious. But it's generic. Alternatives that feel warmer while staying honest:

- "Before you start" -- implies they're already leaning in
- "Fair questions" -- acknowledges the questions are valid, not annoying
- "You're probably wondering" -- conversational, warm

Recommendation: **"Fair questions"** -- it validates the reader's skepticism without being cute.

### Position on page

Current position (after Trust, before Final CTA) is correct. The FAQ is a classic objection-handler -- it belongs right before the final ask. Moving it earlier would interrupt the storytelling flow (Problem -> Solution -> How it works -> Pricing -> Trust -> Objections -> CTA). The research shows fear, but the answer to fear is building context first, then addressing specific objections. The current order does this.

---

## Proposed FAQ: 7 Questions

### 1. Do I need to know how to code?

**No. Meldar handles the technical parts. You describe what you want done, it builds it. If you can code, you'll get more out of it -- but it's not required.**

*Rationale: Tightened from 4 sentences to 3. Removed "great" which felt salesy.*

### 2. What does it cost?

**Discovery is free -- we analyze your workflow and suggest what to automate at no cost. When you start building, you pay for the AI tokens you use plus a 5% convenience fee. Most people spend $5-20/month.**

*Rationale: Lead with free. Be specific about the fee percentage -- vagueness kills trust. Dropped the phone bill analogy.*

### 3. What if it doesn't work?

**Then you stop and it costs you nothing. The discovery phase is free, and building is pay-as-you-go -- there's no contract and no minimum. If an automation breaks, Meldar flags the issue and suggests a fix. We'd rather you try something small and see it work than promise you the moon.**

*Rationale: NEW question. Directly addresses Pain Point 3 (trust/hallucination fear). Honest about failure being possible. Positions the product as low-risk.*

### 4. I tried AI tools before and failed. Why is this different?

**Those tools hand you a blank text box and assume you know what to ask. Meldar starts by watching your workflow, identifies what's worth automating, then builds it for you step by step. You don't need to know the right words.**

*Rationale: Tightened. Added "you don't need to know the right words" -- directly echoes Pain Point 1 (articulation barrier) language from the research.*

### 5. What if I want to stop?

**Everything you build lives on your machine, not ours. Cancel anytime -- your automations keep working. You just lose the suggestions and managed setup.**

*Rationale: Shortened. Cut "your stuff stays your stuff" since TrustSection already owns that line.*

### 6. Is my data safe?

**European privacy law (GDPR) governs everything. We see which apps you use and how often -- never what you type or read. You can delete all your data anytime.**

*Rationale: Kept but shortened since TrustSection covers this in detail right above. Added "GDPR" explicitly -- the acronym carries weight with people who recognize it, and "European privacy law" alone is vague to others.*

### 7. Can I talk to a human?

**Yes. Email us and a person replies -- not a bot. We're a small team in Finland and we actually read every message.**

*Rationale: NEW question. Non-technical users need to know there's a human behind the product. "Small team in Finland" is a trust signal -- it's specific, verifiable, and warm.*

---

## Questions considered but not included

**"What AI does this use?"** -- Considered adding this for transparency (Meldar routes through Claude). Decided against including it in the FAQ because: (a) it invites comparison-shopping ("why not just use Claude directly?"), (b) the answer is technical and the audience is non-technical, (c) it can go in a separate "How it works" detail page. If the team disagrees, it's easy to add as Q8.

**"What can it build for me?"** -- Removed from the FAQ. The answer was always going to be generic ("emails, spreadsheets, reports") and the HowItWorksSection + SkillCardsSection already cover this with more specificity. The FAQ shouldn't repeat what the page already showed.

**"Do you sell my data?"** -- Covered by Q6 (data safety) and the TrustSection. A separate "do you sell my data" question would be redundant and also implies we might, which is a framing problem.

---

## Summary of changes

| # | Before | After | Why |
|---|--------|-------|-----|
| 1 | Do I need to know how to code? | Do I need to know how to code? | Kept, tightened |
| 2 | What does it cost? | What does it cost? | Rewritten -- lead with free, specific fee |
| 3 | Is my data safe? | What if it doesn't work? | NEW -- addresses #1 fear from research |
| 4 | What if I want to stop? | I tried AI tools before and failed... | Reordered for better flow |
| 5 | I tried AI tools before and failed... | What if I want to stop? | Reordered |
| 6 | What can it build for me? | Is my data safe? | Shortened, GDPR explicit |
| 7 | -- | Can I talk to a human? | NEW -- safety net for non-tech users |

**Title:** "Questions people ask" -> "Fair questions"

**Position:** Keep as-is (after TrustSection, before FinalCta). Correct placement for objection-handling.

**Net change:** 6 questions -> 7 questions. Two new, one removed, four rewritten.
