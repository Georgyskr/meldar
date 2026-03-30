# Rapid Discovery Prototypes

**10 features we can build in under 4 hours each.** Every one makes the user say "holy shit, I didn't realize that" within 30 seconds.

All features follow the same pattern: minimal input, instant insight, shareable result, clear path to paid fix.

---

## 1. Subscription Autopsy

**One-liner:** Screenshot your App Store/Google Play subscriptions — see how much you're burning on apps you barely touch.

**Input:** Screenshot of Settings > Subscriptions (iOS) or Google Play > Payments & subscriptions (Android).

**Output:** A breakdown card showing:
- Total monthly/yearly spend
- Estimated "waste" (subscriptions for apps not in their Screen Time top 20)
- "You're paying $14.99/mo for Headspace but used it 12 minutes last month"
- Shareable "Subscription Receipt" card: "I'm leaking $47/month on apps I forgot I had"

**Implementation:** Claude Vision API (Haiku). Send the screenshot, prompt extracts app names + prices + billing cycles. Cross-reference against Screen Time data if available, otherwise flag any subscription over $5/mo as "worth checking." Rule-based waste scoring.

**Build time:** 3 hours. One API route, one upload component (reuse ScreenTimeUpload pattern), one result card.

**Revenue connection:** "Want Meldar to auto-track your subscriptions and alert you before renewal? That's Starter." Also: the total waste number is the price anchor — "$47/month wasted vs $9/month for Meldar."

---

## 2. Notification Flood Score

**One-liner:** Screenshot your notification summary — see how many interruptions are hijacking your focus every day.

**Input:** Screenshot of iOS notification summary (Settings > Notifications > Scheduled Summary) or just the notification center itself (scroll of stacked notifications).

**Output:**
- Total notification count per day (estimated from visible data)
- Top 3 noisiest apps
- "Apps you never actually open after getting notified" (if Screen Time data available)
- Focus score: "You're interrupted every 3.7 minutes during work hours"
- Shareable card: "I get 232 notifications a day. 89% I never act on."

**Implementation:** Claude Vision API. Extract app icons/names and notification counts from the screenshot. Simple math for frequency calculations. Compare against research benchmarks (average person: 80-120/day; Gen Z: 200+).

**Build time:** 2.5 hours. Same upload pattern as Screen Time. New result card template.

**Revenue connection:** "Meldar can build you a smart notification filter that only lets through the ones that matter. That's what Starter does."

---

## 3. Decision Fatigue Calculator

**One-liner:** Answer 8 quick questions about your daily choices — see how many hours per week you lose to "what should I..." decisions.

**Input:** Quick questionnaire (no data upload needed):
- How long choosing what to eat? (slider: 0-30 min, 3x daily)
- How long choosing what to watch? (slider: 0-45 min)
- How long choosing what to wear? (slider: 0-20 min)
- How long browsing before buying something? (slider: 0-2 hours)
- How many tabs open right now? (number)
- How often do you re-check the same app within 10 min? (never / sometimes / constantly)
- How long planning weekend activities? (slider)
- How many group chats deciding plans? (number)

**Output:**
- Weekly decision hours lost (typically 4-9 hours, which shocks people)
- Biggest single drain (usually food or entertainment choices)
- "You spend 3.5 hours/week deciding what to eat. That's 7.6 full days per year."
- Comparison: "That's more time than you'd spend watching all of Breaking Bad. Twice."
- Shareable card: "I lose 6.2 hours/week to decisions that don't matter"

**Implementation:** Pure client-side. No AI needed. Slider inputs, simple multiplication, comparison database (pop culture time references). React component with animated result reveal.

**Build time:** 3 hours. Client-only feature, no API route needed. Quiz component + result card.

**Revenue connection:** "Meldar builds you a personal decision engine — meal plans that learn your taste, a 'what to watch' picker that actually works, outfit rotation. Stop deciding. Start doing."

---

## 4. Email Avalanche Audit

