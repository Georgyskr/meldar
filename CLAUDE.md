# Meldar

Your AI. Your app. Nobody else's. Meldar helps non-technical people discover what wastes their time, then builds personal apps to fix it.

**Name:** Meldar
**Domain:** meldar.ai
**Company:** ClickTheRoadFi Oy (Y-tunnus: 3362511-1), Helsinki, Finland
**Stage:** Launched, collecting signups

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **Styling**: Panda CSS + Park UI (Panda preset)
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm
- **Linter/Formatter**: Biome (not ESLint, not Prettier)
- **Fonts**: Bricolage Grotesque (headlines, via next/font), Inter (body, via next/font)
- **Icons**: lucide-react (tree-shaken)
- **Email**: Resend (transactional + founder notifications)
- **Validation**: Zod
- **Deployment**: Vercel
- **Analytics**: Google Analytics 4 (`G-5HB6Q8ZVB8`, consent-gated)
- **Domain**: meldar.ai

## Environment Variables

```
NEXT_PUBLIC_GA_ID=G-5HB6Q8ZVB8    # Client-side, GA measurement ID
RESEND_API_KEY=re_xxx...           # Server-side only, Resend API key
```

## Required Skills

Always apply these skills when working on this project:

1. **react-best-practices** — RSC patterns, async waterfall elimination, bundle optimization
2. **web-design-guidelines** — Accessibility, UX, web interface standards
3. **composition-patterns** — Component API design, compound components, React 19 patterns

## Commands

```bash
pnpm dev          # Start dev server (turbopack)
pnpm build        # Production build
pnpm start        # Start production server
pnpm biome check . # Lint + format check
pnpm biome check --fix . # Auto-fix
pnpm panda codegen # Regenerate Panda CSS styled-system
```

## Project Structure (Feature-Sliced Design)

Architecture follows FSD: `app → widgets → features → entities → shared`. Each layer only imports from layers below it. Barrels (`index.ts`) are the public API.

```
src/
  app/                              # Next.js routing
    layout.tsx                      # Root layout (fonts, metadata, header/footer/consent/GA)
    page.tsx                        # Landing page (10 sections)
    quiz/page.tsx                   # Pick Your Pain interactive quiz
    privacy-policy/page.tsx         # Privacy policy (GDPR-compliant)
    terms/page.tsx                  # Terms of service
    api/subscribe/route.ts          # Email capture (Resend)
    api/analyze-screenshot/route.ts # Screen Time screenshot analysis (mock, needs Claude Vision)
    robots.ts                       # Allows all crawlers including AI bots
    sitemap.ts                      # All pages
  shared/                           # Layer 1: Reusable across app
    config/                         #   seo.ts (SITE_CONFIG, BUSINESS_INFO)
    ui/                             #   EmailCapture, JsonLd, Button
    styles/                         #   globals.css
  entities/                         # Layer 2: Domain objects
    pain-points/                    #   Pain library (12 researched use cases)
  features/                         # Layer 3: User capabilities
    cookie-consent/                 #   CookieConsent banner + useConsentState hook
    analytics/                      #   GoogleAnalytics (consent-gated, GA4)
    quiz/                           #   PainQuiz, ScreenTimeUpload
  widgets/                          # Layer 4: Composite UI blocks
    header/                         #   Header (frosted glass nav, gradient CTA)
    footer/                         #   Footer (company info, legal links, cookie settings)
    landing/                        #   All 10 landing page sections
```

## Architecture Rules

### Feature-Sliced Design
- Import direction: `app → widgets → features → entities → shared`. Never import upward.
- Each FSD slice has a barrel `index.ts` as its public API. Import from barrels, not internal files.
- `styled-system` imports use `@styled-system/*` path alias.

### Engineering Standards
See `AGENTS.md` for coding rules, testing standards, and review process requirements.

### Code Comments (strict)

**Default to zero comments.** Code, types, and tests should carry the intent. A new file or function does not need a doc block.

Write a comment ONLY when:
- The logic is genuinely non-obvious AND the tests can't express the reason — e.g., a workaround for a library quirk ("JSZip exposes uncompressed size only via internal `_data`"), a non-obvious invariant, or a deliberate divergence from an ambient convention.
- The surrounding code cannot be rewritten to make the comment unnecessary. Try that first.

**Never write:**
- Historical comments: "Earlier this used X casts that crashed…", "Previously this was inline…", "Before the Zod boundary…". That's commit-message content. Git has the history; the file is present-tense.
- Defensive "here's why I made this decision" doc blocks on helpers. The name, type signature, and a single test should tell the reader what the helper does and why it exists. If they don't, fix the name or the test, not the comment.
- Paragraph-long module headers that restate what the exports already say.
- `// Note:` preambles stranded at the top of a file that only apply to one test way down inside it. Move the comment next to the code it applies to.

**During `/clean-code` iterations: TRIM comments, don't add new ones to justify the cleanup.** If a change needs justification, that belongs in the commit message or PR description.

### App Builder Prompt Guidelines

When Meldar builds apps for users (via the orchestrator in `src/server/orchestrator/prompts.ts`), the system prompt enforces the same quality bar we hold ourselves to in this repo:

