# Copy Proofread: Full Line-by-Line Review

Reviewed all text-bearing components: landing sections, header, footer, email capture, and cookie consent.

---

## 1. Typos and Grammar Errors

No outright typos found. Grammar is intentionally conversational/fragmented throughout (e.g., sentence fragments used as stylistic copy). This is consistent and works for the target audience.

### Minor grammar notes

| Location | Text | Issue | Suggested Fix |
|----------|------|-------|---------------|
| `ProblemSection.tsx:8` | `"Ask the AI to do something." Great. What?` | Two consecutive one-word sentences. Technically fine as rhetoric but reads slightly clipped. | **Keep as-is** -- the punchy rhythm is intentional. |
| `FaqSection.tsx:8` | `Like a phone bill — you pay for what you use.` | Repeats the idea from the preceding sentence ("you pay for what you use"). | Consider: `Like a phone bill — predictable, no surprises.` |
| `HowItWorksSection.tsx:6` | `It does the thing you hated, automatically, every time.` | "the thing you hated" is vague -- which thing? The frustration they described in step 1? | Consider: `It handles the task you hated, automatically, every time.` |

---

## 2. Capitalization Consistency

**Brand name: "Meldar"** -- Consistently capitalized across all files. No instances of lowercase "meldar."

| Location | Text | Issue |
|----------|------|-------|
| All files | `Meldar` | Consistent -- always capitalized. No issues. |

**Section headings:**

All section headings use sentence case consistently:
- "Sound familiar?"
- "Things people build in their first week"
- "How Meldar is different"
- "Your stuff stays your stuff"
- "Questions people ask"
- "Ready to build your own AI app?"

No issues found.

---

## 3. Punctuation Consistency (Periods at End of Descriptions)

**This is the single biggest consistency problem on the page.**

### Skill card descriptions (`SkillCardsSection.tsx`)

| Skill | Text | Ends with period? |
|-------|------|--------------------|
| Meal planner | `Tell it what you like and what's in your fridge. Weekly meals and grocery list, automatically.` | Yes (two sentences) |
| Grade checker | `Get a text the second your professor posts a grade. Stop refreshing that portal.` | Yes (two sentences) |
| Price watcher | `Pick any product. Get a message when the price drops or it's back in stock.` | Yes (two sentences) |
| Job tracker | `Every application in one place. Reminded to follow up at the right time.` | Yes (two sentences) |
| Expense sorter | `Snap a receipt. Everything categorized and totaled. Tax season handled.` | Yes (three sentences) |
| Social poster | `Write once. It posts to Instagram, LinkedIn, X, and TikTok, formatted right.` | Yes (two sentences) |

All end with periods. **Consistent.**

### Tier descriptions (`TiersSection.tsx`)

| Tier | Text | Ends with period? |
|------|------|--------------------|
| Explorer | `Find out where your time actually goes. We watch your patterns and tell you what to automate.` | Yes |
| Builder | `We set everything up. Click by click. Working AI in 30 minutes. You pay only for what you use.` | Yes |
| Studio | `Tell us what you need. Our AI builds it while you watch. Design, code, everything.` | Yes |

**Consistent.**

### Tier features (bullet points under each tier)

| Tier | Features | End with period? |
|------|----------|-------------------|
| Explorer | `Activity pattern analysis` / `Daily automation suggestions` / `Privacy-first — metadata only` | No |
| Builder | `Full guided setup` / `Your own AI account` / `Curated automation library` | No |
| Studio | `Real-time build progress` / `Pick your design` / `You own everything` | No |

All feature bullets omit periods. **Consistent.**

### Comparison table values (`ComparisonSection.tsx`)

| Row | Meldar column | Others column |
|-----|---------------|---------------|
| Starting point | `Your frustration` | `A blank prompt` |
| Technical knowledge | `None required` | `Assumed` |
| Discovers what to automate | `Yes, from your patterns` | `You figure it out` |
| Builds the app for you | `Yes, while you watch` | `You build it yourself` |
| Your data | `Yours. Always.` | `Harvested or locked in` |

