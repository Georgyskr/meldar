# Business, GTM & Compliance -- Final Plan

**Authors:** Sales Engineer, Reddit Community Builder, Legal Compliance Checker
**Date:** 2026-03-30
**Status:** Final (Iteration 3) -- ready for synthesis
**Incorporates:** Locked consensus decisions, founder revenue-first mandate, cross-review corrections

---

## Locked Consensus Applied

| Decision | Applied in this document |
|---|---|
| Stripe PoC-critical | Sections 1, 2, 3, 11 |
| Neon Postgres in PoC (3 tables) | Section 8 (privacy policy covers DB storage) |
| No auth in PoC | Sections 1, 3, 11 (email + Stripe customer ID only) |
| Magic link via Auth.js + Resend for MVP | Section 11 |
| No Google OAuth | Section 7 (positioning decision) |
| Screenshots in-memory only | Section 8 (privacy policy language) |
| Haiku 4.5 at $0.003/screenshot | Sections 2, 10 (pricing and cost model) |
| Unlimited free screenshots | Sections 1, 2 (free tier = sales funnel) |
| CTAs route to /quiz | Section 3 (CTA strategy) |
| "12 seniors" in Trust subsection + /about | Section 4 |
| Upstash Redis for rate limiting + cost tracking | Section 8 |
| Three-phase timeline | Section 11 |
| Infra cost ~EUR 126/month at 1,000 users | Section 10 |

---

## 1. Monetization Strategy

### Principle: Revenue from Day 1

The founder has mandated: "We wanna be making money." Revenue is a PoC requirement, not an MVP feature.

### Revenue Streams by Phase

| Revenue stream | Phase | Payment method | Delivery |
|---|---|---|---|
| **Personal Time Audit** (EUR 29 one-time) | PoC (week 1+) | Stripe Checkout | Founder manually analyzes + delivers 1-page report via email within 72 hours |
| **App Build** (EUR 49 one-time) | Commercial Validation (week 3+) | Stripe Checkout | Founder manually builds automation + delivers via email |
| **Starter subscription** (EUR 9/month) | MVP (week 7+) | Stripe Billing (recurring) | Automated: weekly playbook + deeper analysis + priority features |
| **Concierge subscription** (EUR 199/month) | MVP (week 7+) | Stripe Billing (recurring) | Semi-automated: unlimited builds + weekly check-ins |

### Payment Architecture (PoC -- No Auth, No User Accounts)

```
User clicks "Get your Time Audit" (EUR 29)
  -> Frontend calls POST /api/billing/checkout { product: "time-audit", email }
  -> API route creates Stripe Checkout Session with:
     - customer_email: user's email
     - metadata: { product: "time-audit", founding_member: "true/false" }
     - success_url: https://meldar.ai/thank-you?session_id={CHECKOUT_SESSION_ID}
     - cancel_url: https://meldar.ai/xray
  -> User redirected to Stripe-hosted checkout page
  -> User pays (Stripe handles PCI, 3D Secure, EU card rules)
  -> Stripe redirects to /thank-you
  -> Stripe fires webhook to POST /api/billing/webhook
  -> Webhook handler:
     1. Verifies Stripe signature (stripe.webhooks.constructEvent)
     2. Extracts customer email + product from session metadata
     3. Sends confirmation email via Resend
     4. Tags email in Resend: "paid_time_audit" or "founding_member"
     5. Writes payment record to Neon DB (subscribers table with stripe_customer_id)
  -> Done. No user account needed.
```

**Files involved:**

| File | Action | Purpose |
|---|---|---|
| `src/app/api/billing/checkout/route.ts` | Create | Creates Stripe Checkout Sessions |
| `src/app/api/billing/webhook/route.ts` | Create | Handles Stripe webhook events |
| `src/app/thank-you/page.tsx` | Create | Post-payment confirmation page |
| `src/server/billing/stripe.ts` | Create | Stripe client singleton + helpers |

### Cost Control

Every AI API call has a ceiling. No open-ended billing where a user could trigger unbounded costs.

| Action | Model | Cost per call | Cap per user/day |
|---|---|---|---|
| Screenshot analysis | Haiku 4.5 | $0.003 | 20/day (rate limit, not paywall) |
| Time X-Ray narrative | Sonnet 4.6 (MVP) | $0.015 | 3/day |
| Total daily cost ceiling | -- | -- | $50/day global (Upstash counter) |

### Free Tier as Sales Funnel

The free Time X-Ray is not the product. It's the demo. It exists to convert.

**Conversion path on every X-Ray result page (`/xray/[id]`):**

```
[Time X-Ray Card -- free]
  |
  v
"Your top 3 time-wasters. Want a plan to fix them?"
  |
  v
[CTA: "Get your Personal Time Audit -- EUR 29"]
  |                                          |
  v (if Founding 50 spot available)          v (if spots full)
[CTA: "Claim your free audit               [CTA: links to Stripe
 -- 23 of 50 spots left"]                    Checkout, EUR 29]
```

The X-Ray result page is the highest-converting surface on the site. Every element below the card is designed to move the user toward the Time Audit purchase.

---

## 2. Pricing

### Final Price Table

| Tier | Price | Billing | What they get | AI cost per user | Margin |
|---|---|---|---|---|---|
| **Time X-Ray** | Free | -- | Unlimited screenshots + quiz + shareable card with real app data | $0.003/screenshot | N/A (lead gen) |
| **Personal Time Audit** | EUR 29 | One-time | Human-reviewed analysis of workflows. 1-page PDF report with top 3 automation recommendations. Delivered within 72 hours. | $0 (human labor) | ~EUR 14.50/hr founder time |
| **App Build** | EUR 49 | One-time | Founder builds one personal automation. User owns it. 30 days of email support. | ~$2 AI cost + founder labor | ~EUR 10-15/hr |
| **Starter** | EUR 9/month | Stripe subscription | Weekly playbook email + deeper data analysis (Takeout) + priority access to features. | ~$0.02/month AI | ~97% |
| **Concierge** | EUR 199/month | Stripe subscription | Unlimited app builds + weekly check-ins + priority support + continuous monitoring. | ~$5/month AI | ~97% |

