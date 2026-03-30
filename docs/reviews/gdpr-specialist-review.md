# GDPR/Privacy Compliance Review -- Meldar PoC

**Reviewer:** GDPR/Privacy Compliance Specialist
**Date:** 2026-03-30
**Scope:** Privacy policy, terms of service, screenshot processing, data storage, payment handling, email collection, rate limiting, cookie consent
**Jurisdiction:** EU GDPR, Finnish DPA (Tietosuojavaltuutetun toimisto), Finnish Kirjanpitolaki

---

## Executive Summary

The Meldar PoC demonstrates **strong privacy awareness** in its design -- consent-gated analytics, ephemeral screenshot processing, and a reasonably complete privacy policy. However, several gaps exist that would need to be addressed before scaling beyond early access, and a few issues should be fixed now to maintain compliance even at the current stage.

**Severity scale:** CRITICAL (legal risk now), HIGH (must fix before scaling), MEDIUM (should fix soon), LOW (best practice / nice-to-have)

---

## 1. Privacy Policy Completeness

### 1.1 Processing Activities Coverage

| Processing Activity | Disclosed? | Legal Basis Stated? | Notes |
|---|---|---|---|
| Email collection (subscribe) | Yes | Yes (Contract) | OK |
| Cookie analytics (GA4) | Yes | Yes (Consent) | OK |
| Screenshot upload + AI analysis | Yes | Partially | Legal basis not explicitly stated for this specific activity (see 1.2) |
| X-Ray results storage (30 days) | Yes | No explicit basis | Covered implicitly under "Contract" but should be called out |
| Payment processing (Stripe) | Yes | Yes (implicit) | Kirjanpitolaki retention correctly cited |
| Rate limiting (IP address processing) | **No** | **No** | See finding 2.1 |
| Founder notification email (subscriber email forwarded) | **No** | **No** | See finding 2.2 |
| Error logging (console.error with error objects) | **No** | **No** | See finding 2.3 |
| Quiz answers (self-reported data) | Yes | Partially | Listed under "What data we collect" but no specific legal basis |

### 1.2 Legal Basis for Screenshot Processing -- MEDIUM

The privacy policy mentions screenshots under "Uploaded data," "Screenshot processing," and "AI processing," but does not explicitly assign a legal basis (Article 6(1) GDPR) to the act of sending the screenshot to Anthropic's API.

**Recommendation:** Add to the "Legal basis for processing" section:
- **Contract (Art. 6(1)(b)):** Screenshot analysis and Time X-Ray generation, as the core service you requested.

### 1.3 Missing "Automated Decision-Making" Disclosure -- LOW

Article 13(2)(f) GDPR requires disclosure of automated decision-making including profiling. The AI-based screenshot analysis and insight/suggestion generation constitutes profiling (automated processing of personal data to evaluate personal aspects -- specifically, behavioral patterns). While the current processing does not produce legal or similarly significant effects (Art. 22), the existence of profiling should be disclosed.

**Recommendation:** Add a brief section: "We use automated processing to analyze your screen time data and generate personalized insights. This does not produce legal effects and you can request human review of any AI-generated output."

---

## 2. Undisclosed Processing Activities

### 2.1 IP Address Processing in Rate Limiting -- HIGH

**File:** `src/server/lib/rate-limit.ts`, `src/app/api/upload/screentime/route.ts:17`

The rate limiter extracts the user's IP address from `x-forwarded-for` and stores it in Upstash Redis with prefixes like `rl:screentime`, `rl:subscribe`, `rl:quiz`. IP addresses are personal data under GDPR (Recital 30, Breyer v. Germany C-582/14).

**Issues:**
1. The privacy policy does not disclose IP address collection or processing.
2. No legal basis is stated. Legitimate interest (Art. 6(1)(f)) would be appropriate (security/abuse prevention), but it must be documented.
3. The retention period of IP-keyed rate limit records in Upstash is not disclosed. Upstash sliding window keys have a TTL matching the window (1 minute for screentime, 1 hour for subscribe), which is reasonable, but this should be documented.
4. Upstash is listed as a processor ("Rate limiting"), which is good.

**Recommendation:**
- Add to "What data we collect": "IP addresses: We temporarily process your IP address for rate limiting and abuse prevention. IP data is held in memory for the duration of the rate limit window (up to 1 hour) and then automatically deleted."
- Add to "Legal basis for processing": "Legitimate interest: Rate limiting and abuse prevention (IP address processing)."