**One-liner:** Paste your inbox count and answer 5 questions — see how much of your life email is stealing.

**Input:** Questionnaire + one optional screenshot:
- Current unread count (number input, or screenshot of inbox)
- How many times per day do you check email? (slider: 1-50)
- Average time per email session? (1 min / 5 min / 15 min / "I lose track")
- What % of emails actually need a response? (slider: 0-100%)
- Do you use email as a to-do list? (yes/no/what do you mean)

**Output:**
- Weekly hours in email (usually 5-12 hours, people underestimate by 3x)
- "Email debt" score based on unread count vs checking frequency
- "You check email 34 times a day but only 11% need a reply. The other 89% are stealing 6 minutes each time."
- The killer stat: "Context switching back from email costs 23 minutes each time (UC Irvine research). Your 34 checks = 13 hours of lost deep work per week."
- Shareable: "Email is costing me 11 hours/week. I only need 1.2 of those."

**Implementation:** Questionnaire is rule-based math. Optional inbox screenshot uses Claude Vision to extract unread count and top senders. Research-backed multipliers for context-switching cost.

**Build time:** 3 hours. Mostly frontend. Optional Vision API call for screenshot.

**Revenue connection:** "Meldar's email triage skill reads your inbox and surfaces only what matters. The rest gets sorted, snoozed, or killed. That's Starter."

---

## 5. Doomscroll Meter

**One-liner:** Screenshot your Screen Time's "pickups" screen — see how many hours you lose to "just checking" your phone.

**Input:** Screenshot of Screen Time > Pickups (iOS shows pickups per hour of day + first app opened).

**Output:**
- Total daily pickups (average Gen Z: 96/day)
- "Phantom check" rate — pickups that lead to <1 min of use (the "check and put down" loop)
- Peak doomscroll windows (usually 10-11pm, 7-8am)
- Most-opened-first app (the "gravity app" — usually Instagram, TikTok, or Twitter)
- Time math: "96 pickups x 30 sec average = 48 min/day just UNLOCKING your phone. That's 292 hours/year."
- Shareable card: "My gravity app is Instagram. I open it 23 times a day before I open anything else."

**Implementation:** Claude Vision extracts pickup counts by hour and first-app-opened data from the Screen Time screenshot. Rule-based scoring against research benchmarks. Different prompt than the main Screen Time analyzer — focused specifically on the pickups view.

**Build time:** 2 hours. Reuses existing upload infrastructure. New prompt + result template.

**Revenue connection:** "Meldar can build you a phone unlock journal — see your pickups in real time and set boundaries. Or we automate the thing you're actually trying to do when you pick up your phone."

---

## 6. Meeting Tax Calculator

**One-liner:** Paste your calendar URL or answer 5 questions — see how much of your week meetings are actually costing.

**Input:** Quick questionnaire (targeting workers/students):
- How many meetings/classes per week? (slider: 0-30)
- Average meeting length? (15 min / 30 min / 1 hour / 1+ hours)
- How many could've been an email? (slider: 0-100%)
- How much prep time per meeting? (0 / 5 min / 15 min / 30 min+)
- How long to get back into deep work after a meeting? (slider: 0-60 min)

**Output:**
- Raw meeting hours vs "true cost" hours (including prep + recovery)
- "You have 12 hours of meetings, but they actually cost you 23 hours when you include prep and recovery time"
- Meeting-free blocks analysis: "Your longest uninterrupted window is 47 minutes. Deep work needs 2+ hours."
- Money translation: "At your approximate hourly rate, unnecessary meetings cost you $X/week"
- Shareable: "Meetings cost me 23 hours/week. Only 8 of those hours are useful."