"Yours. Always." ends with a period; all others do not. This is intentional (emphasis). **Acceptable -- but if strict consistency is desired, consider changing to `Yours, always` (no periods) to match the other rows.**

### FAQ answers (`FaqSection.tsx`)

All FAQ answers end with periods. **Consistent.**

### How It Works descriptions (`HowItWorksSection.tsx`)

All step descriptions end with periods. **Consistent.**

---

## 4. British vs. American English

All spelling uses **American English** consistently:

| Word | Spelling used | British alternative | Status |
|------|---------------|---------------------|--------|
| categorized | `categorized` (SkillCards) | categorised | American -- consistent |
| summarizing | `summarizing` (FAQ) | summarising | American -- consistent |

No British spellings detected. **Consistent.**

---

## 5. Contractions Consistency

The copy uses contractions freely and consistently. Surveying all instances:

| Contraction | Files used in |
|-------------|---------------|
| `don't` | ProblemSection, FaqSection |
| `didn't` | ProblemSection (testimonial) |
| `doesn't` | -- |
| `it's` | ProblemSection, SkillCardsSection, HowItWorksSection, TiersSection, FaqSection |
| `let's` | ProblemSection |
| `you'd` | ProblemSection |
| `you'll` | FaqSection |
| `you've` | ProblemSection (testimonial) |
| `can't` | -- |
| `that's` | HowItWorksSection |
| `there's` | FaqSection |
| `what's` | SkillCardsSection |
| `we're` | -- (no instance of formal "we are" either) |

No mixing of formal "do not" / "is not" with informal contractions. **Consistent throughout.**

One note: `CookieConsent.tsx` uses a slightly more formal register ("We use cookies to understand how visitors use this site. No tracking until you say so.") which is appropriate for a legal/consent context.

---

## 6. Repeated Words or Phrases Across Sections

### "Get early access" -- appears 4 times

| Location | Context |
|----------|---------|
| `HeroSection.tsx:59` | Primary CTA button |
| `Header.tsx:57` | Header CTA button |
| `FinalCtaSection.tsx:38` | Final CTA button |
| `EmailCapture.tsx:82` | Submit button |

**Plus:** `TiersSection.tsx:29` -- Studio tier CTA also says `Get early access`.

This is intentional CTA repetition -- good for conversion. **No issue.**

### "Your AI. Your app. Nobody else's." -- appears 2 times

| Location | Context |
|----------|---------|
| `HeroSection.tsx:21` | Eyebrow label above headline |
| `FinalCtaSection.tsx:42` | Tagline below final CTA |

Bookend repetition -- intentional. **No issue.**

### "you pay for what you use" -- appears 2 times in the same FAQ answer

| Location | Text |
|----------|------|
| `FaqSection.tsx:8` | `...you pay for what you use. We add a small convenience fee on top. Most people spend $5-20 a month. Like a phone bill — you pay for what you use.` |

**Issue: Same phrase used twice in a single answer.** This reads as accidental repetition.

**Fix:** Change the second instance to something like: `Like a phone bill — predictable, no surprises.`

### "you own" / "yours" -- heavy repetition across sections

- `TiersSection.tsx:27` -- `You own everything` (Studio feature)
- `HowItWorksSection.tsx:6` -- `You own it. It's yours. Done.`
- `ComparisonSection.tsx:8` -- `Yours. Always.`
- `FaqSection.tsx:10` -- `Everything you build is yours. It lives on your computer, not ours.`
- `TrustSection.tsx:34` -- `Your stuff stays your stuff`

This is a deliberate thematic thread (ownership/privacy). **Intentional -- no issue.** But worth noting the density is high. If any section feels redundant, this is the theme that could be trimmed.

---

## 7. Sentences That Could Be Shorter