### 2.2 Founder Notification Email Leaks Subscriber Email -- HIGH

**File:** `src/app/api/subscribe/route.ts:57-62`

When a user subscribes, the system sends a notification to `gosha.skryuchenkov@gmail.com` containing the subscriber's email address and signup timestamp. This is a data transfer to a personal Gmail account.

**Issues:**
1. Not disclosed in the privacy policy.
2. The subscriber's email is being sent via Resend to a personal Gmail address. This means Google (Gmail) becomes an incidental processor of subscriber email addresses -- a processor not covered by DPAs.
3. Even if the founder is acting as the data controller's representative, the transfer through a consumer Gmail account is not ideal from a data minimization perspective.

**Recommendation:**
- Short-term: Disclose that the data controller receives signup notifications. This is acceptable under legitimate interest for a sole-proprietor operation.
- Medium-term: Use a business email on the meldar.ai domain for these notifications, so that data stays within the disclosed processor chain (Resend -> meldar.ai domain).

### 2.3 Error Logging May Capture Personal Data -- MEDIUM

**File:** `src/app/api/upload/screentime/route.ts:113`

```typescript
console.error('Screenshot analysis failed:', err)
```

The `err` object from the Anthropic API or from formData processing could potentially contain fragments of the base64 image data, user IP, or other request metadata. On Vercel, `console.error` output goes to Vercel's log drain, which may retain logs for up to 30 days (or longer with integrations).

**Issues:**
1. If the error contains image data or PII, this contradicts the "0 seconds, in-memory only" claim for screenshots.
2. Vercel log retention is not disclosed as a data storage location.

**Recommendation:**
- Sanitize error logging: `console.error('Screenshot analysis failed:', err instanceof Error ? err.message : 'Unknown error')` -- never log the full error object in routes that handle file uploads.
- Disclose in the privacy policy that error logs may be temporarily retained by the hosting provider for debugging purposes.

---

## 3. Data Retention and Purge Enforcement

### 3.1 30-Day Purge Cron Job Is Missing -- CRITICAL

**File:** `src/server/db/schema.ts:28-31`

The schema defines `expiresAt` with a 30-day default and has an index on it (`idx_xray_expires`), which is good. However, **there is no cron job, scheduled function, or any mechanism to actually delete expired records.**

The privacy policy states: "Anonymous X-Ray results: 30 days, then automatically purged." This is currently a false statement -- records will accumulate indefinitely.

**Issues:**
1. Breach of the stated retention policy (Art. 5(1)(e) -- storage limitation principle).
2. The `expiresAt` column and index exist but are purely decorative without a purge mechanism.
3. No `vercel.json` with cron configuration exists. No `src/app/api/cron/` directory exists.

**Recommendation (immediate):**
Create a Vercel cron endpoint:
```
src/app/api/cron/purge-expired/route.ts
```
With a `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/purge-expired", "schedule": "0 3 * * *" }] }
```
The endpoint should: `DELETE FROM xray_results WHERE expires_at < NOW()` with a CRON_SECRET authorization check.

### 3.2 Subscriber Data Has No Retention Limit -- MEDIUM

The `subscribers` table has no `expiresAt` or retention policy. The privacy policy says "Until you unsubscribe or request deletion," which is acceptable for consent/contract-based email processing. However:

1. There is no unsubscribe endpoint or self-service deletion mechanism. Users must email the founder.
2. Welcome emails sent via Resend do not contain an unsubscribe link (checked `src/app/api/subscribe/route.ts:32-53`).

**Recommendation:**
- Add an unsubscribe link to the welcome email (also a CAN-SPAM / ePrivacy requirement).
- Consider adding a self-service data deletion endpoint (nice-to-have at this stage, but will be required at scale).

### 3.3 Audit Orders Retention -- OK (with note)

The `auditOrders` table has no expiration, which is correct -- Finnish Kirjanpitolaki 2:10 requires 6-year retention of accounting records. The privacy policy correctly states this. However, the `email` field in `auditOrders` is personal data that will be retained for 6 years. Ensure that any GDPR erasure request (Art. 17) correctly handles the Kirjanpitolaki exception (Art. 17(3)(b) -- compliance with legal obligation).

---

## 4. Screenshot Processing Flow

### 4.1 Ephemeral Processing Claim -- MEDIUM

**Files:** `src/app/api/upload/screentime/route.ts`, `src/server/discovery/ocr.ts`

