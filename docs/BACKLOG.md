# Backlog

## Pre-Public Launch (before marketing push)

- [ ] Set up Upstash Redis (rate limiting) — add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- [ ] Verify meldar.ai domain in Resend (emails currently go from sandbox)
- [ ] Rotate all secrets (DB, Stripe, Anthropic keys exposed in conversation)
- [ ] Add Sentry error monitoring (removed dead dep, need to set up properly)
- [ ] Add GitHub Actions CI pipeline
- [ ] Add CSP header to next.config.ts
- [ ] Add email capture on X-Ray result page (biggest funnel leak)
- [ ] Add purchase confirmation email in webhook handler
- [ ] Add founder notification email on purchases
- [ ] Fix thank-you page to show correct product name (not always "Time Audit")

## UX Improvements

- [ ] X-Ray card reveal animation (staggered data appearance)
- [ ] Drag-and-drop on upload zone (currently says "Drop" but no handler)
- [ ] Platform detection for upload instructions (show iOS or Android, not both)
- [ ] OG image: use Bricolage Grotesque font instead of system-ui
- [ ] "12 seniors" avatars — add initials or real photos instead of colored circles
- [ ] Anchoring on EUR 29 price (show cost of inaction or reference price)
- [ ] Founding 50 visible counter + deadline for urgency

## Accessibility

- [ ] aria-live on upload processing states
- [ ] aria-label on file input
- [ ] Focus management after upload completes
- [ ] role="alert" on error messages
- [ ] Check color contrast on footer text (onSurface/20, onSurface/30)
- [ ] 44x44px minimum touch targets on share/copy buttons

## Technical Debt

- [ ] Sort apps by usageMinutes before taking top app (not guaranteed by Claude)
- [ ] Tighten Zod schemas (min lengths, nonnegative numbers)
- [ ] Deduplicate DB query in /xray/[id] (generateMetadata + page both call getXRay)
- [ ] Cache getDb() instance instead of recreating per call
- [ ] Server-validate foundingMember flag (currently trusts client)
- [ ] Add unsubscribe link to welcome email
- [ ] Wire GA4 conversion events in funnel components