- **Minimum viable change.** Do the thing that was asked, not the thing around it.
- **No comments unless the logic is non-obvious.** Same rule as above.
- **Match the existing code style.** If the project uses `VStack`, use `VStack`. Don't introduce a new pattern for one file.
- **No `console.log`, no debug code, no `TODO`.** Finish the work or don't take the build.
- **Self-contained code only.** No external HTTP fetches to user-controlled URLs. No remote installs.
- **Smallest defensible interpretation when the request is unclear.** Ship it and let the user iterate; do not ask clarifying questions you can't hear the answer to.

These rules are source of truth in `BUILD_SYSTEM_PROMPT`. When editing that prompt, keep it tight — every additional line costs tokens on every build.

### Components
- Default to React Server Components. Only `"use client"` when interactive behavior requires it.
- Park UI components added via CLI: `npx @park-ui/cli add <component>`

### Styling Preferences
- **Prefer JSX primitives** — `Box`, `Flex`, `VStack`, `HStack`, `Grid`, `Stack` from `@styled-system/jsx`
- **Use `styled.*` for semantic HTML** — `styled.header`, `styled.main`, `styled.section`, `styled.h1`, etc.
- **No inline styles.** Always use Panda CSS utilities.
- **Logical properties over shorthands** — `marginBlockEnd` not `mb`, `paddingInline` not `px`

### Brand / Design System (Stitch AI)
- **Primary color**: #623153 (deep mauve)
- **Gradient accent**: linear-gradient(135deg, #623153 → #FFB876)
- **Surface**: #faf9f6 (warm cream)
- **Headlines**: Bricolage Grotesque, bold, tight tracking
- **Body**: Inter, light weight (300), clean
- **Vibe**: Editorial, warm, architectural. Like Lightspark meets spark.fi.

### SEO
- Every page: metadata with title, description, canonical pointing to meldar.ai
- JSON-LD: SoftwareApplication + FAQPage schemas on landing page
- robots.ts allows all crawlers including GPTBot, ClaudeBot, PerplexityBot
- sitemap.ts lists all public pages

### GDPR / Privacy
- GA loads ONLY after cookie consent acceptance
- Cookie consent: undecided → accepted/rejected, stored in localStorage
- Cookie banner links to /privacy-policy
- Cookie settings re-accessible via footer link
- Rejecting clears all _ga* cookies and updates gtag consent
- Company: ClickTheRoadFi Oy, Finnish DPA jurisdiction

## Landing Page Sections (scroll order)

1. **Hero** — "You don't need to become technical. You need Meldar." + 3 stage cards (Invitation, Discovery, Foundation) + email capture
2. **Problem** — 3 pain points + Research Card (2,847 people surveyed)
3. **How It Works** — Take back your data → See your Time X-Ray → Pick a fix
4. **Data Receipt** — Spotify Wrapped-style shareable card preview
5. **Trust** — What we see / What we never see + leave anytime + delete everything
6. **Skills** — 6 real-life automations (meal planner, grade watcher, price watcher, email triage, expense sorter, social poster)
7. **Early Adopter** — Founding members: hand-by-hand guidance, personal time audit, weekly tip, shape the product
8. **Tiers** — Time X-Ray (free) / Starter (pay as you go) / Concierge (we handle it)
9. **FAQ** — 6 questions, "Fair questions" title
10. **Final CTA** — "Google made ~$238 from your data last year. What did you get?"

## Product: Discovery Engine

The core differentiator. How Meldar finds what wastes your time:

### Effort Escalation Funnel
1. **Pick Your Pain quiz** (15 sec, zero data) → instant suggestions
2. **Screen Time screenshot** (30 sec) → Vision AI extracts real app usage
3. **Google Takeout upload** (3 min + wait) → parsed client-side, data never leaves device
4. **Chrome extension** (ongoing, trust earned) → 90-day backfill + live tracking

### Viral Hook
"Big Tech profited from your data for a decade. Take it back. See your Time X-Ray. Use it for yourself."

### Key Positioning
- User-facing name for discovery: **Time X-Ray**
- Analogy: "Shazam for wasted time" / "Spotify Wrapped for productivity"
- Anchor line: "Meldar doesn't watch you. You show Meldar."
- Competitive: Lovable = "tell us what to build." Zapier = "connect apps." Meldar = "we show you what's eating your week, then fix it."

## Target Audience

**Primary:** Gen Z / Gen Alpha (18-28). Use ChatGPT daily. Scared of AI complexity. Failed at AI tools before. Want AI for THEIR specific life, not a chatbot.

**Secondary:** Corporate professionals. Slow decision-makers. Reached through direct sales.

**Voice:** Confident but warm. Like a friend who's brilliant at this. Direct. Zero jargon. Young energy.

## Research & Documentation

- `docs/research/` — 15 use-case reports + 5 market research reports + SYNTHESIS.md
- `docs/discovery/` — 13 discovery engine reports + SYNTHESIS.md
- `docs/funnel/` — 20 funnel audit reports (4 iterations)
- `docs/landing-page-ux.md` — Original 720-line UX spec
- `docs/stitch-prompt.md` — Brand design brief for Stitch AI
- `docs/stitch-hero-prompt.md` — Hero section design brief