The flow is:
1. File received as `FormData` -> converted to `Buffer` -> converted to base64 string
2. Base64 sent to Anthropic Claude API
3. Structured data extracted from response
4. Only structured data (app names, usage minutes, categories) stored in DB

The screenshot data (buffer, base64) lives in server memory during request processing and is garbage-collected after the request completes. This is genuinely ephemeral in a serverless (Vercel Functions) context -- functions are short-lived and memory is released.

**However:**
1. **Anthropic's processing:** The privacy policy states "Anthropic does not retain your data or use it for model training under their commercial API terms." This is correct per Anthropic's current API data policy, but the specific DPA reference should be cited (see section 6).
2. **Vercel memory/swap:** In extreme error scenarios (OOM, crash), Vercel could theoretically write a core dump containing the image buffer. This is an extremely low probability event and acceptable at this stage, but worth noting.
3. **The base64 string is passed inline in the API request body.** If Anthropic's API returns an error that echoes the request body (unlikely but possible), and that error is caught by the `console.error` at line 113, the screenshot could end up in Vercel logs. See finding 2.3.

### 4.2 No Explicit Consent Before Upload -- HIGH

**File:** `src/features/screenshot-upload/ui/UploadZone.tsx`

The upload zone shows: "Your screenshot is processed in ~3 seconds and deleted immediately. We never store your image." (line 135-137). This is informative text, but **there is no explicit consent checkbox or affirmative action beyond the file upload itself**.

Under GDPR, the file upload action can be considered an affirmative act constituting consent (similar to submitting a form). However, given that:
- The screenshot is sent to a third-party AI provider (Anthropic)
- The screenshot may contain sensitive personal data (app usage revealing health, dating, financial apps)

A more robust consent mechanism is advisable:

**Recommendation:**
- Add a brief notice near the upload button: "By uploading, you agree that your screenshot will be processed by our AI partner (Anthropic) to extract app usage data. The image is deleted within seconds. [Privacy Policy]"
- Alternatively, add a checkbox: "I understand my screenshot will be analyzed by AI and immediately deleted."

This is especially important because screen time screenshots can reveal sensitive categories of data (health apps, dating apps, religious apps) which may qualify as special category data under Art. 9 GDPR.

---

## 5. Cookie Consent Implementation

### 5.1 Implementation Quality -- GOOD

The cookie consent implementation is well-done:
- GA only loads when `consent === 'accepted'` (`GoogleAnalytics.tsx:18`)
- Default consent mode: `ad_storage: 'denied'`, `ad_user_data: 'denied'`, `ad_personalization: 'denied'`
- Rejection clears all `_ga*` cookies with proper domain handling
- Cross-tab synchronization via `storage` event
- Consent versioning with 1-year expiry
- Footer link to re-open consent banner
- Banner links to privacy policy

### 5.2 Consent Record -- MEDIUM

The consent record is stored in `localStorage` only. While this works, there is no server-side record of consent. If the Finnish DPA requests proof of consent (Art. 7(1)), you cannot demonstrate that a specific user consented at a specific time.

**Recommendation (for scale):** When consent is accepted, send a server-side log entry recording: consent version, timestamp, and a hashed/anonymized identifier. This is not critical at early access stage but will be needed if the DPA inquires.

### 5.3 Cookie Banner Does Not Cover New Processing -- LOW

The current cookie banner only covers analytics cookies. The screenshot upload and email collection do not go through the cookie consent flow (correctly -- they are not cookie-based). The banner text ("We use cookies to understand how visitors use this site. No tracking until you say so.") is accurate and appropriately scoped.

---

## 6. Third-Party Processors and DPAs

### 6.1 Processor List -- GOOD

All 7 processors are listed in the privacy policy with geographic information and transfer mechanisms:
1. Stripe -- Payment processing (DPF)
2. Anthropic -- AI analysis (SCCs/DPF)
3. Vercel -- Hosting (DPF)
4. Resend -- Email (DPF)
5. Neon -- Database (EU, Frankfurt)
6. Upstash -- Rate limiting (EU, Frankfurt)
7. Google -- Analytics (DPF)

### 6.2 DPA Status -- HIGH

The privacy policy lists processors but does not reference Data Processing Agreements (DPAs). Under Art. 28 GDPR, the controller must have a DPA with each processor.

