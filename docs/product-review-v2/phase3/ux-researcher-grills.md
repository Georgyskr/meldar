# Phase 3 — UX Researcher Grilling Round

**Reviewer:** UX Researcher
**Date:** 2026-03-31
**Based on:** Phase 1 UX Researcher report, all other Phase 1 reviews, Phase 2 QA Evidence Report

---

## 1. Hallucinations and Invalidated Claims from My Phase 1 Report

### Hallucination 1: The flow I reviewed does not exist on the live site

My entire Phase 1 review was about a 2-phase flow (scan → result) with a collapsible "Where do I find this?" toggle below the upload zone. The live site has a 3-step wizard: context chips → screenshot guide (a mandatory step with iPhone/Android toggle and step dots) → upload zone.

The specific UI elements I analyzed at length — the small `fontSize="xs"` toggle text, the `marginBlockStart={3}` positioning, the salience problem of "reads as a footnote" — **do not exist on the live site.** The guide is not hidden behind a toggle. It is a mandatory wizard step that users must complete or explicitly skip via "I know how."

Every finding in Sections 2, 3, and 4 of my Phase 1 report (the toggle discoverability analysis, touch target size of the toggle, the failure mode of the file picker obscuring the toggle) is analysis of a design that was never deployed.

### Hallucination 2: The chip label

I analyzed the label "I'm currently..." and called it "grammatically clear but purpose-unclear." The QA agent confirmed the live site uses "What's your week about?" — a materially different label that is more purposeful. My Section 8 critique of the grammatically incomplete sentence is based on a label that does not appear on the live site.

### Hallucination 3: Chip deselection as a functional gap

I stated in Section 8 that "`onSelect` only sets a value, never clears it" and identified this as a functional gap. The QA agent found the live flow transitions to the guide immediately on chip selection — there is no deselection moment in the flow at all because you move past the chips upon selecting one. The deselection issue I flagged is structurally moot in the deployed flow (though it becomes relevant if a user navigates back).

### What was actually verified from my Phase 1 questions

QA marked 4 of my 5 questions as untestable. The one that got a response (guide toggle behavior) was N/A — the guide is no longer a toggle.

---

## 2. What Survives Grilling: My 3 Real Issues (Evidence-Backed)

### Issue 1 — No keyboard focus styles on context chips (Severity: HIGH)

**Evidence:** QA directly confirmed this: "FAIL — No visible focus rings on context chip buttons. Tabbing through the page with keyboard shows no visual change on focus. Confirmed by zoomed inspection. WCAG 2.4.7 violation."

This is not a theoretical concern. It was tested on the live site and confirmed to be absent. The UX Architect reached the same conclusion in Phase 1 independently. Two separate reviewers identified it; one was verified by QA on the deployed site.

The impact is real: keyboard-only users (power users, users with motor impairments, anyone testing with Tab) cannot navigate the /xray flow without a visible cursor. This is a production accessibility failure, not a code review finding.

**What needs to happen:** Add `_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}` to the ContextChip styled button. The HeroSection cards already do this — the pattern exists in the codebase and was not carried forward.

### Issue 2 — The 3-step guide flow solves the discoverability problem but creates a new drop-off: chip-to-guide transition is immediate (Severity: MEDIUM)

**Evidence:** QA found the live flow transitions immediately from chip selection to the guide step. There is no deselection affordance. The transition is instant.

My Phase 1 concern about "users not finding the guide" is resolved — the guide is now a mandatory step. But the live flow introduces a new friction point I did not analyze: users who select a chip expecting to land at the upload zone are instead taken to a 4-step wizard. The micro-commitment of chip selection is immediately followed by a wizard that the user may not have anticipated.

For the 30-40% of users I identified as already knowing where Screen Time lives, this wizard is additional friction. They arrive expecting upload, select a chip to personalize their result, and are detoured into a guide they don't need before reaching the "I know how" skip link.

The skip affordance ("I know how") exists, which is good. But it requires the user to (a) read the wizard step, (b) understand that "I know how" skips the whole thing, and (c) click it. Users who don't see it will click through 4 steps they don't need.

**What needs to happen:** Make "I know how" more prominent on the first guide step — not a secondary link but a clearly styled option alongside "Next." Alternatively, offer the skip at the chip selection stage: a small "I already have a screenshot" affordance that goes directly to the upload zone, bypassing the guide.

### Issue 3 — Cold /xray entry lacks social proof and result preview (Severity: MEDIUM)

**Evidence:** QA confirmed the live /xray page shows "One tap, then one screenshot. Takes under a minute." as the subtitle before chip selection. There is no social proof, no example result, and no explanation of what Meldar is for cold visitors.

QA also confirmed that /discover is not linked from the header, landing page, or footer — it is only reachable via direct URL. This means the only way to reach /xray cold is via: (a) the landing page CTAs, (b) a shared /xray/[id] link, or (c) direct navigation. For case (b) — the viral vector — the user arrives at the shareable result page and then clicks "Get your own Time X-Ray," landing at /xray with zero context about what Meldar is.

