# AgentGate Landing Page -- UX Specification

**Author:** UX Architect
**Date:** 2026-03-30
**Status:** Ready for implementation
**Target:** Convert visitors to email signup (primary) or guided setup tutorial (secondary)

---

## Copy Brief

- **Page goal:** Convert problem-aware visitors into email signups or tutorial starts
- **Target audience:** Developers who bounced off Claude Code/Cursor setup, solopreneurs who want AI agents but don't know where to start, power users who can't identify what to automate
- **Core value proposition:** AgentGate discovers what you should automate, then gets you from zero to a working AI agent in 30 minutes
- **Primary CTA:** Email signup for early access
- **Secondary CTA:** Start the guided setup tutorial now
- **Traffic sources:** Twitter/X referrals from AI communities, Reddit r/ClaudeAI, Hacker News, organic search for "Claude Code setup", direct from outbound sales DMs
- **Awareness level:** Problem-aware to solution-aware. They know AI agents exist, many have tried and failed to set one up. They do NOT know AgentGate exists yet.

---

## Information Architecture -- Conversion Psychology

The page follows a deliberate psychological sequence:

1. **Recognition** -- "This is about MY problem" (Hero)
2. **Credibility** -- "Other people had this problem too" (Social proof)
3. **Clarity** -- "Here's what this actually does" (Three tiers)
4. **Concreteness** -- "Here are real things it automates" (Skill cards)
5. **Simplicity** -- "The process is simple" (How it works)
6. **Safety** -- "My data is protected" (Trust/privacy)
7. **Comparison** -- "This is better than what I've tried" (Positioning)
8. **Urgency** -- "I should start now" (Final CTA)

Every section has one job. No filler. No "about us" that doesn't serve conversion.

---

## Page Sections (Scroll Order)

---

### Section 1: Hero

**Purpose:** Instant recognition. The visitor should think "that's exactly my problem" within 3 seconds. Establish the promise and capture the highest-intent visitors immediately.

**Headline:**

> You don't need to learn AI. You need AI that works for you.

**Subheadline:**

> AgentGate finds what you're wasting time on, then sets up an AI agent to fix it. 30 minutes from zero to working automation. No PhD required.

**Primary CTA:**

> Button: "Get early access" --> Email capture inline (single field + button, no separate page)
> Micro-copy below field: "Free to start. No credit card."

**Secondary CTA:**

> Text link below primary: "Or start the guided setup now -- it takes 30 minutes"

**Content elements:**

- Single-field email input embedded in hero (not behind a click)
- Subtle animated terminal illustration showing the "before" (failed npm install, Xcode errors, API key confusion) morphing into the "after" (clean AgentGate setup, first automation running). This is not a screenshot -- it's a stylized representation using code-font text and brand colors. Keep it abstract enough that it doesn't date quickly.
- Small trust line beneath CTA: "Finnish company. GDPR-native. Your data stays yours."

**UX notes:**

- Email field is always visible above the fold on all devices. This is non-negotiable.
- No video, no carousel, no tabs. One message, one action.
- The terminal animation is decorative -- it must not distract from the headline or CTA. Use `prefers-reduced-motion` to serve a static version.
- Mobile: stack vertically. Headline, subheadline, email field, CTAs. Terminal illustration moves below or is hidden.

**Psychology applied:**

- **Framing Effect (PLFS +13):** Reframes the problem from "I failed at setup" to "setup was designed badly." The line "No PhD required" validates that the complexity wasn't the user's fault.
- **Loss Aversion (PLFS +12):** "What you're wasting time on" -- implies ongoing loss that continues every day they don't act.

---

### Section 2: Problem Validation

**Purpose:** Deepen the recognition from the hero. Make the visitor feel understood. This section earns the right to present the solution by first proving you understand the problem.

**Headline:**

> You tried. The tools made it hard.

**Body copy (three short blocks, each with an icon):**

