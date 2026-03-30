# How It Works Section Review

**Date:** 2026-03-30
**Component:** `src/components/landing/HowItWorksSection.tsx`
**Audience lens:** Non-technical person who is scared, has tried AI tools before, and failed

---

## Current Copy Assessment

### Step 01: "Tell us what bugs you"

**Current desc:** "Start with a frustration, not a feature list. 'I waste 2 hours every Monday on this.' That's enough. Meldar takes it from there."

**What works:**
- "Start with a frustration, not a feature list" is excellent reframing. It tells the user they don't need to know anything technical.
- The example quote ("I waste 2 hours every Monday on this") is concrete and relatable.

**What doesn't work:**
- "Tell us" is vague. Tell you how? Where? A form? A chat window? An email? A phone call? For someone who's already anxious about getting started, ambiguity at the first step is a dropout trigger.
- "Meldar takes it from there" is hand-wavy. The scared user thinks: "Takes it from there how? Last time something 'took it from there' I got a broken chatbot output."
- The title is colloquial ("bugs you") which is good for tone, but it could be confused with software bugs by the small fraction who have some tech exposure.

**Verdict:** Good emotional tone, unclear mechanism. The user needs to know exactly what they will do physically: click a button, type in a box, talk to a person.

---

### Step 02: "Watch it come together"

**Current desc:** "Meldar designs and builds your personal app. You see the progress in real time. Pick the design you like. Suggest changes. It's your thing."

**What works:**
- "It's your thing" reinforces ownership.
- "Pick the design you like. Suggest changes." implies collaboration, not a black box.

**What doesn't work:**
- "Watch it come together" sets an expectation of a live build experience. For a pre-launch company, this is a dangerous promise. If the MVP doesn't have a real-time progress view on day one, users will feel lied to.
- "Designs and builds your personal app" — the word "app" can terrify non-technical people. They think App Store, downloads, updates, things breaking. Many in this audience don't want an "app." They want their problem to go away.
- "You see the progress in real time" — if this is aspirational (Tier 3 Premium feature), it should not be in the launch landing page's How It Works. How It Works must describe what actually happens, not a roadmap.
- The step implies the user is passive ("watch"). Scared users who failed before want to feel in control, not like a spectator.

**Verdict:** Promising concept but over-promises on the current product reality. The word "app" needs rethinking for this audience. User should feel like a participant, not a viewer.

---

### Step 03: "It just works. Forever."

**Current desc:** "Your app runs on your computer. It does the thing you hated, automatically, every time. You own it. It's yours. Done."

**What works:**
- "It does the thing you hated" — visceral, relatable.
- "You own it. It's yours." — strong ownership message, differentiator from SaaS subscription fatigue.
- "Done." — punchy close.

**What doesn't work:**
- "It just works. Forever." is a promise no software company can keep. Software environments change. APIs break. OSes update. Saying "forever" to a skeptical audience who has been burned before is the opposite of trust-building — it sounds like every other overpromise that let them down.
- "Runs on your computer" could concern people who worry about computer performance, storage, or "is this safe?" Non-technical users don't find "runs locally" reassuring; they find it confusing.
- The entire step has zero mention of support, updates, or what happens when something changes. The scared user's #1 question is: "What if it breaks? Am I alone again?"

**Verdict:** The ownership angle is strong. The "forever" claim undermines trust. Needs a support/safety net message.

---

## Structural Questions

### Should we add a "Step 0: Sign up and get your free guide"?

**Yes, strongly recommended.** Reasons:

1. The current Step 1 asks the user to describe a frustration, which requires vulnerability and effort. A Step 0 that asks only for an email in exchange for value (a guide, examples, templates) is a much lower commitment entry point.
2. For the scared user, seeing other people's examples of what they automated ("Sarah automated her weekly meal plan," "Tom stopped manually tracking freelance invoices") is proof that this works for regular people.
3. It creates a two-step conversion: Step 0 captures the lead (email), and Steps 1-3 describe what happens next. This matches the landing page goal of converting to email signups.
4. Framing it as "Step 0" or even just a pre-step CTA avoids making the main flow feel longer.

**Recommended implementation:** Not a numbered step, but a call-to-action card before the numbered steps: "Not sure what to automate? Grab our free guide — 50 things real people automated this month." This gives the hesitant user a reason to engage without committing to describing their own problem yet.

### Should the section show what they'll see at each step?

**Yes, with caveats.** Each step should include a visual hint of what the experience looks like:

- **Step 1:** A mockup of the input interface — whether it's a simple text box with placeholder text like "I spend 45 minutes every morning sorting emails..." or a guided questionnaire. This removes the "tell us how?" ambiguity.
- **Step 2:** A simplified progress/status view. Even a stylized timeline ("Understanding your problem... Designing a solution... Building it...") is better than nothing. But only show what the product actually does — do not mock up features that don't exist.
- **Step 3:** A before/after snapshot. "Before: 45 min/day sorting emails. After: 0." Simple, visual, credible.

