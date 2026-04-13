# 05 — Onboarding Data Strategy: Smart Collection for Personalized First Builds

How Meldar collects enough data during onboarding to make the first build feel personal — without making the user fill out a form.

Cross-references UX Architecture (02-ux-architecture.md) and UX Research (01-ux-research-findings.md) throughout. Problem IDs like P0-1 refer to the research document's prioritized problem list.

---

## 1. LinkedIn OAuth: What You Actually Get

### Sign In with LinkedIn using OpenID Connect (Self-Serve)

This is the only LinkedIn product available without a partner application. Any developer can register an app and use it immediately.

**Data returned:**
- `sub` (unique LinkedIn member ID)
- `name` / `given_name` / `family_name`
- `email` (requires `email` scope)
- `email_verified` (boolean)
- `picture` (profile photo URL)

**Data NOT returned:**
- Headline (e.g., "Founder at Studio Mia | Hair Stylist")
- Industry
- Current/past positions
- Company name
- Skills
- Location

**Verdict:** LinkedIn self-serve OAuth gives exactly what Google OAuth already gives — name, email, photo. No business signal whatsoever. Meldar already has Google OAuth at `/api/auth/google/` returning name + email + verified status. Adding LinkedIn OAuth would duplicate this without adding data value.

### Community Management API / Marketing API (Partner-Only)

These APIs expose headline, positions, industry, and company data. They require:
- LinkedIn Partner Program application
- Business justification review
- Weeks to months for approval
- Ongoing compliance requirements
- Rate limits and usage auditing

**Verdict:** Not viable for an MVP pre-launch product with zero users. The approval timeline alone (4-12 weeks) makes this a post-PMF consideration, not a launch feature.

### LinkedIn Profile URL Scraping

The user could paste their LinkedIn profile URL, and Meldar could attempt to parse the public profile page for headline/industry data.

**Problems:**
- LinkedIn aggressively blocks scraping (login walls, CAPTCHAs, rate limits)
- Public profile data varies — many users restrict visibility
- Legal gray area under LinkedIn's Terms of Service and GDPR (processing data from a third-party platform without explicit consent from that platform)
- Unreliable data extraction from HTML that changes frequently
- Engineering cost to build and maintain a scraper vs. just asking 3 questions

**Verdict:** High engineering cost, legal risk, and unreliable output — all to avoid asking the user 3 straightforward questions they can answer in 15 seconds.

### Recommendation: Skip LinkedIn Entirely

LinkedIn adds no data that Google OAuth does not already provide. The partner APIs are inaccessible at this stage. Scraping is fragile and legally risky. The engineering investment is better spent on a smart adaptive quiz that collects the same signals (business type, services, hours) in a fraction of the time with zero third-party dependency.

---

## 2. Other Smart Data Sources

### Viable Now

| Source | What You Get | Integration Effort | Signal Quality |
|---|---|---|---|
| **Google OAuth (already built)** | Name, email, verified status, profile photo | Done | Low — identity only, no business signal |
| **User-supplied website URL** | Scrape business name, services, hours, location, about text | Medium (server-side fetch + LLM extraction) | High — if the user has a website, it's the richest single source |
| **Instagram bio** | Business category, service keywords, location, link-in-bio URL | Medium (public API or profile scrape) | Medium — many small businesses list services in bio, but format varies wildly |
| **Google Business Profile** | Business name, category, hours, address, phone, reviews, photos | Medium (Places API, requires API key) | Very High — structured, verified data. But only ~30% of solo service providers have one |

### Viable Later (Post-MVP)

| Source | What You Get | Why Not Now |
|---|---|---|
| **Google Business Profile OAuth** | Full management access, booking integration | Requires Google verification process, complex OAuth scopes |
| **Square / Stripe account connection** | Services, pricing, transaction history | Requires partnership or OAuth integration per provider |
| **Phone contacts** | Client list for future import | Privacy-sensitive, requires deep trust (Phase 2+ feature) |
| **Calendar integration** | Availability patterns, existing booking cadence | Requires OAuth per provider (Google, Apple, Outlook) |

### What Competitors Do