### Early Adopter Pricing (Founding 50)

| Tier | Regular price | Founding 50 price | Stripe implementation | Lock-in |
|---|---|---|---|---|
| Personal Time Audit | EUR 29 | **Free** | 100% off coupon code | First 50 signups only |
| Starter | EUR 9/month | **EUR 4/month** | Stripe Coupon: 55% off forever | Locked forever |
| App Build | EUR 49/app | **EUR 19/app** | Stripe Coupon: 61% off | First 5 apps |
| Concierge | EUR 199/month | **EUR 99/month** | Stripe Coupon: 50% off | Locked for 12 months |

**Stripe coupon codes (create in Stripe Dashboard):**
- `FOUNDING50_AUDIT` -- 100% off, max redemptions: 50, applies to "Personal Time Audit" product
- `FOUNDING50_STARTER` -- 55% off forever, max redemptions: 50, applies to "Starter" product
- `FOUNDING50_BUILD` -- 61% off, max redemptions: 250 (50 members x 5 apps), applies to "App Build" product
- `FOUNDING50_CONCIERGE` -- 50% off for 12 months, max redemptions: 50, applies to "Concierge" product

### Anchor Pricing Psychology

- Landing page tiers section: show regular price crossed out next to founding price
- "Save 55%" badge on founding pricing cards
- Counter on landing page: "23 of 50 founding spots remaining" (pulled from Neon DB or hardcoded during PoC)
- After Founding 50 fills: prices go to regular. No exceptions. Scarcity must be real.

### VAT/ALV Compliance

- ClickTheRoadFi Oy (Y-tunnus: 3362511-1) is a Finnish company selling B2C digital services in the EU
- Finnish VAT (ALV): 25.5% (standard rate as of 2025)
- EU OSS (One-Stop Shop): For B2C digital services sold cross-border within EU, must charge buyer's country VAT rate once revenue exceeds EUR 10,000/year
- **Action required before first transaction:** Register for EU OSS via vero.fi (MyTax portal)
- **Stripe Tax:** Enable in Stripe Dashboard. Stripe Tax automatically calculates correct VAT per buyer country, generates compliant invoices, and provides tax reports for filing
- Prices shown to users: inclusive of VAT (EU B2C standard). Stripe handles the split.

---

## 3. Early Adopter Program: "The Founding 50"

### Status: Launch-Critical (Founder Mandate)

This is not a nice-to-have. The Founding 50 program is the primary go-to-market vehicle for launch.

### What Founding Members Get

| Perk | Format | Delivery | Cost to us | Stripe integration |
|---|---|---|---|---|
| **Free Personal Time Audit** | 1-page PDF report | Email, within 72 hours of intake form | 1-2 hrs founder time per user | 100% coupon on "Time Audit" product |
| **Weekly Automation Playbook** | Email newsletter | Every Tuesday, starting Day 3 post-signup | 3-4 hrs/week to produce | N/A (free content) |
| **Shape the Product** | Welcome email survey + monthly vote | Ongoing | Near-zero | N/A |
| **Founding pricing locked** | Stripe coupon codes | Applied at checkout | Revenue discount | Coupon codes with max redemptions |
| **Direct line to the founder** | Email replies | Ongoing for founding 50 | Founder's time | N/A |

### The Intake Flow

```
User signs up (email capture on landing page)
  -> Resend sends welcome email:
     Subject: "Welcome to the Founding 50. Here's your first step."
     Body:
     - "You're member #[N] of 50."
     - "Your free Time Audit is ready. Fill out this 5-minute form: [Tally form link]"
     - "While you wait, here's your first automation playbook: [link]"
     - "Reply to this email anytime. I read every one. --Gosha"
  -> User fills out intake form (5-7 questions):
     1. What's your job/role?
     2. What 3-5 apps do you use most every day?
     3. What's the most annoying repetitive task in your work?
     4. How many hours/week do you think you waste on repetitive tasks?
     5. If we could automate ONE thing for you, what would it be?
  -> Founder analyzes and writes personalized report (1-2 hours)
  -> Founder sends report via email:
     Subject: "Your Personal Time Audit is ready."
     Body: PDF attachment + "Here's what I'd automate first, and here's how."
```

**Tools needed:**
- Tally (free tier, 100 responses/month) or Google Forms for the intake questionnaire
- Resend for all email delivery (already in stack)
- Google Docs or Notion for report templates
- No new engineering work for the intake flow -- it's entirely email-driven

### The "8+ Years Dev Advice" Angle

Delivered as **async content**, not live calls:

1. **Monthly "Ask Me Anything" email thread.** Founding members reply to the monthly email with questions about building apps, launching products, or using AI. Founder answers personally. Best answers go into the weekly playbook.

2. **"Build Log" blog posts.** Weekly behind-the-scenes posts on the `/about` page or a future `/blog` route. Shows real decisions, real code, real tradeoffs. This is dev advice packaged as content marketing.

3. **One "Launch Checklist" resource.** A single document: "How to go from idea to production-grade app." Given to founding members first, later published as a lead magnet.

**Why async:** The target audience (18-28) doesn't schedule video calls. They consume content on their own time. Live events have 15-25% show-up rates in this demographic.