| Location | Current text | Suggested shorter version |
|----------|-------------|--------------------------|
| `ProblemSection.tsx:8` | `You heard AI can save you hours. You tried to set it up. Then it asked you to install three things you'd never heard of, enter codes into a black screen, and somehow "configure" something. You closed the laptop.` | Fine as-is -- the length is the point (building frustration). |
| `TrustSection.tsx:38` | `We only see which apps you switch between and how often. Never what you type, read, or look at. No screen recordings. No passwords. No messages. European privacy law protects everything. You can delete it all, anytime.` | Could trim `European privacy law protects everything.` to `Protected by European privacy law.` to save 3 words and tighten rhythm. |
| `FaqSection.tsx:7` | `No. Meldar handles the technical stuff. You just tell it what you want done, and it builds it. If you CAN code, great, you'll get even more out of it. But it's not required.` | Last sentence redundant after "If you CAN code..." -- consider dropping `But it's not required.` since "No." already answered the question. |
| `FaqSection.tsx:11` | `Because those tools assume you already know what you're doing. Meldar starts from zero. It figures out what's worth automating in YOUR day, sets everything up for you, and stays with you until it works.` | Fine -- strong answer. No trimming needed. |

---

## 8. Smart Quotes vs. Straight Quotes

### HTML entities used (smart quotes):

| Location | Entity | Renders as |
|----------|--------|------------|
| `ProblemSection.tsx:84` | `&ldquo;` ... `&rdquo;` | Curly double quotes around testimonial |
| `HeroSection.tsx:21` | `&apos;` | Straight apostrophe (HTML entity) |
| `FinalCtaSection.tsx:42` | `&apos;` | Straight apostrophe (HTML entity) |

### JavaScript string quotes (rendered as straight quotes):

All other quotes in JavaScript strings use escaped straight single quotes (`\'`) or straight double quotes within strings. These render as straight quotes in the browser.

**Inconsistency found:**

| Location | Text | Quote type |
|----------|------|------------|
| `ProblemSection.tsx:84-85` (testimonial) | `"I've tried every AI tool..."` | **Smart/curly** (`&ldquo;`/`&rdquo;`) |
| `ProblemSection.tsx:12` | `"Ask the AI to do something."` | **Straight** (JS string `"..."`) |
| `HowItWorksSection.tsx:4` | `"I waste 2 hours every Monday on this."` | **Straight** (JS string `"..."`) |

**Recommendation:** The testimonial correctly uses curly quotes (`&ldquo;`/`&rdquo;`). The quoted phrases in problem descriptions and how-it-works descriptions use straight quotes because they are inside JS strings. This is a common limitation. For full consistency, convert inline quoted phrases to use `&ldquo;`/`&rdquo;` entities as well, but this would require refactoring the data arrays into JSX. **Low priority -- acceptable as-is.**

---

## 9. Em Dash vs. En Dash Usage

All dashes in the copy use **em dashes** (`—` / `\u2014`):

| Location | Text |
|----------|------|
| `FaqSection.tsx:8` | `Like a phone bill — you pay for what you use.` |
| `TiersSection.tsx:8` | `Privacy-first — metadata only` |

Regular hyphens used for compound words:
- `Privacy-first`
- `Pay as you go` (no hyphen -- correct, used as noun phrase)
- `Real-time` (correctly hyphenated as adjective)

**Consistent. No en dashes used where em dashes should be (or vice versa).**

Note: Em dashes have spaces on both sides (`word — word`). This is the **British/European convention**. American convention omits spaces (`word—word`). Since the company is Finnish and all other spelling is American, this is a minor stylistic choice. **Recommend picking one and documenting it. Current usage (spaced) is fine.**

---

## 10. Placeholder or TODO Text

| Location | Text | Status |
|----------|------|--------|
| `EmailCapture.tsx:14` | `// TODO: connect to actual API endpoint` | **Active TODO** -- expected for pre-launch, but should be resolved before go-live. |