| Product | Questions Asked | Data Sources | Time to First Value |
|---|---|---|---|
| **Calendly** | 3 questions: name, what you do, meeting types | None — manual entry only | ~90 seconds |
| **Square Appointments** | 2 questions: business name, business type (dropdown) | Square account if exists | ~60 seconds |
| **Acuity Scheduling** | 4 questions: name, business name, timezone, services | None — manual entry only | ~2 minutes |
| **Wix Bookings** | 5+ questions: business type, name, services, hours, location | Wix AI generates site from answers | ~3 minutes |
| **GoDaddy Airo** | 3 questions: business name, type, location. Then AI generates everything. | Domain search, AI content generation | ~2 minutes |

**Key insight from competitors:** Nobody uses LinkedIn or social OAuth for data enrichment. The fastest products (Calendly, Square) ask 2-3 direct questions. The ones that try to be smarter (Wix, GoDaddy) use AI generation from the answers, not external data fetching. The pattern that works is: **ask few, infer many**.

### Website URL: The Best Non-Quiz Data Source

If the user has an existing website (even a simple one), parsing it with an LLM provides the highest-value enrichment available:

- Business name (from title tag, header, or OG metadata)
- Services offered (from service pages, pricing tables, or body text)
- Operating hours (from contact/hours pages)
- Location (from contact page or footer)
- About text (from about page)
- Brand tone (inferred from copy style)
- Color scheme (from CSS or dominant colors)

**Implementation:** Server-side fetch of the URL, extract readable text, pass to Claude with a structured extraction prompt. Cost: ~$0.01 per extraction. Latency: 2-5 seconds.

**When to ask:** After vertical selection, as an optional accelerator: "Have a website? Paste the URL and we'll grab your details." If they do, skip the manual service/hours entry. If they don't (most solo service providers on phones), fall through to the quiz.

---

## 3. Adaptive Quiz Design

### Design Principles

The quiz must feel like a conversation, not a form. Three principles:

1. **Every question visibly changes the output.** The user should see their answer immediately reflected in a preview, a summary card, or a progress indicator. "I answered X, and now I see X on my page" — this builds trust and motivation to continue.

2. **Smart defaults reduce typing to tapping.** Pre-fill answers from the vertical selection. The user's job is to confirm or override, not to compose from scratch. A hair salon user should see "Haircut, Color, Blowout" already listed and tap to remove/edit, not type service names from a blank input.

3. **Progressive profiling over front-loading.** Collect the minimum to start the first build, then ask follow-up questions during the build loading time or on return visits. Don't gate the "Build my page" button behind a 6-field form.

### Recommended Quiz Flow: 3 Steps + 1 Optional

**Step 1: Vertical Selection (existing, enhanced)**
- Current: 5 cards (Hair/Beauty, PT/Wellness, Tattoo/Piercing, Consulting, Other)
- Enhanced: Expand to 8-10 verticals covering more service businesses (add Photography, Pet services, Tutoring/Coaching, Cleaning/Home services, Dance/Music lessons)
- "Other" becomes a free-text input: "Describe your business in a few words" — processed by Claude to infer the closest vertical and generate appropriate defaults
- Signal value: HIGH. Determines all subsequent defaults.

**Step 2: Your Services (new — solves P0-1)**
- Pre-filled from vertical defaults (e.g., for "Hair/Beauty": Haircut 45min EUR 45, Color 90min EUR 85, Blowout 30min EUR 35)
- Each service is an inline-editable row: [name] [duration] [price]
- "Remove" button on each row, "+ Add another" at the bottom
- Copy: "We guessed these from 'Hair / Beauty' — change anything that's wrong."
- Skip behavior: Users CAN skip without editing. The defaults are good enough to produce a credible first build. The skip is implicit — they just tap "Next" without editing.
- Signal value: VERY HIGH. Services are the primary content on a booking page.

**Step 3: Your Hours (new — solves P0-1)**
- Pre-filled from vertical defaults (e.g., Tue-Sat 10:00-18:00)
- Day picker (tap to toggle days) + start/end time dropdowns
- Copy: "When are you available?"
- Skip behavior: Same as services — defaults are pre-filled, user confirms or edits.
- Signal value: HIGH. Hours determine calendar availability.

**Optional: Website URL (new)**
- Shown between Step 1 and Step 2: "Have a website? Paste the URL and we'll grab your details."
- If provided: auto-fill Steps 2 and 3 from extracted data, show "We found these on your site — look right?" instead of generic defaults
- If skipped: proceed with vertical-based defaults
- Signal value: VERY HIGH when available, but optional because many target users (phone-first, solo operators) don't have websites.

