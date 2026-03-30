# Sprint Priorities — Meldar Product Rethink

**Date:** 2026-03-30
**Context:** Solo founder, PoC stage, collecting signups. Landing page live. Quiz gives pre-baked results (founder considers it low-value). Screenshot upload + Claude Vision + X-Ray card + shareable link built but untested with real users. Stripe checkout for Time Audit (EUR 29) and App Build (EUR 79) wired.

---

## 1. Sprint 1 Focus: Make the X-Ray the Front Door

**Core insight:** The quiz is a fake-value gate that sits between users and the real differentiator (Screen Time X-Ray). The X-Ray is already built. The highest-impact work is removing friction to reach it, not building new features.

### The Problem with the Current Funnel

```
Landing Page → Quiz (fake data) → "Get your real X-Ray" link → /xray (upload) → X-Ray Card → Upsell
     ^              ^                                               ^
     |              |                                               |
   10 sections    FRICTION POINT                              ACTUAL VALUE
   (long scroll)  (users get fake hrs/week numbers,           (real data, shareable,
                   feels gimmicky, erodes trust)               personal)
```

The quiz promises "~X hrs/week you could get back" from pre-baked numbers. Users who are even slightly skeptical will bounce. The real X-Ray does the same thing but with their actual data — and it's only one click away.

### Sprint 1 Goal

**Repoint the entire site at the X-Ray.** The user's first meaningful action should be uploading a screenshot, not picking tiles from a canned list.

---

## 2. Kill List

Remove or hide these from the live site:

| Item | Action | Rationale |
|---|---|---|
| **Quiz page** (`/quiz`) | Hide (remove nav links, keep route for existing URLs) | Gives fake numbers, erodes trust, adds a step before real value |
| **"Pick Your Pain" CTA** in hero/nav | Remove | Don't send people to the quiz anymore |
| **12 pain-point tiles** as primary discovery | Demote | Pre-baked hours are unsubstantiated; keep the pain library as data but don't lead with it |
| **"2,847 people surveyed" Research Card** | Keep for now | Social proof still useful on landing page; revisit when you have real user count |
| **Tiers section pricing** | Simplify or hide Starter tier | Starter is "coming soon" anyway; showing 3 tiers to a site with 0 users is premature. Show X-Ray (free) + Time Audit (EUR 29) only |
| **Stage cards** ("Invitation / Discovery / Foundation") | Simplify | Feels abstract; replace with concrete value prop tied to X-Ray |

