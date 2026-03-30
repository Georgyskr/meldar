# Skill Cards — Content Optimization

**Date:** 2026-03-30
**Input:** Current SkillCardsSection.tsx (6 cards) + SYNTHESIS.md research

---

## Analysis of Current 6

| Current Card     | Research Tier | Verdict |
|------------------|:---:|---|
| Meal planner     | T1 (extreme pain) | **Keep** — broadest relatability, universal decision fatigue |
| Grade checker    | T1 (extreme pain) | **Keep** — instant recognition for students, demonstrates "polling → push" pattern |
| Price watcher    | T2 | **Swap** — low pain compared to T1 alternatives; too "nice to have" |
| Job tracker      | T2 | **Swap** — tracking is the weaker angle; resume tailoring is T1 extreme pain |
| Expense sorter   | T1 (extreme pain) | **Keep** — universal, tax-time urgency |
| Social poster    | T2 | **Keep but reframe** — strong for freelancers/solopreneurs; needs tighter copy |

### What the current set misses

The research flags two T1-extreme use cases that aren't represented:

1. **Email triage** — appears across freelance, forums, and social research. Everyone drowns in email. No good solution exists beyond Gmail filters.
2. **Resume tailoring** — extreme pain for job seekers. "Job tracker" is a weaker version of this need; the real pain is customizing per application, not just tracking.

Also missing: **apartment hunting alerts** (T2, but extremely high emotional stakes, great for demonstrating the "stop checking" pattern).

---

## Answers to Strategic Questions

### 1. Are these the 6 most compelling use cases?

No. Four of six are strong, but **price watcher** and **job tracker** are Tier 2. Swap them for:

- **Email triage** (T1 extreme) — replaces price watcher
- **Resume tailor** (T1 extreme) — replaces job tracker (same audience, sharper pain)

### 2. Is each description punchy enough?

Mostly yes. The current copy is already strong — short sentences, second-person, action-oriented. Two fixes needed:

- **Expense sorter**: "Snap a receipt" implies a camera feature we may not have. Use "Forward a receipt" (email-forward is more realistic and lower friction).
- **Social poster**: "formatted right" is vague. Specify the outcome more concretely.

### 3. Should we show more than 6? Fewer?

**Stay at 6.** Reasoning:
- 6 fills a clean 2x3 / 3x2 grid (current layout: 2 cols mobile, 3 cols desktop)
- More cards = more cognitive load. The section headline says "first week" — 6 feels achievable; 8 feels like work.
- Fewer than 6 doesn't showcase enough variety across life categories.

### 4. "Time saved" badges vs. "replaces X apps"?

**Neither.** Here's why:

- "Time saved" requires the reader to believe a number ("saves 2 hours/week") — skepticism is the default for a product they haven't tried.
- "Replaces 3 apps" is better but still abstract.

**What actually works for a scared non-technical person: outcome language.** The current descriptions already do this well ("Stop refreshing that portal", "Tax season handled"). These are mini-outcomes — the reader pictures the relief, not the mechanism.

If we want to add a visual cue, add a **single short tagline above the icon** that names the cross-cutting pattern from the research:

- "Stop checking" (polling → push)
- "Stop deciding" (decision fatigue)
- "Stop tracking" (manual tracking fatigue)

These are more emotionally resonant than numbers. They name the feeling the user already has.

### 5. Should we group by audience?

**No.** Grouping by audience (students, parents, freelancers) forces the reader to self-identify before they can engage. It splits attention and makes 2/3 of the cards feel irrelevant.

Instead, the current approach is correct: **mix audiences so every visitor sees at least 2-3 cards that resonate.** The variety itself communicates "this works for anyone."

---

## Proposed Final 6 Cards

### Section header (keep current — it's strong)

> **Things people build in their first week**
> Real problems. Personal apps. Each takes minutes to set up.

### Cards

| # | Icon | Name | Pattern tag | Description |
|---|------|------|-------------|-------------|
| 1 | `restaurant` | **Meal planner** | Stop deciding | Tell it what you like and what's in your fridge. Weekly meals and a grocery list, done. |
| 2 | `school` | **Grade watcher** | Stop checking | Get a text the second your professor posts a grade. Never refresh that portal again. |
| 3 | `mail` | **Email triage** | Stop sorting | Your inbox, prioritized. Important stuff surfaced, the rest handled. Every morning, before you open it. |
| 4 | `description` | **Resume tailor** | Stop rewriting | Paste a job listing. Get your resume rewritten for that specific role in seconds. |
| 5 | `receipt_long` | **Expense sorter** | Stop tracking | Forward a receipt. Everything categorized and totaled. Tax season handled. |
| 6 | `share` | **Social poster** | Stop copy-pasting | Write once. It posts to Instagram, LinkedIn, X, and TikTok — formatted for each. |

### Why these 6

- **4 of 6 are Tier 1 extreme pain** (meal planner, grade watcher, email triage, resume tailor, expense sorter)
- **Every card maps to a cross-cutting research pattern** (decision fatigue, polling→push, scattered data, manual tracking)
- **Audience spread:** students (grade watcher), job seekers (resume tailor), freelancers/solopreneurs (social poster, email triage), everyone (meal planner, expense sorter)
- **No card requires technical knowledge to understand** — all descriptions use plain verbs (tell, get, paste, forward, write)

### What we dropped and why

| Dropped | Why |
|---------|-----|
| Price watcher | Tier 2, low emotional stakes. "Price dropped on headphones" doesn't compare to "your grade is posted" or "your inbox is handled." |
| Job tracker | Replaced by resume tailor — same audience, sharper pain. Tracking apps already exist (Huntr, Teal). Resume tailoring per-application is the unsolved problem. |

### Runner-ups (if we ever go to 8)

| Card | Description | Why it's strong |
|------|-------------|-----------------|
| **Apartment hunter** | Pick your filters. Get a message the minute a new listing appears. Stop refreshing Zillow. | High emotional stakes, clean "polling→push" demo |
| **Invoice chaser** | Sent an invoice? It follows up at day 7, 14, 30. You never have to write "just following up" again. | Extreme freelancer pain, money on the line |

---

## Implementation Notes

### Pattern tags (optional)

The "Stop ___" tags above each card are optional but recommended. They:
- Create visual rhythm (every card starts the same way)
- Name the pain before the solution — the reader nods before reading the description
- Reinforce the "polling → push" and "decision fatigue" research themes

If implemented, render them as a small muted label above the icon, like:
```
Stop deciding
🍽️
Meal planner
Tell it what you like...
```

### Copy principles applied

1. **Second person throughout** — "your", "you", never "users" or "people"
2. **Verbs first** — "Tell it", "Get a text", "Paste a job", "Forward a receipt", "Write once"
3. **End on the outcome** — "done", "never refresh again", "before you open it", "in seconds", "handled", "formatted for each"
4. **No jargon** — no "automation", "workflow", "integration", "AI agent"
5. **Under 25 words per description** — skimmable in 3 seconds