### Which Questions Give Highest Signal-to-Noise Ratio

Ranked by impact on first-build quality:

| Rank | Data Point | Why It Matters | Collection Method |
|---|---|---|---|
| 1 | **Business vertical** | Determines ALL defaults: services, hours, style, copy, layout | Card selection (existing) |
| 2 | **Services offered** | Primary content of the booking page | Pre-filled editable list |
| 3 | **Business name** | Appears in header, title, URL, metadata — the biggest ownership signal | Text input (existing) |
| 4 | **Operating hours** | Determines calendar availability | Pre-filled day/time picker |
| 5 | **Location / timezone** | Affects time display, local SEO, currency | Browser geolocation API (auto-detect, no question needed) |
| 6 | **Style preference** | Color scheme, font weight, overall vibe | NOT asked — vertical defaults are sufficient for first build |
| 7 | **About text** | About section on booking page | NOT asked — generated from vertical + business name for first build |
| 8 | **Contact info** | Phone, email on booking page | NOT asked — email from auth, phone collected post-build |

**Key decisions:**
- Style preference is NOT asked during onboarding. Research shows users can't articulate style preferences in abstract ("warm? modern? minimal?"). They can only react to a concrete output. Show them a default, let them say "make it darker" via feedback. This is the propose-and-go philosophy applied to aesthetics.
- About text is NOT asked. It's generated from the vertical + business name. "Studio Mia is a hair salon offering haircuts, color treatments, and blowouts." Good enough for a first build. The user iterates via feedback.
- Location is auto-detected from the browser's geolocation API or timezone. No question needed. If we can't detect it, Helsinki (company HQ) is the fallback for timezone, and location is simply omitted from the first build.

### How Vertical Selection Pre-fills Subsequent Steps

The vertical drives a complete set of defaults. When the user picks a vertical, Steps 2 and 3 are pre-filled immediately:

```
User picks "Hair / Beauty"
  → Step 2 shows: Haircut (45min, EUR 45), Color (90min, EUR 85), Blowout (30min, EUR 35)
  → Step 3 shows: Tue-Sat, 10:00-18:00

User picks "PT / Wellness"
  → Step 2 shows: Personal training (60min, EUR 65), Massage therapy (60min, EUR 70), Assessment (45min, EUR 50)
  → Step 3 shows: Mon-Fri, 08:00-20:00

User picks "Other" and types "Dog grooming"
  → Claude infers closest vertical: pet-services
  → Step 2 shows: Bath & brush (60min, EUR 40), Full groom (90min, EUR 65), Nail trim (15min, EUR 15)
  → Step 3 shows: Mon-Sat, 09:00-17:00
```

The "Other" free-text path requires a server call to Claude to generate appropriate defaults. This adds 1-2 seconds of latency, which can be masked with a "Setting up your options..." transition.

### When to Show "Skip" vs. Force an Answer

| Step | Skip Allowed? | Why |
|---|---|---|
| Vertical selection | No | Required. Without it, there are no defaults and no template direction. |
| Business name | Yes (already optional) | System generates a name from vertical if omitted: "My Hair Salon" |
| Services | Yes (implicit — defaults are pre-filled) | Pre-filled defaults produce a credible first build even without editing |
| Hours | Yes (implicit — defaults are pre-filled) | Same rationale. Vertical defaults are realistic. |
| Website URL | Yes (explicit skip link) | Most phone-first users won't have a URL ready |

**Rule:** Never block the "Build my page" button. The vertical selection alone is enough data to produce a usable first build. Everything else improves quality but is not required.

### Progressive Profiling: Using Build Loading Time

The auto-build pipeline takes 15-45 seconds (from the architecture doc, 5 cards built sequentially). This loading time is an opportunity for low-friction data collection:

**During the build, show one follow-up question at a time:**

1. "While we set up your page — what's the best way for clients to reach you?" → Phone number (optional, skippable)
2. "Want to add a short intro about yourself?" → 1-2 sentence about text (optional, skippable, with a pre-generated suggestion they can edit)
3. "Where are you located?" → Address or area (optional, skippable, with auto-detected city pre-filled)