**Block 1: The Setup Wall**
> You wanted to try Claude Code. Then you needed Node.js. Then Xcode. Then an API key from a dashboard you'd never seen. Three hours later, you had a blinking cursor and no idea what to type.

**Block 2: The "What Do I Even Automate?" Problem**
> Everyone says AI agents will change everything. Nobody tells you what to point them at. You have a powerful tool and zero idea what's worth automating in YOUR day.

**Block 3: The Half-Built Prototype**
> You followed a tutorial. It worked on Tuesday. It broke on Wednesday. You spent a weekend debugging something that was supposed to save you time.

**No CTA in this section.** This is a trust-building pause. Adding a CTA here would feel premature.

**Content elements:**

- Three blocks, each with a simple line-art icon (terminal with X, question mark, broken gear)
- Short paragraphs. Conversational tone. Second person ("you").

**UX notes:**

- Desktop: three columns. Mobile: single column, stacked.
- These blocks must feel like someone describing the reader's own experience, not like a company listing problems to sell against. The tone is empathetic, not alarmist.
- Keep this section tight. Three blocks, no more. It should scroll past in 5-8 seconds.

**Psychology applied:**

- **Confirmation Bias (PLFS +11):** Reader sees their own experience reflected back. This builds trust because the company "gets it."
- **Empathy before solution:** Classic copywriting structure. Problem acknowledgment before solution presentation increases perceived credibility of the solution.

---

### Section 3: The Three Tiers (Solution Overview)

**Purpose:** Present AgentGate's value as a clear progression. Show that there's an entry point for everyone, from free discovery to done-for-you building. This is where the visitor shifts from "I have a problem" to "this could solve it."

**Headline:**

> Three ways in. Pick where you are.

**Subheadline:**

> Whether you want to explore, set up yourself, or have us build it -- we meet you where you are.

**Tier cards (three columns on desktop, stacked on mobile):**

---

**Tier 1 Card: Discover**

- Label tag: "Free"
- Icon: Magnifying glass over a calendar/activity pattern
- Title: "Find out what to automate"
- Body: "We analyze your activity patterns -- which apps you switch between, what you copy-paste, where your time actually goes. You get a daily list of specific automations worth building. Most people find 5-8 hours of waste they never noticed."
- CTA: "Get early access" (same email capture as hero -- scrolls to hero or opens inline modal)
- Trust line: "We see what apps you use, not what you type in them."

---

**Tier 2 Card: Setup + Use**

- Label tag: "Pay as you go"
- Icon: Rocket/arrow through a gate
- Title: "Zero to AI agent in 30 minutes"
- Body: "We walk you through every step: install the tools, configure your API key (we provision it for you), and run your first automation. You pay only for what you use, plus a 5% convenience fee. No subscription. No commitment."
- CTA: "Start setup now" --> Links to guided tutorial
- Trust line: "You own your code. Cancel anytime."

---

**Tier 3 Card: Auto-Build**

- Label tag: "$200 -- $10,000"
- Icon: Building blocks assembling themselves
- Title: "We build it. You watch."
- Body: "Tell us what you want automated. Our AI agents design it, build it, and deploy it -- while you watch progress in real time. From a simple script to a full application. You review, we iterate."
- CTA: "Get early access" (email capture)
- Trust line: "You own everything we build."

---

**UX notes:**

- Tier 2 card should be visually highlighted (subtle border or brand-color accent) as the recommended starting point. This uses the default effect -- highlighting one option reduces decision paralysis.
- Price tags on each card act as anchoring. Free -> pay-as-you-go -> project pricing creates a natural escalation that makes the middle tier feel like the "smart" choice.
- Desktop: three equal-width columns. Mobile: horizontal swipe carousel with dots, or stacked cards with clear visual separation.
- Each card must stand alone -- a visitor skimming should understand the tier from the card alone.

**Psychology applied:**