### Founding 50 Counter (Landing Page)

The EarlyAdopterSection (`src/widgets/landing/EarlyAdopterSection.tsx`) needs to display remaining spots.

**PoC implementation (simple):**
- Store a `founding_spots_claimed` row in the Neon `subscribers` table (count where `is_founding = true`)
- Server component queries the count and renders: "N of 50 spots remaining"
- Or simpler: hardcode and manually update weekly during PoC

**Dependency on Frontend:** The `EarlyAdopterSection.tsx` component must be updated to show the counter and link the email capture to the founding member flow.

### Sequence

| Week | Action | Revenue |
|---|---|---|
| 0 | Update landing page: fix CTAs, add Founding 50 counter, Stripe integration | EUR 0 |
| 1 | Start distributing. First playbook email Day 3 post-signup. Social media posts begin. | EUR 0 (founding members are free) |
| 1-4 | Deliver free Time Audits as intake forms arrive (~10-15/week target). | EUR 0 (founding) |
| 4 | First "Shape the Product" vote. Share results in playbook. | EUR 0 |
| 6 | Founding 50 full (target). Switch to paid Time Audit (EUR 29). | First paid revenue |
| 6-10 | Paid Time Audits + first App Build requests. | EUR 29-49 per customer |

---

## 4. "Built by 12 Senior Engineers" Positioning

### Locked Placement

Per consensus: **subsection within Trust section** on landing page + **/about page** (MVP).

**Landing page (Trust section, `src/widgets/landing/TrustSection.tsx`):**
Add a subsection below the privacy promises:

```
Built in a single day by 12 senior engineers.
Refined every day since.

[12 small overlapping avatar circles]
Combined experience: 150+ years
```

**Footer (`src/widgets/footer/Footer.tsx`):**
One line: "Built by 12 senior engineers in Helsinki."

**/about page (MVP):**
Full story with team details, the "why" behind building Meldar, build process photos/screenshots.

### Authentic Storytelling Principles

- Show the build process. Time-lapse, commit logs, screenshots. Make it verifiable.
- Name the engineers (first name + specialty). Real people, real accountability.
- Be specific: "We planned for a week, then built for 14 hours straight."
- Connect to product: "We used AI to build Meldar. Meldar uses AI to build YOUR apps."
- Mitigate skepticism: "Built in a day. Improved every day since."

---

## 5. Reddit Strategy

### Philosophy: 90/10 Value-to-Promotion

Reddit penalizes self-promotion. The strategy: become a valued community member who happens to work on something relevant. 4-8 weeks of genuine participation before any promotional post.

### Target Subreddits (Ranked by Priority)

| Subreddit | Size | Strategy | Content type |
|---|---|---|---|
| **r/productivity** | 2.4M+ | Answer workflow optimization questions. Share automation tips from the weekly playbook. | Comments, then self-posts |
| **r/ChatGPT** | 5M+ | Help with prompts, share use cases. Position as AI practitioner. | Comments |
| **r/nocode** | 300K+ | Share practical "I automated X without code" tutorials. | Self-posts with tutorials |
| **r/SideProject** | 200K+ | "Show HN"-style posts AFTER 4 weeks of participation. | Project showcase |
| **r/smallbusiness** | 500K+ | Answer operational questions. Share automation ideas. | Comments |
| **r/college** / **r/GradSchool** | 1M+ combined | Help with productivity, study habits, tool recommendations. | Comments |
| **r/mealprep** / **r/EatCheapAndHealthy** | 3M+ combined | Share meal planning tips. Natural fit when meal planner app exists. | Comments |
| **r/Entrepreneur** | 2M+ | Share efficiency tips, automation case studies. | Comments, then self-posts |
| **r/Finland** / **r/Suomi** | 400K+ combined | Finnish company pride. Building a startup in Helsinki. | Occasional posts |

### Content Calendar (Weeks 1-8)

| Week | Action | Where | Notes |
|---|---|---|---|
| 1-2 | **Listen and comment only.** Thoughtful replies, no posts. Build karma. | r/productivity, r/ChatGPT, r/nocode | 20 min/day |
| 3-4 | **First value posts.** "I automated X and saved Y hours/week. Here's how." No Meldar mention. | r/productivity, r/nocode | 2 posts/week |
| 5-6 | **"Download your Google data" tutorial.** Genuinely useful, viral potential. Meldar link in Reddit profile only. | r/productivity, r/ChatGPT, r/privacy | 1 viral-intent post |
| 7-8 | **First project post.** "I'm building a tool that finds what to automate. Would love feedback." Transparent about being the founder. | r/SideProject, r/nocode | 1 showcase post |

### Rules (Non-Negotiable)

1. No link to meldar.ai in posts for first 4 weeks. Profile bio only.
2. No marketing language. No "game-changer," no "disrupting."
3. Every post/comment provides standalone value. Reader benefits without clicking.
4. Respond to every comment on your posts.
5. Transparent about being the founder when posting about Meldar.
6. Respect subreddit rules. Read the sidebar first.
7. No paid Reddit ads at this stage.
8. No bot accounts or vote manipulation.

### Metrics

| Metric | Target | Timeframe |
|---|---|---|
| Comment karma in target subreddits | 500+ | 4 weeks |
| Posts with 50+ upvotes | 3+ | 8 weeks |
| Direct signups attributed to Reddit (UTM tracked) | 20+ | 8 weeks |

---

## 6. Other Channels

### Channel Priority Matrix

