# Business, GTM & Compliance Plan -- Iteration 1

**Date:** 2026-03-30
**Authors:** Sales Engineer, Reddit Community Builder, Legal Compliance Checker
**Status:** Draft for cross-review

---

## 1. Monetization Strategy

### Revenue from Day 1: The "Paid Audit" Model

The product is not built yet. But we can charge for the *human-delivered* version of what the product will automate. This is the classic "do things that don't scale" approach, and it directly validates willingness to pay.

**Day-1 revenue mechanics:**

| Revenue stream | When it activates | Payment method | Notes |
|---|---|---|---|
| **Personal Time Audit (premium)** | Immediately on launch | Stripe one-time payment | First 50 free (Founding 50), then paid |
| **Weekly "Automation Playbook" subscription** | Week 2+ | Stripe recurring | Low-ticket, high-volume |
| **Concierge: manual app build** | When first paying customer asks | Stripe invoice / payment link | High-ticket, 1:1 delivery |

**Why Stripe:**
- Best-in-class EU/Finnish support (Stripe Atlas supports Finnish companies)
- Handles VAT/ALV automatically for EU B2C (critical for Finnish company selling to EU consumers)
- Checkout, subscriptions, and invoicing in one platform
- Stripe Tax handles reverse charge and MOSS/OSS compliance
- PCI compliance handled by Stripe -- no card data touches our servers

**Payment flow (PoC):**
1. User signs up with email (existing flow)
2. For paid features: Stripe Checkout session created server-side
3. Redirect to Stripe-hosted checkout page (no PCI scope for us)
4. Webhook confirms payment, unlocks feature
5. No user accounts/passwords needed initially -- email + Stripe customer ID is sufficient

**Cost control principle:** Every AI API call must have a ceiling. No open-ended "pay as you go" where a single user could rack up $50 in Claude calls. Set per-action cost caps:
- Screen Time screenshot analysis: ~$0.002 (Claude Haiku)
- Full Time X-Ray report generation: ~$0.05 (Claude Sonnet)
- App build session: cap at $2.00 per session (hard limit on token usage)

### Subscription vs. One-Time

**Recommendation: Hybrid.**
- Time X-Ray: Free forever (lead gen)
- Individual paid features: One-time (audits, single app builds)
- Ongoing value: Subscription (weekly playbooks, continuous monitoring, auto-updates)

Subscriptions are better for revenue predictability but harder to sell pre-product. Start with one-time payments to validate willingness to pay, then introduce subscriptions once recurring value is proven.

---

## 2. Pricing

### Concrete Price Points

| Tier | Price | Billing | What they get |
|---|---|---|---|
| **Time X-Ray** | Free | -- | Quiz + Screen Time screenshot analysis + shareable Data Receipt. The hook. |
| **Personal Time Audit** | EUR 29 (one-time) | Stripe Checkout | Human-reviewed analysis of their workflows. 1-page report with top 3 automation recommendations ranked by impact. Delivered within 72 hours. |
| **Starter** | EUR 9/month | Stripe subscription | Weekly automation playbook email + deeper data analysis (Google Takeout) + priority access to new features. Cancel anytime. |
| **App Build** | EUR 49 per app (one-time) | Stripe Checkout | We build one personal automation for them. They own it. Includes the AI cost + setup + 30 days of support. |
| **Concierge** | EUR 199/month | Stripe subscription | Unlimited app builds + weekly check-ins + priority support + continuous monitoring. For power users / small businesses. |

### Early Adopter Pricing

| Tier | Regular price | Founding 50 price | Lock-in |
|---|---|---|---|
| Personal Time Audit | EUR 29 | **Free** | First 50 only |
| Starter | EUR 9/month | **EUR 4/month** | Locked forever |
| App Build | EUR 49/app | **EUR 19/app** | First 5 apps |
| Concierge | EUR 199/month | **EUR 99/month** | Locked for 12 months |

**Anchor pricing psychology:**
- Show the regular price crossed out next to the founding price
- "Save 55%" badge on founding pricing
- Counter on landing page: "23 of 50 founding spots remaining"
- After Founding 50 fills: prices go to regular. No exceptions. This scarcity must be real.

### Why these numbers:

- **EUR 29 for Time Audit:** Founder spends 1-2 hours per audit. At EUR 29, that's EUR 14.50-29/hour -- sustainable if volume stays under 20/month post-founding period. Cheap enough that Gen Z won't blink. Expensive enough to signal real value.
- **EUR 9/month Starter:** Below the "Netflix threshold" (EUR 10.99). Gen Z evaluates every subscription against Netflix. Stay under it.
- **EUR 49/app:** Anchored against "hiring a developer" (EUR 5,000+). The 100x discount makes it feel like a steal. Also covers AI API costs (~$2) with massive margin.
- **EUR 199/month Concierge:** Anchored against "a part-time virtual assistant" (EUR 800-1,500/month). Positioned as "your AI team for the price of a nice dinner."

