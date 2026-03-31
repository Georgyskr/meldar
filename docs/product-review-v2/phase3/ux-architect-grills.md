# UX Architect — Phase 3 Grilling Report

**Date:** 2026-03-31
**Author:** UX Architect
**Sources:** Phase 1 (ux-architect.md) + all 9 other Phase 1 files + Phase 2 evidence report

---

## 1. Hallucinations and Errors in My Phase 1 Review

### Confirmed Hallucination: The flow I reviewed does not match the live site

My Phase 1 review examined a 2-phase flow (`scan | result`) where the X-Ray page rendered: context chips (labeled "I'm currently...") inline above the upload zone, followed by a collapsible "Where do I find this?" toggle below the zone.

**The live site runs a 3-step flow: context chip selection → guide wizard → upload zone.**

This is a material difference. The "collapsible toggle" I described is not present anywhere on the live /xray page. Instead, the guide is a mandatory step (with skip option) that appears immediately after chip selection. Several of my accessibility findings were targeted at a component arrangement that does not exist in production:

- My critique of the collapsible toggle's discoverability (fontSize="xs", low contrast, under-44px tap target) is moot — the toggle does not exist on the live site.
- My statement about `UploadZone.tsx` having a "collapsible guide" in the code is technically accurate for the file, but the live UI uses the guide as a full wizard step, not a toggle.
- I described the upload zone as "the first thing users see on /xray." On the live site, context chip selection is the first thing users see.

**What this means:** My Phase 1 accessibility findings about the toggle itself were based on codebase analysis, but the live site architecture is different. My findings about ContextChip focus styles, ARIA roles, animation, and color contrast are still valid because those components are still present — but the interaction model I was critiquing has diverged.

### Not a hallucination but scope drift: Phase label confusion

My Phase 1 review described the phase model as "two-phase (`scan | result`)." This matches the code in `xray-client.tsx`. The live site wizard (context → guide → upload) is implemented within what the code calls the "scan" phase — it is UX-visible as 3 steps but code-level as 1 phase. This is confusing but not a factual error.

### Phase 1 stated: "XRayCard is not truly an entity-layer component"

The Phase 2 report confirmed this component exists and is deployed. The finding is valid — but is based on a codebase read of `XRayCard.tsx`, a file the QA agent could not test without a real result. This criticism stands and is unverified by QA.

---

## 2. Top 3 Real, Evidence-Backed Issues (with Severity)

### Issue 1 — CRITICAL: No visible focus styles on interactive elements (WCAG 2.4.7)

**Evidence:** Phase 2 QA agent directly confirmed this via browser automation:
> "FAIL — No visible focus rings on context chip buttons. Tabbing through the page with keyboard shows no focus indicator on any chip. Zoomed inspection confirms zero visual change on focus. WCAG 2.4.7 violation."

This is not a theoretical finding from a code read. It is a confirmed, reproducible failure on the live site at `meldar.ai/xray`.

**Scope in the live 3-step flow:** The context chip buttons (step 1), the guide wizard navigation (step 2: "Next", "I know how", iPhone/Android toggle), and the upload zone (step 3) all appear on /xray. If the chip buttons have no focus ring, the guide wizard buttons almost certainly share the same styling gap — they use the same component system.

**Why this is critical, not just medium:** The primary audience (Gen Z, 18-28) includes a non-trivial cohort of users with motor impairments who navigate by keyboard, switch access, or assistive technology. More immediately: Vercel and Next.js deployment means crawlability and automated accessibility audits will flag this as a blocker. Any EU market (this is a Finnish company, GDPR jurisdiction) means EN 301 549 accessibility compliance is relevant — which references WCAG 2.1 AA. This is a legal exposure.

**Fix:** Add `_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}` to all interactive `styled.button` elements in ContextChip, the guide wizard buttons, and XRayCardActions. One Panda prop per button. This is a 30-minute fix.

---

### Issue 2 — HIGH: The #874a72 gradient midpoint is hardcoded in 3 separate files, creating a design system split

**Evidence:** Phase 1 code analysis identified the 3-stop gradient (`#623153 → #874a72 → #FFB876`) hardcoded in:
- `XRayCard.tsx` — gradient header
- `UploadZone.tsx` — "Choose image" button, scan line
- `ResultEmailCapture.tsx` — submit button