- **Paradox of Choice (PLFS +14):** Exactly three options. Not two (feels limiting), not four (overload). Three with a highlighted default.
- **Anchoring (PLFS +12):** The $200-$10,000 range on Tier 3 makes the 5% fee on Tier 2 feel tiny in comparison. Tier 1 being free makes Tier 2 feel like a reasonable next step.
- **Default Effect (PLFS +11):** Tier 2 highlighted as recommended. Most users will gravitate to it.

---

### Section 4: Concrete Automations (Skill Cards)

**Purpose:** Make "AI automation" tangible. Abstract promises mean nothing to the target audience. Concrete examples of real automations create the "I need that" moment.

**Headline:**

> Here's what people are automating this week

**Subheadline:**

> Real workflows. Real time saved. Each one takes minutes to set up.

**Skill cards (6 cards, 2 rows of 3 on desktop, scrollable on mobile):**

| Skill | Description | Time Saved |
|-------|-------------|------------|
| **Organize Downloads** | Auto-sort your Downloads folder by file type, project, and date. Never dig through chaos again. | ~2 hrs/week |
| **Git Commit Summaries** | Generate meaningful commit messages from your staged changes. Stop writing "fix stuff" at midnight. | ~1 hr/week |
| **Meeting Notes to Tasks** | Turn meeting transcripts into structured action items in your task manager. | ~3 hrs/week |
| **Email Draft from Context** | Write email responses based on thread history and your communication style. | ~2 hrs/week |
| **Jira to Git Branch** | Auto-create Git branches from Jira tickets with proper naming conventions. | ~1 hr/week |
| **CSV Data Cleanup** | Clean, normalize, and transform messy CSV files using plain English instructions. | ~4 hrs/week |

Each card shows:
- Icon (simple, monochrome line art)
- Skill name (bold)
- One-line description
- "~X hrs/week saved" badge
- Small "Set up this skill" link (leads to tutorial or email capture)

**UX notes:**

- Desktop: 3x2 grid. Mobile: horizontal scroll carousel with peek (show partial next card to indicate scrollability).
- Time-saved numbers must be honest estimates, not inflated. Mark as estimates: "~" prefix.
- These cards are the same component pattern that will appear in the dashboard later (suggestion cards). Design them as a reusable component.
- A subtle "More skills coming weekly" note below the grid signals ongoing value.

**Psychology applied:**

- **Jobs to Be Done (PLFS +13):** Each card is a specific job the user recognizes from their own workflow. "Organize Downloads" is universally relatable. "Jira to Git Branch" targets developers specifically.
- **Concreteness Effect:** People value specific, tangible outcomes over abstract promises. "2 hrs/week" is concrete. "Boost your productivity" is not.

---

### Section 5: How It Works

**Purpose:** Remove uncertainty about the process. The target audience failed at setup before -- they need to see that THIS process is different. Three steps. No ambiguity.

**Headline:**

> Three steps. Thirty minutes. Done.

**Steps (numbered, with connecting line/arrow between them):**

**Step 1: Sign up and install**
> We detect your operating system and walk you through every step. Node.js, command-line tools, Claude Code -- each install has a verify button so you know it worked. No guessing.

**Step 2: Get your API key**
> We provision your API key automatically. One click to copy, one command to configure. You're billed only for what you use -- we add a 5% fee to cover setup support and curated skills.

**Step 3: Run your first automation**
> Pick a skill from our library, or let our discovery engine suggest one based on your activity. Your first automation runs in under 5 minutes. You'll see the result immediately.

**CTA below steps:**

> Button: "Start now -- it's free to try"
> Subtext: "Thousands of people set up Claude Code the hard way. You don't have to."

**Content elements:**

- Three numbered steps with brief descriptions
- Each step has a small illustrative element (OS detection mockup, API key copy button, terminal showing output)
- Connecting line or progress indicator between steps reinforces linearity and simplicity

**UX notes:**

- Desktop: horizontal steps with connecting arrows. Mobile: vertical steps with connecting line.
- Each step must feel visually lightweight. If the steps look complex, the section fails its purpose.
- The "verify button" mentioned in Step 1 is a key differentiator -- make it visually prominent even in this overview. It's the detail that signals "this is different from a blog tutorial."

