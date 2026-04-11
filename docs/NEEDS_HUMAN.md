# Needs Human

## Summary: what's blocking Sprint 1 ship
1. **Git commit** — all new files need `git add` + commit. 6 route-tracking tests will pass after.
2. **Wildcard DNS** — one CNAME record in Cloudflare. 5 minutes.
3. **Resend domain** — verify `send.meldar.ai` in Resend dashboard + add DNS records. 15 minutes.
4. **RESEND_WEBHOOK_SECRET** — get from Resend webhook settings, add to Vercel env vars.
5. **DPIA document** — 2-3 page internal doc. Required before first real user.
6. **Secret rotation** — rotate DB, Stripe, Anthropic keys that were exposed in conversations.
7. **Browser test** — open the onboarding flow, booking page, and admin panel in a real browser. Test the full flow.
8. **Visual feedback tool** — needs browser testing to verify iframe click-to-edit works.
9. **Helsinki market pricing review** — verify the default service prices per vertical are realistic.

Everything else is built and tested (895 passing tests).

## Vertical-specific booking defaults
The onboarding flow needs default services/pricing/hours per business type. I can create the config structure and placeholder data, but the REAL defaults (Helsinki market pricing for haircuts, PT sessions, tattoo appointments, consulting calls) need founder input. Using reasonable placeholders for now — flag for review before first user.

## Visual feedback tool — browser testing required
The click-to-edit-element-in-iframe flow needs real browser testing. The FeedbackOverlay prototype exists from the design lab session but needs to be adapted for the live workspace preview pane and tested on actual rendered booking pages.

## "Made with Meldar" badge — design approval
Can build the component with brand colors, but exact placement/size/copy needs founder eye.

## Resend sending identity — API credentials
Per-customer email isolation needs Resend API access to create sending identities. Need the production Resend API key to test this flow. Using mock for now.

## Git commit needed for routes-tracked test
The `routes-tracked.test.ts` meta-test checks that all route files on disk are tracked by git. New routes (onboarding, agent-tick, agent/tasks, agent/events, webhooks/resend) exist on disk but aren't committed yet. Tests will pass after `git add` + commit.

## Resend domain verification for send.meldar.ai
Per-customer email isolation uses `{slug}@send.meldar.ai` as sender. Need to:
1. Add `send.meldar.ai` as a verified domain in Resend dashboard
2. Add SPF/DKIM DNS records to Cloudflare for `send.meldar.ai`
Without this, emails from per-user addresses will fail.

## Wildcard DNS for *.meldar.ai
Need to add a CNAME record in Cloudflare: `*.meldar.ai` → `cname.vercel-dns.com`. This is a one-time manual config. Without it, subdomains like `elif-studio.meldar.ai` won't resolve.