**Implementation:** Pure rule-based math. No AI needed. Slider questionnaire + calculation engine. Research-backed context-switching multipliers (Maker's Schedule research by Paul Graham, Microsoft Research on recovery time).

**Build time:** 2.5 hours. Client-side only. Questionnaire component + animated result reveal.

**Revenue connection:** "For workers: Meldar can auto-audit your calendar weekly and suggest which meetings to decline, batch, or shorten. For students: auto-organize your study blocks around your class schedule. That's Starter."

---

## 7. Shopping Spiral Tracker

**One-liner:** Screenshot your browser tabs or Amazon order history — see how much time you spend "researching" purchases you never make.

**Input:** One of:
- Screenshot of open browser tabs (shows the "47 tabs open" problem)
- Screenshot of Amazon/shopping app order history
- Quick questionnaire: How many times per week do you browse without buying? How long per session?

**Output:**
- "Tab hoarding" score based on open tab count
- Estimated weekly browsing-without-buying hours
- "You have 34 open tabs. 19 of them are shopping. The average sits open for 6 days before you close it without buying."
- Cart abandonment personality: "Browser" / "Comparer" / "Wishlist Dreamer" / "Coupon Hunter"
- Shareable: "I spend 4.7 hours/week shopping for things I never buy"

**Implementation:** Claude Vision for tab screenshots (extract tab titles, identify shopping sites). Questionnaire path is pure rule-based. Fun personality categorization based on answers.

**Build time:** 3 hours. Vision API for screenshot path, rule-based for questionnaire path. Result card with personality badge.

**Revenue connection:** "Meldar's price watcher skill monitors the stuff you actually want and alerts you when it drops. Stop browsing. Start saving. That's Starter."

---

## 8. Content Creation vs Consumption Ratio

**One-liner:** Answer 6 questions about your social media habits — see the brutal ratio between what you consume and what you create.

**Input:** Quick questionnaire:
- How much time on social media daily? (from Screen Time or estimate)
- How many posts/stories did you publish last week? (number)
- How long does creating one post take you? (slider: 5 min - 2 hours)
- How many drafts/unused photos on your phone? (rough number)
- Do you spend time "researching content ideas"? (how long)
- How long editing photos/videos before posting? (slider)

**Output:**
- Consumption:Creation ratio (typically 50:1 or worse)
- "You scroll for 2.3 hours/day but only create 12 minutes of content per week. Your ratio is 68:1."
- "You have 847 unused photos. At 30 seconds each to take, that's 7 hours of content you never shared."
- Creator efficiency score
- Shareable: "My social media ratio is 68:1. I consume 68x more than I create."

**Implementation:** Pure questionnaire + math. No AI. The ratio calculation is the viral hook — nobody has seen their number before and it's always embarrassingly high.

**Build time:** 2 hours. Simplest of all — pure client-side math with a well-designed result card.

**Revenue connection:** "Meldar's social poster skill auto-schedules your posts, suggests content from your unused photos, and batches your creation time. Flip the ratio. That's Starter."

---

## 9. Sleep Procrastination Score

**One-liner:** Answer 5 questions about your bedtime — see how much sleep you're sacrificing to "revenge bedtime procrastination."

**Input:** Quick questionnaire:
- What time do you plan to sleep? (time picker)
- What time do you actually fall asleep? (time picker)
- What do you do in that gap? (multi-select: scroll social, watch shows, read, game, "nothing productive")
- How many times do you pick up your phone after "going to bed"? (slider: 0-20)
- What time does your alarm go off? (time picker)

**Output:**
- "Revenge gap" in minutes per night (the time between intending to sleep and actually sleeping)
- Weekly/yearly sleep debt: "You lose 1.7 hours of sleep per night to revenge scrolling. That's 620 hours/year — 26 full days."
- Health cost translation: "Research shows this level of sleep debt equals X" (cognitive impairment references)
- The "why" insight: "You're not procrastinating sleep. You're reclaiming 'me time' your day didn't give you."
- Shareable: "I sacrifice 620 hours of sleep per year to revenge bedtime procrastination."

**Implementation:** Pure rule-based. Time difference calculations + research-backed health impact data. The "revenge bedtime procrastination" framing is the hook — it has a name, it validates their behavior, and the numbers are always shocking.

**Build time:** 2 hours. Client-side only. Time pickers + calculation + result card.

**Revenue connection:** "Meldar can build you a wind-down routine that reclaims that 'me time' earlier in your evening, so you don't steal it from sleep. Plus a phone lockdown schedule. That's Starter."

---

## 10. Copy-Paste Detective

**One-liner:** Paste any block of text from your clipboard — we'll tell you what you were trying to do and if there's a faster way.

**Input:** User pastes whatever is on their clipboard right now. Could be:
- A long URL with UTM parameters
- A recipe from a website
- An address they're sending to someone
- A tracking number
- A price comparison
- Literally anything

**Output:** Context-aware analysis:
- "This is a tracking number for UPS. You're probably checking delivery status. Meldar could auto-track all your packages."
- "This is a recipe URL. You copied it to save for later. You have 47 saved recipes you'll never cook. Meldar's meal planner picks 5 per week based on what you actually eat."
- "This is an address. You're probably sending it to someone. Meldar could auto-fill this across all your apps."
- "This is a chunk of text you probably reformatted from a PDF. Meldar could do that extraction automatically."
- The surprise: showing people that their clipboard reveals their daily friction points.

**Implementation:** Claude Haiku text API (not Vision). Send clipboard content, classify intent, suggest the automation that removes the friction. Prompt engineering is the whole feature — the prompt maps clipboard patterns to Meldar skills.

**Build time:** 2 hours. One textarea input, one API call, one result display. The prompt does all the work.

**Revenue connection:** "Every time you copy-paste, you're doing something a computer could do better. Meldar learns your patterns and automates the repetitive ones. That's the whole product."

---

## Priority Ranking

By **viral potential x build effort**:

| Rank | Feature | Build Time | Viral Score | Why |
|------|---------|-----------|-------------|-----|
| 1 | Subscription Autopsy | 3h | 10/10 | Dollar amounts = instant sharing. "I'm wasting $67/month" |
| 2 | Decision Fatigue Calculator | 3h | 9/10 | Universal, no data needed, numbers always shock |
| 3 | Sleep Procrastination Score | 2h | 9/10 | Named phenomenon + relatable + health angle |
| 4 | Doomscroll Meter | 2h | 8/10 | Extends existing Screen Time feature, easy build |
| 5 | Content Creation Ratio | 2h | 9/10 | "68:1" is a meme-ready number |
| 6 | Notification Flood Score | 2.5h | 7/10 | Solid but less surprising than others |
| 7 | Email Avalanche Audit | 3h | 7/10 | Strong for workers, less for Gen Z primary audience |
| 8 | Copy-Paste Detective | 2h | 8/10 | Novel concept, but harder to explain virally |
| 9 | Shopping Spiral Tracker | 3h | 7/10 | Fun personality angle, but niche |
| 10 | Meeting Tax Calculator | 2.5h | 6/10 | Best for secondary audience (corporate), not Gen Z |

## Suggested Build Order

**Sprint 1 (Day 1):** Decision Fatigue Calculator + Sleep Procrastination Score (both pure client-side, no API costs, 4h total)

**Sprint 2 (Day 2):** Subscription Autopsy + Doomscroll Meter (both use existing Vision API infrastructure, 5h total)

**Sprint 3 (Day 3):** Content Creation Ratio + Copy-Paste Detective (one client-side + one text API, 4h total)

That gives us 6 new discovery angles in 3 days. Each one is a standalone viral moment and a funnel entry point.

---

## Architecture Note

All of these follow the same component pattern:
1. **Input component** (questionnaire or upload — reuse ScreenTimeUpload and PainQuiz patterns)
2. **API route** (for Vision/text features) or **client-side calc** (for questionnaire features)
3. **Result card** (shareable, branded, designed for screenshots/social sharing)
4. **CTA** linking to the relevant Meldar skill/tier

Suggest a shared `DiscoveryTool` layout component and a `ShareableCard` component that all 10 features use. Build these once with the first feature, reuse for the rest.