**Psychology applied:**

- **Processing Fluency (PLFS +12):** Three steps feels simple. The brain registers "three things" as manageable. More than five and it feels like work.
- **Risk Reversal (PLFS +11):** "Free to try" plus specificity ("30 minutes") reduces perceived risk. The subtext acknowledges the alternative (hard way) and positions this as the smart shortcut.

---

### Section 6: Trust and Privacy

**Purpose:** Address the #1 objection for activity-monitoring software: "Is this safe?" This section must appear BEFORE the final CTA because unresolved privacy concerns kill conversions. Handle the objection, then ask for the action.

**Headline:**

> Your data. Your rules. No exceptions.

**Body (two-column layout on desktop):**

**Left column -- What we see vs. what we don't:**

> **We see:**
> - Which applications you switch between
> - How often you perform repetitive tasks
> - Patterns in your workflow timing
>
> **We never see:**
> - What you type in those applications
> - Your passwords, messages, or personal content
> - Screen recordings or screenshots

**Right column -- Trust signals:**

> **Finnish company, EU jurisdiction**
> Built in Helsinki. GDPR isn't a checkbox for us -- it's the law we operate under. The Finnish Data Protection Authority actively enforces. Your data is stored in EU data centers.
>
> **No lock-in. Ever.**
> Your automations are yours. Your code is yours. Export everything, delete your account, switch to a direct API key -- we make it easy, not painful.
>
> **Open about our business model**
> We add 5% to your AI token usage. That's it. No hidden fees, no data selling, no ads. You can see the exact base cost on every invoice.

**No CTA in this section.** This is objection resolution. Adding a CTA here would undermine the trust-building tone.

**Content elements:**

- Two-column layout with clear visual separation
- "We see / We never see" uses a green-check / red-X icon pattern for instant scanning
- Finnish flag or "Built in Finland" small badge
- GDPR compliance badge/icon

**UX notes:**

- Desktop: two columns, equal width. Mobile: stacked, "What we see" section first.
- This section should feel calm and authoritative, not defensive. The design should use generous whitespace and a slightly different background tone to set it apart from the more energetic sections above.
- The "We see / We never see" format is critical -- it proactively answers the question the reader is already thinking. Don't bury this in a FAQ.

**Psychology applied:**

- **Transparency Effect (PLFS +14):** Showing the business model openly (5% markup, visible on invoices) converts skeptics. Counter-intuitive but proven -- Buffer's open salaries, Everlane's transparent pricing.
- **Authority Bias (PLFS +10):** Finnish jurisdiction, GDPR enforcement, EU data residency. Institutional authority signals that don't require the visitor to trust AgentGate's word alone.

---

### Section 7: Competitive Positioning

**Purpose:** For visitors who are evaluating alternatives. This section answers "how is this different from Zapier / Cursor / hiring a developer?" without naming competitors aggressively. Positions AgentGate as a distinct category.

**Headline:**

> Not another AI tool. The tool that gets you to the tools.

**Body (comparison grid -- NOT a feature matrix):**

| If you've tried... | What happened | AgentGate instead |
|---------------------|---------------|-------------------|
| **Zapier or Make** | You had to already know what to automate. And you hit integration limits fast. | We discover what's worth automating first. Then we build with code, not drag-and-drop limitations. |
| **Cursor or Copilot** | Great tools -- if you can get them running. Most people stall at setup or don't know what to build. | We're the on-ramp. We get you set up, suggest what to build, and stay with you through your first automations. |
| **YouTube tutorials** | Fragmented. Outdated by next week. No one to ask when you get stuck. | A guided, verified setup process. Each step confirms it worked before you move on. |
| **Hiring a developer** | $5,000-$50,000 per project. Weeks of back-and-forth. | Our AI builds it for $200-$10,000. You watch progress in real time and own everything. |

**CTA below table:**