| Channel | Priority | Why | Investment | When |
|---|---|---|---|---|
| **TikTok** | HIGH | Target demo (18-28) spends 95 min/day here. Time X-Ray reveals are inherently viral. | 3 videos/week, 60-90 sec each | Week 1+ |
| **Twitter/X** | HIGH | Build-in-public. AI/startup community. Other founders + early adopters discover products here. | 2-3 tweets/day + 1 thread/week | Week 1+ |
| **Instagram Reels** | MEDIUM | Cross-post TikTok content. Data Receipt card is screenshot-friendly. | Cross-post from TikTok | Week 2+ |
| **YouTube Shorts** | MEDIUM | Cross-post TikTok. YouTube algorithm favors Shorts from small creators. | Cross-post from TikTok | Week 2+ |
| **Hacker News** | MEDIUM | "Show HN" when MVP has real users. HN values technical depth. | One well-timed post | MVP launch |
| **Product Hunt** | MEDIUM | One-shot cannon. Don't waste on a landing page. Save for MVP with real results. | One launch day | MVP launch |
| **LinkedIn** | LOW (for Gen Z) | Secondary audience (corporate). Share Build Log posts. | 1 post/week, repurposed | Week 4+ |
| **Discord** | DEFER | Do not create server until 100+ engaged email subscribers. Empty Discord = dead brand. | None | Post-100 subscribers |

### TikTok Content Pillars

1. **"Google knows..." series** -- "Google knows I searched 'easy dinner' 23 times this month. So I built an AI that decides for me."
2. **"Time X-Ray reveals"** -- Screen recordings of the X-Ray moment. Self-perception vs. reality.
3. **"I automated my week"** -- Before/after showing time saved.
4. **"Built in a day"** -- Behind-the-scenes dev content. Performs well on TikTok.

### Twitter/X Build-in-Public

- **Daily:** One observation, one metric, or one decision shared. "70% of our users' top time-waster is meal planning. Building a meal planner this week."
- **Weekly:** Thread summarizing the week. What shipped, what broke, what surprised.
- **Monthly:** Milestone thread with numbers. Revenue, signups, learnings.

---

## 7. Competitive Positioning

### The Positioning Matrix

```
                    DISCOVERS what to automate    USER must know what to build
                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  Builds the fix   MELDAR                        Lovable, Bolt.new, Replit
                   "We find it AND fix it"        "Tell us what to build"

  Suggests only    Screen Time (Apple)            ChatGPT, Claude
                   "Shows numbers, no action"     "Advises, doesn't act"

  Connects apps    (nobody)                       Zapier, Make
                                                  "Connect A to B yourself"
```

Meldar is the only product in the top-left quadrant.

### Head-to-Head Positioning

| Competitor | Their pitch | Meldar's counter |
|---|---|---|
| **Lovable** ($6.6B) | "Describe what you want to build" | "You don't have to know what to build" |
| **Bolt.new** ($105M) | "Build from a prompt or template" | "Your life IS the template" |
| **Zapier/Make** | "Connect these two apps" | "We tell you WHICH apps to connect and WHY" |
| **ChatGPT/Claude** | "Ask me anything" | "We don't wait for you to ask" |
| **Lindy.ai** | "Get 2 hours back every day" | "We show you exactly WHICH 2 hours and HOW" |

### One-Liner (All External Communications)

> **Lovable:** "Tell us what to build."
> **Zapier:** "Connect these two apps."
> **Meldar:** "Let us show you what's eating your week -- then fix it."

### The Auth Positioning Advantage (Consensus: No Google OAuth)

"We're the only AI product that never asks for your Google password." This is a positioning decision, not just a technical one. When users see magic link login instead of "Sign in with Google," it reinforces: "Meldar doesn't watch you. You show Meldar."

### Objection Handlers (For Sales Conversations + FAQ Copy)

| Objection | Response |
|---|---|
| "I can do this with Zapier" | "What's the first Zap you'd set up? If you knew, you'd have done it already. Meldar finds what to automate. That's the part Zapier skips." |
| "I can just use ChatGPT" | "ChatGPT gives advice. Meldar builds things. Advice evaporates when you close the tab. A Meldar app runs while you sleep." |
| "This sounds like it reads my data" | "We never connect to your accounts. You upload a screenshot. We read it in 3 seconds and delete it immediately. Open your Screen Time yourself first -- that's exactly what we see." |
| "EUR 49 per app is expensive" | "A freelance developer charges EUR 5,000+. Meldar builds it for EUR 49 and you own it forever." |

---

## 8. GDPR Compliance Audit

### Processing Activities and Legal Basis

| Processing activity | Data processed | Legal basis (GDPR Art. 6) | Retention | Notes |
|---|---|---|---|---|
| **Email capture** | Email address | Consent (opt-in) | Until unsubscribe + 30 days | Resend handles delivery |
| **Quiz responses** | Selected pain points | Legitimate interest | 30 days (Neon DB, auto-purge) | Non-PII; anonymized |
| **Screenshot analysis** | Image file (in-memory) | Consent (user uploads voluntarily) | **Never stored.** In-memory ~3-5 seconds. | Image discarded after API call. Only extracted JSON returned. |
| **X-Ray results** | App names, hours, categories | Contract (delivering the service) | 30 days (Neon DB, auto-purge) | Linked to session_id, not user account in PoC |
| **Payment processing** | Email, payment method (Stripe) | Contract | Stripe retains per their policy; we retain transaction records 6 years (Finnish Kirjanpitolaki 2:10) | We never see card numbers |
| **AI processing** | Derived insights sent to Claude API | Legitimate interest + consent | Not stored by us. Anthropic API does not retain inputs for API customers (verify current policy). | Only image tokens + system prompt sent |
| **Analytics (GA4)** | Anonymized: page views, session duration | Consent (cookie banner) | 26 months (GA4 default) | Loaded ONLY after cookie acceptance |
| **Email marketing** | Email, engagement data | Consent | Until unsubscribe | Unsubscribe link in every email |