**Important:** The visuals must match the real product experience. Aspirational mockups of features that are on the roadmap but not built will destroy trust with this audience. If the real experience is a simple form + email notification when it's ready, show that honestly.

### Is "01, 02, 03" numbering intimidating or clarifying?

**Clarifying, but the current styling could feel cold.** The large, faded numbers are a common design pattern and work well for scannability. However:

- For this audience, the numbers communicate "there are only 3 steps" which is reassuring.
- The zero-padded format (01, 02, 03) is slightly more "design-y" than "human." For a scared, non-technical audience, "Step 1," "Step 2," "Step 3" or even "First," "Then," "Done" would feel warmer.
- Consider adding a progress/timeline connector (a vertical line or dots between steps) to reinforce that this is a journey with a clear end, not an open-ended process.

**Recommendation:** Keep numbered steps. Consider "Step 1 / Step 2 / Step 3" or "First / Then / Done" instead of "01 / 02 / 03" for warmth.

---

## Rewritten Steps

### Design principles for the rewrite:
1. **Specific over vague** — say exactly what the user does at each step
2. **Honest over aspirational** — only promise what the product delivers today
3. **Safe over impressive** — address the fear of failure at every step
4. **Active over passive** — the user is doing things, not watching things happen

---

### Recommended Rewrite (Option A — "Warm and specific")

**Step 1: "Describe what drains your time"**

> "Open the app, type what frustrates you in plain words. 'I spend an hour every week updating my budget spreadsheet.' No technical language needed. No right or wrong answer. We'll ask a few follow-up questions to make sure we understand — that's it."

**Why this works:** "Open the app, type" tells them exactly what to do. "No right or wrong answer" disarms the fear of getting it wrong. "We'll ask follow-up questions" signals a conversation, not a black box — and sets realistic expectations for the interaction.

**Step 2: "We build it, you approve it"**

> "Meldar creates a solution based on what you described. You'll get a preview with a clear explanation of what it does — no code, no jargon. If something's off, say so. We adjust until you're happy. Nothing goes live until you say yes."

**Why this works:** "You approve it" puts them in the driver's seat. "Nothing goes live until you say yes" is the single most important trust signal for the scared user. "No code, no jargon" preempts their biggest anxiety. "We adjust until you're happy" promises iteration without making them feel like they need to project-manage.

**Step 3: "It handles the boring part from now on"**

> "Your solution runs quietly on your computer. That task you hated? It happens automatically now. If anything needs attention, Meldar lets you know. And if something changes down the road — an update, a tweak — we're here."

**Why this works:** "From now on" is confident but not "forever" — it doesn't promise immortality. "Runs quietly" is less anxiety-inducing than "runs on your computer" alone. "If anything needs attention, Meldar lets you know" addresses the #1 fear: being left alone with a broken thing. "We're here" is the safety net.

---

### Alternative Rewrite (Option B — "Ultra-minimal, max trust")

**Step 1: "Type what annoys you"**

> "A text box. That's it. Describe the thing that eats your time every week. 'I hate updating my spreadsheet.' 'I check the same 5 websites every morning.' We take it from there."

**Step 2: "Review what we made"**

> "We build something for you and show you exactly what it does — in plain language. You decide: keep it, change it, or start over. No pressure, no commitment until you're ready."

**Step 3: "It just works — and we've got your back"**

> "Your solution runs automatically. The annoying task is gone. If anything ever needs fixing, we handle it. You're not on your own."

---

### Alternative Rewrite (Option C — "Problem-first, ultra-relatable")

**Step 1: "Start with a complaint"**

> "Seriously. 'I waste my whole Sunday planning meals.' 'I copy the same data into three apps.' Just tell us what drains you. One sentence is enough."

**Step 2: "See your solution before it's real"**

> "Meldar shows you a plan: here's what we'll build, here's what it'll do, here's how it works. You say yes, no, or 'change this part.' We don't build anything until you're comfortable."

**Step 3: "The annoying thing stops being your problem"**

> "Your fix runs on its own. Every day, every week, however often you need it. And if life changes — new job, new workflow — we adjust it with you."

---

## Recommendation

**Option A** is the strongest for the target audience. It balances specificity with warmth, addresses fear directly, and makes honest promises. Option B is good for a more minimal design where space is tight. Option C leans harder into personality but risks feeling too casual for users who need to trust a company with their workflow.

**Additional recommendations:**
1. Add a pre-step CTA for the free guide / example gallery (addresses Step 0 question)
2. Add subtle illustrations or mockups at each step showing the actual interface
3. Consider "Step 1 / 2 / 3" labeling over "01 / 02 / 03"
4. Add a micro-line under the section like "Questions? We're real people. hello@meldar.app" — trust signal for the scared user