My Phase 1 analysis of this cold entry problem (Section 5) was accurate in substance and still applies to the live site: no onboarding context, no social proof, no preview of the result. The specific UI details I described were wrong (based on the 2-phase flow), but the structural gap is real and unaddressed.

**What needs to happen:** Add a single trust-building element to the /xray page for cold entry — either the "2,847 people" data point, a miniature preview of what an X-Ray card looks like, or a one-line "Used by X people this week" social signal. This costs one component and zero API calls.

---

## 3. What Was Actually Good in the Phase 1 UX Analysis

### The drop-off ranking was methodologically sound

My Section 7 ranked drop-off points. The top item — "users who arrive, tap Choose image, find no Screen Time screenshot, and leave" — remains the highest-risk drop-off in the live flow. The guide wizard directly addresses this: it teaches users how to take the screenshot before they reach the upload zone. This is a genuine improvement over the design I reviewed.

The live flow is arguably more defensible on this dimension than the 2-phase design I analyzed. The mandatory guide step forces the user to engage with the "how to get a screenshot" instructions, reducing the failure mode I rated as 35-50% drop risk.

### The context chip labeling critique was partially right

My Section 8 noted that chips with no stated purpose get skipped. The live site uses "What's your week about?" which is a better label than "I'm currently..." — but it still doesn't tell users what selecting a chip changes. The Nudge Engine made the same point independently: without a stated payoff ("Get a tailored read"), the chips read as data collection, not personalization. This remains a valid critique of the live implementation.

### The cold /xray entry gap (Section 5) remains the most actionable unfixed issue

This analysis was accurate, grounded in the code, and still applies to the live site. It was the part of my report least affected by the flow mismatch.

---

## 4. Cross-Review Notes

### On the UX Architect's findings

The UX Architect's accessibility findings (no focus styles on ContextChip, no `aria-live` on upload steps, no text alternative for the bar chart, `onSurfaceVariant/50` contrast issue) all survive grilling because they are code-level findings. QA confirmed the focus ring absence on the live site. The rest are untestable without a real upload but are structurally correct based on code inspection.

The UX Architect's animation findings (no `prefers-reduced-motion` in `XRayCardReveal`, FocusAmbient blobs running infinitely) are valid but untestable in the live environment without OS accessibility settings access.

### On the Nudge Engine's findings

The Nudge Engine's finding that the quiz → X-Ray handoff drops all context (Zeigarnik failure) remains valid and untestable by QA. The live site confirms no `?pain=` URL params are passed from quiz to /xray. QA confirmed chip state resets on page refresh with no sessionStorage persistence. The context loss is real.

The Nudge Engine's email capture sequencing concern (upsell appears before email capture) cannot be verified without completing an upload. The code analysis is internally consistent; the live behavior cannot be confirmed.

### On the Rapid Prototyper's claims

Two Rapid Prototyper claims were directly falsified by QA:

1. The Rapid Prototyper stated "/xray/[id]/og route does not exist." QA confirmed it IS deployed and returns 200 with `image/png`. This was a hallucination.

2. The Rapid Prototyper stated the /discover quiz pages "dead-end" with no CTAs. QA confirmed the Overthink quiz result has a clear "Get your Time X-Ray" CTA. This was also a hallucination.

Both of these falsified claims affected the Sprint Prioritizer's prioritization (who listed the OG route as "HIGHEST IMPACT" work that needs building). If the OG route already exists and the quiz pages already have exit CTAs, these were not the gaps the Sprint Prioritizer thought they were.

### On the Sprint Prioritizer's TiersSection findings

The Sprint Prioritizer's highest-priority revenue fix — "TiersSection CTAs don't reach Stripe" — is N/A. QA confirmed TiersSection does not exist on the live site at all. The landing page has no pricing section. This fundamentally changes the revenue fix prioritization: there is no broken CTA to fix because the entire section was removed.

The live site's revenue path is entirely through the /xray flow's UpsellBlock. All other revenue findings from Phase 1 that reference TiersSection are moot.

### What QA could not test that I'm most concerned about

The processing step animation synchronization (Nudge Engine Question 4) and the deletion banner visibility race condition (Nudge Engine Question 5) remain untested. These are timing-sensitive UX issues that could silently fail in production. The deletion banner is the primary trust signal for new users — if it fires and hides before users can read it, a key trust moment is lost.

---

## 5. Net Assessment

My Phase 1 report had a fundamental problem: the flow I analyzed in detail does not match the deployed site. The 3-step wizard that replaced the 2-phase design is arguably better than what I reviewed — the guide is now mandatory, which directly addresses the drop-off risk I rated highest.

The issues that survive grilling are:
1. Focus styles are absent on the live site (confirmed by QA, WCAG violation)
2. The chip-to-guide transition is abrupt for users who already have a screenshot
3. Cold /xray entry lacks social proof (code-confirmed, structurally unchanged from Phase 1)

The largest structural gap across all Phase 1 reviews — the entire TiersSection revenue analysis — was invalidated by QA discovering the section was removed. Multiple Phase 1 reviewers spent significant analysis on a pricing section that does not exist on the live site. This is the most consequential divergence between what was reviewed and what was deployed.