### Privacy Policy Updates Required

Add these sections to `src/app/privacy-policy/page.tsx`:

**1. "Third-party processors"**

| Processor | What they process | DPA | Data location |
|---|---|---|---|
| **Stripe** | Payment data (email, card via Stripe, transaction history) | Auto-accepted on signup | EU + US (DPF certified) |
| **Anthropic** | Screenshot image tokens (in-transit, not stored) | Available on request -- **sign before PoC launch** | US (SCCs or DPF) |
| **Vercel** | Application hosting, serverless function execution | Accept in Vercel Dashboard | EU (Frankfurt available) + US |
| **Resend** | Email delivery (email addresses, engagement data) | On website | US (DPF certified) |
| **Neon** | Database storage (quiz results, X-Ray results, subscribers) | On website | EU (Frankfurt) |
| **Upstash** | Rate limiting data (IP-based counters) | On website | EU (Frankfurt available) |
| **Google** | Analytics data (anonymized) | Via Google Ads data processing terms | US (DPF certified) |

**2. "Screenshot processing"**

> "When you upload a Screen Time screenshot, it is processed in server memory (typically 3-5 seconds) to extract app usage data. The image is sent to Anthropic's Claude AI for analysis. The image is never written to disk, database, or file storage. After the analysis completes, the image no longer exists on our systems. Only the extracted data (app names, usage hours, categories) is returned to your browser and optionally saved if you choose to create a shareable Time X-Ray."

**3. "AI processing"**

> "Meldar uses Anthropic's Claude AI to analyze your data and generate insights. We send only the minimum data needed for analysis (image tokens for screenshots, aggregated usage data for reports). Anthropic does not retain your data or use it for model training. See Anthropic's data processing terms at [link]."

**4. "Payment data"**

> "Payments are processed by Stripe. We never see, store, or process your credit card number. Stripe's privacy policy: [link]. Your transaction history is retained for 6 years as required by Finnish accounting law (Kirjanpitolaki 2:10)."

**5. "Data retention"**

| Data type | Retention period | Deletion method |
|---|---|---|
| Anonymous X-Ray results | 30 days | Auto-delete via Neon cron job |
| Quiz responses | 30 days | Auto-delete via Neon cron job |
| Email subscriber data | Until unsubscribe + 30 days | Resend API deletion |
| User account data (MVP) | Until account deletion or 2 years of inactivity | GDPR erasure endpoint |
| Payment records | 6 years | Finnish accounting law requirement |
| Analytics data | 26 months | GA4 automatic |
| AI API call metadata | Not stored by us | N/A |

### DPA Checklist (Complete Before PoC Launch)

| Processor | DPA status | Action |
|---|---|---|
| Stripe | Auto-accepted on account creation | Verify acceptance |
| Anthropic | Available on request | **Sign DPA before first API call with user data** |
| Vercel | In dashboard settings | Accept in Vercel Dashboard |
| Resend | On website | Accept before sending marketing emails |
| Neon | On website | Accept before storing user data |
| Upstash | On website | Accept before enabling rate limiting |
| Google (GA4) | Via Google Ads terms | Already covered if GA4 is active |

### DPIA (Data Protection Impact Assessment)

**Assessment:** Meldar's PoC processes behavioral data (app usage patterns) to generate insights. This may fall under "systematic and extensive profiling" per GDPR Article 35 and the Finnish DPA's published DPIA list.

**Decision:** Conduct a lightweight DPIA before MVP launch. For PoC (first 50 users, manual audits, anonymous X-Ray data with 30-day auto-delete), the risk is lower. Document this risk assessment.

**The strongest mitigation:** Privacy by architecture. Screenshots exist only in serverless memory for ~3-5 seconds. X-Ray results are auto-deleted after 30 days. No raw behavioral data is persisted. The architecture itself is the primary GDPR safeguard.

---

## 9. Terms of Service Updates

Add these sections to `src/app/terms/page.tsx`:

### New Clauses Required

**1. AI Processing Disclosure**

> "Meldar uses artificial intelligence (provided by Anthropic) to analyze your data and generate insights. AI-generated content may contain errors or inaccuracies. You should verify any recommendations before acting on them. We do not guarantee the accuracy of AI-generated analyses."

**2. File Processing and Retention**

> "When you upload screenshots, they are processed in server memory to extract usage patterns. The original image is never stored. Derived data (app names, usage hours) is retained for 30 days unless you create an account, in which case it is retained until account deletion."

**3. Payment Terms (Expand Existing Section)**

> "Payments are processed by Stripe. Prices are displayed in EUR and include applicable VAT. Refund policy: If you are unsatisfied with a paid service, contact us within 14 days for a full refund per the EU Consumer Rights Directive. Subscriptions can be cancelled at any time; you retain access until the end of the billing period."

**4. Right of Withdrawal (EU Consumer Rights Directive)**

> "Under EU law, you have a 14-day right of withdrawal for digital content purchases. By proceeding with your purchase, you consent to the immediate delivery of the digital service and acknowledge that you lose your right of withdrawal once the service begins."

**Implementation:** Add a checkbox to the Stripe Checkout success flow or pre-checkout confirmation: "I agree that delivery begins immediately and I waive my 14-day right of withdrawal."

**5. Beta/Early Access Disclaimer**

> "Meldar is currently in early access. Features may change or be discontinued. We will provide reasonable notice before removing features that affect your data. Early access pricing commitments (founding member pricing) will be honored for the duration specified."

**6. No SLA**

> "Meldar does not currently offer a service level agreement (SLA). We aim for reasonable availability but do not guarantee uptime."