> "Ready to skip the hard way?" --> Scrolls to email capture

**UX notes:**

- Desktop: table format as shown. Mobile: collapse into accordion cards (tap to expand each "If you've tried..." row).
- Do NOT use a checkmark feature comparison matrix (e.g., "we have X, they don't"). That format invites nitpicking and looks defensive. The narrative comparison format above tells a story the reader recognizes.
- Tone is matter-of-fact, not dismissive of alternatives. Respect the reader's intelligence -- they may have used and liked some of these tools.

**Psychology applied:**

- **Distinctiveness / Category Design (PLFS +11):** Positions AgentGate as a new category ("the on-ramp") rather than a competitor in an existing one. This avoids direct feature-by-feature comparison where AgentGate (pre-launch) would lose.
- **Recognition over recall:** The "If you've tried..." column maps to real experiences the reader has had. They don't need to remember features -- they recognize their own frustration.

---

### Section 8: FAQ / Objection Handling

**Purpose:** Catch remaining objections before the final CTA. Every question here was identified from the sales coach's objection playbook and the outbound strategist's response data.

**Headline:**

> Common questions

**Questions and answers (accordion/expandable format):**

**Q: I can just get my own API key from Anthropic. Why use yours?**
> You absolutely can. About 15% of our users eventually do. But most tell us the curated skills, managed billing, and zero-friction setup are worth far more than the 5% fee. If you spend $20/month on tokens, that's $1 in fees. If the automations we helped you set up save you 5 hours, that's a good trade.

**Q: What if I'm not a developer?**
> That's exactly who we built this for. Our guided setup detects your operating system, verifies each step, and gives you a "first mission" that works in minutes. You don't need to know what Node.js is -- you just need to click "Install" when we tell you to.

**Q: What does the 5% fee actually cover?**
> Setup support, curated automation skills, the discovery engine that tells you what to automate, and managed billing so you don't need to deal with API dashboards. We show the base cost and our fee on every invoice -- full transparency.

**Q: What happens to my data if I leave?**
> You export everything (code, automations, configuration) and delete your account. We remove your data within 30 days per GDPR requirements. Your automations keep working -- they're just code on your machine.

**Q: Is this a wrapper? What if you shut down?**
> AgentGate provisions your API key and provides curated skills. Claude Code runs on your machine, not on ours. If we disappeared tomorrow, your automations would still work. You'd just lose the discovery suggestions and managed billing.

**Q: How is this different from reading the Claude Code documentation?**
> Documentation tells you what's possible. We tell you what's possible FOR YOU, based on your actual workflow. Then we set it up. The difference is 30 minutes vs. 30 hours, and automation suggestions you'd never think of on your own.

**UX notes:**

- Accordion format: questions visible, answers hidden until clicked/tapped. This prevents the section from feeling overwhelming.
- Desktop and mobile: same layout. Full-width accordion.
- Maximum 6-8 questions. More than that signals uncertainty, not thoroughness.
- Questions should be phrased the way real people ask them (informal), not as corporate FAQ headers.

---

### Section 9: Final CTA

**Purpose:** Convert visitors who scrolled the entire page. These are high-intent -- they read everything and are still here. Make the ask clear and remove final friction.

**Headline:**

> Your first AI agent is 30 minutes away.

**Subheadline:**

> Sign up for early access. We'll send you the guided setup tutorial and your first curated automation skill. Free to start, pay only for what you use.

**CTA elements:**

- Email field (same as hero -- single field + submit button)
- Button text: "Get early access"
- Below button: "Or start the guided setup now" (text link to tutorial)
- Micro-copy: "No credit card required. Unsubscribe anytime."

**Additional trust element (below CTA):**

> A single line: "Built in Helsinki, Finland. Privacy by design, not by accident."

**UX notes:**