Phase 2 confirmed the live site uses this gradient. Phase 1 review of the reference component (`Header.tsx`) confirmed it uses a clean 2-stop gradient without `#874a72`.

**Why this is real and not cosmetic:** Three files sharing an undocumented hex value means a single brand refresh requires hunting through 3+ components with no token-level guarantee that all instances are updated. The Stitch brand brief documents `#623153` (primary) and `#FFB876` (accent) but `#874a72` is a one-off midpoint interpolated by a developer. It is not in `panda.config.ts`, not in any token map, and not described anywhere in `CLAUDE.md`. Any new component that wants to use the "full brand gradient" will either copy this undocumented hex or drift visually.

**Additionally:** The live site action buttons (upload, email submit) use a different gradient variant than the header CTA — same tier of action, different visual treatment. This is unintentional inconsistency confirmed by comparing the live header to the /xray upload flow.

**Fix:** Extract `--colors-gradient-brand: linear-gradient(135deg, #623153 0%, #874a72 40%, #FFB876 100%)` as a CSS custom property in `globals.css`. Replace 3 inline string values. 20-minute fix.

---

### Issue 3 — HIGH: No `prefers-reduced-motion` handling anywhere in the animation layer

**Evidence:** Phase 1 code analysis identified this across 11 animation sites. Phase 2 marked it "UNTESTABLE" (cannot change OS settings via browser automation), which is precisely the problem — this issue cannot be caught in automated testing and requires manual QA. It is confirmed unimplemented at the code level.

**Why the scope is wider than Phase 1 framed it:**

The live site runs the 3-step wizard. Step 2 is a guide with wizard pagination. The context chips use scale+shadow transitions on hover/select. The upload zone has `scanPulse`, `scanLine`, and `gentleBreathe` running simultaneously. The result phase has `RevealStagger` with up to 1200ms stagger chains and `FocusAmbient` running 30-40 second infinite loops.

Users with vestibular disorders (a significant minority, not edge case) will experience the full animation stack on every /xray visit. WCAG 2.3.3 (AAA, non-binding) covers this, but more practically: iOS and macOS both surface "Reduce Motion" as a prominent accessibility setting, and Android does the same. A non-trivial fraction of the target audience has it enabled.

The architectural problem: all keyframes live in `globals.css` and none have `@media (prefers-reduced-motion: reduce)` blocks. This means there is no progressive degradation — animations either run fully or not at all depending on whether the media query is respected, and currently it is never respected because no query exists.

**Fix:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
Add this to `globals.css`. This is a 5-line global fix that immediately resolves the issue across all animation sites. Components with `opacity: 0` initial state set via inline style (RevealStagger) would reveal immediately, which is the correct behavior for reduced-motion contexts.

---

## 3. What Is Actually Good (Evidence-Backed)

### The 3-step wizard is better UX than the collapsible toggle

The live site runs: chip selection → guide wizard (with iPhone/Android toggle + step dots) → upload zone. This is superior to the collapsible "Where do I find this?" toggle I and the UX Researcher critiqued in Phase 1. The mandatory guide step eliminates the discoverability problem. Users cannot miss it.

Phase 2 confirmed: "Guide wizard works correctly. iPhone/Android toggle switches instructions. 'I know how' link correctly skips to upload zone." The QA agent, without any prior knowledge of Phase 1 critiques, evaluated this as passing.

The UX Researcher's Phase 1 concern about the toggle being invisible when the file picker is open is now moot. The guide is seen before the file picker is ever opened. This is the correct solution.

### The /xray/[id]/og route exists and is deployed

Phase 1 (Rapid Prototyper) claimed "/xray/[id]/og route does not exist." Phase 2 directly refuted this:
> "PASS — Route IS deployed. Non-existent IDs return 'Not found' text, confirming the route handler exists. Root /og route returns 200 with image/png content type."

The Sprint Prioritizer's #1 priority ("Create /xray/[id]/og route — 60 min, HIGHEST IMPACT") was based on the false premise that the route was missing. It already exists. This changes the priority stack: the OG image may need quality improvements (Social Strategist identified real problems) but it is not a blocking absence.

### The mock /api/analyze-screenshot route has been deleted

Phase 1 Feedback Synthesizer rated this a 4-reviewer blocker ("Returns hardcoded fake data to anyone who hits it"). Phase 2 confirmed:
> "PASS. Both GET and POST to /api/analyze-screenshot return 404 on the live site. The file has also been deleted from the codebase."

