# Frontend & UX Cross-Review of All Clusters

**Authors:** Frontend Developer, ArchitectUX, UX Researcher
**Date:** 2026-03-30
**Status:** Iteration 2 -- Cross-review

---

## Review: Architecture Draft

### Agreements

1. **Modular monolith is the right call.** From a frontend perspective, having backend logic in `src/server/` alongside the Next.js app means shared types, no CORS, and instant API responses. The FSD layer system we already have maps cleanly onto this.

2. **Pre-auth discovery (ADR-005) is the single most important architectural decision.** We fully endorse this. The quiz and screenshot flows MUST work without auth. This is not a nice-to-have -- it is the conversion strategy. Value before ask.

3. **Session-based anonymous tracking** with `session_id` cookies is the right mechanism. We can use this client-side to store results in localStorage as well, providing instant rendering without round-trips.

4. **Neon Postgres + Drizzle** is a solid choice. From a frontend perspective, we care that the data layer doesn't slow us down. Neon's serverless driver means API routes respond fast even on cold starts. Drizzle's type safety means the frontend can trust the API response shapes.

5. **REST-ish route handlers** over tRPC/GraphQL -- agreed. We have <20 endpoints. Zod schemas shared between frontend and backend give us the type safety we need without an abstraction layer.

6. **Process-and-discard privacy (ADR-007)** is architecturally sound AND a UX selling point. We can confidently say "deleted immediately" in the UI because the architecture enforces it.

### Challenges

1. **Google OAuth contradicts our brand positioning.** Architecture proposes Auth.js with Google OAuth as the primary auth method. This is a UX problem. Meldar's entire pitch is "Big Tech profited from your data. Take it back." Then the first thing we do is ask users to "Sign in with Google"? This creates cognitive dissonance. Gen Z is privacy-aware enough to notice this contradiction, even if they don't articulate it. The architecture draft itself acknowledges magic links as a PoC option -- we should make magic links the *primary* method and defer Google OAuth until we actually need Google API access (Calendar, Gmail integration in post-MVP).

2. **The database schema has `screentime_analyses.raw_image_deleted` column.** This implies the image might NOT be deleted at some point. The flag should not exist. If the architecture guarantees ephemeral processing, the schema should reflect that certainty, not hedge it. From a UX trust perspective, if a user ever saw this field in a data export, it would undermine confidence. Remove the column -- the architecture already guarantees deletion.

3. **Discovery sessions + chat** (the `discovery_sessions` and `discovery_messages` tables) are MVP scope, but the schema is designed as if they're in PoC. This creates schema migration churn. For PoC, we need only: `subscribers`, `quiz_results`, `screentime_analyses`. Add the rest when MVP starts.

4. **The `src/server/` directory** creates a parallel structure to FSD's existing layers. We already have `entities/` for domain models and `features/` for user capabilities. Adding `src/server/` means backend logic for the same domain lives in two places. Proposal: keep server-only logic in FSD slices using `.server.ts` file naming (Next.js convention) rather than a separate directory tree. For example, `src/entities/xray-result/model/data.server.ts` for the Drizzle query logic.

### Answers to Architecture's Questions