- This section should feel like a destination, not a repetition. Different background color/treatment than the hero to signal "new section" even though the CTA is the same.
- On mobile, the email field must be prominently visible without scrolling within this section.
- Consider a subtle animation or micro-interaction on the submit button (e.g., brief checkmark animation on success) to reinforce completion.
- After submission: redirect to a confirmation page or show inline confirmation with "Check your email for next steps" message. Do NOT just show a generic "thanks."

**Psychology applied:**

- **Commitment Consistency (PLFS +10):** The visitor has invested time reading the page. The final CTA capitalizes on this investment -- abandoning now would feel like wasted effort.
- **Specificity:** "30 minutes" is a concrete, testable promise. "Get started" is vague. The number creates accountability and credibility.

---

### Section 10: Footer

**Purpose:** Legal compliance, trust reinforcement, navigation. The footer is not a conversion tool, but it IS a trust signal. Sloppy footers suggest sloppy companies.

**Content:**

- **Left:** AgentGate logo + wordmark. One-line description: "The on-ramp to the AI agent era."
- **Center:** Links: Privacy Policy | Terms of Service | Cookie Settings | Contact
- **Right:** Finnish company registration number (e.g., "AgentGate Oy | Y-tunnus: XXXXXXX-X"). Social links: Twitter/X, GitHub.
- **Bottom line:** "(c) 2026 AgentGate Oy. Built in Helsinki, Finland."

**UX notes:**

- "Cookie Settings" link is required for GDPR re-consent. Must trigger the cookie consent modal.
- Footer should be minimal. This is not a sitemap.
- Finnish company registration number is a deliberate trust signal -- it says "we're a real, registered company."
- Mobile: stack all elements vertically, centered.

---

## Conversion Flow

### Primary Path (Email Signup)

```
Land on page
  --> Read hero headline (instant recognition)
  --> See email field (highest-intent visitors convert here)
  --> Scroll to problem validation (feel understood)
  --> See three tiers (understand the offering)
  --> See concrete automations (want specific skills)
  --> See how it works (believe it's simple)
  --> Read privacy section (trust established)
  --> See comparison (confirm this is different)
  --> Scan FAQ (last objections resolved)
  --> Enter email in final CTA
  --> Receive confirmation + next steps email
```

**Estimated conversion points:** Hero CTA (30% of conversions), Final CTA (50% of conversions), Tier card CTAs (20% of conversions).

### Secondary Path (Guided Setup)

```
Land on page
  --> Read hero headline
  --> Click "start the guided setup now" (secondary CTA in hero)
  --> Redirect to /setup (guided tutorial page)
  --> Complete tutorial --> prompted to create account
```

This path is for visitors with high urgency and existing technical comfort. They don't need convincing -- they need a path.

### Objection Resolution Map

| Objection | Where it's addressed | Section |
|-----------|---------------------|---------|
| "Is this safe / private?" | Trust and Privacy section | 6 |
| "What does it cost?" | Tier cards (Section 3) + FAQ | 3, 8 |
| "Is it worth my time?" | Skill cards with time-saved estimates | 4 |
| "How is this different from X?" | Competitive positioning table | 7 |
| "What if I'm not technical?" | How it works (verified steps) + FAQ | 5, 8 |
| "What if I want to leave?" | Trust section (no lock-in) + FAQ | 6, 8 |
| "Is this a real company?" | Finnish registration in footer + trust section | 6, 10 |

---

## Mobile-First Considerations

### Layout Changes

| Section | Desktop | Mobile |
|---------|---------|--------|
| Hero | Two columns (copy + terminal animation) | Single column, copy only. Animation below fold or hidden. |
| Problem Validation | Three columns | Single column, stacked |
| Three Tiers | Three columns | Swipe carousel with dots, or stacked with clear separation |
| Skill Cards | 3x2 grid | Horizontal scroll carousel with peek |
| How It Works | Horizontal steps with arrows | Vertical steps with connecting line |
| Trust/Privacy | Two columns | Single column, stacked |
| Comparison | Table | Accordion (tap to expand each row) |
| FAQ | Accordion | Accordion (same) |
| Final CTA | Centered with whitespace | Full-width, prominent |

