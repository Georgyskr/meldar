# Onboarding Funnel v3 — "Every door leads somewhere"

## Principle

Nobody should have to know what they want before they start. The funnel qualifies intent, then adapts. Every screen must either (a) collect useful data or (b) show the user something that makes them want to continue. Dead screens = drop-off.

## The 3 Doors

### Screen 1: "What brings you here?"

Not "What's your business?" — that assumes everyone IS a business. Instead, qualify intent.

```
┌─────────────────────────────────────────────┐
│                                             │
│              Welcome to Meldar              │
│                                             │
│    ┌─────────────────────────────────┐      │
│    │  🏪  I need something for       │      │
│    │      my business                │      │
│    │      Set up a booking page,     │      │
│    │      client portal, or landing  │      │
│    │      page in 30 seconds.        │      │
│    └─────────────────────────────────┘      │
│                                             │
│    ┌─────────────────────────────────┐      │
│    │  👀  Show me what this can do   │      │
│    │      See real examples. No      │      │
│    │      commitment. Pick one       │      │
│    │      if you like it.            │      │
│    └─────────────────────────────────┘      │
│                                             │
│    ┌─────────────────────────────────┐      │
│    │  💡  I have an idea but I'm     │      │
│    │      not sure where to start    │      │
│    │      Describe what you need     │      │
│    │      and we'll figure it out.   │      │
│    └─────────────────────────────────┘      │
│                                             │
│    847 pages created this week              │
│                                             │
└─────────────────────────────────────────────┘
```

**Continuation hook:** Three big tappable cards. No wrong answer. Social proof at bottom.

---

### Door A: "I need something for my business"
→ Owner, Employee, Skeptic with intent

**Screen A1: "What kind of business?"**
6 vertical cards (with emoji + label). "Consulting" selected state shown.
Business name input. Optional website URL ("Got a website? We'll read it for you").

**Continuation hook:** Verticals pre-fill everything downstream. Business name creates ownership. Website URL = "wow it knows me" moment.

**Screen A2: "Here's what we'd set up"**
NOT a services picker. A PREVIEW of the proposal.

```
┌─────────────────────────────────────────────┐
│                                             │
│  Based on consulting businesses, here's     │
│  what your booking page would include:      │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  My Consulting Business             │    │
│  │                                     │    │
│  │  Strategy call · 60 min · €120      │    │
│  │  Workshop · 180 min · €350          │    │
│  │  Quick check-in · 30 min · €50      │    │
│  │                                     │    │
│  │  Mon-Fri, 09:00-17:00              │    │
│  │                                     │    │
│  │  [ Book now ]                       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [ This looks right → ]  [ Change things ]  │
│                                             │
└─────────────────────────────────────────────┘
```

"This looks right" = instant build (zero more questions).
"Change things" = expand inline editors for services, hours.

**Continuation hook:** They SEE their page before it's built. Their name is in it. Services match their vertical. 90% tap "This looks right" and skip everything else.

---

### Door B: "Show me what this can do"
→ Explorer, Lost, Skeptic without intent

**Screen B1: "Pick one that catches your eye"**
3 real example pages — a salon, a PT studio, a consultant. Each is a mini-preview card showing the actual page design with real content.

```
┌─────────────────────────────────────────────┐
│                                             │
│  Real pages made by Meldar this week        │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Studio   │ │ FitLab   │ │ Anna     │    │
│  │ Mia      │ │ PT       │ │ Consult  │    │
│  │          │ │          │ │          │    │
│  │ Hair     │ │ Personal │ │ Business │    │
│  │ salon    │ │ training │ │ strategy │    │
│  │          │ │          │ │          │    │
│  │ [I want  │ │ [I want  │ │ [I want  │    │
│  │  this]   │ │  this]   │ │  this]   │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│                                             │
│  Or: "I want something different" →         │
│                                             │
└─────────────────────────────────────────────┘
```

**Continuation hook:** Visual, zero cognitive load. Tap "I want this" → pre-fills vertical, style, and services. Lands on Screen A2 (the proposal preview) with data already filled.

"I want something different" → lands on Screen A1 (vertical picker).

---

### Door C: "I have an idea but I'm not sure"
→ Lost, Forced Learner

**Screen C1: "Tell us in your own words"**
Single text input. Big, inviting, conversational.

```
┌─────────────────────────────────────────────┐
│                                             │
│  What's eating your time?                   │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ I run a yoga studio and clients     │    │
│  │ keep calling to book classes...     │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Examples people type:                      │
│  · "I'm a photographer and need a          │
│     portfolio with booking"                 │
│  · "My team wastes hours on scheduling"     │
│  · "I want clients to book without          │
│     calling me"                             │
│                                             │
│  [ See what Meldar suggests → ]             │
│                                             │
└─────────────────────────────────────────────┘
```

On submit → Haiku analyzes the text, infers vertical + services + page type. Shows Screen A2 (proposal preview) with AI-generated defaults.

**Continuation hook:** No wrong answer. Type anything. The AI figures it out. Examples show it's OK to be vague.

---

## Convergence: All doors lead to Screen A2

```
Door A (Business) → A1 (vertical) → A2 (proposal preview) → Build
Door B (Explorer) → B1 (examples)  → A2 (proposal preview) → Build
Door C (Idea)     → C1 (describe)  → A2 (proposal preview) → Build
```

Screen A2 is THE conversion point. It shows the user THEIR page before it exists. The "This looks right" button is the only CTA that matters.

## Build → Live (same for all paths)

**Screen: Building**
Progress with real service names. Optional questions during build (phone, about).

**Screen: Live**
Preview loads. Teaching moment: "Your page is live. Point at anything to change it."

## Continuation Hooks Summary

| Screen | Hook | Psychology |
|--------|------|-----------|
| 3 Doors | No wrong answer, low commitment | Reduces choice paralysis |
| A1 Vertical | Name + vertical pre-fill everything | Investment + personalization |
| A2 Proposal | They SEE their page before building | Endowment effect ("this is mine") |
| B1 Examples | Visual, zero reading required | Social proof + aspiration |
| C1 Describe | Free text, examples shown | No judgment, AI handles the hard part |
| Building | Real names in progress ("Adding Strategy call") | Investment payoff |
| Live | Their name in a real page header | Ownership. The aha moment. |

## Drop-off Prevention

| Risk | Prevention |
|------|------------|
| "I don't know what to pick" | Door B (examples) and Door C (describe) exist |
| "This is too much work" | Door A: 2 screens to build. Door B: 1 tap to build. |
| "I'll do this later" | "847 pages created this week" + "takes 30 seconds" |
| "I don't trust this" | Door B shows REAL pages. Proof before commitment. |
| "My boss sent me" | All doors produce a shareable result to demo |
| "I picked wrong" | "Change things" inline editor on A2. Never start over. |