**Current DPA status (to verify):**
| Processor | DPA Available? | Notes |
|---|---|---|
| Stripe | Yes (auto-accepted in dashboard) | Standard, well-established |
| Anthropic | Yes (commercial API terms include DPA) | Verify current terms at anthropic.com/legal |
| Vercel | Yes (auto-accepted with account) | Standard |
| Resend | Likely yes (check terms) | Smaller provider, verify explicitly |
| Neon | Yes (enterprise terms) | Check if DPA is part of standard plan |
| Upstash | Yes (GDPR page) | Check if DPA is part of standard plan |
| Google (GA4) | Yes (auto-accepted in GA setup) | Standard |

**Recommendation:**
- Verify that DPAs are in place with all 7 processors. Download/archive copies.
- Add a statement to the privacy policy: "We have Data Processing Agreements in place with all third-party processors listed above."

### 6.3 International Data Transfers -- MEDIUM

The privacy policy mentions Google's SCCs and DPF certification but does not address transfers for the other US-based processors (Anthropic, Resend, Stripe, Vercel). All likely participate in the EU-U.S. Data Privacy Framework, but this should be stated.

**Recommendation:** Expand the "International data transfers" section:
"Several of our processors are based in the United States. Transfers are protected by the EU-U.S. Data Privacy Framework and/or Standard Contractual Clauses. Specifically: [list each US processor and their transfer mechanism]."

---

## 7. Stripe and Payment Compliance

### 7.1 14-Day Withdrawal Waiver -- OK (with note)

**File:** `src/app/terms/page.tsx:72-76`

The terms state: "By purchasing, you agree that delivery begins immediately and acknowledge that the right of withdrawal is waived once the service is delivered."

This is compliant with the EU Consumer Rights Directive (2011/83/EU) Art. 16(m) for digital content. However, to be fully compliant, the waiver should be presented as an explicit acknowledgment during the checkout flow (not just buried in ToS). Stripe Checkout supports custom consent text.

**Recommendation:** Add a checkbox or acknowledgment text in the Stripe Checkout session metadata or custom fields: "I agree that digital delivery begins immediately and waive my 14-day right of withdrawal."

### 7.2 Kirjanpitolaki Compliance -- OK

Payment records are retained for 6 years per Finnish Kirjanpitolaki 2:10. The `auditOrders` table stores: email, Stripe session ID, customer ID, product, amount, currency, timestamps. This is appropriate for accounting purposes. No credit card data is stored (Stripe handles PCI compliance).

### 7.3 VAT Compliance Note -- LOW

Terms state "All prices include VAT." Ensure VAT handling is correctly configured in Stripe for Finnish VAT (24% standard rate). For EU cross-border digital services, you may need to handle OSS (One-Stop Shop) VAT if selling to consumers in other EU member states.

---

## 8. Data Subject Rights Implementation

### 8.1 Rights Listed -- OK

All required GDPR rights are listed in the privacy policy:
- Access (Art. 15)
- Rectification (Art. 16)
- Erasure (Art. 17)
- Portability (Art. 20)
- Restriction (Art. 18)
- Objection (Art. 21)
- Withdraw consent (Art. 7(3))

### 8.2 Rights Implementation -- MEDIUM

Rights are exercised via email to the founder. This is acceptable at early access stage but:

1. **No automated erasure endpoint exists.** Deletion requires manual database queries.
2. **No data export/portability endpoint exists.** Generating a machine-readable export requires manual work.
3. **30-day response time is stated and compliant** (Art. 12(3) allows up to one month).

**Recommendation (for scale):**
- Build a `/api/data/export` endpoint that generates a JSON export of all data associated with an email.
- Build a `/api/data/delete` endpoint that removes all records associated with an email (except those retained under Kirjanpitolaki).

### 8.3 Erasure Exception for Accounting Records -- OK

The privacy policy does not explicitly state the Kirjanpitolaki exception for erasure requests. When a user requests erasure, payment records in `auditOrders` must be retained for 6 years. The privacy policy should note: "We may retain certain data where required by law (e.g., financial records under Finnish accounting law)."

---

## 9. DPIA Assessment

### 9.1 Is a DPIA Required? -- LOW (at current scale)

A Data Protection Impact Assessment (Art. 35 GDPR) is required when processing is "likely to result in a high risk to the rights and freedoms of natural persons." The Finnish DPA's list of processing operations requiring a DPIA includes:

- Large-scale profiling
- Systematic monitoring
- Innovative technology use with personal data