### Touch Targets

- All buttons: minimum 44x44px touch target (WCAG 2.5.8)
- Email input fields: full-width on mobile, minimum 48px height
- Accordion expand/collapse: full row is tappable, not just the chevron
- Skill card carousel: swipe gesture with momentum, peek at next card

### Scroll Depth Expectations

- Mobile users scroll less. The hero and email CTA must do the heaviest lifting.
- Problem validation section should be compact on mobile (3 short paragraphs, not 3 large blocks).
- "Sticky CTA" consideration: a subtle fixed bar at bottom of screen with "Get early access" that appears after scrolling past the hero. This ensures the CTA is always one tap away. Must be dismissible and must not obstruct content.

### Performance

- No heavy images above the fold. Terminal animation should be CSS/SVG, not a GIF or video.
- Font loading: use `font-display: swap` to prevent layout shift.
- Target: Largest Contentful Paint < 2.5s on mobile 4G.

---

## SEO Requirements

### Target Keywords

| Priority | Keyword | Search Intent | Monthly Volume (est.) |
|----------|---------|---------------|----------------------|
| 1 | "how to set up claude code" | Informational | Medium |
| 2 | "claude code tutorial" | Informational | Medium |
| 3 | "ai agent setup" | Informational | Low-Medium |
| 4 | "what to automate with ai" | Commercial | Low-Medium |
| 5 | "claude code api key" | Informational | Low |
| 6 | "ai automation for beginners" | Informational | Low |
| 7 | "agentgate" | Navigational | Emerging |

### Meta Title

> AgentGate -- From Zero to AI Agent in 30 Minutes

**Character count:** 48 (under 60 limit)

### Meta Description

> AgentGate discovers what you should automate, guides you through AI agent setup in 30 minutes, and builds your automations with AI. Free to start. Finnish company, GDPR-native.

**Character count:** 176 (within 150-160 ideal range after trimming). Trim to:

> AgentGate discovers what you should automate and guides you from zero to a working AI agent in 30 minutes. Free to start. GDPR-native.

**Character count:** 137

### Open Graph Tags

```
og:title = "AgentGate -- From Zero to AI Agent in 30 Minutes"
og:description = "Discovers what you should automate, guides setup in 30 minutes, builds automations with AI. Free to start."
og:image = [Social share card with AgentGate logo, tagline, terminal-inspired design]
og:type = "website"
og:url = "https://agentgate.com"
```

### JSON-LD Structured Data

Use `SoftwareApplication` schema:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "AgentGate",
  "description": "The on-ramp to the AI agent era. Discovers what to automate, guides AI agent setup, and builds automations with AI.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "macOS, Windows, Linux",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free discovery tier. Pay-as-you-go for AI token usage with 5% convenience fee."
  },
  "author": {
    "@type": "Organization",
    "name": "AgentGate Oy",
    "url": "https://agentgate.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Helsinki",
      "addressCountry": "FI"
    }
  }
}
```

Also add `Organization` schema and `FAQPage` schema for the FAQ section (helps with rich snippet eligibility).

### Additional SEO Notes

- Canonical URL: `https://agentgate.com/` (trailing slash, pick one convention and be consistent)
- `<html lang="en">` -- English only for now, add `hreflang` when i18n is added
- H1: only one per page (the hero headline)
- H2: each section headline
- Image alt text on all illustrations/icons
- Internal links: hero CTA links to `/setup` (guided tutorial), which should exist as a separate indexed page

---

## Cookie Consent (GDPR)

A cookie consent banner must appear on first visit, BEFORE any analytics scripts load.

**Banner copy:**

> We use cookies to understand how visitors use this site. No tracking until you say so.
> [Accept] [Reject] [Cookie settings]

**Behavior:**