### Finnish Consumer Protection (Kuluttajansuojalaki)

For B2C digital services sold to Finnish consumers:
- 14-day right of withdrawal (can be waived with explicit consent, see clause 4 above)
- Clear pre-purchase information about functionality and compatibility
- Delivery confirmation email (handled by Stripe receipt + our Resend confirmation)

---

## 10. Revenue Projections

### Assumptions (Conservative)

- Founding 50: fills in 6 weeks
- Post-founding conversion: 3% of signups to any paid tier (industry benchmark for freemium: 2-5%)
- Average revenue per paying user: EUR 15/month (blended)
- Monthly churn: 8% (high, typical for early-stage consumer SaaS)
- Infrastructure cost: EUR 126/month at 1,000 users

### Revenue by Phase

| Phase | Duration | Signups | Paying users | Revenue | Notes |
|---|---|---|---|---|---|
| **PoC** (weeks 1-2) | 2 weeks | 50 (Founding 50) | 0 (all free) | EUR 0 | Founding members get free audits |
| **Commercial Validation** (weeks 3-6) | 4 weeks | 100-200 | 5-10 (paid audits) | EUR 145-290 | First paid Time Audits at EUR 29 |
| **MVP** (weeks 7-10) | 4 weeks | 300-500 | 15-25 | EUR 135-375/month recurring | Starter subscriptions begin |

### Revenue Projections at Scale

| Scenario | Total signups | Paying users (3%) | Monthly revenue | Monthly cost | Net margin |
|---|---|---|---|---|---|
| 500 signups | 500 | 15 | EUR 225 | EUR 50 | EUR 175 |
| 1,000 signups | 1,000 | 30 | EUR 450 | EUR 126 | EUR 324 |
| 5,000 signups | 5,000 | 150 | EUR 2,250 | EUR 300 | EUR 1,950 |
| 10,000 signups | 10,000 | 300 | EUR 4,500 | EUR 500 | EUR 4,000 |

### Tier Mix Sensitivity (at 1,000 signups, 30 paying users)

| Scenario | Starter (EUR 9) | App Builds (EUR 49 one-time) | Concierge (EUR 199) | Monthly recurring | One-time |
|---|---|---|---|---|---|
| **All Starter** | 30 | 0 | 0 | EUR 270 | EUR 0 |
| **Realistic mix** | 22 | 5 | 3 | EUR 795 | EUR 245 |
| **Concierge-heavy** | 15 | 5 | 10 | EUR 2,125 | EUR 245 |

**Key insight:** 10 Concierge users at EUR 199/month = EUR 1,990/month. That's more than 220 Starter users. Concierge is the revenue lever. Prioritize finding and serving Concierge-tier customers.

### Infrastructure Cost Model (Corrected)

| Service | At 50 users (PoC) | At 1,000 users (MVP) | Notes |
|---|---|---|---|
| Vercel | EUR 0 (Hobby) | EUR 20 (Pro) | |
| Neon Postgres | EUR 0 (Free) | EUR 19 (Launch) | |
| Anthropic API | EUR 0.50 | EUR 21 | $0.003/screenshot + $0.015/Sonnet call |
| Stripe fees | EUR 0-5 | EUR 40-50 | 2.9% + EUR 0.25/transaction |
| Resend | EUR 0 | EUR 0-20 | Free tier covers 3K emails/month |
| Upstash Redis | EUR 0 | EUR 5 | Rate limiting + cost tracking |
| Sentry | EUR 0 | EUR 0 | Free tier: 5K errors/month |
| **Total** | **~EUR 1-6** | **~EUR 105-135** | |

### Break-Even

Infrastructure break-even: 12 Starter subscribers or 1 Concierge subscriber covers monthly costs.

The real cost is founder time. At 50 paying users:
- Weekly playbook: 3-4 hours/week
- Time Audits: ~10/month x 2 hours = 20 hours/month
- App Builds: ~5/month x 3-4 hours = 15-20 hours/month
- Support: ~10 hours/month
- **Total: ~55-70 hours/month**

This is sustainable as a full-time solo founder operation up to ~50 paying users. Beyond that, the product must automate Time Audit generation and App Build delivery.

---

## 11. Three-Phase Timeline

### Phase 1: PoC -- "Discovery + Revenue" (Weeks 1-2)

**Goal:** Prove discovery engine works AND activate Stripe for day-1 revenue readiness.

| Deliverable | Owner | Effort | Business dependency |
|---|---|---|---|
| Fix dead CTA links (route to /quiz) | Frontend | 1-2 hrs | **Blocker #0** |
| Stripe account setup + products + coupons | Business | 2 hrs | Stripe account for ClickTheRoadFi Oy |
| `/api/billing/checkout` route | Architecture | 2 hrs | Stripe SDK + products created |
| `/api/billing/webhook` route | Architecture | 2 hrs | Stripe webhook secret |
| Claude Vision integration (replace mock) | AI Pipeline | 2-3 hrs | Anthropic API key |
| Time X-Ray card component | Frontend | 3-4 hrs | AI pipeline returns structured data |
| Neon DB setup (3 tables: subscribers, quiz_results, screentime_analyses) | DevOps | 2-3 hrs | Neon account |
| Shareable X-Ray page (`/xray/[id]`) + OG image | Frontend | 3-4 hrs | Neon DB for result storage |
| Rate limiting (Upstash Redis) | DevOps | 1 hr | Upstash account |
| Founding 50 counter on landing page | Frontend | 1 hr | Neon DB query |
| `/thank-you` page (post-payment) | Frontend | 1 hr | Stripe success redirect URL |
| EU OSS registration via vero.fi | Business | 1 hr | ClickTheRoadFi Oy MyTax access |
| Sign Anthropic DPA | Business/Legal | 30 min | Anthropic account |