No other TODOs, placeholder text (lorem ipsum, "TBD", "[INSERT]"), or dummy content found in any of the reviewed files.

---

## Additional Findings

### 11. Inconsistent CTA button text across tiers

| Tier | CTA text |
|------|----------|
| Explorer | `Begin here` |
| Builder | `Start building` |
| Studio | `Get early access` |

These are intentionally varied. **No issue** -- each matches the tier's energy level. But note that "Get early access" on Studio is the same as the primary CTA elsewhere, which could dilute its specificity.

### 12. "CAN" and "YOUR" in all-caps for emphasis

| Location | Text |
|----------|------|
| `FaqSection.tsx:7` | `If you CAN code` |
| `FaqSection.tsx:11` | `in YOUR day` |
| `ProblemSection.tsx:11` | `YOUR specific work` |

This is used sparingly (3 instances) and works as conversational emphasis in informal copy. **Acceptable.** However, if the design system later adds proper `<em>` or italic styling, these should be converted.

### 13. Oxford comma usage

| Location | Text | Oxford comma? |
|----------|------|---------------|
| `SkillCardsSection.tsx:9` | `Instagram, LinkedIn, X, and TikTok` | Yes |
| `FaqSection.tsx:12` | `Sorting files, writing emails, cleaning spreadsheets, summarizing meetings, generating reports.` | No comma before implicit "and" (list just uses commas) |
| `ProblemSection.tsx:8` | `install three things you'd never heard of, enter codes into a black screen, and somehow "configure" something` | Yes |

**Mostly consistent with Oxford comma.** The FAQ list (`Sorting files, writing emails...`) is a different pattern (no conjunction, just a trailing list). **No issue.**

### 14. Number formatting

| Location | Text |
|----------|------|
| `HeroSection.tsx:43` | `30 minutes` |
| `TiersSection.tsx:16` | `30 minutes` |
| `FaqSection.tsx:8` | `$5-20 a month` |
| `TiersSection.tsx:25` | `From $200` |
| `HowItWorksSection.tsx:4` | `2 hours` |
| `FaqSection.tsx:12` | `more than twice a week` |

Numbers under 10 are sometimes written as digits (`2 hours`) and sometimes as words (`twice`). In casual marketing copy, digits are preferred for scannability. **Acceptable -- no strict rule needed.**

The price range `$5-20` uses a hyphen. For a true range, an en dash is more correct (`$5--20`), but in casual copy this is standard. **Acceptable.**

### 15. EmailCapture success message tone mismatch

| Location | Text |
|----------|------|
| `EmailCapture.tsx:29` | `Check your inbox. Your setup guide is on its way.` |

This promises a "setup guide" but the product is in pre-launch/email-collection phase. If no actual setup guide is sent, this creates a broken promise. **Verify that the email flow delivers what this message promises, or change to:** `You're on the list. We'll be in touch.`

---

## Summary: Required Fixes

1. **`FaqSection.tsx:8`** -- Remove duplicate "you pay for what you use" phrase in the cost FAQ answer.
2. **`EmailCapture.tsx:14`** -- Resolve TODO before launch (connect to actual API).
3. **`EmailCapture.tsx:29`** -- Verify "setup guide" promise matches actual email content, or soften the message.

## Summary: Recommended (Optional) Improvements

4. **`TrustSection.tsx:38`** -- Tighten `European privacy law protects everything.` to `Protected by European privacy law.`
5. **`FaqSection.tsx:7`** -- Consider dropping `But it's not required.` (redundant after opening "No.").
6. **`ComparisonSection.tsx:8`** -- If strict consistency is desired, change `Yours. Always.` to match the no-period pattern of other table values.
7. **`HowItWorksSection.tsx:6`** -- Consider `handles the task` instead of `does the thing` for slightly more clarity.
8. Em dash spacing convention (spaced vs. unspaced) -- document the chosen style for future content.