### VAT/ALV Considerations

Finnish company selling B2C in the EU must charge VAT at the buyer's country rate (EU OSS/One-Stop Shop rules). Stripe Tax handles this automatically. Finnish standard VAT is 25.5% (as of 2025). For EU cross-border B2C digital services under EUR 10,000/year, can use Finnish VAT rate for all EU sales. Above that threshold, must register for OSS via Finnish tax authority (vero.fi).

**Action item:** Register for EU OSS via vero.fi before first paid transaction. Stripe Tax will calculate correct VAT per country.

---

## 3. Early Adopter Program: "The Founding 50"

### What Founding Members Get

Building on the existing `01-early-adopter-value.md` analysis, here is the final package:

| Perk | Format | Delivery | Cost to us |
|---|---|---|---|
| **Free Personal Time Audit** | Personalized 1-page PDF report | Within 72 hours of intake form | 1-2 hours of founder time per user |
| **Weekly Automation Playbook** | Email newsletter | Every Tuesday, starting Day 3 after signup | 3-4 hours/week to produce (batch-write 4 ahead) |
| **Shape the Product** | Welcome email survey + monthly vote | Ongoing | Near-zero |
| **Founding pricing locked forever** | Stripe coupon code | Applied at checkout | Revenue discount |
| **"Built by 12 seniors" story access** | Behind-the-scenes build log / blog series | Weekly, starts at launch | Content already being produced |
| **Direct line to the founder** | Email, not Discord/Slack | Ongoing for founding 50 | Founder's time |

### The "8+ Years Dev Advice" Angle

The team lead specified: "advice from 8+ years experienced software dev on how to launch production-grade apps." This needs a concrete format.

**Recommendation: "Office Hours" -- async, not live.**