**Rules for loading-time questions:**
- Maximum 3 questions during a single build wait
- Each question is independently skippable
- Answers are stored as wishes and applied in a follow-up build iteration (not blocking the current build)
- Questions disappear when the build completes — the preview is always more important than the question
- If the user ignores them, no problem. The first build works without these answers.

---

## 4. Minimum Viable Data for a Good First Build

### What Feeds Into the Claude Build Prompt

The onboarding API (`/api/onboarding/route.ts`) currently sends `verticalId` and optional `businessName` to create a project. The auto-build pipeline then uses template plans and starter files. The build prompt for each card receives project context.

For the first build to feel personalized, the prompt needs:

| Data Point | Where It Goes in the Prompt | Effect on Output |
|---|---|---|
| Business name | Page header, title tag, meta description, about section | "Studio Mia" instead of "My Hair Salon" |
| Vertical | Template selection, layout structure, section ordering | Hair salon layout vs. consulting layout |
| Services (name, duration, price) | Service cards, booking form options, price list | Real services instead of generic defaults |
| Hours (days, start, end) | Calendar availability, hours display section | Real hours instead of "Contact for availability" |

### Minimum Set (Must Have for Credible First Build)

**Business name + vertical + services (name, duration, price for 1-3 services)**

This produces a booking page where:
- The header says the user's business name
- The services listed are ones the user recognizes as their own
- The booking form offers real service options with real durations
- The price list is approximately correct

This is the "aha moment" threshold from the visual narrative doc (03-visual-narrative.md, Section 6): name recognition + context recognition. Two of the three ownership signals are present.

### Good Set (Target for Variant B Onboarding)

**Business name + vertical + services + hours**

Adds:
- The calendar shows actual availability (Tue-Sat, not Mon-Sun)
- The hours section displays real operating times
- The booking form only offers slots during business hours

This is the minimum personalization proposed in the UX Architecture (02-ux-architecture.md, Section 2): "Minimum viable personalization: Business name + services (name, duration, price) + hours."

### Platinum Set (With Website URL or Return-Visit Data)

**Business name + vertical + services + hours + location + about text + phone + style preference**

Adds:
- Location in the footer/contact section
- A personalized about paragraph (not AI-generic)
- Phone number for direct contact
- Color/style choices that match the user's taste

This produces a booking page that could pass as a professionally designed site. But collecting all this during onboarding would take 3-5 minutes and cause drop-off. The strategy: collect the Good Set during onboarding, then upgrade to Platinum through progressive profiling (loading-time questions, feedback iterations, return-visit prompts).

### Data Flow: Onboarding to Build Prompt

```
Onboarding Step 1: vertical → determines template + defaults
Onboarding Step 2: services (confirmed/edited) → overrides default services
Onboarding Step 3: hours (confirmed/edited) → overrides default hours
Business name (from Step 1 or sign-up) → injected into all build prompts

                    ↓

/api/onboarding POST body:
{
  verticalId: "hair-beauty",
  businessName: "Studio Mia",
  services: [
    { name: "Haircut", durationMinutes: 45, priceEur: 40 },
    { name: "Highlights", durationMinutes: 90, priceEur: 95 },
    { name: "Extensions", durationMinutes: 120, priceEur: 150 }
  ],
  hours: { days: ["tue","wed","thu","fri","sat"], start: "10:00", end: "18:00" }
}

                    ↓

Project created with personalized wishes → auto-build pipeline uses these
in every card's build prompt instead of generic vertical defaults
```

---

## 5. Data Strategy Matrix