**Do NOT kill:**
- Email capture (keep, move to post-X-Ray position too)
- Trust section (privacy messaging is load-bearing for screenshot upload)
- Shareable X-Ray cards + OG images (this is the viral loop)
- Stripe checkout (keep wired, just don't make it the hero)

---

## 3. Build List — Minimum Viable Sprint 1

### Must-Do (Ship This Week)

| # | Task | Effort | Why |
|---|---|---|---|
| **B1** | **Hero CTA points to /xray** — Replace "Time Audit" email capture with "See Your Time X-Ray" button linking to /xray. Keep email capture but move it secondary. | 1h | Eliminates the biggest friction point: users hit real value in one click |
| **B2** | **Remove quiz from nav and all CTAs** — Remove /quiz from header nav, "How It Works" section, and any internal links. Keep the route alive (301 or soft landing) for any shared URLs. | 1h | Stops sending users to fake-value page |
| **B3** | **Add email capture AFTER X-Ray result** — The ResultEmailCapture component exists but verify it works end-to-end. This is the highest-intent moment. | 2h | Biggest funnel leak per backlog. Capture users at peak interest |
| **B4** | **Test X-Ray with 5 real screenshots** — Actually upload 5 real iOS/Android Screen Time screenshots through the live flow. Document what breaks. | 2h | Zero real-user testing has been done. Ship-blocking bugs are likely hiding here |
| **B5** | **Fix upload UX: drag-and-drop handler** — The upload zone says "Drop" but has no drop handler per backlog. Wire it. | 1h | Users will try to drag. If it doesn't work, they'll think the app is broken |
| **B6** | **Platform detection for upload instructions** — Show iOS instructions on iPhones, Android instructions on Android. Currently shows both. | 1h | Reduces cognitive load at the critical moment |

**Total Must-Do: ~8 hours**

### Should-Do (If Time Remains)

| # | Task | Effort | Why |
|---|---|---|---|
| **B7** | **Simplify landing page to 6 sections** — Cut from 10 to: Hero, Problem, How It Works (rewrite for X-Ray), Trust, FAQ, Final CTA. Remove Data Receipt preview (the real thing is better), Early Adopter, Tiers, Skills. | 3h | Shorter page = higher conversion. Every section is a chance to bounce. |
| **B8** | **Add "X-Ray in 30 seconds" social proof** — Show 1-2 anonymized example X-Ray cards on landing page instead of the fake Data Receipt mockup | 2h | Shows real output, not a preview of an output |
| **B9** | **Verify Resend domain** — Emails from sandbox domain hurt deliverability and look untrustworthy | 1h | Already in backlog. Blocks any email-based re-engagement |

---

## 4. RICE Scoring — Top 10 Actions

Scoring: Reach (users affected per week, 1-10), Impact (effect on conversion, 1-3 where 3=massive), Confidence (0.5-1.0), Effort (person-weeks, lower=better). **RICE = (R x I x C) / E**

| Rank | Action | R | I | C | E (weeks) | RICE | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **Hero CTA → /xray** | 10 | 3 | 1.0 | 0.02 | 1500 | DO NOW |
| 2 | **Remove quiz from nav/CTAs** | 10 | 2 | 0.9 | 0.02 | 900 | DO NOW |
| 3 | **Test X-Ray with real screenshots** | 10 | 3 | 0.8 | 0.05 | 480 | DO NOW |
| 4 | **Fix drag-and-drop on upload** | 8 | 2 | 1.0 | 0.02 | 800 | DO NOW |
| 5 | **Email capture after X-Ray result** | 6 | 3 | 0.9 | 0.05 | 324 | DO NOW |
| 6 | **Platform detection for upload** | 8 | 1 | 1.0 | 0.02 | 400 | DO NOW |
| 7 | **Simplify landing to 6 sections** | 10 | 2 | 0.7 | 0.08 | 175 | THIS WEEK IF TIME |
| 8 | **Verify Resend domain** | 4 | 2 | 1.0 | 0.02 | 400 | THIS WEEK IF TIME |
| 9 | **Example X-Ray cards on landing** | 10 | 2 | 0.6 | 0.05 | 240 | NEXT SPRINT |
| 10 | **X-Ray card reveal animation** | 8 | 1 | 0.8 | 0.05 | 128 | NEXT SPRINT |

**Not on this list (deferred):**
- Google Takeout parser (too much effort for PoC)
- Chrome extension (trust not yet earned)
- Rate limiting with Upstash (no traffic yet)
- Sentry (no users to generate errors yet)
- CI pipeline (one person, manual deploy is fine)

---

## 5. One Metric That Matters (Next 2 Weeks)

### **X-Ray Completion Rate**

```
OMTM = (Successful X-Ray cards generated) / (Visitors to /xray page)
```

**Why this metric:**
- It proves the core hypothesis: "People will upload a real screenshot to see their data."
- It's upstream of everything else (sharing, email capture, purchases).
- If this number is low, nothing else matters — the product doesn't work.
- If this number is high, you have product-market fit signal for the discovery engine.

**Target:** 40%+ completion rate (industry benchmark for single-step tools is 30-50%).

**How to measure:**
- GA4 event on /xray page load (already consent-gated)
- GA4 event on successful X-Ray result render
- Manual count is fine for first 2 weeks; don't over-engineer analytics

**Secondary metric (watch but don't optimize for):**
- X-Ray share rate (how many generated cards get shared via the shareable link)

---

## 6. Solo Founder Constraint

### What 1 Person Can Realistically Ship This Week

**Available hours:** ~30 focused hours (assuming some time goes to non-engineering work: customer conversations, content, admin).

**Maximum scope for Sprint 1:**
- B1-B6 from the Must-Do list (~8 hours of engineering)
- 1-2 items from Should-Do (~3-4 hours)
- Testing the live X-Ray flow with real data (~2 hours)
- Fixing bugs found during testing (~4 hours buffer)
- **Total: ~17 hours of engineering**

That leaves ~13 hours for:
- Talking to 3-5 potential users (show them the X-Ray, watch them use it)
- Writing 1-2 social posts showing an anonymized X-Ray card
- Responding to any signups from the email list

### What to Explicitly NOT Do

- Do not build new features. The X-Ray is built. Ship it to users.
- Do not redesign the landing page. Simplify it (cut sections), don't redesign.
- Do not set up monitoring/CI/rate-limiting. Zero users = zero need.
- Do not build the Google Takeout parser. It's a 2-week project for a maybe.
- Do not build the Chrome extension. That's a quarter of work.
- Do not add more pain points to the quiz. The quiz is being deprioritized.
- Do not optimize OG images. The current ones work.
- Do not add Founding 50 counter/urgency. You need people using X-Ray first.

### Decision Framework for Solo Founders

Before starting any task, ask:

1. **Does this put the X-Ray in front of a real user?** If no, skip it.
2. **Can I ship this in under 2 hours?** If no, break it down or defer it.
3. **Will I learn something from this?** If no, it's polish, not progress.

---

## Sprint 1 Summary

```
THEME:    "X-Ray is the product. Everything else is a distraction."
DURATION: 1 week (2026-03-30 to 2026-04-05)
OMTM:     X-Ray completion rate (target: 40%+)
SCOPE:    6 must-do tasks (~8h) + 2-3 should-do tasks (~4h) + bug buffer (~4h)
KILL:     Quiz as primary path, excess landing sections, premature pricing tiers
BUILD:    Nothing new. Remove friction to existing value.
VALIDATE: 5 real screenshots through live flow. 3-5 user conversations.
```