- Default state: `undecided`. No analytics loaded.
- "Accept": sets consent, loads Google Analytics 4.
- "Reject": sets rejected state, no analytics. Banner does not reappear.
- "Cookie settings": opens modal with granular controls (analytics yes/no, marketing yes/no -- even if only analytics exists now, build the structure for future use).
- Consent state stored in `localStorage`. Re-accessible via "Cookie Settings" footer link.
- Banner position: bottom of viewport, non-intrusive. Must not obscure the hero CTA.

---

## Component Inventory (for implementation)

These are the discrete components needed, organized by FSD layer:

### shared/ui
- `EmailCapture` -- inline email field + submit button + micro-copy (reused in hero and final CTA)
- `JsonLd` -- JSON-LD structured data renderer (already exists per CLAUDE.md)
- `SectionHeading` -- consistent section headline + optional subheadline
- `TrustBadge` -- small inline trust signal ("Finnish company", "GDPR-native", etc.)

### features/cookie-consent
- `CookieConsent` -- banner component (already planned per project structure)

### components/landing
- `HeroSection` -- headline, subheadline, email capture, terminal animation, trust line
- `ProblemSection` -- three problem blocks with icons
- `TiersSection` -- three tier cards with pricing, CTAs, trust lines
- `SkillCardsSection` -- grid/carousel of automation skill cards
- `HowItWorksSection` -- three numbered steps with illustrations
- `TrustSection` -- two-column privacy/trust content
- `ComparisonSection` -- narrative comparison table/accordion
- `FaqSection` -- accordion Q&A
- `FinalCtaSection` -- closing CTA with email capture
- `StickyCtaBar` -- mobile-only fixed bottom CTA bar (appears after scrolling past hero)

### widgets/header
- Minimal header: logo + "Get early access" button (no complex nav for a landing page)

### widgets/footer
- `Footer` -- company info, legal links, social links

---

## Post-Submission Flow (Email Capture)

When a visitor submits their email:

1. **Inline confirmation:** Email field transforms to checkmark + "Check your inbox. Your setup guide is on its way."
2. **Email sent immediately** (not daily batch):
   - Subject: "Your 30-minute setup guide is ready"
   - Body: Link to guided tutorial, link to first skill, one-line about what to expect
   - Tone: warm, direct, no marketing fluff. This email is the first product experience.
3. **No redirect to a separate "thank you" page.** Keep them on the landing page where they might continue reading or click through to the tutorial.

---

## Measurement Plan

### Key Metrics

| Metric | What it tells us | Target |
|--------|-----------------|--------|
| Email capture rate (visitors to signups) | Overall page effectiveness | 5-10% |
| Hero CTA vs Final CTA ratio | Whether problem/solution sections are helping or if most convert on first impression | ~30/50 split |
| Scroll depth to Section 6 (Trust) | Whether middle sections are engaging or losing people | >40% of visitors |
| Tutorial start rate (from email) | Whether the post-signup flow works | >30% |
| Time on page | Engagement quality | 2-4 minutes |
| Bounce rate | First-impression effectiveness | <60% |

### A/B Test Candidates (Future)

1. Hero headline variants (loss-frame vs. aspiration-frame)
2. "Get early access" vs. "Start free" vs. "Get started" CTA text
3. With/without problem validation section (does it help or slow people down?)
4. Tier card order (Discover-Setup-Build vs. Setup-Discover-Build)
5. Sticky mobile CTA bar (on vs. off)

---

## Implementation Notes

- All sections are React Server Components except: `EmailCapture` (form interaction), `CookieConsent` (localStorage + conditional script loading), `FaqSection` (accordion interaction), `StickyCtaBar` (scroll position detection), `SkillCardsSection` (carousel on mobile).
- Use `styled.section` for each page section per project styling rules.
- Spacing between sections: consistent, generous. Use `paddingBlock` with spacing tokens (e.g., `paddingBlock={20}` = 80px).
- Dark mode default for product/dashboard. Light mode default for this marketing/landing page (per brand guardian recommendation -- dark terminals can intimidate the non-developer audience).
- All copy in this spec is final draft, not placeholder. Implement as written, then test.