| Data Point | Source Options | Signal Value (1-5) | Collection Friction (1-5, 5=hardest) | When to Collect | Required? |
|---|---|---|---|---|---|
| **Business vertical** | Card selection (existing) | 5 | 1 | Onboarding Step 1 | Yes |
| **Business name** | Text input (existing) | 4 | 1 | Onboarding Step 1 | No (generated from vertical if skipped) |
| **Services (name, duration, price)** | Pre-filled editable list from vertical defaults; OR website URL extraction | 5 | 2 (edit defaults) / 1 (accept defaults) | Onboarding Step 2 | No (defaults used if not edited) |
| **Operating hours** | Pre-filled day/time picker from vertical defaults; OR website URL extraction | 4 | 2 (edit) / 1 (accept) | Onboarding Step 3 | No (defaults used if not edited) |
| **Website URL** | User pastes URL → LLM extraction | 5 (when available) | 2 | Onboarding (optional, between Step 1 and 2) | No |
| **Location / city** | Browser geolocation API (auto-detect) | 3 | 0 (automatic) | Background, during onboarding | No |
| **Timezone** | Browser `Intl.DateTimeFormat().resolvedOptions().timeZone` | 3 | 0 (automatic) | Background, automatic | No |
| **Phone number** | Text input during build loading time | 2 | 3 | Progressive profiling (during build) | No |
| **About text** | Generated by Claude from vertical + name + services; user edits via feedback | 2 | 4 (if manual) / 0 (if generated) | Generated at build time | No |
| **Style / colors** | NOT collected — vertical defaults applied, user iterates via feedback | 2 | 4 (abstract question) / 1 (react to output) | Post-first-build feedback | No |
| **Profile photo** | Google OAuth (already available) | 1 | 0 (automatic) | Auth flow | No |
| **Email** | Auth flow (already available) | 1 | 0 (automatic) | Auth flow | Yes (for account) |
| **Instagram bio** | User pastes handle → public API or scrape | 3 | 2 | Post-MVP | No |
| **Google Business Profile** | OAuth integration | 5 | 4 (requires GBP account + OAuth) | Post-MVP | No |

### Reading the Matrix

**High signal, low friction (do first):**
- Vertical selection (5/1) — already exists
- Services with pre-filled defaults (5/2) — new, highest-impact addition
- Business name (4/1) — already exists
- Hours with pre-filled defaults (4/2) — new
- Website URL extraction (5/2) — new, optional fast-track
- Auto-detected location (3/0) — free data, no user effort
- Auto-detected timezone (3/0) — free data, no user effort

**High signal, high friction (defer or automate):**
- Google Business Profile (5/4) — post-MVP
- About text if manual (2/4) — generate it instead
- Style preference if asked directly (2/4) — let users react to output instead

**Low signal (skip entirely):**
- LinkedIn OAuth (1/3) — provides nothing Google doesn't already provide
- Profile photo (1/0) — available from Google OAuth but not useful for booking page personalization

---

## 6. Implementation Recommendations

### Priority 1: Enhance Onboarding with Services + Hours (Variant B)

Extend the existing `OnboardingFlow` to add Steps 2 and 3 as described in the UX Architecture doc (02-ux-architecture.md, Section 2). The data model already supports this — `BookingVertical` in `src/entities/booking-verticals/model/data.ts` already has `defaultServices` and `defaultHours` fields with realistic data per vertical.

The `/api/onboarding` route body schema needs to expand from `{ verticalId, businessName? }` to include `services` and `hours` arrays.

### Priority 2: Expand Vertical Options

Add 3-5 more verticals to `BOOKING_VERTICALS` to cover common service businesses not currently represented:
- Photography (sessions: portrait/event/headshot)
- Pet services (grooming, walking, sitting)
- Tutoring / coaching (lessons by subject)
- Cleaning / home services (deep clean, regular, move-in/out)
- Dance / music lessons (private lesson, group class, recital prep)

Enhance the "Other" option with a free-text input that maps to generated defaults via Claude.

### Priority 3: Website URL Extraction (Optional Fast-Track)

Add an optional "Got a website?" input between Step 1 and Step 2. On submission, the server extracts business data and pre-fills Steps 2 and 3 with real data instead of vertical defaults. This replaces the entire LinkedIn enrichment concept with something that actually works and provides genuine business signal.

### Priority 4: Progressive Profiling During Build

Add loading-time questions (phone, about text, location) that appear during the build wait. Answers stored as wishes for a follow-up micro-build.

### What NOT to Build

- **LinkedIn OAuth**: No additional data over Google OAuth. Engineering cost with zero data return.
- **Instagram integration**: Unreliable data extraction, scraping legal risk. Post-MVP if ever.
- **Style/preference quizzes**: Users cannot articulate aesthetic preferences abstractly. Let them react to the output instead.
- **Multi-step onboarding wizards with 5+ screens**: Each additional screen costs ~15-20% completion rate. Three steps is the ceiling.