At the current early-access scale (likely <1,000 users), a formal DPIA is **not required**. However, the screenshot analysis pipeline (AI profiling of behavioral data from screen time) could trigger the DPIA requirement at scale, particularly because:

1. Screen time data can reveal sensitive categories (health, dating, religion)
2. AI-based automated analysis of personal behavior patterns
3. Potential for large-scale processing as the user base grows

**Recommendation:** Document a lightweight DPIA now (1-2 pages covering the screenshot flow, data minimization measures, and safeguards). This demonstrates proactive compliance and will be the foundation for a formal DPIA if needed later.

---

## 10. Additional Findings

### 10.1 Age Verification -- LOW

Terms state minimum age is 16 (Art. 8 GDPR allows member states to set 13-16; Finland has set 13). The 16-year minimum is stricter than required and is fine. However, there is no age verification mechanism. At the current stage, this is acceptable -- a self-declaration during signup would be the minimum needed at scale.

### 10.2 Email Welcome Without Double Opt-In -- MEDIUM

**File:** `src/app/api/subscribe/route.ts`

The subscription flow is single opt-in: user enters email, welcome email is sent immediately. Under GDPR, double opt-in is not strictly required (single opt-in with clear consent is sufficient), but it is strongly recommended by the Finnish DPA and is considered best practice in the EU.

**Recommendation:** Implement double opt-in: send a confirmation email with a verification link before adding the email to the active subscriber list.

### 10.3 Subscribe Route Missing Rate Limiting -- LOW

**File:** `src/app/api/subscribe/route.ts`

The `subscribeLimit` rate limiter is defined in `rate-limit.ts` but is not used in the subscribe route. Only the screentime route uses rate limiting. This is a security concern (email bombing) more than a GDPR concern, but abuse of the subscribe endpoint could result in sending unwanted emails, which has GDPR implications (sending unsolicited communications).

### 10.4 Privacy Policy Not Versioned -- LOW

The privacy policy shows "Last updated: March 30, 2026" but there is no version history or changelog. Under GDPR, you must be able to demonstrate what policy was in effect when a user consented.

**Recommendation:** Maintain a version history at the bottom of the privacy policy, or archive previous versions at `/privacy-policy/archive/v1`.

---

## Summary of Findings by Severity

### CRITICAL (fix now)
1. **3.1** -- 30-day purge cron job is missing. The privacy policy promises automatic purging that does not happen.

### HIGH (fix before scaling)
2. **2.1** -- IP address processing in rate limiting is undisclosed.
3. **2.2** -- Founder notification email leaks subscriber email to personal Gmail.
4. **4.2** -- No explicit consent/notice before screenshot upload to AI provider.
5. **6.2** -- DPA status with all 7 processors not verified/documented.

### MEDIUM (fix soon)
6. **1.2** -- Legal basis for screenshot processing not explicitly stated.
7. **2.3** -- Error logging may capture personal data (screenshots in error objects).
8. **3.2** -- No unsubscribe link in welcome email.
9. **5.2** -- No server-side consent record for cookie consent.
10. **6.3** -- International data transfers section incomplete.
11. **8.2** -- No automated data export or deletion endpoints.
12. **10.2** -- Single opt-in email subscription (double opt-in recommended).

### LOW (best practice)
13. **1.3** -- Missing automated decision-making/profiling disclosure.
14. **7.1** -- Withdrawal waiver should be explicit in checkout flow.
15. **7.3** -- VAT OSS compliance for cross-border EU sales.
16. **8.3** -- Erasure exception for accounting records not stated.
17. **9.1** -- Lightweight DPIA should be documented now.
18. **10.1** -- No age verification mechanism.
19. **10.3** -- Subscribe route missing rate limiting.
20. **10.4** -- Privacy policy not versioned.

---

## Recommended Priority Actions

1. **Implement the purge cron job** -- This is the only finding that makes a current privacy policy statement provably false. A Vercel cron that runs daily and deletes expired `xray_results` rows takes ~20 lines of code.

2. **Disclose IP processing** and add legitimate interest basis for rate limiting.

3. **Switch founder notifications** to a `@meldar.ai` email address.

4. **Sanitize error logging** in the screenshot upload route to prevent accidental PII persistence.

5. **Add upload consent notice** near the screenshot upload zone.

6. **Verify and archive DPAs** with all 7 processors.

7. **Add unsubscribe link** to the welcome email.
