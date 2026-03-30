# Objection Map: Meldar Landing Page

Audit date: 2026-03-30
Source: all components in `src/components/landing/` plus `src/shared/ui/EmailCapture.tsx`

Page section order (as rendered in `page.tsx`):
Hero -> Problem -> SkillCards -> HowItWorks -> Tiers -> Comparison -> Trust -> FAQ -> FinalCTA

---

## 1. "Is this another scam AI tool?"

**Where addressed:**
- **ProblemSection** -- empathizes with past failures ("tutorials never work twice", "you closed the laptop"), signaling self-awareness that the category has burned people.
- **ComparisonSection** -- positions Meldar against "Others" on five dimensions. Implicit trust signal: we know the competition is bad.
- **ProblemSection testimonial** -- "Meldar is the first one that didn't make me feel stupid" (anonymous "Early beta user").

**What's missing:**
- The testimonial is anonymous and vague. A non-technical visitor who has been burned before needs a real name, a real face, and a specific outcome ("I built X in Y minutes"). An anonymous quote reads as fabricated.
- No company backstory, founder visibility, or "why we built this." Scam tools have no origin story.
- No press mentions, review site badges, or third-party validation anywhere on the page.

**Recommended copy changes:**
- Replace anonymous testimonial with a named beta user and concrete result (even if pseudonym + real screenshot).
- Add a brief founder line in TrustSection or below Hero: "Built in Helsinki by [Name], who got tired of watching people bounce off AI tools."
- If any third-party coverage exists, add a small "As seen in" row or review count.

---

## 2. "I don't understand what this actually does"

**Where addressed:**
- **HeroSection** -- "Tell Meldar what annoys you. It builds a personal app that fixes it. 30 minutes. No coding. No confusion."
- **SkillCardsSection** -- six concrete examples (Meal planner, Grade checker, etc.).
- **HowItWorksSection** -- three-step flow: tell frustration -> watch it build -> it runs forever.
- **ComparisonSection** -- contrasts starting point, required knowledge, who builds the app.

**What's missing:**
- No visual demo, screenshot, video, or GIF anywhere on the page. Every section is text-only. A non-technical person who doesn't understand what this does needs to *see* it happening.
- The hero subline is good but abstract. "Builds a personal app" -- what does that look like? Is it a phone app? A desktop thing? A website?
- HowItWorks step 3 says "Your app runs on your computer" but there is no indication of what form that takes (browser tab? system tray? desktop window?).

**Recommended copy changes:**
- Add a hero visual: even a stylized mockup showing a conversation ("I waste 2 hours sorting receipts") turning into an app card. This is the single highest-impact gap on the page.
- Clarify "personal app" in the hero. E.g., "It builds a tool on your computer that does it for you."
- In HowItWorks step 3, specify the form: "Your app runs quietly on your computer -- a small window you can check anytime."

---

## 3. "How much will this cost me?"

**Where addressed:**
- **TiersSection** -- three tiers: Free / Pay as you go / From $200.
- **FaqSection** -- "Most people spend $5-20 a month. Like a phone bill."
- **EmailCapture** -- "Free to start. No credit card."

**What's missing:**
- "Pay as you go" is vague for a non-technical user. What are they paying for? The FAQ mentions AI token costs but TiersSection doesn't explain the unit of cost.
- "From $200" on the Studio tier is a sticker shock moment with no context. Is that monthly? One-time? Per project? The description says "Our AI builds it while you watch" but doesn't clarify the pricing model.
- The "5% convenience fee" (mentioned in CLAUDE.md) is not disclosed anywhere on the landing page. Informed users may feel misled when they discover it.
- No price anchoring. The visitor has no reference point for whether $5-20/month is cheap or expensive.