**PoC exit criteria:**
- [ ] 50 email signups
- [ ] Stripe Checkout works end-to-end (founding coupon + paid)
- [ ] Claude Vision returns accurate analysis for >90% of test screenshots
- [ ] Time X-Ray card is shareable via link with OG image
- [ ] At least 3 people share their Time X-Ray on social media

### Phase 2: Commercial Validation -- "First Revenue" (Weeks 3-6)

**Goal:** Founding 50 filled. First paid Time Audits. Validate willingness to pay.

| Deliverable | Owner | Effort | Business dependency |
|---|---|---|---|
| Write 4 weekly playbook emails (batch) | Business | 12-16 hrs total | Content research |
| Deliver 50 free Time Audits | Business (founder) | 75-100 hrs total | Intake forms returned |
| Set up Resend welcome email sequence | Business | 2 hrs | Resend templates |
| Reddit commenting (weeks 1-4 of 8-week plan) | Business | 20 min/day | Reddit account |
| TikTok first 6 videos | Business | 6-8 hrs | Video recording setup |
| Twitter/X build-in-public threads | Business | 30 min/day | Twitter account |
| "Download your Google data" tutorial blog post | Business | 4-6 hrs | Content only, no engineering |
| GA4 conversion tracking for Stripe events | DevOps | 1-2 hrs | GA4 + Stripe webhook |
| Privacy policy updates (add processor disclosures) | Business/Legal + Frontend | 2-3 hrs | Text changes to page.tsx |
| Terms of service updates (add AI + payment clauses) | Business/Legal + Frontend | 2-3 hrs | Text changes to page.tsx |

**Commercial Validation exit criteria:**
- [ ] 50 founding spots filled
- [ ] At least 5 paid Time Audits sold (EUR 145+ revenue)
- [ ] Weekly playbook open rate >40%
- [ ] At least 1 person asks "can you build this for me?" (validates App Build tier)
- [ ] At least 10 social media shares of Time X-Ray cards

### Phase 3: MVP -- "Automate + Scale" (Weeks 7-10)

**Goal:** Automate what was manual. First recurring revenue. 10+ subscribers.

| Deliverable | Owner | Effort | Business dependency |
|---|---|---|---|
| Magic link auth (Auth.js + Resend) | Architecture | 4-6 hrs | Resend already in stack |
| Starter subscription (Stripe Billing) | Architecture | 3-4 hrs | Stripe subscription product |
| Google Takeout upload + client-side parser | AI Pipeline + Frontend | 1-2 weeks | JSZip, file format research |
| Automated Time X-Ray report (Sonnet) | AI Pipeline | 4-6 hrs | Multi-source data available |
| User dashboard (X-Ray history, settings) | Frontend | 1-2 weeks | Auth system |
| GDPR endpoints (data export, account deletion) | Architecture | 3-4 hrs | Auth + DB |
| DPIA documentation | Business/Legal | 4-6 hrs | Processing activities finalized |
| Concierge tier setup (manual delivery, Stripe subscription) | Business | 2 hrs | Stripe subscription product |
| Product Hunt launch preparation | Business | 4-6 hrs | Real users + real results required |

**MVP exit criteria:**
- [ ] 10+ paying subscribers (any tier)
- [ ] EUR 375+/month recurring revenue
- [ ] Automated Time X-Ray generation (no manual work per user)
- [ ] NPS >40 from paying users
- [ ] 0 GDPR complaints

---

## 12. Risk Mitigations

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Nobody pays after free trial** | Medium | Critical | Validate with Founding 50 intake form answers. If <20% fill the form, the value prop is wrong. Pivot before investing in MVP. |
| **Churn after first month** | High | High | Weekly playbook creates recurring touchpoint. Monthly "Shape the Product" vote creates ownership. Lock founding pricing for retention. |
| **AI-generated X-Ray insights are generic/wrong** | Medium | High | PoC uses rule-based insights (no LLM hallucination risk). MVP uses Sonnet with validated templates. |
| **Competitor copies positioning** | Low | Medium | The discovery engine + "data never leaves your device" positioning is hard to copy because it requires architectural commitment (client-side parsing, in-memory processing). Lovable/Bolt won't rebuild their product for this. |
| **GDPR complaint from Finnish DPA** | Low | High | Privacy by architecture (in-memory processing). DPAs signed with all processors. Data retention enforced via cron jobs. DPIA completed before MVP. |

### Compliance Risks

| Risk | Mitigation |
|---|---|
| Anthropic changes data retention policy | Verify policy quarterly. The privacy policy says "as of [date]" with a link to Anthropic's current terms. |
| Stripe Tax miscalculates VAT | Stripe Tax is the industry standard. Monitor quarterly tax reports. Register for EU OSS via vero.fi before first cross-border sale. |
| Missing DPA with a processor | Checklist above. All 7 DPAs must be signed before PoC launch. |
| 14-day withdrawal right not properly waived | Add explicit checkbox before Stripe Checkout redirect. Log the consent timestamp. |

### GTM Risks

| Risk | Mitigation |
|---|---|
| Reddit account gets flagged for self-promotion | 4-week no-link warmup period. 90/10 value ratio. Never post promotional content in first month. |
| TikTok content doesn't gain traction | Test 3 content pillars in first 2 weeks. Double down on whichever gets >1,000 views. Pivot away from pillars that flatline. |
| Founding 50 doesn't fill in 6 weeks | Lower target to 25. Or extend timeline. The number matters less than learning from the people who DO sign up. |

---

## 13. Dependencies on Other Clusters

### From Architecture