**"How does the frontend handle session merging?"** (responding to ADR-005's consequences)

See Section 5 below for the full session-merge UX design.

**"Should quiz/screenshot results be stored client-side or server-side for PoC?"**

Both. Client-side (localStorage) for instant rendering and offline resilience. Server-side (Neon) for shareable URLs and persistence. The client is the source of truth for the current session; the server is the source of truth for shareable links. When a user creates a shareable X-Ray, we POST the data to create a UUID-addressable record.

### Revisions to Our Plan

- **Remove `/quiz/results` as a separate route.** The architecture's API design (`POST /api/quiz/submit`) returns results inline. The quiz results view should be client-side state within the quiz page, not a separate route. Keeps things simpler.
- **Align API route naming** with architecture's proposal: `/api/upload/screentime` instead of our `/api/analyze-screenshot`. More consistent.
- **Add `session_id` cookie management** to our component architecture. This is a `shared/lib/session.ts` utility, not a feature-level concern.

---

## Review: AI/ML Pipeline Draft

### Agreements

1. **Haiku 4.5 for screenshot OCR is the right call.** The cost numbers ($0.002-0.003/screenshot) mean we can afford to be generous with the free tier. This directly affects our UX -- see "cheap enough to be generous" below.

2. **Rule-based insights for PoC, LLM-generated for MVP.** From a UX perspective, rule-based insights are actually *better* for PoC because they're predictable. We can design the Time X-Ray card layout precisely when we know the output format. LLM-generated text has variable length, which is harder to lay out in a fixed card design.

3. **Structured output via tool_use.** This gives the frontend a guaranteed JSON schema. No parsing errors, no "the model returned markdown instead of JSON" edge cases. The frontend can trust the response shape.

4. **Image preprocessing (resize + JPEG compression).** We should do the resize client-side before uploading. This reduces upload time on mobile (critical for users on 4G) and reduces server processing time. A 1568x-max JPEG at 80% quality is ~200-400KB vs 2-5MB for a raw screenshot. Client-side resize using `canvas` is trivial.

5. **"Confidence" field in the response.** This directly maps to our UX: high confidence = show full results. Low confidence = show partial results + "try a clearer screenshot" CTA. This is good API design for good UX.

### Challenges

1. **The AI draft proposes `time-x-ray` as a feature.** Our draft proposes `xray-result` as an entity and `screenshot-upload` as a feature. These need to align. Our proposal is FSD-correct: the X-Ray data model (types, card component) is an entity because it has no side effects. The upload flow is a feature because it has user interaction. The AI pipeline's `generate-insights.ts` belongs in the entity layer as a pure function (takes data in, returns insights out), not in a feature. **Recommendation:** merge into `entities/xray-result/` for the data model + card + insight generation, `features/screenshot-upload/` for the upload interaction.

2. **Privacy toggle on Time X-Ray card** (AI draft: "Only shows aggregated categories by default, not specific app names"). We disagree. App names ARE the viral hook. "You spent 2.3 hours on Instagram" is shareable. "You spent 2.3 hours on social media" is not. Users should see their full data by default, with an option to anonymize before sharing. The default should be specific, not vague.

### How Cheap AI Changes Our UX

At $0.003/screenshot, we can afford a fundamentally different UX than if it cost $0.50:

1. **Allow re-uploads.** "Not clear enough? Try another screenshot." No penalty. No "you've used your free analysis." This removes friction from the most critical conversion moment.

2. **Show "Try again with a clearer image" instead of "error."** If confidence is low, don't just show partial results -- offer a guided retry. Show what a good screenshot looks like alongside their blurry one. The cost of a retry is $0.003.

3. **Allow multiple screenshots per session.** "Want to see your full week? Upload Monday's AND Sunday's screenshots." At $0.006 for two screenshots, this is effectively free but dramatically increases engagement and data quality.

4. **Remove any signup gate for screenshots entirely in PoC.** No "you get 1 free analysis." At the PoC scale (100 users), even if each person uploads 10 screenshots, that's $3 total. Remove all friction.

5. **Pre-analyze on drop.** Start the analysis the moment the file is dropped, before any "are you sure?" confirmation. Show results faster. If they want to redo it, it costs $0.003.

### Answers to AI Pipeline's Questions

**"Time X-Ray card: Canvas rendering vs HTML/CSS with html2canvas?"**

HTML/CSS for the visible card. `html-to-image` (better than html2canvas for modern CSS) for the "Save as image" export. `next/og` (Satori) for the OG image endpoint. Three rendering paths for three purposes:

| Purpose | Renderer | Why |
|---|---|---|
| On-page display | HTML/CSS (RSC) | Accessible, SEO-indexed, fast |
| "Save as image" button | html-to-image | Renders the DOM node directly, pixel-perfect |
| OG image for link sharing | next/og (Satori) | Edge runtime, no browser needed, cached |

**"Should the card be a separate page for sharing, or client-only?"**

Separate page (`/xray/[id]`). This is non-negotiable for virality. A shareable URL must resolve to a server-rendered page with OG meta tags. Client-only rendering means link previews show a blank page on Twitter/iMessage/WhatsApp. The viral loop dies.

**"How does ScreenTimeUpload handle the richer response?"**

The current `ScreenTimeUpload.tsx` shows a basic list. We'll refactor: the upload component handles the upload interaction only. On success, it navigates to `/xray/[id]` (or renders the `XRayCard` in-place if we stay on the quiz page). The card component is a separate entity (`entities/xray-result/ui/XRayCard.tsx`) that receives structured data and renders the full receipt.

### Revisions to Our Plan

- **Add client-side image resize** to the upload flow (before POST). Reduces upload time, saves bandwidth, no quality loss for text OCR.
- **Remove per-user upload limits from PoC.** The cost is negligible. Allow unlimited retries and multiple screenshots.
- **Update processing indicator** to show confidence-aware messaging: high confidence = "Your X-Ray is ready!", low confidence = "We got partial results. A clearer screenshot would give you the full picture."

---

## Review: DevOps & Infrastructure Draft

### Agreements

1. **Stay on Vercel.** No argument. The existing deployment works, preview deployments are automatic, and free tier covers PoC.

2. **Neon Postgres.** Aligned with architecture draft. Serverless, EU region, free branching.

3. **Sentry for error tracking.** From a UX perspective, Sentry's session replay feature (free tier includes some) is extremely valuable for understanding where users get stuck in the upload/quiz flows. We should enable session replay for the PoC funnel pages.

4. **No staging environment.** Vercel preview deployments per PR are sufficient. One fewer thing to maintain.

5. **In-memory screenshot processing.** Exactly right. No Vercel Blob needed for screenshots. The file goes from FormData -> Buffer -> base64 -> Anthropic -> response -> garbage collected.

6. **GitHub Actions CI** with biome + panda codegen + build. Good baseline. We'd add: Lighthouse CI for performance budgets in MVP phase.

### Challenges

1. **Anthropic API cost estimate is too high.** DevOps draft says "$0.05/call" in the cost table, but the AI pipeline draft says "$0.002-0.003/call" using Haiku. This 20x discrepancy affects infrastructure planning. Use the AI team's number.

2. **Rate limiting via Upstash Redis** is fine, but for PoC, a simpler in-memory rate limiter in the API route is sufficient. Adding Upstash is another account, another key, another vendor. PoC has <100 users -- an in-memory counter per IP (with a Map that resets hourly) works. Upgrade to Upstash for MVP when we need distributed rate limiting across Vercel's serverless instances.

3. **Authentication recommendation says "Clerk or NextAuth.js -- evaluate when auth is needed."** This is vague. Architecture draft already decided on Auth.js with magic links for PoC. DevOps should align and prepare the Neon database for Auth.js tables, not leave it as an open question.

### Answers to DevOps Questions

**"Are there any planned real-time features (live updates, WebSocket connections)?"**

No. Not for PoC or MVP. The processing indicator in the screenshot upload is a client-side state machine, not a WebSocket connection. The API call is a standard POST with a ~3-5 second response. No SSE, no WebSocket, no polling. When we add the discovery chat (MVP), that will use SSE (Server-Sent Events via ReadableStream in Route Handlers), which Vercel supports natively. Still no WebSocket.

**"What's the data retention policy?"**

From a UX perspective:
- Anonymous session data (quiz results, screenshot analyses without auth): **30 days**, then auto-purge via Vercel Cron.
- Authenticated user data: **retained until account deletion** (GDPR right to erasure).
- Shareable X-Ray links: **90 days** for anonymous, **indefinite** for authenticated users. Display "This X-Ray expires in X days" on anonymous shared pages to create urgency for signup.

### Revisions to Our Plan

- **Add Sentry session replay** to the PoC monitoring setup. Enable it on `/quiz`, `/xray`, and the screenshot upload flow.
- **Use in-memory rate limiting for PoC**, not Upstash. Simpler, no vendor dependency.
- **Add `.env.example`** file creation to the PoC implementation checklist.

---

## Review: Business, GTM & Compliance Draft

### Agreements

1. **"Founding 50" program** is a great framing. The countdown ("23 of 50 spots remaining") creates genuine scarcity. From a UX perspective, we'll display this as a subtle counter near the email capture, not as a aggressive popup.

2. **Stripe Checkout (hosted)** for payments. No PCI scope for us. Redirect to Stripe's page. This is the simplest payment UX and avoids custom form design.

3. **Reddit strategy of 90/10 value-to-promotion.** The Time X-Ray card is designed to be naturally shareable in Reddit threads about productivity. "I found out I spend 2.3 hours on Instagram" with a screenshot of the card is exactly the kind of content that performs well in r/productivity.

4. **TikTok as highest-priority non-Reddit channel.** The Time X-Ray "reveal" moment -- seeing your real numbers for the first time -- is inherently video-worthy. The card design at 440px width is optimized for phone screen recordings.

5. **Pricing below Netflix threshold** (EUR 9/month). Smart psychological anchoring for Gen Z.

6. **"Built in a day" phrasing with ongoing refinement.** "Built in a day. Improved every day since." is strong. It addresses the skepticism without backing down from the claim.

7. **Competitive positioning matrix** is excellent. "Discovers what to automate AND builds the fix" -- this is the unique quadrant. The UI should reinforce this: the quiz DISCOVERS, the X-Ray REVEALS, and the automations FIX.

### Challenges

1. **Business says "no auth for PoC."** Architecture says "magic links for PoC." We said "magic links for MVP." These three positions need to converge. See Key Tension #1 resolution below.

2. **Business says "12 seniors" goes in footer + About page, NOT landing page.** We proposed a dedicated landing page section between Trust and Skills. See Key Tension #2 resolution below.

3. **ALL current landing page CTAs link to `#early-access`** which scrolls to the email capture in the Hero section. But the email capture is ALSO in the Hero section at the top. So clicking a CTA in section 7 scrolls all the way back to the top. This is disorienting. Also, the `#early-access` anchor is on the Hero's email form, not on the EarlyAdopterSection which actually talks about early access. See Key Tension #4 resolution below.

4. **Async "Office Hours" via email reply.** This is fine but the UX needs thought. If founding members can reply to any email with questions, we need to set expectations about response time. "Founder answers within 48 hours" should be stated explicitly. Otherwise, silence after sending an email feels like being ignored.

5. **The EUR 29 Time Audit is "delivered within 72 hours."** From a UX perspective, 72 hours is a long wait after the instant gratification of the free Time X-Ray. The journey goes: instant quiz results -> instant screenshot analysis -> ... 3-day wait for the paid audit. This feels like a regression. Can we deliver a preliminary automated report immediately and the human review within 72 hours?

### Answers to Business Questions

**"Free tier limit: 1 screenshot/month or 3?"**

Neither. Unlimited for PoC. At $0.003/screenshot with Haiku, even 100 screenshots costs $0.30. The cost is a rounding error. Removing limits removes friction. If a user uploads 10 screenshots trying to get a good read, that's engagement we WANT. For MVP at scale, consider 3/month free, unlimited for paid tiers.

**"Should the Time X-Ray card be gated behind signup, or fully free?"**

Fully free. The card IS the viral mechanic. Gating it behind signup kills sharing. Anonymous users should be able to create, view, and share X-Rays. Signup captures them AFTER they've experienced value. This is the Value Before Ask principle.

**"Privacy policy needs updating for Anthropic as sub-processor."**

Yes, and from a UX perspective, the disclosure should be visible in the upload flow itself, not buried in the privacy policy. Our proposed upload zone design includes "Your image is processed in seconds and deleted immediately" -- we should add a small "How it works" expandable that says "We use AI (Claude by Anthropic) to read app names and times from your screenshot. The AI sees the image for ~3 seconds, extracts the data, and the image is discarded. Anthropic does not store your data."

### Revisions to Our Plan

- **Add Founding 50 counter** to the email capture component. Show "X of 50 founding spots remaining" below the submit button.
- **Add Stripe checkout redirect** for paid features. No custom payment form.
- **Add "48 hours" response time promise** to the Office Hours / AMA format.

---

## Key Tension Resolutions

### Tension 1: Auth Strategy -- No Auth vs Magic Link vs Google OAuth

**Positions:**
- Business: No auth for PoC. Email + Stripe customer ID is sufficient.
- Architecture: Auth.js + Google OAuth (MVP), magic links (PoC fallback).
- Frontend (us): Magic link as primary, no Google OAuth.

**Resolution: Layered approach.**

| Phase | Auth method | What it unlocks |
|---|---|---|
| PoC (weeks 0-6) | **No auth.** Email capture only. | Quiz, screenshot, X-Ray, sharing. All anonymous. |
| PoC+ (when first paid feature ships) | **Magic link via Resend.** | Save results, purchase Time Audit, view dashboard. |
| MVP (when Google API access needed) | **Add Google OAuth as optional.** | Connect Gmail, Calendar for deeper discovery. |

**UX rationale:** Business is right that PoC doesn't need auth. Architecture is right that we'll eventually need Google OAuth for API access. We're right that magic link should be the primary path because it aligns with the privacy positioning. Google OAuth is added as "Connect your Google account for deeper insights" -- an opt-in power feature, not the login method.

**Frontend implementation:** The PoC email capture (existing `EmailCapture.tsx`) is the "signup." When magic links are added, the same email input sends a login link instead of (or in addition to) subscribing. No new UI needed -- just a behavior change on the backend.

### Tension 2: "Built by 12 Seniors" -- Landing Section vs Footer/About Only

**Positions:**
- Business: Footer + About page. Don't put it on the landing page -- it's a trust signal, not conversion-driving.
- Frontend (us): Dedicated landing page section between Trust and Skills.

**Resolution: We concede partially, but with a counter-proposal.**

Business is right that a full dedicated section risks looking self-congratulatory. But burying it in the footer wastes its trust-building power.

**Compromise: Integrate into the existing Trust section, not a new section.**

The Trust section already covers "What we see / What we never see." Add a subsection at the bottom:

```
Who's behind the curtain?

12 senior engineers. 150+ years of combined experience.
Built in a single day. Improved every day since.

[12 overlapping avatars]     [Read our story -->]
```

This is 3-4 lines, not a full section. It appears where users are already thinking about trust. The "Read our story" link goes to `/about` (MVP). No separate landing page section needed.

**Footer:** Keep the one-liner: "Built by 12 senior engineers in Helsinki."

### Tension 3: Cheap AI Enables Generous UX

**Position:** AI team says Haiku at $0.003/call. This changes the UX calculus.

**Resolution: Remove ALL usage gates from PoC.**

Concrete UX changes enabled by cheap AI:

1. **Upload flow:** Remove "1 free analysis" language. The button just says "Analyze my screen time." No counter, no limit, no gate.

2. **Error recovery:** When confidence is low, show results + "Want a more complete picture? Upload a clearer screenshot or a different day's data." This is a HELPFUL prompt, not a paywall.

3. **Multiple screenshots:** Add a "+" button after the first analysis: "Add another day's data for a fuller picture." Merge results client-side. Show weekly aggregate.

4. **Instant re-analysis:** If the user accidentally uploads the wrong image, they can immediately try again. No "you've used your attempt" messaging.

5. **Processing animation can be shorter.** At $0.003, we don't need to "justify the cost" with a long loading animation. 2-3 seconds of processing indicator, then results.

### Tension 4: All CTAs Link to Non-Existent #early-access

**Current state (verified in codebase):**
- `HeroSection.tsx` line 180: `<Flex ... id="early-access">` -- the email form in the hero
- `TiersSection.tsx` lines 114-129: all tier CTAs are `<styled.a href="#early-access">`
- `PainQuiz.tsx` line 180-194: quiz results CTA links to `#early-access`

The problem: users in section 7 (Tiers) click a CTA, scroll all the way back to the top, and land on the Hero email form. This is jarring. The email form at the top doesn't match the context of what they just read.

**Resolution: Context-specific CTAs + a floating email capture.**

1. **Move the `id="early-access"` to the EarlyAdopterSection** (section 7), not the Hero. This is where the founding member pitch lives. CTAs should scroll to where users can read what they're signing up for.

2. **Give each section a contextual CTA:**

| Section | Current CTA | Proposed CTA | Links to |
|---|---|---|---|
| Hero | Email form (inline) | Keep as-is | N/A (it IS the form) |
| Problem | None | "See what eats your time" | `/quiz` |
| How It Works | None | "Try it free" | `/quiz` |
| Data Receipt | None | "Get your own X-Ray" | `/quiz` or `/xray` |
| Trust | None | No CTA (trust section shouldn't sell) | N/A |
| Skills | None | "Which one first?" | `/quiz` |
| Tiers | "Get your free X-Ray" / "Join the waitlist" | "Start your free X-Ray" / "Join founding members" | `/quiz` / scroll to `#founding` |
| FAQ | None | No CTA | N/A |
| Final CTA | Email form | Keep as-is | N/A (it IS the form) |

3. **Add a second email capture** at the bottom of the EarlyAdopterSection with `id="founding"`. This is where "Join the waitlist" CTAs should scroll.

4. **Mid-page CTA buttons** should route to `/quiz` (the entry point of the funnel), not to an email form. The funnel is: landing -> quiz -> screenshot -> X-Ray -> THEN email capture. Don't short-circuit to email before value delivery.

### Tension 5: Session-Merge UX

**Context:** Architecture's ADR-005 says anonymous quiz/screenshot results merge into authenticated accounts on first login. Business says PoC has no auth, just email capture. What does this look like?

**PoC session merge (email-only, no auth):**

There is no session merge in PoC. The email capture is a newsletter signup (Resend), not account creation. Quiz results and screenshot analyses live in localStorage and optionally in the database (keyed by `session_id`). Shareable X-Ray links work via server-side UUID lookup. No merge needed because there are no accounts.

**MVP session merge (magic link auth):**

When a user clicks a magic link and authenticates for the first time:

1. **Before login:** User has `session_id` cookie. Quiz results and screenshot analyses in the database are linked to this `session_id` (nullable `user_id`, non-null `session_id`).

2. **During login:** After magic link verification, the server:
   - Creates a user record (or finds existing by email)
   - Queries for all records with matching `session_id`
   - Updates `user_id` on all matching records
   - Sets the authenticated session cookie

3. **After login:** User is redirected to the dashboard. The dashboard shows:

```
+--------------------------------------------+
|                                            |
|  Welcome! We found your existing data.     |
|                                            |
|  [Quiz result card]  [X-Ray card]          |
|  "From your visit on Mar 28"               |
|                                            |
|  These are now saved to your account.      |
|                                            |
+--------------------------------------------+
```

**UX details:**
- The merge happens silently on the server. The user never sees a "merging your data..." screen.
- The dashboard shows a one-time "We found your existing data" banner. It disappears after dismissal. This reassures users that nothing was lost.
- If no prior data exists (user signs up cold), the dashboard shows "Create your first X-Ray" instead.
- If the user had multiple sessions (different devices), only the current device's `session_id` is merged. This is acceptable -- users rarely use the pre-auth flow on multiple devices for the same product.

**Edge case: email already exists.** If someone enters an email that already has an account, the magic link logs them in (not a separate "sign up" flow). Their new session data merges into the existing account. No special UI needed -- it just works.

---

## Summary of Revisions to Our Draft

Based on cross-review, here are the changes to `01-frontend-ux-draft.md`:

1. **Auth:** PoC = no auth (email capture only). Magic links added when first paid feature ships. Google OAuth deferred to post-MVP for API access.

2. **"12 Seniors" section:** Removed as standalone section. Integrated into existing Trust section as a subsection. Full story on `/about` page (MVP).

3. **Screenshot upload:** Remove ALL usage limits. Allow multiple uploads per session. Add "try again" for low-confidence results. Add client-side image resize before upload.

4. **CTA strategy:** Rewrite all landing page CTAs. Mid-page CTAs link to `/quiz`. Move `#early-access` to EarlyAdopterSection. Add second email capture at EarlyAdopterSection.

5. **Session merge:** Added complete UX spec for MVP session merging. PoC has no merge (no accounts).

6. **Route naming:** Align with architecture: `/api/upload/screentime` not `/api/analyze-screenshot`.

7. **Remove `/quiz/results` route.** Results rendered client-side within the quiz page.

8. **FSD alignment:** `xray-result` stays as entity. Upload flow stays as feature. Align naming with AI pipeline's types.

9. **Time X-Ray card:** Show specific app names by default (not anonymized categories). Add privacy toggle for sharing only.

10. **Founding 50 counter:** Add to EmailCapture component.

---

## ADDENDUM: Revenue-First Priority Override

**Founder directive:** "We wanna be making money." Revenue is a PoC requirement, not an MVP feature.

This changes several positions from the cross-review above. Here is the revised frontend/UX stance with revenue as the #1 filter.

### What Changes

**1. Auth revision: PoC needs lightweight auth after all.**

Our original cross-review said "PoC = no auth, email capture only." The founder's directive changes this. Stripe Checkout requires identifying who paid. Two options:

**Option A -- Stripe-only identity (RECOMMENDED for PoC):**
- No user accounts. No login system.
- When a user clicks "Buy" (e.g., EUR 29 Time Audit), we create a Stripe Checkout session with their email pre-filled (from the email capture they already completed).
- Stripe handles identity: `customer_email` on the Checkout session, `stripe_customer_id` on the webhook response.
- After payment, send a confirmation email via Resend with a unique link to their purchased content (e.g., `meldar.ai/audit/[token]`).
- The token is a signed JWT with their Stripe customer ID + purchase ID. No database needed for auth -- Stripe IS the source of truth.
- "Logged in" state for PoC = having a valid purchase token in a cookie or URL.

**Why this works:** No Auth.js, no Neon users table, no session management. Stripe Checkout is the login page. The purchase confirmation email is the magic link. This lets us ship payments in hours, not days.

**Option B -- Magic link (if we need persistent accounts in PoC):**
- Only if we decide authenticated users need to see a dashboard in PoC.
- Adds complexity. Defer unless the Founding 50 program explicitly requires repeat access.

**UX flow for Option A:**

```
Landing page
  |
  v
[CTA: "Get your free X-Ray"]
  |
  v
Quiz --> Screenshot --> Time X-Ray (all anonymous, free)
  |
  v
X-Ray result page shows:
  "Want a deeper audit by a senior engineer? EUR 29"
  [Buy Time Audit]
  |
  v
Stripe Checkout (hosted page, pre-filled email)
  |
  v
Stripe confirmation --> Resend email with audit delivery link
  |
  v
Founder delivers audit manually within 72 hours
  |
  v
User receives audit PDF at their unique link
```

No accounts. No passwords. No auth library. Stripe is the payment processor AND the identity provider for PoC.

**2. CTA strategy revision: every CTA must lead toward revenue.**

Our original cross-review proposed routing mid-page CTAs to `/quiz`. With revenue-first thinking, the CTA hierarchy changes:

| Section | Proposed CTA | Links to | Revenue angle |
|---|---|---|---|
| Hero | Email form (inline) | N/A | Captures email for Founding 50 funnel |
| Problem | "See what eats your time" | `/quiz` | Entry point -- builds awareness of problem |
| How It Works | "Try it free" | `/quiz` | Free X-Ray is the lead magnet |
| Data Receipt | "Get your own X-Ray" | `/quiz` | Shows what they'll get -- desire creation |
| Trust | No CTA | N/A | Trust-building only |
| Skills | "Get this built for you -- EUR 49" | Stripe Checkout link | **DIRECT REVENUE CTA** |
| Early Adopter | "Join Founding 50 (X spots left)" | `#founding` email capture | Captures high-intent leads |
| Tiers | "Start free" / "EUR 9/mo" / "EUR 199/mo" | `/quiz` / Stripe / Stripe | **DIRECT REVENUE CTAs** |
| FAQ | No CTA | N/A | Objection handling only |
| Final CTA | "Get your free Time X-Ray" + email form | `/quiz` + email capture | Captures remaining stragglers |

Key change: the Skills section and Tiers section now have DIRECT links to Stripe Checkout for paid options. The free X-Ray is positioned as a taste, not the product.

**3. The landing page needs pricing visible above the fold.**

Not the full pricing table, but a signal that this is a real product with real pricing:

In the Hero section, below the email form, add:
```
Free forever -- No credit card
Founding members get a free Time Audit (worth EUR 29)
```

This does two things:
- Anchors the value at EUR 29 (they're getting something worth money for free)
- Signals that this is a real business, not a side project

**4. Founding 50 program becomes the primary conversion mechanism.**

The Founding 50 is NOT a nice-to-have. It's the revenue engine for PoC. The email capture must explicitly sell the Founding 50 package:

Current EmailCapture button text: "Get your free time audit"
New EmailCapture messaging:

```
+--------------------------------------------+
|  Join the Founding 50                      |
|                                            |
|  [email input]  [Claim your spot]          |
|                                            |
|  27 of 50 spots remaining                  |
|  Free Time Audit (EUR 29 value) +          |
|  Weekly automation playbook +              |
|  Founding pricing locked forever           |
+--------------------------------------------+
```

The counter is real. It updates from a server-side count (Resend contact list count, or a simple Neon/KV counter). When it hits 50, the form changes to "Join the waitlist" with regular pricing shown.

**5. X-Ray result page needs a paid upsell, not just email capture.**

Our original draft had the X-Ray result page ending with "Save your results + get weekly tips" (email capture). With revenue-first:

```
+--------------------------------------------+
|  [Time X-Ray card - free]                  |
|                                            |
|  Your free X-Ray shows the basics.         |
|  Want the full picture?                    |
|                                            |
|  [Personal Time Audit -- EUR 29]           |
|  A senior engineer reviews your data,      |
|  interviews you for 15 minutes, and        |
|  delivers a custom action plan.            |
|                                            |
|  [Buy your Time Audit -->]  (Stripe)       |
|                                            |
|  -- or --                                  |
|                                            |
|  [Join Founding 50 and get it free]        |
|  (only if spots remain)                    |
+--------------------------------------------+
```

This creates two paths to revenue:
1. Direct purchase (EUR 29)
2. Founding 50 signup (free audit, but captures a high-intent user who will convert to paid tiers later)

**6. The Tiers section needs real Stripe links, not anchor links.**

Currently all tier CTAs link to `#early-access`. With Stripe in PoC:

| Tier | CTA | Action |
|---|---|---|
| Time X-Ray (Free) | "Start your free X-Ray" | Link to `/quiz` |
| Starter (EUR 9/mo) | "Join Founding 50 -- EUR 4/mo" | Stripe Checkout session (subscription) |
| Concierge (EUR 199/mo) | "Talk to us" | `mailto:` or Calendly link (manual sales) |

For the one-time products:
| Product | CTA | Action |
|---|---|---|
| Personal Time Audit (EUR 29) | "Get your audit" | Stripe Checkout (one-time) |
| App Build (EUR 49) | "Get this built" | Stripe Checkout (one-time) |

**7. Dead CTA links are blocker #1. Here's the implementation plan.**

The founder is right -- dead links = $0. Here's exactly what needs to change in the existing codebase:

**File: `src/widgets/landing/TiersSection.tsx` (lines 114-129)**
- Replace `href="#early-access"` with:
  - Free tier: `href="/quiz"`
  - Starter tier: `onClick` that calls `POST /api/billing/checkout` to create a Stripe session, then redirects
  - Concierge tier: `href="mailto:hello@meldar.ai?subject=Concierge"`

**File: `src/features/quiz/ui/PainQuiz.tsx` (lines 180-194)**
- Replace `href="#early-access"` with a proper CTA that either:
  - Links to `/xray` (screenshot upload for PoC), or
  - Shows inline email capture with Founding 50 messaging

**File: `src/widgets/landing/HeroSection.tsx` (line 180)**
- Keep the `id="early-access"` on the Hero email form for backwards compatibility
- BUT also add `id="founding"` to the EarlyAdopterSection's email capture

**New file: `src/app/api/billing/checkout/route.ts`**
- Creates Stripe Checkout sessions for Time Audit (EUR 29) and Starter (EUR 9/mo)
- Accepts `{ product: 'time-audit' | 'starter', email?: string }`
- Returns `{ checkoutUrl }` for client-side redirect

**New file: `src/app/api/billing/webhook/route.ts`**
- Handles `checkout.session.completed` events
- Sends confirmation email via Resend
- For Time Audit: sends intake form link
- For Starter: sends welcome + weekly playbook opt-in

### What Does NOT Change

1. **Free X-Ray remains free and ungated.** The founder said "free tier exists to convert." That means it's a funnel, but it's still free. No login wall on quiz/screenshot/X-Ray.

2. **Screenshot uploads remain unlimited for PoC.** At $0.003/call, the cost is noise. The screenshots feed the X-Ray which feeds the upsell.

3. **Session merge design stays the same** -- it's still an MVP concern. PoC uses Stripe customer email as identity, not user accounts.

4. **"12 Seniors" integrated into Trust section** -- this is a trust signal that supports revenue. No change.

5. **Sharing mechanics unchanged.** Viral X-Ray sharing drives free traffic that enters the paid funnel.

### New Component Architecture for Revenue

```
src/
  features/
    billing/                    # NEW -- PoC revenue infrastructure
      index.ts
      ui/
        PurchaseButton.tsx      # "Buy Time Audit" / "Start Starter" button
        FoundingCounter.tsx     # "27 of 50 spots remaining" live counter
        PricingCard.tsx         # Individual tier card with Stripe CTA
      lib/
        use-checkout.ts         # Hook: calls /api/billing/checkout, handles redirect
    founding-program/           # NEW -- Founding 50 specific UX
      index.ts
      ui/
        FoundingEmailCapture.tsx  # Enhanced email capture with counter + perks list
        FoundingBadge.tsx         # "Founding member" badge for social proof
```

### Revised PoC Frontend Priorities (Ordered by Revenue Impact)

1. **Fix dead CTAs** -- Replace all `#early-access` links. This is a same-day fix.
2. **Stripe Checkout integration** -- `/api/billing/checkout` + `/api/billing/webhook` routes. 1 day.
3. **Founding 50 email capture** -- Enhanced EmailCapture with counter, perks, scarcity. 0.5 day.
4. **X-Ray result page with paid upsell** -- Time Audit purchase CTA after free results. 0.5 day.
5. **Screenshot upload UX polish** -- Multi-step progress, platform detection, retry flow. 1 day.
6. **Time X-Ray card** -- The shareable result card. 1 day.
7. **Dynamic OG images** -- For viral sharing. 0.5 day.
8. **"12 Seniors" in Trust section** -- Subsection with avatars. 0.5 day.

Total: ~5 days of frontend work for a revenue-generating PoC.

### Revenue-First Success Metrics (Frontend Perspective)

| Metric | Target | How we measure |
|---|---|---|
| CTA click-through rate | >5% per section | GA4 event on each CTA |
| Quiz-to-X-Ray conversion | >40% | GA4 funnel |
| X-Ray-to-purchase click | >8% | GA4 event on "Buy Time Audit" |
| Stripe Checkout completion | >50% of sessions created | Stripe dashboard |
| Founding 50 fill rate | 50 in 6 weeks | Resend contact count |
| First EUR 29 payment | Within 2 weeks of launch | Stripe dashboard |