**Recommended copy changes:**
- Under "Pay as you go" add: "Most people spend $5-20/month" (move this from FAQ to the tier card itself, since many visitors won't open FAQ).
- Under "From $200" add: "One-time. You keep the app forever." (or whatever the actual model is).
- Add a one-liner about what drives cost: "You pay for AI processing time, like electricity -- use more, pay more."
- Consider a simple cost calculator or "typical monthly cost" example.

---

## 4. "Will my data be stolen?"

**Where addressed:**
- **TrustSection** -- "Your stuff stays your stuff." Explains metadata-only collection, no screen recordings, no passwords. European privacy law. Delete anytime. Links to privacy policy.
- **FaqSection** -- "European privacy law applies to everything we do."
- **ComparisonSection** -- "Your data: Yours. Always." vs "Harvested or locked in."
- **TiersSection Explorer** -- "Privacy-first -- metadata only."

**What's missing:**
- TrustSection is section 7 of 9 on the page. A privacy-anxious visitor may have bounced long before reaching it. The data safety message needs to appear earlier.
- "European privacy law" is abstract. Saying "GDPR" is more recognizable and carries more weight.
- No specifics about what "metadata only" means. "Which apps you switch between and how often" is good but buried in body text.
- No mention of where data is stored (EU servers? local machine?).
- No mention of encryption, SOC 2, or any technical security measures.

**Recommended copy changes:**
- Add a trust signal near the Hero or right after ProblemSection: a one-liner like "GDPR-compliant. Your data never leaves your machine."
- Replace "European privacy law" with "GDPR (European privacy law)" at least once for recognition.
- In TrustSection, add: "Your data stays on your computer. We never store your files, messages, or passwords on our servers."
- Consider a small shield/lock icon badge near the email capture form.

---

## 5. "I'm not technical enough"

**Where addressed:**
- **HeroSection** -- "No coding. No confusion."
- **ProblemSection** -- entire section validates the frustration of non-technical users. Directly describes their experience.
- **HowItWorksSection** -- "Start with a frustration, not a feature list." Step 1 requires zero technical input.
- **ComparisonSection** -- "Technical knowledge: None required" vs "Assumed."
- **FaqSection** -- "Do I need to know how to code? No."
- **SkillCardsSection** -- examples are everyday tasks (meals, grades, prices), not developer tasks.

**Assessment:** This is the best-addressed objection on the page. The copy consistently speaks to non-technical users and validates their past frustrations. The problem/solution framing is strong.

**What's missing (minor):**
- The word "app" appears frequently and may still feel technical. Some visitors may think "I can't manage an app."
- No mention of support or help if they get stuck. "Meldar stays with you until it works" is only in the FAQ.

**Recommended copy changes:**
- In HowItWorks step 2, add: "Stuck? We're right there with you."
- Consider testing "your own tool" or "your own helper" instead of "your own AI app" in some places.

---

## 6. "Why should I give you my email?"

**Where addressed:**
- **EmailCapture** -- "Free to start. No credit card."
- **HeroSection** -- CTA says "Get early access" (anchor link to #early-access).
- **FinalCtaSection** -- Repeats "Get early access."
- **TiersSection** -- all three tiers link to #early-access.

**What's missing (CRITICAL):**
- There is NO explicit value exchange for the email. "Get early access" to what? The product doesn't exist yet (it's pre-launch). The visitor is asked to give their email with no clear promise of what they'll receive.
- The EmailCapture success message says "Check your inbox. Your setup guide is on its way" -- but this is never mentioned BEFORE submission. The visitor doesn't know a setup guide exists.
- No mention of: what "early access" means, when it starts, how many spots are available, what early adopters get that later users won't.
- No social proof near the CTA (e.g., "Join 847 people on the waitlist").
- No urgency or scarcity mechanism.

**Recommended copy changes (with early adopter benefit):**

The strongest early adopter benefit for someone who hasn't seen the product yet is **locked-in pricing + priority access + influence over what gets built**. Here's a specific framing:

**Above the email field:**
> "Join the early access list. First 500 people get:"
> - Free discovery tier forever (not just during beta)
> - Locked-in Builder pricing -- no price increases, ever
> - Direct line to the team -- tell us what to build next
> - Setup guide in your inbox within 2 minutes

**Below the email field (replacing "Free to start. No credit card."):**
> "No spam. One email to get started, then only product updates. Unsubscribe anytime."

**Near FinalCtaSection, add a counter:**
> "347 people on the waitlist" (even if approximate, this creates social proof)

**Why this works for non-technical, AI-scared visitors:**
- "Free discovery tier forever" removes cost fear
- "No price increases, ever" removes future cost anxiety
- "Direct line to the team" makes it feel human, not automated
- "Setup guide in your inbox within 2 minutes" gives immediate tangible value
- Waitlist count normalizes the action ("others are doing this too")

---

## 7. Additional objections identified

### 7a. "What if it breaks and I can't fix it?"

**Where partially addressed:**
- FaqSection: "What if I want to stop?" -- explains apps keep working. But doesn't address ongoing maintenance or breakage.
- HowItWorks step 3: "It just works. Forever." -- bold claim with no backup.

**What's missing:**
- No mention of updates, maintenance, or what happens when something changes (e.g., a website Meldar scrapes redesigns).
- "Forever" is a dangerous promise for a pre-launch product.

**Recommended copy changes:**
- Replace "It just works. Forever." with "It just works. And if something changes, we update it."
- Add a FAQ: "What if something breaks?" -> "We monitor your automations and fix issues before you notice. If you need help, we're one message away."

### 7b. "Who is behind this? Is this a real company?"

**Where addressed:** Nowhere on the landing page.

**What's missing:**
- No company name, founder name, team photo, location, or any human identity.
- The footer (not in landing components) may have some info, but the landing sections themselves have zero human presence.
- For a non-technical, trust-sensitive audience, anonymity = danger signal.

**Recommended copy changes:**
- Add a brief "Built by" line in TrustSection or Footer: "Meldar is built in Helsinki, Finland, by [Name]. European company, European privacy."
- Consider a small founder photo + one-liner for warmth.

### 7c. "I've never heard of Meldar"

**Where addressed:** Not addressed. No brand recognition signals exist.

**What's missing:**
- No "as seen in," no partner logos, no user count, no review scores.
- Pre-launch makes this hard, but even "Backed by Y Combinator" or "Built by ex-[Company]" or a beta user count helps.

**Recommended copy changes:**
- If any credibility markers exist (accelerator, notable beta users, relevant background), surface them.
- At minimum, the waitlist counter serves as a proxy for "other people trust this."

### 7d. "What happens to my stuff if Meldar disappears?"

**Where partially addressed:**
- FaqSection: "Everything you build is yours. It lives on your computer, not ours. If you leave, your apps keep working."
- ComparisonSection: "Your data: Yours. Always."

**Assessment:** This is reasonably well addressed, but only in the FAQ. Moving the "your apps keep working even if you leave" message higher on the page (e.g., into HowItWorks or TrustSection) would help.

### 7e. "This feels too good to be true / What's the catch?"

**Where addressed:** Not explicitly addressed.

**What's missing:**
- "30 minutes. No coding. No confusion." + "It just works. Forever." + "Free" -- these claims together trigger skepticism in a burned audience.
- No honest admission of limitations or trade-offs.

**Recommended copy changes:**
- Add a FAQ: "What's the catch?" -> "Meldar works best for tasks you repeat often on your computer. It won't replace specialized software. The free tier shows you what's possible; building costs a few dollars a month in AI processing."
- Alternatively, thread a light limitation into HowItWorks: "Not everything can be automated. Meldar tells you what can -- and what's not worth the effort."

---

## Summary: Priority fixes

| Priority | Objection | Gap | Fix |
|----------|-----------|-----|-----|
| **P0** | #6 Why give email? | No value exchange stated | Add explicit early adopter benefits above email capture |
| **P0** | #2 What does this do? | No visual/demo anywhere | Add hero mockup or product screenshot |
| **P1** | #1 Is this a scam? | Anonymous testimonial, no team identity | Named testimonial + founder line |
| **P1** | #3 How much? | Pricing tiers unclear | Move "$5-20/mo" to tier card, clarify Studio pricing |
| **P1** | #7b Who is behind this? | Zero company/founder presence | Add "Built in Helsinki by [Name]" |
| **P2** | #4 Data safety | Trust section too late in page | Add trust signal near hero or after problem section |
| **P2** | #7a What if it breaks? | "Forever" is unbelievable | Soften claim, add maintenance FAQ |
| **P2** | #7e Too good to be true | No honest limitations | Add "What's the catch?" FAQ |
| **P3** | #5 Not technical enough | Already well addressed | Minor: add support mention earlier |
| **P3** | #7c Never heard of Meldar | No brand signals | Add waitlist counter as minimum social proof |
| **P3** | #7d What if Meldar dies? | Addressed but buried in FAQ | Surface portability message higher |