This was a security finding that was actually resolved before Phase 1 analysis ran. The code corpus was stale relative to the deployed state.

### The quiz results page does NOT display fake hour estimates

Phase 1 reviewers repeatedly flagged `weeklyHours` as the #1 trust destroyer. Phase 2 confirmed:
> "No fake hour estimates visible on results page (the weeklyHours values are NOT displayed)."

The most-flagged trust issue across the entire review corpus was already resolved prior to Phase 1 analysis.

---

## 4. Cross-Review Notes

### Where Phase 1 reviewers were wrong due to stale codebase

Multiple Phase 1 reviewers (Rapid Prototyper, Sprint Prioritizer, Feedback Synthesizer) appear to have analyzed a codebase snapshot that did not match the live deployment:

- **TiersSection:** Reviewed by Sprint Prioritizer (CTA links to /quiz — "single highest-priority fix") and Rapid Prototyper as if it exists. Phase 2 confirmed: "TiersSection does NOT exist on the current live landing page." The entire pricing section has been removed. All Sprint Prioritizer findings about tier CTAs are N/A.

- **ScreenshotGuide.tsx dead code:** Both Sprint Prioritizer and Rapid Prototyper flagged this as dead code to delete. Phase 2 confirmed it exists in the codebase but is not imported anywhere. Phase 1 was correct that it is dead code, but the deletion recommendation is based on a file that already has no runtime impact.

- **/discover/overthink exit CTA:** Rapid Prototyper claimed these quizzes "dead-end." Phase 2 confirmed: "The Overthink quiz results page has a clear CTA: 'Want to see where ALL your time goes?' + 'Get your Time X-Ray' button linking to /xray."

### Where Phase 1 reviewers were correct

- **Focus ring absence (UX Architect, Feedback Synthesizer):** Confirmed by Phase 2 live testing.
- **"Job hunting" chip orphaned on mobile (Visual Storyteller, Phase 2):** Confirmed on 375px viewport.
- **Contact email is personal Gmail (Sprint Prioritizer):** Confirmed by Phase 2 (footer shows gosha.skryuchenkov@gmail.com).
- **OG tags generic across sub-pages (Phase 2 new finding):** Phase 1 did not flag this explicitly but Visual Storyteller and Social Strategist raised OG image quality concerns.

### Issues that are genuinely unresolved and require live upload testing

None of the following could be verified by Phase 2 without a real screenshot upload:
- Does `prefers-reduced-motion` suppress RevealStagger animations? (My Phase 1 finding, still unverified)
- Is `onSurfaceVariant/50` color contrast failing WCAG AA? (My Phase 1 finding, still unverified)
- Does the App name fixed `width="100px"` in XRayCard overflow at 320px? (My Phase 1 finding, still unverified)
- Does `aria-live` missing from upload steps cause screen reader silence? (My Phase 1 finding, still unverified)

These findings are real concerns from code analysis. They require a real screenshot upload on a device with the relevant accessibility settings enabled to confirm or refute.

### The Thank-You Page is a confirmed broken customer promise

Phase 2 confirmed two facts:
1. The thank-you page is hardcoded to "Time Audit" regardless of product purchased.
2. The thank-you page says "Check your email for confirmation" but no purchase confirmation email is sent.

This was flagged by Sprint Prioritizer (Phase 1) as a bug. Phase 2 elevates it: a user who pays EUR 79 for an appBuild sees the wrong product name and receives a promise (confirmation email) that will never arrive. This is not a design system issue — it is an operational trust failure on the first post-purchase interaction. The UX Architect does not own this fix, but it is worth calling out: **no amount of accessibility or token improvements compensates for a broken post-purchase experience.**

### Animation architecture remains a two-source-of-truth problem

Phase 1 identified keyframes split between `globals.css` and `panda.config.ts`. Phase 2 confirmed dead keyframes in `globals.css`:
> "shimmer and phaseExit keyframes — defined in globals.css, never referenced in components."

This is a maintenance problem that compounds over time. Every new animated component added to the discovery flow adds more `style={{}}` props and more `globals.css` keyframes, widening the gap between what Panda can express and what the product actually does. The fix (move keyframes to `panda.config.ts > theme.extend.keyframes`) is not urgent but becomes more expensive with each iteration.