- **Not** 1:1 video calls (doesn't scale, exhausting, scheduling nightmare)
- **Not** a video course (contradicts "we do it for you" positioning, takes weeks to produce)
- **Not** Discord (will be empty and damage brand per the existing analysis)

**Instead:**
- **Monthly "Ask Me Anything" email thread.** Founding members can reply to the monthly email with any question about building apps, launching products, or using AI. The founder answers personally. Answers that are broadly useful get anonymized and published in the weekly playbook.
- **"Build Log" blog posts.** Weekly behind-the-scenes posts showing real decisions, real code, real tradeoffs. "Here's how we built feature X. Here's what went wrong. Here's what we'd do differently." This is the dev advice, packaged as content marketing. It serves both the founding members AND attracts organic traffic.
- **One "Launch Checklist" resource.** A single, definitive document: "How to go from idea to production-grade app." Written once, updated as needed. Given to founding members first, then published as a lead magnet.

**Why async over live:** The target audience is 18-28. They don't schedule calls. They consume content asynchronously. They want to read/watch on their own time. Live events have low show-up rates in this demographic (typically 15-25% of registrants actually attend).

### Sequence

| Week | Action |
|---|---|
| 0 | Update landing page with Founding 50 package. Set up Stripe. Set up welcome email + intake form. |
| 1 | Start distributing. First weekly playbook goes out Day 3 after signup. |
| 1-4 | Deliver free Time Audits as intake forms come in. |
| 4 | First "Shape the Product" vote. Share results in playbook. |
| 6 | Founding 50 full (target). Switch to paid Time Audit (EUR 29) + regular pricing. |
| 8 | First paid App Build deliveries begin. |

---

## 4. "Built by 12 Seniors" Positioning

### What It Signals

"Built in a single day by 12 IT seniors" is a bold claim. It signals:

1. **Speed and competence** -- "These people know what they're doing"
2. **AI leverage** -- "AI makes this possible" (implicit: Meldar will give YOU the same leverage)
3. **Authenticity** -- "This isn't a faceless corporation, it's real people"
4. **Proof of concept** -- "If 12 seniors can build a product in a day, imagine what Meldar can do for YOUR workflow"

### How to Tell It Authentically

**Do:**
- Show the actual build process. Time-lapse, screenshots, commit logs. Make it verifiable.
- Name the seniors (first name + role). "Anna, backend. Mika, design. Juha, security." Real people, real accountability.
- Be specific about what "built in a day" means. "We planned for a week, then built for 14 hours straight. Here's the commit log."
- Connect it to the product promise: "We used AI to build Meldar. Meldar uses AI to build YOUR apps."

**Don't:**
- Claim the product is "complete" or "production-ready" from day one. Be honest: "We built the foundation in a day. We've been refining it since."
- Make it sound like a hackathon gimmick. Frame it as a demonstration of what's possible.
- Use it as the primary value proposition. It's a trust signal, not the product.

### Where It Goes on the Website

- **About / Team section** (new page, not on landing page): Full story + names + photos
- **Footer:** One line -- "Built in a day by 12 senior engineers. Refined every day since."
- **Blog post:** The full behind-the-scenes story. This IS the first "Build Log" post.
- **Landing page:** Do NOT put this in the hero or above the fold. It's interesting but not conversion-driving. Place it in the Trust section or as a subtle badge near the footer.

### Risk Mitigation

The claim invites skepticism. "If you built it in a day, how good can it be?" Mitigate by:
- Emphasizing ongoing refinement: "Built in a day. Improved every day since."
- Showing real metrics: uptime, response times, Lighthouse scores
- Being transparent about what "built in a day" included and what came after

---

## 5. Reddit Strategy

### Philosophy: 90/10 Value-to-Promotion

Reddit penalizes self-promotion aggressively. The strategy is to become a valued community member who happens to work on something relevant. This takes 4-8 weeks of consistent participation before any promotional post is appropriate.

### Target Subreddits

| Subreddit | Size | Relevance | Strategy |
|---|---|---|---|
| r/productivity | 2.4M+ | Core audience: people seeking time optimization | Answer questions about workflow optimization. Share automation tips (from the weekly playbook). Never mention Meldar for first 4 weeks. |
| r/ChatGPT | 5M+ | People already using AI but struggling | Help with prompts, share use cases. Position as "AI practitioner," not "AI vendor." |
| r/nocode | 300K+ | Non-technical builders | Share practical tutorials. "Here's how I automated X without code." |
| r/SideProject | 200K+ | Builders showing their work | Appropriate for "Show HN"-style posts AFTER 4 weeks of genuine participation. |
| r/smallbusiness | 500K+ | SMB owners drowning in repetitive tasks | Answer operational questions. Share automation ideas specific to their context. |
| r/college / r/GradSchool | 1M+ combined | Students (core target demo) | Help with productivity, study habits, tool recommendations. Time management advice. |
| r/personalfinance | 18M+ | People tracking expenses manually | Relevant when expense-sorting automation is ready. Share budgeting tips meanwhile. |
| r/mealprep / r/EatCheapAndHealthy | 3M+ combined | Meal planning pain point | Share meal planning tips. When meal planner app exists, it's a natural fit. |
| r/Entrepreneur | 2M+ | Solopreneurs with automation needs | Share efficiency tips, automation case studies. |
| r/Finland / r/Suomi | 400K+ combined | Local community, Finnish company pride | Occasional posts about Finnish tech scene, building a startup in Helsinki. |

### Content Calendar (Weeks 1-8)

| Week | Action | Subreddits | Content type |
|---|---|---|---|
| 1-2 | **Listen and comment.** No posts. Only thoughtful replies to existing threads. | r/productivity, r/ChatGPT, r/nocode | Comments only. Help people. Answer questions. |
| 3-4 | **Start posting value content.** "I automated X and saved Y hours/week. Here's how." No Meldar mention. | r/productivity, r/nocode, r/SideProject | Self-posts with tutorials/guides |
| 5-6 | **Share the "download your Google data" tutorial.** Genuinely useful, viral potential. Still no Meldar mention in the post -- link in profile only. | r/productivity, r/ChatGPT, r/privacy | Educational content |
| 7-8 | **First "Show My Project" post.** "I'm building a tool that finds what to automate in your daily routine. Would love feedback." Genuine request for feedback, not a sales pitch. | r/SideProject, r/nocode, r/Entrepreneur | Project showcase |

### Rules of Engagement

1. **Never post a link to meldar.ai in the first 4 weeks.** Put it in your Reddit profile bio only.
2. **Never use marketing language.** No "game-changer," "revolutionary," "disrupting." Speak like a person.
3. **Always provide value in the comment/post itself.** The reader should benefit even if they never click anything.
4. **Respond to every comment on your posts.** Reddit rewards engagement.
5. **Be transparent about being the founder.** When you do post about Meldar, say "I'm building this." Never pretend to be a user.
6. **Respect each subreddit's rules.** Read the sidebar before posting. Many have "Self-Promotion Saturday" or similar designated days.
7. **Cross-post sparingly.** Reddit users notice if the same post appears in 5 subreddits simultaneously.
8. **Track what resonates.** If a comment about meal planning gets 200 upvotes, that's market signal. Double down.

### Metrics

| Metric | Target | Timeframe |
|---|---|---|
| Comment karma in target subreddits | 500+ | 4 weeks |
| Posts with 50+ upvotes | 3+ | 8 weeks |
| Profile clicks to meldar.ai | 100+ | 8 weeks |
| Direct signups attributed to Reddit | 20+ | 8 weeks |

### What NOT to Do

- **No paid Reddit ads at this stage.** Reddit users despise ads. The CPM is high and the CTR is abysmal for unknown brands.
- **No "AMA" until you have traction.** AMAs with zero existing reputation get ignored or roasted.
- **No bot accounts or vote manipulation.** Reddit detects this and will ban the account permanently.
- **No posting in r/startups asking for validation.** They've seen 10,000 "validate my idea" posts. Instead, post results: "We got 50 signups in 2 weeks. Here's what we learned."

---

## 6. Other Channels

### Where Gen Z (18-28) Actually Hangs Out

| Channel | Priority | Strategy | Investment |
|---|---|---|---|
| **TikTok** | HIGH | Short-form video: "I found out Google knows I searched 'what to eat' 1,847 times" / screen recordings of Time X-Ray reveals / "AI automated my week" before-after | 2-3 videos/week, 60-90 seconds each |
| **Twitter/X** | HIGH | Build-in-public thread. Daily updates. AI/productivity niche has strong engagement. Tag relevant voices. | 2-3 tweets/day + 1 thread/week |
| **Instagram Reels** | MEDIUM | Repurpose TikTok content. Data Receipt card is designed to be screenshot-friendly -- this is the IG play. | Cross-post from TikTok |
| **YouTube Shorts** | MEDIUM | Repurpose TikTok content. YouTube's algorithm favors Shorts from small creators. | Cross-post from TikTok |
| **LinkedIn** | LOW (for Gen Z) | Secondary audience (corporate professionals). Share the "Build Log" posts. | 1 post/week, repurpose blog content |
| **Discord** | DEFER | Do not create a server until 100+ engaged email subscribers. Empty Discord = dead brand signal. | None until subscriber threshold |
| **Hacker News** | MEDIUM | "Show HN" post when MVP is ready. HN values technical depth -- lead with the architecture story. | One well-timed post |
| **Product Hunt** | MEDIUM | Launch when MVP has real users and real results to show. PH is a one-shot cannon. Don't waste it on a landing page. | Defer to MVP launch |

### TikTok Content Strategy (Highest Priority Non-Reddit Channel)

**Why TikTok:** The target audience (18-28) spends 95 minutes/day on TikTok (eMarketer 2025). The "I found out X about my data" format is inherently viral. The Data Receipt / Time X-Ray is designed to be screenshotted and shared -- TikTok is the natural amplification layer.

**Content pillars:**
1. **"Google knows..." series** -- Reveal surprising data from Google Takeout exports. "Google knows I searched 'easy dinner' 23 times this month. So I built an AI that decides for me."
2. **"Time X-Ray reveals"** -- Screen recordings of the Time X-Ray moment. The gap between self-perception and reality is the hook.
3. **"I automated my week"** -- Before/after showing time saved. Concrete, visual, relatable.
4. **"Built in a day"** -- Behind-the-scenes of building features. Dev content performs well on TikTok.

**Posting cadence:** 3x/week minimum. TikTok's algorithm rewards consistency over quality in the early phase.

### Twitter/X Build-in-Public Strategy

**Why Twitter:** The AI/startup community on Twitter is highly engaged. Build-in-public threads get amplified by the community. It's where other founders, early adopters, and potential investors discover products.

**Format:**
- Daily: One observation, one metric, or one decision shared publicly. "Today we learned that 70% of our users' top time-waster is meal planning. Building a meal planner this week."
- Weekly: Thread summarizing the week. What shipped, what broke, what surprised us. Tag relevant people (AI influencers, productivity creators, indie hackers).
- Monthly: Milestone thread. "Month 1: 50 signups, 12 audits delivered, first paying customer. Here's everything."

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

Meldar is the only product in the top-left quadrant: discovers the problem AND builds the solution. Every competitor occupies one axis but not both.

### Competitive Wedge: "The Blank Prompt Problem"

Every competitor starts with an empty text box. "What do you want to build?" "Which apps do you want to connect?" "What's your prompt?"

The target audience doesn't know the answer. They don't know what's possible. They don't know where to start. They've tried and failed.

**Meldar's wedge:** "You don't start with a prompt. You start with your life."

This is not a feature comparison. It's a category difference. Meldar is not a worse version of Lovable. It's a different kind of product for a different kind of person.

### Head-to-Head Positioning

| Competitor | Their pitch | Meldar's counter | Why we win |
|---|---|---|---|
| **Lovable** ($6.6B) | "Describe what you want to build" | "You don't have to know what to build" | They need you to have an idea. We find the idea. |
| **Bolt.new** ($105M) | "Build from a prompt or template" | "Your life IS the template" | Templates are generic. Your Time X-Ray is personal. |
| **Zapier/Make** | "Connect these two apps" | "We tell you WHICH apps to connect and WHY" | They assume you've mapped your workflow. We do the mapping. |
| **ChatGPT/Claude** | "Ask me anything" | "We don't wait for you to ask" | They're reactive. We're proactive. |
| **Lindy.ai** | "Get 2 hours back every day" | "We show you exactly WHICH 2 hours and HOW" | They automate known workflows. We discover unknown ones. |

### Positioning for Sales Conversations

**The one-liner:** "Lovable says 'tell us what to build.' Zapier says 'connect these two apps.' Meldar says 'let us show you what's eating your week -- then we fix it.'"

**The 30-second pitch:** "Everyone has 5 hours a week they waste without realizing it. Checking the same sites, making the same decisions, copying the same data. You can't fix what you can't see. Meldar sees it. You upload your data -- a screenshot, a Google export, whatever you're comfortable with. We show you exactly where your time goes. Then we build a personal app that handles it. You own it. It runs on your terms. Done."

**The objection handler:**

| Objection | Response |
|---|---|
| "I can do this with Zapier" | "Can you? What's the first Zap you'd set up? If you knew, you'd have done it already. Meldar tells you what to automate. That's the part Zapier skips." |
| "I can just use ChatGPT" | "ChatGPT gives advice. Meldar builds things. Advice evaporates when you close the tab. A Meldar app runs while you sleep." |
| "This sounds like it reads my data" | "We never connect to your accounts. You download your own data -- it's your legal right. You hand us a file. We analyze it and delete it. Open the file yourself first if you want to see exactly what we'll see." |
| "EUR 49 per app is expensive" | "A freelance developer charges EUR 5,000+ for a custom app. Meldar builds it for EUR 49 and you own it forever." |

---

## 8. GDPR Compliance Audit

### Current State Assessment

The existing privacy policy (`/privacy-policy`) and terms of service (`/terms`) are solid for a landing-page-only product collecting emails. However, the planned features introduce new data processing activities that require updates.

### New Processing Activities and Their GDPR Implications

| New feature | Data processed | Legal basis | GDPR requirement | Status |
|---|---|---|---|---|
| **Screen Time screenshot upload** | Image file containing app names, usage hours | Consent (user uploads voluntarily) | Must inform user what data is extracted. Must delete original image after processing. Must document retention period. | **NEEDS UPDATE** in privacy policy |
| **Google Takeout upload** | ZIP containing Chrome history, search history, YouTube, Calendar, Maps | Consent (user uploads voluntarily) | Client-side processing claim must be technically accurate. If ANY data is sent server-side, must disclose. Must document what's extracted vs. what's discarded. | **NEEDS UPDATE** in privacy policy |
| **User accounts** | Email, hashed password (or magic link), usage history | Contract (necessary to deliver service) | Must implement: right to access, right to erasure, right to data portability. Must set data retention periods. Must document. | **NEEDS NEW SECTION** in privacy policy |
| **Payment processing (Stripe)** | Name, email, payment method (held by Stripe), transaction history | Contract | Must disclose Stripe as data processor. Must link to Stripe's DPA. Must clarify we never see/store card numbers. | **NEEDS NEW SECTION** in privacy policy and terms |
| **AI processing (Anthropic Claude)** | Derived data sent to Claude API for analysis | Legitimate interest + consent | Must disclose that user data is processed by a third-party AI provider. Must link to Anthropic's data processing terms. Must clarify what data is sent (derived insights, NOT raw uploads). | **NEEDS NEW SECTION** in privacy policy |
| **Email marketing (Resend)** | Email address, engagement data | Consent (opt-in at signup) | Must include unsubscribe link in every email. Must disclose Resend as data processor. Already partially covered. | **MINOR UPDATE** needed |
| **Chrome extension** (future) | Browsing history, tab data | Consent (explicit permission at install) | Requires separate, prominent disclosure. Chrome Web Store requires privacy policy. Must be incredibly specific about what's collected. | **FUTURE** -- not needed for PoC/MVP |

### Required Privacy Policy Updates

**Add these sections:**

1. **"Third-party processors"** -- List: Stripe (payments), Anthropic (AI analysis), Vercel (hosting), Resend (email). For each: what data they process, link to their DPA/privacy policy, where data is stored.

2. **"AI processing"** -- "When you use Meldar's analysis features, derived insights from your data (such as 'spends 3 hours/week on email') may be sent to Anthropic's Claude AI for processing. We never send your raw files, passwords, or personal messages to AI providers. Anthropic's data processing terms are available at [link]. Anthropic does not use your data to train their models."

3. **"Payment data"** -- "Payments are processed by Stripe. We never see, store, or process your credit card number. Stripe's privacy policy: [link]. Stripe's DPA: [link]."

4. **"Data retention"** -- Specify: uploaded files deleted within 24 hours of processing. Account data retained until account deletion. Analytics data retained for 26 months (GA4 default). Stripe transaction data retained per Stripe's policy + Finnish accounting law (6 years for financial records per Kirjanpitolaki 2:10).

5. **"International data transfers"** -- Update to include: Anthropic (US -- SCCs or DPF), Stripe (US -- DPF certified), Vercel (US -- DPF certified). Google Analytics already covered.

### Data Processing Agreements (DPAs)

Finnish company as data controller must have DPAs with all data processors:

| Processor | DPA available | Action needed |
|---|---|---|
| Stripe | Yes, auto-accepted on signup | Document acceptance |
| Anthropic | Yes, available on request | **Sign before processing user data** |
| Vercel | Yes, in dashboard | Accept in Vercel dashboard |
| Resend | Yes, on website | Accept before sending marketing emails |
| Google (GA4) | Yes, via Google Ads data processing terms | Already covered if using GA4 |

### Cookie Consent Updates

Current cookie consent only covers GA4. New features may introduce:
- Stripe's cookies (fraud prevention -- classified as "strictly necessary," no consent needed)
- No new marketing/tracking cookies planned

**No changes needed to cookie consent banner for PoC/MVP.**

### Age Verification

Terms say "must be at least 16 years old." This is correct for GDPR (Article 8: 16 years for information society services, though Finland could lower to 13). However, the landing page targets 18-28 year olds, so 16 is a reasonable minimum. No change needed.

### DPIA (Data Protection Impact Assessment)

Under GDPR Article 35, a DPIA is required when processing is "likely to result in a high risk to the rights and freedoms of natural persons." The Finnish DPA (Tietosuojavaltuutetun toimisto) has published a list of processing operations requiring DPIA.

**Assessment:** Meldar's processing (analyzing uploaded behavioral data to generate insights) likely falls under "systematic and extensive profiling with significant effects." A DPIA should be conducted before processing real user data at scale.

**Recommendation:** Conduct a lightweight DPIA before MVP launch. For PoC (first 50 users with manual audits), the risk is lower because processing is manual and human-reviewed. Document this risk assessment.

---

## 9. Terms of Service Updates

### New Terms Needed

The current ToS is minimal but adequate for a landing page. For PoC/MVP, add:

**1. AI Processing Disclosure**

> "Meldar uses artificial intelligence (provided by Anthropic) to analyze your data and generate insights. AI-generated content may contain errors. You should verify any recommendations before acting on them. We do not guarantee the accuracy of AI-generated analyses."

**2. Data Processing Specifics**

> "When you upload files (screenshots, exports), they are processed to extract usage patterns. Original files are deleted within 24 hours. Derived insights (e.g., 'uses email app 3 hours/day') are retained in your account until you delete them or your account."

**3. Payment Terms (expand existing section)**

> "Payments are processed by Stripe. Prices are displayed in EUR and include applicable VAT. Refund policy: If you are unsatisfied with a paid service, contact us within 14 days for a full refund (per EU Consumer Rights Directive for digital content). Subscriptions can be cancelled at any time; you retain access until the end of the billing period."

**4. User-Generated Content / Exports**

> "Data you upload remains yours. We do not claim any intellectual property rights over your data. Apps built through Meldar are yours -- you own the output. If Meldar ceases operations, your apps continue to work independently."

**5. Beta/Early Access Disclaimer**

> "Meldar is currently in early access. Features may change, break, or be discontinued. We will provide reasonable notice before removing features that affect your data or workflows. Early access pricing is subject to change for new subscribers, but existing pricing commitments (founding member pricing) will be honored."

**6. Service Level (or lack thereof)**

> "Meldar does not currently offer a service level agreement (SLA). We aim for reasonable availability but do not guarantee uptime. For business-critical automations, we recommend maintaining manual fallback procedures."

**7. Finnish Consumer Protection**

Under Finnish Consumer Protection Act (Kuluttajansuojalaki), B2C digital services sold to Finnish consumers have additional requirements:
- 14-day right of withdrawal for digital content (can be waived with explicit consent + acknowledgment that withdrawal right is lost once performance begins)
- Clear information about the digital content's functionality and compatibility
- Delivery confirmation

**Action:** Add a checkbox at Stripe checkout: "I agree that delivery of the digital service begins immediately and I acknowledge that I lose my right of withdrawal once the service is delivered."

---

## 10. Revenue Projections

### Assumptions

- Founding 50: 6 weeks to fill (based on existing early adopter analysis targets)
- Post-founding conversion rate: 5% of email signups convert to any paid tier (conservative; industry average for freemium SaaS is 2-5%)
- Average revenue per paying user: EUR 15/month (blended across tiers)
- Churn rate: 8%/month (high for early-stage, typical for consumer subscription)

### Conservative Projections

| Scenario | Total signups | Paying users (5%) | Monthly revenue | Annual run rate |
|---|---|---|---|---|
| **100 signups** (Month 2) | 100 | 5 | EUR 75 | EUR 900 |
| **500 signups** (Month 4-5) | 500 | 25 | EUR 375 | EUR 4,500 |
| **1,000 signups** (Month 6-8) | 1,000 | 50 | EUR 750 | EUR 9,000 |
| **5,000 signups** (Month 12+) | 5,000 | 250 | EUR 3,750 | EUR 45,000 |

### Revenue Breakdown by Tier (at 1,000 signups)

| Tier | % of paying users | Users | Price | Monthly revenue |
|---|---|---|---|---|
| Time X-Ray | 95% (free) | 950 | EUR 0 | EUR 0 |
| Starter | 3% | 30 | EUR 9/mo | EUR 270 |
| App Build (one-time) | 1.5% | 15 | EUR 49 (one-time) | EUR 735 (one-time, not recurring) |
| Concierge | 0.5% | 5 | EUR 199/mo | EUR 995 |
| **Total recurring** | | | | **EUR 1,265/month** |

### Cost Structure (at 1,000 signups)

| Cost | Monthly |
|---|---|
| Vercel Pro | EUR 20 |
| Anthropic API (50 paying users x ~$0.50/month avg) | EUR 25 |
| Resend (email, 1,000 contacts) | EUR 0 (free tier covers 3,000 emails/month) |
| Stripe fees (2.9% + EUR 0.25 per transaction) | ~EUR 40 |
| Domain + misc | EUR 10 |
| **Total infrastructure** | **~EUR 95/month** |
| Founder time (opportunity cost, not cash) | Not counted |

### Break-Even Analysis

Infrastructure costs are trivially low (~EUR 95/month). Meldar breaks even on infrastructure at approximately 11 Starter subscribers or 1 Concierge subscriber.

The real cost is founder time. At 1,000 signups with 50 paying users:
- Weekly playbook: 3-4 hours/week
- Time Audits (paid, post-founding): ~5/month x 2 hours = 10 hours/month
- App Builds: ~5/month x 3-4 hours = 15-20 hours/month
- Support: ~10 hours/month

Total founder time: ~60-70 hours/month for ~EUR 1,265/month recurring. This is not sustainable as a solo operation at this scale. The product must automate the Time Audit and App Build processes to reach profitability.

### When It Gets Interesting

At 5,000 signups with an automated product:
- 250 paying users
- EUR 3,750/month recurring
- Infrastructure costs: ~EUR 200/month (API costs scale)
- Founder time drops dramatically once product automates discovery + building
- **Net margin: ~EUR 3,500/month**

At 10,000 signups: EUR 7,500/month recurring. This is a livable income for a solo founder in Helsinki.

---

## 11. PoC vs. MVP Boundary

### PoC: Validate Willingness to Pay (Weeks 0-6)

**Goal:** Get 50 people to sign up. Get 5 people to pay money for something. Learn what they'll pay for.

| Feature | In PoC? | Notes |
|---|---|---|
| Landing page with email capture | YES | Already exists (needs CTA fix) |
| Founding 50 package | YES | Free Time Audits, weekly playbook, shape-the-product survey |
| Screen Time screenshot analysis | YES | Vision AI, low cost ($0.002/parse), instant value |
| Pick Your Pain quiz | YES | Already exists |
| Stripe checkout (one-time payments) | YES | For paid Time Audits post-founding |
| Shareable Data Receipt (Time X-Ray card) | YES | Viral hook, designed for screenshots |
| User accounts / authentication | NO | Email + Stripe customer ID is enough |
| Google Takeout upload | NO | Complex, save for MVP |
| Chrome extension | NO | Too much trust required too early |
| Subscriptions (recurring billing) | NO | Validate one-time payments first |
| App building (automated) | NO | Deliver manually first, automate in MVP |
| Concierge tier | NO | Offer it but deliver manually via email |

**PoC success criteria:**
1. 50 email signups within 6 weeks
2. At least 5 paid Time Audits (EUR 29 each) = EUR 145 revenue
3. At least 1 person asks "can you build this for me?" (validates App Build tier)
4. Weekly playbook open rate > 40%
5. At least 3 people share their Data Receipt on social media

### MVP: Sustainable Revenue (Weeks 7-16)

**Goal:** Automate what was manual in PoC. Reach 10+ paying subscribers on recurring plans.

| Feature | In MVP? | Notes |
|---|---|---|
| Everything in PoC | YES | |
| Google Takeout upload + client-side parsing | YES | Core discovery feature |
| Automated Time X-Ray report (AI-generated) | YES | Replaces manual Time Audit |
| User accounts (magic link auth) | YES | Needed for persistent data |
| Stripe subscriptions (Starter tier) | YES | Recurring revenue |
| First 3 automated app templates | YES | Meal planner, price watcher, expense sorter |
| App Build checkout (one-time, EUR 49) | YES | With automated delivery |
| GDPR endpoints (data export, account deletion) | YES | Legal requirement before scale |
| DPIA documentation | YES | Required before processing at scale |
| Chrome extension | NO | Defer to post-MVP. Trust must be earned. |
| Concierge tier (automated) | NO | Keep manual until unit economics proven |
| Mobile app | NO | Web-first. Mobile is a distraction. |

**MVP success criteria:**
1. 500 email signups
2. 25+ paying users (any tier)
3. EUR 375+/month recurring revenue
4. Automated Time X-Ray report generation (no manual work per user)
5. At least 10 app builds delivered (mix of manual + automated)
6. NPS > 40 from paying users

---

## Appendix A: Stripe Implementation Checklist

1. [ ] Create Stripe account (if not already done)
2. [ ] Enable Stripe Tax for EU VAT handling
3. [ ] Register for EU OSS via vero.fi
4. [ ] Create products: Time Audit (EUR 29), Starter (EUR 9/mo), App Build (EUR 49), Concierge (EUR 199/mo)
5. [ ] Create founding member coupon codes (100% off Time Audit, 55% off Starter, 61% off App Build, 50% off Concierge)
6. [ ] Set up Stripe Checkout session creation in Next.js API route
7. [ ] Set up Stripe webhook endpoint for payment confirmation
8. [ ] Add Stripe's DPA acceptance to compliance documentation
9. [ ] Add 14-day withdrawal waiver checkbox to checkout flow
10. [ ] Test full payment flow end-to-end

## Appendix B: Privacy Policy Update Checklist

1. [ ] Add "Third-party processors" section (Stripe, Anthropic, Vercel, Resend)
2. [ ] Add "AI processing" section
3. [ ] Add "Payment data" section
4. [ ] Add "Data retention" section with specific timeframes
5. [ ] Update "International data transfers" to include Anthropic, Stripe, Vercel
6. [ ] Add DPA references for all processors
7. [ ] Update "Last updated" date
8. [ ] Review with legal counsel before publishing (recommended, not mandatory for PoC)

## Appendix C: Terms of Service Update Checklist

1. [ ] Add AI processing disclosure + accuracy disclaimer
2. [ ] Add file processing and retention terms
3. [ ] Expand payment terms (VAT, refunds, EU Consumer Rights)
4. [ ] Add beta/early access disclaimer
5. [ ] Add no-SLA disclaimer
6. [ ] Add 14-day withdrawal clause with waiver mechanism
7. [ ] Update "Last updated" date

## Appendix D: Reddit Account Setup

1. [ ] Create dedicated Reddit account (personal name, not brand name)
2. [ ] Complete profile: bio mentioning "building tools for non-technical people" + link to meldar.ai
3. [ ] Subscribe to all target subreddits
4. [ ] Set up Reddit notifications for keywords: "automate my," "wasting time on," "AI for non-technical," "meal planning app," "too many apps"
5. [ ] Block 4 weeks in calendar for daily 20-minute Reddit commenting sessions
6. [ ] Prepare 4 value posts (automation tutorials) before first post

---

*This is iteration 1. Awaiting cross-review from Product/UX and Engineering clusters.*