| What I need | When | Why |
|---|---|---|
| `/api/billing/checkout` route | PoC week 1 | Day-1 revenue |
| `/api/billing/webhook` route | PoC week 1 | Payment confirmation flow |
| Neon DB with `subscribers` table including `stripe_customer_id` and `is_founding` columns | PoC week 1 | Track founding members + payment state |
| `/api/user/export` and `/api/user/delete` endpoints | MVP week 7 | GDPR compliance |
| Magic link auth flow | MVP week 7 | User accounts for dashboard |

### From Frontend

| What I need | When | Why |
|---|---|---|
| Working CTAs on landing page (route to /quiz, not #early-access) | PoC week 1 | **Blocker #0.** Dead links = $0. |
| "Get your Time Audit" CTA on X-Ray result page linking to Stripe Checkout | PoC week 1 | Conversion path from free to paid |
| Founding 50 counter on EarlyAdopterSection | PoC week 1 | Scarcity + social proof |
| `/thank-you` page after Stripe payment | PoC week 1 | Post-purchase experience |
| Privacy policy page updated with new sections | Commercial Validation week 3 | Legal compliance |
| Terms of service page updated with new clauses | Commercial Validation week 3 | Legal compliance |

### From AI Pipeline

| What I need | When | Why |
|---|---|---|
| Structured JSON from Claude Vision (app names, hours, categories) | PoC week 1 | X-Ray result feeds the upsell CTA |
| Confirmation of Anthropic's data retention policy for API customers | PoC week 1 | Privacy policy language |

### From DevOps

| What I need | When | Why |
|---|---|---|
| `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel env vars | PoC week 1 | Stripe integration |
| Upstash Redis for rate limiting + daily cost tracking | PoC week 1 | Protect against abuse |
| Neon DB provisioned (Frankfurt, EU) | PoC week 1 | Store subscribers + X-Ray results |
| Sentry monitoring on `/api/billing/webhook` | PoC week 1 | Payment failures = lost revenue |

---

## Appendix A: Stripe Product Configuration

Create these in Stripe Dashboard before PoC launch:

| Product name | Price | Type | Stripe Price ID | Notes |
|---|---|---|---|---|
| Personal Time Audit | EUR 29.00 | One-time | `price_timeaudit_29` | |
| App Build | EUR 49.00 | One-time | `price_appbuild_49` | |
| Starter Plan | EUR 9.00/month | Recurring | `price_starter_9` | Cancel anytime |
| Founding Starter Plan | EUR 4.00/month | Recurring | `price_starter_founding_4` | Created via coupon on `price_starter_9` |
| Concierge Plan | EUR 199.00/month | Recurring | `price_concierge_199` | Cancel anytime |
| Founding Concierge Plan | EUR 99.00/month | Recurring | `price_concierge_founding_99` | Created via coupon on `price_concierge_199` |

Stripe coupon codes:
- `FOUNDING50_AUDIT`: 100% off, max 50 redemptions, applies to Time Audit
- `FOUNDING50_STARTER`: 55% off forever, max 50 redemptions, applies to Starter
- `FOUNDING50_BUILD`: 61% off, max 250 redemptions, applies to App Build
- `FOUNDING50_CONCIERGE`: 50% off for 12 months, max 50 redemptions, applies to Concierge

## Appendix B: Email Sequences (Resend)

### Welcome Email (Founding 50)

**Trigger:** New subscriber with founding member status
**From:** gosha.skryuchenkov@gmail.com (personal, not noreply)
**Subject:** "Welcome to the Founding 50. Here's your first step."
**Body:**
- "You're member #[N] of 50."
- "Your free Personal Time Audit: fill out this form [Tally link]"
- "While you wait, your first automation playbook: [link]"
- "Reply anytime. I read every one. --Gosha"

### Welcome Email (Post-Founding)

**Trigger:** New subscriber after founding spots are full
**From:** gosha.skryuchenkov@gmail.com
**Subject:** "Welcome to Meldar. Here's what you get."
**Body:**
- "The founding spots are full, but you still get the weekly automation playbook."
- "Want a Personal Time Audit? [CTA to Stripe Checkout, EUR 29]"
- "Reply anytime. --Gosha"

### Weekly Playbook

**Trigger:** Every Tuesday, 9:00 AM EET
**From:** gosha.skryuchenkov@gmail.com
**Subject:** "This week's automation: [Topic]"
**Format:** Problem, tool, steps, time saved, "Meldar will do this automatically for you" soft-sell at the end.

### Payment Confirmation

**Trigger:** Stripe webhook `checkout.session.completed`
**From:** gosha.skryuchenkov@gmail.com
**Subject:** "Your Time Audit is on its way."
**Body:** "I'll have your personalized report in your inbox within 72 hours. In the meantime, [link to your Time X-Ray]."

## Appendix C: GA4 Conversion Events

Set up these custom events for measuring business metrics:

| Event name | Trigger | Parameters |
|---|---|---|
| `signup` | Email submitted via EmailCapture component | `method: "email"` |
| `quiz_complete` | Quiz submitted | `pain_count: N` |
| `screenshot_upload` | Screenshot uploaded to /api/upload/screentime | `platform: "ios" | "android"` |
| `xray_created` | Time X-Ray result generated | `total_hours: N, top_app: "X"` |
| `xray_shared` | Share button clicked on X-Ray result | `method: "link" | "image" | "native"` |
| `checkout_initiated` | Stripe Checkout Session created | `product: "time_audit" | "app_build" | "starter" | "concierge"` |
| `purchase` | Stripe webhook `checkout.session.completed` | `value: N, currency: "EUR", product: "X"` |

---

*Final version. Ready for synthesis into unified plan.*
