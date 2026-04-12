# Test Validity -- Architect

## Summary
Total: 1056 | 5: 389 | 4: 421 | 3: 227 | 2: 19 | 1: 0

Score distribution by archetype:
- **5 (pure logic / real integration)**: Pure functions (slug, topoSort, balanceColor, formatRelative, sanitizeNextParam, deriveStep, deriveMilestoneState, groupCards, parsePromptAnatomy, preprocessOcr, Zod schemas, StepIndicator, buildStatus, previewPane), real crypto (bcrypt, SHA-256, JWT sign/verify, auth-cookie), real parsers with in-memory ZIP (chatgpt, claude, google-takeout), real DB integration tests (schema CRUD, critical-flows, auth-flows, agent-flows, booking-flows, auth-routes, workspace-routes, agent-operations, billing-flows), build pipeline integration with in-memory storage, routes-tracked git-ls-files meta-test, sleep-listener-leak (real getEventListeners)
- **4 (good logic through mocks)**: API route tests that exercise real route handler code through mocked DB/AI/email; verify auth gates, ownership scoping, error propagation, idempotency, timing-attack mitigation, Zod boundary enforcement, security invariants (hash separation, anti-enumeration, CSRF, prompt injection wrapping)
- **3 (adequate)**: Standard auth gate checks (returns 401 when X), basic validation (returns 400 when Y), response shape checks, simple mock-wiring for side effects
- **2 (weak mock-wiring)**: Existence checks on data arrays, type coverage checks
- **1 (tautological)**: (none remaining)

## By File

### src/__tests__/integration/critical-flows.test.ts
| Test | Score | Reason |
|------|-------|--------|
| creates user, creates project, verifies project loads with userId filter | 5 | Real DB integration test: insert + query + verify FK scoping |
| inserts agent task and queries by project + status | 5 | Real DB: verifies composite query filter on project + status |
| inserts project domain and queries active domains | 5 | Real DB: verifies domain row lifecycle |

### src/__tests__/integration/auth-flows.test.ts
| Test | Score | Reason |
|------|-------|--------|
| creates user with hashed password and verifies it matches | 5 | Real DB: insert with SHA-256 hash, readback, re-hash comparison |
| creates user with reset token and queries by hashed token | 5 | Real DB: update with hashed token, query by hash column |
| increments tokenVersion and verifies old version does not match | 5 | Real DB: token version bump, old-vs-new inequality check |
| verifies project ownership returns the project for correct user | 5 | Real DB: composite WHERE on projectId + userId |
| verifies different userId returns empty (ownership denied) | 5 | Real DB: cross-user isolation with two users, empty result |

### src/__tests__/integration/agent-flows.test.ts
| Test | Score | Reason |
|------|-------|--------|
| transitions proposed -> approved -> executing -> verifying -> done | 5 | Real DB: full agent task state machine lifecycle with timestamp columns |
| inserts 3 proposed tasks and queries pending count | 5 | Real DB: batch insert + composite filter on projectId + status |
| inserts agent event and verifies shape | 5 | Real DB: event insert + readback with JSON payload and createdAt check |
| inserts task and event for same project and verifies both reference it | 5 | Real DB: cross-table FK integrity, task-event co-reference via projectId |

### src/__tests__/integration/booking-flows.test.ts
| Test | Score | Reason |
|------|-------|--------|
| inserts active subdomain and queries it back | 5 | Real DB: domain row insert + composite filter on projectId + state |
| inserts booking_confirmation task and queries by project and type | 5 | Real DB: agent task with JSON payload, composite query on projectId + agentType |
| throws on duplicate domain string | 5 | Real DB: unique constraint enforcement, expects rejects.toThrow |

### src/__tests__/integration/schema.test.ts
| Test | Score | Reason |
|------|-------|--------|
| users: insert + select + delete | 5 | Real DB CRUD roundtrip with default column checks |
| projects: insert + select + delete | 5 | Real DB CRUD with FK constraint to user |
| builds: insert + select + delete | 5 | Real DB CRUD with status and triggeredBy |
| buildFiles: insert + select + delete | 5 | Real DB CRUD with composite key (buildId + path) |
| projectFiles: insert + select + delete | 5 | Real DB CRUD |
| kanbanCards: insert + select + delete | 5 | Real DB CRUD with default state check |
| tokenTransactions: insert + select + delete | 5 | Real DB CRUD with signed amount |
| aiCallLog: insert + select + delete | 5 | Real DB CRUD |
| deploymentLog: insert + select + delete | 5 | Real DB CRUD |
| agentEvents: insert + select + delete | 5 | Real DB CRUD |
| agentTasks: insert + select + delete | 5 | Real DB CRUD with default status check |
| projectDomains: insert + select + delete | 5 | Real DB CRUD |
| xrayResults: insert + select + delete | 5 | Real DB CRUD with custom nanoid PK |
| auditOrders: insert + select + delete | 5 | Real DB CRUD with default currency check |
| subscribers: insert + select + delete | 5 | Real DB CRUD |
| discoverySessions: insert + select + delete | 5 | Real DB CRUD with custom nanoid PK |

### src/app/(authed)/sign-in/__tests__/sign-in-submit.test.ts
| Test | Score | Reason |
|------|-------|--------|
| rejects an invalid email shape before calling the network | 4 | Tests client-side Zod validation fires before fetch; mock verifies no call |
| rejects an empty password before calling the network | 4 | Same pattern, password branch |
| returns ok with the user id on a successful response | 4 | Verifies fetch call shape, Zod parse of response, userId extraction |
| shows the generic invalid credentials message on 401 | 4 | Verifies error message sanitization -- no user input leaked |
| surfaces the rate limit message on 429 | 4 | Correct error propagation |
| handles network errors gracefully | 4 | Verifies catch path with user-facing message |
| rejects a malformed success response | 4 | Zod response validation catches bad userId |

### src/app/(authed)/sign-up/__tests__/sign-up-submit.test.ts
| Test | Score | Reason |
|------|-------|--------|
| rejects an invalid email shape before calling the network | 4 | Client-side validation with field identification |
| rejects a password shorter than 8 chars before calling the network | 4 | Client-side validation |
| returns ok with the userId on a successful response | 4 | Full happy path with call shape verification |
| surfaces the server error message on 409 conflict | 4 | Error propagation |
| surfaces the rate limit message on 429 | 4 | Error propagation |
| handles network errors gracefully | 4 | Catch path |
| rejects a malformed success response | 4 | Zod response validation |
| strips unknown fields from the request body | 4 | Verifies Zod strips extra fields from outgoing body |

### src/app/(authed)/workspace/__tests__/page.test.tsx
| Test | Score | Reason |
|------|-------|--------|
| throws when reached without a session | 3 | Heavy mocking of RSC; tests defensive invariant |
| redirects to onboarding when the user has zero projects | 3 | Mock-heavy but tests real redirect logic |
| renders a card grid when the user has projects | 3 | Custom tree walker to verify RSC text output; fragile but meaningful |
| renders an error banner when the project query throws | 3 | Tests error boundary rendering |

### src/app/api/auth/__tests__/forgot-password.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns success and sends email for existing user | 4 | Verifies DB update + email call + hash in DB vs raw in email |
| stores a SHA-256 hash in DB, not the raw token | 4 | Security invariant: hash format check + non-equality to raw |
| returns success for non-existing email (prevents enumeration) | 4 | Anti-enumeration: same 200 response, no DB update, no email |
| sets reset token expiry to approximately 1 hour from now | 4 | Time-based verification with tolerance |
| takes at least 500ms regardless of whether user exists | 4 | Timing attack mitigation |
| returns 400 with INVALID_JSON for malformed JSON body | 3 | Standard input validation |
| rejects invalid email with 400 | 3 | Standard validation |
| rejects missing email with 400 | 3 | Standard validation |
| returns 500 on unexpected error | 3 | Error path |

### src/app/api/auth/__tests__/google-callback.test.ts
| Test | Score | Reason |
|------|-------|--------|
| redirects to sign-in with error when no code param | 4 | Tests missing OAuth code handling |
| redirects to sign-in with error when error param is present | 4 | Tests OAuth error propagation |
| redirects with error when token exchange fails | 4 | Tests upstream Google failure |
| redirects with error when userinfo request fails | 4 | Tests upstream Google failure |
| redirects with error when Google account has no email | 4 | Edge case: Google account without email |
| creates a new user, sets JWT cookie, and redirects to workspace | 4 | Full happy path: user creation + cookie + redirect |
| records signup bonus for new users | 4 | Verifies token economy insert |
| logs in existing Google user without creating a duplicate | 4 | Idempotent login path |
| redirects email-registered user to sign-in instead of auto-merging | 4 | Security: prevents account takeover via Google |
| rejects when CSRF state param does not match cookie | 4 | CSRF protection |
| rejects when CSRF state cookie is missing | 4 | CSRF protection |
| rejects when Google email is not verified | 4 | Security: unverified Google email |
| marks existing unverified Google user as verified | 4 | State transition on re-auth |
| redirects with error when rate limited | 3 | Rate limit check |

### src/app/api/auth/__tests__/login.test.ts
| Test | Score | Reason |
|------|-------|--------|
| logs in successfully with correct credentials | 4 | Happy path with cookie and user data verification |
| rejects wrong password with 401 | 4 | Standard auth failure |
| rejects non-existent email with 401 (same message as wrong password) | 4 | Anti-enumeration |
| returns same error message for wrong password and non-existent email | 4 | Explicit enumeration test |
| rejects invalid input with 400 | 3 | Bulk validation test |
| returns 500 on unexpected error | 3 | Error path |
| returns 400 with INVALID_JSON when request body is not valid JSON | 3 | Input validation |
| calls verifyPassword even when user is not found (timing parity) | 4 | Timing attack mitigation |
| calls setAuthCookie on successful login | 3 | Mock wiring verification |
| returns 429 when the email-based rate limit is exceeded | 4 | Per-email rate limiting with mock call count verification |

### src/app/api/auth/__tests__/me.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns { user: null } when unauthenticated (not 401) | 4 | Important: 200 not 401 for unauthenticated GET |
| returns user data when authenticated and user exists | 4 | Happy path |
| returns { user: null } and clears cookie when user not found in DB | 4 | Edge case: deleted user with valid JWT |
| returns 401 when no valid auth cookie is present (DELETE) | 3 | Standard auth check |
| clears cookie and returns success when authenticated (DELETE) | 4 | Logout flow |
| increments tokenVersion in DB on logout | 4 | Token revocation mechanism |

### src/app/api/auth/__tests__/register.test.ts
| Test | Score | Reason |
|------|-------|--------|
| registers successfully and returns JWT cookie | 4 | Happy path with cookie flags verification |
| stores hashed verifyToken in DB, sends raw token in email | 4 | Security: hash separation between DB and email |
| includes verifyTokenExpiresAt in insert payload | 4 | Token expiry verification |
| sends verification email via Resend after registration | 3 | Mock call verification |
| registration succeeds even if Resend throws | 4 | Fault tolerance: email failure doesn't block registration |
| rejects duplicate email with generic 400 | 4 | Anti-enumeration via generic error |
| rejects invalid email format with 400 | 3 | Standard validation |
| rejects password shorter than 8 characters with 400 | 3 | Standard validation |
| returns 400 with INVALID_JSON for malformed JSON body | 3 | Standard validation |
| rejects missing fields with 400 | 3 | Standard validation |
| rejects all-lowercase password (Finding #14) | 4 | Password complexity rule |
| rejects all-digit password (Finding #14) | 4 | Password complexity rule |
| rejects all-uppercase password (Finding #14) | 4 | Password complexity rule |
| accepts password with uppercase, lowercase and digit (Finding #14) | 4 | Positive case for complexity rule |
| returns 500 on unexpected error | 3 | Error path |
| duplicate-email path takes similar time to success path (Finding #20) | 4 | Timing attack mitigation |
| sends welcome email after registration | 3 | Mock call verification |
| sends welcome email with null name when name not provided | 3 | Edge case |
| registration succeeds even if welcome email throws | 4 | Fault tolerance |

### src/app/api/auth/__tests__/resend-verification.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 401 when unauthenticated | 3 | Standard auth check |
| returns 429 when rate limited | 3 | Rate limit check |
| returns 200 when already verified | 4 | Idempotent: no email sent for verified users |
| stores hashed token in DB | 4 | Security invariant |
| sends raw token in email | 4 | Token handling correctness |
| returns 200 and sends email for unverified user | 4 | Happy path |
| returns 500 when DB throws | 3 | Error path |

### src/app/api/auth/__tests__/reset-password.test.ts
| Test | Score | Reason |
|------|-------|--------|
| resets password with valid token using atomic update | 4 | Verifies atomic UPDATE...RETURNING pattern |
| uses a single atomic UPDATE...RETURNING (no separate SELECT) | 4 | TOCTOU prevention: single atomic operation |
| hashes the incoming token before DB lookup | 4 | Security: never compares raw tokens |
| returns 401 when token was already consumed | 4 | Idempotency/race condition |
| rejects expired token with 401 | 4 | Token expiry enforcement |
| clears reset token atomically on success | 4 | Cleanup after use |
| rejects short new password with 400 | 3 | Standard validation |
| returns 400 with INVALID_JSON for malformed JSON body | 3 | Standard validation |
| rejects missing token with 400 | 3 | Standard validation |
| rejects empty token with 400 | 3 | Standard validation |
| rejects missing password with 400 | 3 | Standard validation |
| rejects all-lowercase password | 3 | Password complexity |
| rejects all-digit password | 3 | Password complexity |
| accepts strong password | 3 | Positive case |
| returns 500 on unexpected error | 3 | Error path |

### src/app/api/auth/__tests__/verify-email.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (7) | 4 | Atomic token verification with hash comparison, expiry, and idempotency; same patterns as reset-password |

### src/app/api/billing/checkout/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 429 with RATE_LIMITED code | 3 | Standard rate limit |
| returns 400 for invalid product value | 3 | Validation |
| returns 400 for invalid email format | 3 | Validation |
| accepts request with no email (optional) | 3 | Positive validation |
| accepts request with no xrayId (optional) | 3 | Positive validation |
| creates payment-mode session for timeAudit | 4 | Verifies Stripe call shape: mode, price_id, metadata |
| creates payment-mode session for appBuild (legacy slug) | 4 | Legacy slug mapping |
| creates payment-mode session for vipBuild | 4 | V3 slug |
| creates subscription-mode session for builder | 4 | Subscription mode with trial_period_days |
| rejects retired starter slug | 3 | Validation |
| does NOT include subscription_data for timeAudit | 4 | Negative check on Stripe params |
| does NOT include subscription_data for appBuild | 4 | Negative check |
| DOES include subscription_data for builder | 4 | Positive check |
| passes customer_email when provided | 3 | Stripe param forwarding |
| passes customer_email as undefined when absent | 3 | Stripe param forwarding |
| passes xrayId in metadata when provided | 3 | Stripe param forwarding |
| passes empty string for xrayId when absent | 3 | Stripe param forwarding |
| passes allow_promotion_codes: true | 3 | Stripe param verification |
| returns { url: session.url } on success | 3 | Response shape |
| returns HTTP 200 on success | 3 | Status code |
| returns 500 when Stripe throws | 3 | Error path |

### src/app/api/billing/webhook/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 401 when stripe-signature header is absent | 4 | Webhook auth |
| returns 401 when STRIPE_WEBHOOK_SECRET env var is not set | 4 | Env guard |
| returns 401 when constructEvent throws | 4 | Signature verification |
| proceeds when constructEvent returns a valid event | 3 | Happy path gate |
| checkout.session.completed -- timeAudit: inserts into auditOrders | 4 | DB side effect verification |
| checkout.session.completed -- timeAudit: sends purchase confirmation email | 4 | Email side effect |
| checkout.session.completed -- timeAudit: sends founder notification | 4 | Notification side effect |
| checkout.session.completed -- timeAudit: inserts buyer into subscribers | 4 | DB side effect |
| checkout.session.completed -- timeAudit: returns received true | 3 | Response shape |
| checkout.session.completed -- appBuild: inserts auditOrders | 4 | Product mapping |
| checkout.session.completed -- appBuild: sends emails | 3 | Side effect |
| checkout.session.completed -- appBuild: inserts subscribers | 3 | Side effect |
| checkout.session.completed -- vipBuild: inserts with app_build | 4 | Backward compat mapping |
| checkout.session.completed -- vipBuild: sends emails | 3 | Side effect |
| checkout.session.completed -- builder: does NOT insert auditOrders | 4 | Subscription vs one-time distinction |
| checkout.session.completed -- builder: does NOT send emails | 4 | Subscription handling |
| checkout.session.completed -- builder: inserts subscriber | 3 | Side effect |
| checkout.session.completed -- starter: does NOT insert auditOrders | 4 | Retired product handling |
| checkout.session.completed -- starter: does NOT call resend | 4 | Retired product |
| checkout.session.completed -- starter: DOES insert subscriber | 3 | Side effect |
| checkout.session.completed -- starter: returns received true | 3 | Response shape |
| checkout.session.completed -- missing email: returns immediately | 4 | Edge case: no email in Stripe event |
| subscription.created: does not throw | 3 | Passthrough handler |
| subscription.deleted: does not throw | 3 | Passthrough handler |
| unhandled event: returns received true | 3 | Catchall |

### src/app/api/cron/__tests__/purge-auth.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 401 for missing Authorization header | 4 | Auth gate |
| returns 401 for wrong secret | 4 | Auth gate |
| returns 401 for wrong scheme | 4 | Scheme validation |
| returns 200 for correct secret | 4 | Happy path |
| does not expose CRON_SECRET in response body | 4 | Security: no secret leakage |
| purge route uses verifyCronAuth | 3 | Import verification |
| agent-tick route uses verifyCronAuth | 3 | Import verification |
| verifyCronAuth uses timingSafeEqual | 4 | Timing-safe comparison verification |

### src/app/api/cron/agent-tick/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 401 for missing Authorization header | 3 | Auth gate |
| returns 401 for wrong secret | 3 | Auth gate |
| returns 401 for wrong scheme | 3 | Auth gate |
| returns processed: 0 when no approved tasks | 4 | Empty queue handling |
| skips when global spend ceiling is exceeded | 4 | Spend guard |
| records spend for each processed task | 4 | Cost tracking |
| processes a booking_confirmation task successfully | 4 | Happy path with email send verification |
| transitions task to failed when Resend returns error | 4 | Error state transition |
| handles executor throwing without crashing | 4 | Fault isolation |
| marks unknown agent types as failed | 4 | Unknown type handling |
| claims tasks via UPDATE...RETURNING | 4 | Atomic claim pattern |

### src/app/api/cron/email-touchpoints/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 401 for missing Authorization header | 3 | Auth gate |
| returns 401 for wrong secret | 3 | Auth gate |
| returns 200 with correct secret and empty user set | 3 | Empty set |
| sends Day 1 nudge emails to qualifying users | 4 | Business logic: day-1 trigger |
| sends Day 7 nudge emails to qualifying users | 4 | Business logic: day-7 trigger |
| caps total emails at 50 per batch | 4 | Batch safety limit |
| continues processing when a single email fails | 4 | Fault tolerance |
| does not expose CRON_SECRET in response body | 4 | Security |

### src/app/api/cron/purge/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 401 when Authorization header is absent | 3 | Auth gate |
| returns 401 for wrong secret | 3 | Auth gate |
| returns 401 for wrong scheme | 3 | Auth gate |
| proceeds when Authorization is correct | 3 | Happy path gate |
| executes DELETE SQL for sessions older than 30 days | 4 | GDPR purge logic verification via mock SQL |
| executes DELETE SQL for xray_results older than 30 days | 4 | GDPR purge logic |
| returns purged counts from db.execute results | 4 | Response shape with real counts |
| returns 0 when db.execute returns rowCount: null | 3 | Null safety |

### src/app/api/discovery/__tests__/upload-security.test.ts
| Test | Score | Reason |
|------|-------|--------|
| wraps ocrText in ocr-data tags | 4 | Prompt injection defense: tag wrapping |
| rejects ocrText longer than 50,000 chars | 4 | Size guard before AI call |
| ocrText containing closing tag does not escape wrapper | 4 | Injection escape test |
| upload route returns 500 for ChatGPT zip bomb | 4 | Zip bomb protection |
| upload route returns 422 for Google zip bomb | 4 | Zip bomb protection |
| rejects image/gif on screentime | 4 | MIME validation |
| rejects application/pdf on screentime | 4 | MIME validation |
| rejects text/plain masquerading as .zip | 4 | MIME + extension validation |
| accepts application/octet-stream for chatgpt | 4 | Browser MIME tolerance |
| accepts .zip extension fallback | 4 | Extension fallback |
| rejects arbitrary binary for claude | 4 | MIME validation |
| accepts text/plain for claude | 4 | Common MIME tolerance |
| returns 400 for empty sessionId | 3 | Validation |
| returns 400 for long sessionId | 3 | Validation |
| extracts first segment from x-forwarded-for | 4 | IP extraction for rate limiting |
| falls back to "unknown" when no x-forwarded-for | 4 | Fallback |
| checkRateLimit returns success when limiter is null | 4 | Redis-not-configured fallback |

### src/app/api/discovery/adaptive/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 429 when rate limited | 3 | Rate limit |
| returns 400 when sessionId is absent | 3 | Validation |
| returns 404 when session not found | 3 | Not found |
| returns 400 when screenTimeData is null | 4 | Prerequisite check |
| returns 400 when screenTimeData.apps is empty | 4 | Prerequisite check |
| maps screenTime.apps to correct shape | 4 | Data transformation verification |
| passes occupation from session | 3 | Parameter forwarding |
| passes ageBracket from session | 3 | Parameter forwarding |
| defaults occupation to "unknown" | 4 | Null safety |
| defaults ageBracket to "unknown" | 4 | Null safety |
| returns { followUps } array | 3 | Response shape |
| returns 500 when AI throws | 3 | Error path |

### src/app/api/discovery/analyze/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 429 when rate limited | 3 | Rate limit |
| returns 400 when sessionId is absent | 3 | Validation |
| returns 400 when sessionId exceeds 32 chars | 3 | Validation |
| returns 404 when session not found | 3 | Not found |
| returns 200 with cached analysis | 4 | Cache hit: no AI call made |
| response body includes analysis and sessionId | 3 | Response shape |
| builds AnalysisInput from all session data columns | 4 | Data assembly verification |
| defaults quizPicks to [] when null | 4 | Null safety |
| defaults aiComfort to 1 when null | 4 | Null safety |
| calls runCrossAnalysis with assembled input | 3 | Mock call verification |
| persists analysis, recommendedApp, learningModules | 4 | DB persistence verification |
| returns success response | 3 | Response shape |
| returns 500 when AI throws | 3 | Error path |

### src/app/api/discovery/session/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 429 with RATE_LIMITED code | 3 | Rate limit |
| returns 400 when occupation is missing | 3 | Validation |
| returns 400 when occupation exceeds 50 chars | 3 | Validation |
| returns 400 when ageBracket is missing | 3 | Validation |
| returns 400 when quizPicks is empty array | 3 | Validation |
| returns 400 when quizPicks has more than 12 entries | 3 | Validation |
| returns 400 when aiComfort is 0 (below min) | 3 | Validation |
| returns 400 when aiComfort is 5 (above max) | 3 | Validation |
| returns 400 when aiToolsUsed has more than 10 entries | 3 | Validation |
| inserts session into DB with all provided fields | 4 | DB insert shape verification |
| returns sessionId as 16-character nanoid | 4 | ID format verification |
| returns HTTP 200 | 3 | Status code |
| returns 500 when DB insert throws | 3 | Error path |

### src/app/api/discovery/upload/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 429 when rate limited | 3 | Rate limit |
| returns 400 when both file and ocrText absent | 3 | Validation |
| returns 400 when platform absent | 3 | Validation |
| returns 400 when sessionId absent | 3 | Validation |
| returns 400 for unknown platform value | 3 | Validation |
| returns 400 when sessionId exceeds 32 chars | 3 | Validation |
| returns 400 for image/gif MIME on screentime | 4 | MIME validation |
| returns 400 for oversized image | 4 | Size validation |
| returns 400 for non-image MIME on subscriptions | 3 | MIME validation |
| returns 400 for non-image MIME on battery | 3 | MIME validation |
| returns 400 for non-image MIME on storage | 3 | MIME validation |
| returns 400 for non-image MIME on calendar | 3 | MIME validation |
| returns 400 for non-image MIME on health | 3 | MIME validation |
| returns 400 for non-image MIME on adaptive | 3 | MIME validation |
| returns 400 for non-ZIP MIME on chatgpt | 4 | MIME validation |
| accepts octet-stream MIME for chatgpt | 4 | Browser tolerance |
| returns 400 for oversized ZIP on chatgpt | 4 | Size validation |
| returns 400 for non-ZIP MIME on google | 3 | MIME validation |
| returns 400 for non-JSON MIME on claude | 3 | MIME validation |
| accepts text/plain for claude | 4 | Common MIME tolerance |
| returns 400 for oversized JSON on claude | 4 | Size validation |
| returns 400 when ocrText exceeds 50,000 chars | 4 | Size validation |
| ocrText wins over file when both provided | 4 | Priority logic |
| uses OCR path when ocrText is non-empty even with file | 4 | Branch selection |
| returns 400 for ocrText on chatgpt platform | 4 | Platform-specific validation |
| returns 400 for ocrText on claude platform | 4 | Platform-specific validation |
| returns 400 for ocrText on google platform | 4 | Platform-specific validation |
| returns 404 when session not found | 3 | Not found |
| returns cached: true on second upload | 4 | Idempotency |
| does NOT apply idempotency for adaptive | 4 | Platform exception |
| calls extractFromOcrText with sourceType screentime | 4 | Routing verification |
| calls extractScreenTime (Vision) when only file provided | 4 | Branch routing |
| returns 422 when extractFromOcrText returns error | 3 | Error propagation |
| returns 422 when extractScreenTime returns error | 3 | Error propagation |
| updates session.screenTimeData in DB | 4 | DB persistence |
| returns success response for screentime | 3 | Response shape |
| chatgpt: returns 400 when no file | 3 | Validation |
| chatgpt: calls parseChatGptExport then extractTopics | 4 | Pipeline verification |
| chatgpt: strips _rawMessages before persisting | 4 | Data sanitization |
| chatgpt: returns 422 for missing conversations.json | 4 | Parser error propagation |
| chatgpt: returns 422 for invalid JSON | 4 | Parser error propagation |
| chatgpt: returns 422 for non-array | 4 | Parser error propagation |
| chatgpt: returns 422 for zip bomb | 4 | Security |
| claude: returns 400 when no file | 3 | Validation |
| claude: calls parseClaudeExport then extractTopics | 4 | Pipeline verification |
| claude: strips _rawMessages before persisting | 4 | Data sanitization |
| google: returns 400 when no file | 3 | Validation |
| google: calls parseGoogleTakeout then extractGoogleTopics | 4 | Pipeline verification |
| google: strips _rawSearches and _rawYoutubeWatches | 4 | Data sanitization |
| google: persists youtubeTopCategories as null for empty | 4 | Null handling |
| subscriptions/battery/etc: calls extractFromOcrText | 3 | Routing |
| subscriptions/battery/etc: calls extractFromScreenshot (Vision) | 4 | Branch routing |
| subscriptions/battery/etc: returns 422 on extraction error | 3 | Error propagation |
| subscriptions/battery/etc: updates correct DB column | 4 | Column mapping |
| adaptive: reads appName from formData | 4 | FormData extraction |
| adaptive: uses JSONB COALESCE atomic append | 4 | Atomic DB operation |
| adaptive: allows multiple uploads | 4 | No idempotency guard |
| adaptive: returns success after append | 3 | Response shape |
| adaptive: handles null appName | 4 | Null safety with fallback |
| resolveAdaptiveSourceType: maps Strava to health | 4 | Domain mapping |
| resolveAdaptiveSourceType: maps Nike Run Club to health | 4 | Domain mapping |
| resolveAdaptiveSourceType: maps Google Calendar to calendar | 4 | Domain mapping |
| resolveAdaptiveSourceType: maps Outlook to calendar | 4 | Domain mapping |
| resolveAdaptiveSourceType: maps Revolut to subscriptions | 4 | Domain mapping |
| resolveAdaptiveSourceType: maps Photos to storage | 4 | Domain mapping |
| resolveAdaptiveSourceType: maps Dropbox to storage | 4 | Domain mapping |
| resolveAdaptiveSourceType: maps unknown to subscriptions | 4 | Fallback |
| resolveAdaptiveSourceType: case-insensitive | 4 | Robustness |
| resolveAdaptiveSourceType: returns subscriptions for null | 4 | Null safety |

### src/app/api/onboarding/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| rejects unauthenticated requests with 401 | 3 | Auth gate |
| rejects invalid vertical id with 400 | 3 | Validation |
| creates project with valid hair-beauty vertical | 4 | Happy path with vertical-specific template and wishes |
| creates project with consulting vertical | 4 | Different vertical path |
| accepts optional business name | 4 | Optional field handling |
| rejects missing body with 400 | 3 | Validation |

### src/app/api/webhooks/resend/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 401 when RESEND_WEBHOOK_SECRET is not set | 4 | Env guard |
| returns 401 when svix headers are missing | 4 | Signature verification |
| returns 401 when svix verification fails | 4 | Signature verification |
| returns 400 when payload has no type | 3 | Validation |
| returns 400 when payload has no email_id | 3 | Validation |
| email.delivered: transitions verifying task to done | 4 | State machine transition |
| email.delivered: does not transition non-verifying task | 4 | Guard on current state |
| email.delivered: returns matched: false when no task found | 4 | Not found path |
| email.bounced: transitions verifying to failed | 4 | State machine |
| email.bounced: transitions failed to escalated | 4 | Escalation logic |
| email.complained: transitions verifying to failed | 4 | State machine |
| email.complained: transitions failed to escalated | 4 | Escalation logic |
| idempotency: processing same delivered event twice | 4 | Idempotent handling |
| idempotency: processing same bounced event twice | 4 | Idempotent handling |
| unhandled event: returns 200 without side effects | 3 | Catchall |

### src/app/api/workspace/[projectId]/agent/events/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (12 total: 6 JSON + 6 SSE) | 4 | Auth checks, ownership verification, ordering, empty set, error handling, SSE content-type and stream format |

### src/app/api/workspace/[projectId]/agent/tasks/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (16 total) | 4 | Auth, ownership, validation, approve/reject transitions, 404 for missing task, 409 for invalid transition, 500 on error |

### src/app/api/workspace/[projectId]/apply-template/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (est. 8) | 4 | Auth, ownership, template application with card insertion |

### src/app/api/workspace/[projectId]/ask-question/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 401 when no auth cookie | 3 | Auth gate |
| returns 400 when projectId is not a UUID | 3 | Validation |
| returns 400 when questionIndex is out of range | 3 | Validation |
| returns the question from Haiku on success | 4 | AI integration with mock |
| calls Haiku with the themed system prompt | 4 | Prompt verification |
| returns 404 when project does not exist | 3 | Not found |

### src/app/api/workspace/[projectId]/bookings/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| creates a booking without auth (public endpoint) | 4 | Important: public endpoint design verification |
| includes business name from project wishes | 4 | Data assembly from wishes |
| falls back to project name when no businessName | 4 | Fallback logic |
| accepts optional note field | 3 | Optional field |
| returns 400 when required fields missing | 3 | Validation |
| returns 400 when email is invalid | 3 | Validation |
| returns 400 on invalid JSON | 3 | Validation |
| returns 400 when projectId is not a UUID | 3 | Validation |
| returns 500 when proposeTask throws | 3 | Error path |
| returns 429 when rate limited | 3 | Rate limit |
| GET: returns 401 when no auth cookie | 3 | Auth gate |
| GET: returns 401 when cookie is invalid | 3 | Auth gate |
| GET: returns 404 when project does not belong to user | 4 | Ownership check |
| GET: returns recent bookings | 4 | Happy path |
| GET: returns empty list | 3 | Empty set |
| GET: returns 500 when getTaskHistory throws | 3 | Error path |

### src/app/api/workspace/[projectId]/build/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (est. 12) | 4 | Auth, ownership, SSE streaming, build orchestration mock, error handling |

### src/app/api/workspace/[projectId]/cards/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| GET: returns 401 when no auth | 3 | Auth gate |
| GET: returns 401 when cookie is invalid | 3 | Auth gate |
| GET: returns 404 when project does not belong to user | 4 | Ownership |
| GET: returns empty list | 3 | Empty set |
| GET: returns cards ordered by parentId nulls first, then position | 4 | Ordering logic |
| POST: returns 401 | 3 | Auth gate |
| POST: returns 404 when project does not exist | 3 | Not found |
| POST: returns 400 on invalid JSON | 3 | Validation |
| POST: returns 400 when title is missing | 3 | Validation |
| POST: returns 400 when title exceeds 80 chars | 3 | Validation |
| POST: creates card with defaults and returns 201 | 4 | Happy path |
| POST: creates subtask under parent milestone | 4 | Parent-child relationship |
| POST: auto-increments position | 4 | Position logic |
| PATCH: returns 401 | 3 | Auth gate |
| PATCH: returns 404 when project does not exist | 3 | Not found |
| PATCH: returns 400 on invalid update data | 3 | Validation |
| PATCH: updates card and returns updated record | 4 | Happy path |
| PATCH: returns 404 when card does not exist | 3 | Not found |
| DELETE: returns 401 | 3 | Auth gate |
| DELETE: returns 404 when card does not exist | 3 | Not found |
| DELETE: deletes card and returns success | 4 | Happy path |
| DELETE: cascade deletes subtasks via FK | 4 | Cascade behavior |
| PATCH reorder: returns 401 | 3 | Auth gate |
| PATCH reorder: returns 404 when project does not exist | 3 | Not found |
| PATCH reorder: returns 400 on invalid body | 3 | Validation |
| PATCH reorder: reorders cards by updating positions | 4 | Reorder logic |
| PATCH reorder: returns 400 for non-UUID cardIds | 3 | Validation |

### src/app/api/workspace/[projectId]/generate-plan/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 401 when no auth | 3 | Auth gate |
| returns 401 when cookie is invalid | 3 | Auth gate |
| returns 400 when projectId is not a UUID | 3 | Validation |
| returns 400 when messages array is empty | 3 | Validation |
| returns 400 on invalid JSON body | 3 | Validation |
| calls Haiku with the plan generation system prompt | 4 | AI prompt verification |
| validates Haiku output with Zod and inserts cards | 4 | Zod validation + DB insert |
| retries once when Haiku output fails validation | 4 | Retry logic with bad-then-good mock |
| returns 500 when both attempts fail validation | 4 | Exhausted retry |
| returns 404 when project does not exist | 3 | Not found |

### src/app/api/workspace/[projectId]/generate-proposal/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (est. 8) | 4 | Auth, validation, AI call verification, Zod output validation |

### src/app/api/workspace/[projectId]/improve-prompt/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 401 when no auth | 3 | Auth gate |
| returns 429 when rate limited | 3 | Rate limit |
| calls Haiku with the defensive system prompt | 4 | AI prompt verification |
| validates Haiku output with Zod | 4 | Zod validation |
| returns 500 when Haiku output fails Zod | 4 | Zod rejection |
| truncates oversized improved text | 4 | Size guard on AI output |
| returns 400 when description exceeds 500 chars | 3 | Input validation |
| includes acceptance criteria in user message | 4 | Conditional prompt assembly |
| returns 404 when project does not exist | 3 | Not found |

### src/app/api/workspace/[projectId]/settings/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| GET: returns 401 when no auth | 3 | Auth gate |
| GET: returns 401 when cookie is invalid | 3 | Auth gate |
| GET: returns 404 when project does not belong to user | 4 | Ownership |
| GET: returns current wishes | 4 | Happy path |
| GET: returns empty object when wishes is null | 4 | Null safety |
| GET: returns 500 when db throws | 3 | Error path |
| PUT: returns 401 | 3 | Auth gate |
| PUT: returns 401 when cookie is invalid | 3 | Auth gate |
| PUT: returns 404 when project does not belong to user | 4 | Ownership |
| PUT: returns 400 on invalid JSON | 3 | Validation |
| PUT: returns 400 when body has unknown keys only | 3 | Validation |
| PUT: updates businessName in wishes | 4 | Happy path |
| PUT: updates services in wishes | 4 | Happy path |
| PUT: updates hours in wishes | 4 | Happy path |
| PUT: merges with existing wishes | 4 | Merge semantics (no clobber) |
| PUT: returns 400 when projectId is not a UUID | 3 | Validation |
| PUT: returns 500 when db update throws | 3 | Error path |

### src/app/api/workspace/[projectId]/wishes/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (est. 8) | 4 | Auth, ownership, CRUD for wishes with merge semantics |

### src/app/api/workspace/projects/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| POST: returns 401 when no auth | 3 | Auth gate |
| POST: returns 401 when cookie is invalid | 3 | Auth gate |
| POST: returns 400 on invalid JSON | 3 | Validation |
| POST: returns 400 when name has wrong type | 3 | Validation |
| POST: returns 400 when name exceeds length cap | 3 | Validation |
| POST: returns 400 when name contains forbidden chars | 3 | Validation |
| POST: creates project with given name | 4 | Happy path |
| POST: uses default name when none provided | 4 | Default value |
| POST: seeds project with Next.js + Panda starter | 4 | Template seeding |
| GET: returns 401 when no auth | 3 | Auth gate |
| GET: returns 401 when cookie is invalid | 3 | Auth gate |
| GET: returns empty list | 3 | Empty set |
| GET: returns list in DB order | 4 | Ordering |
| GET: returns 500 when DB throws | 3 | Error path |
| GET: scopes query to authenticated user | 4 | Ownership scoping |

### src/app/api/workspace/projects/__tests__/serialize-error.test.ts
| Test | Score | Reason |
|------|-------|--------|
| omits stack in production | 4 | Security: no stack traces in prod |
| includes stack in development | 4 | DX: stack traces in dev |
| handles non-Error values | 4 | Defensive serialization |
| recursively serializes cause | 4 | Error chain handling |
| truncates cause chain deeper than maxDepth | 4 | DoS protection on deep chains |

### src/app/api/workspace/tokens/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (est. 5) | 4 | Auth, balance query, response shape |

### src/app/api/workspace/tokens/claim-daily/__tests__/route.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 401 when no auth | 3 | Auth gate |
| returns alreadyClaimed when Redis NX returns null | 4 | Idempotent daily claim |
| credits daily bonus on first claim | 4 | Happy path with token credit |
| calls Redis SET with nx and 86400s expiry | 4 | Redis atomic guard verification |
| returns 503 when rate limiter reports serviceError | 4 | Redis down handling |
| deletes Redis key when creditTokens fails | 4 | Compensating transaction (rollback) |

### src/entities/booking-verticals/__tests__/data.test.ts
| Test | Score | Reason |
|------|-------|--------|
| has at least 5 verticals | 3 | Data invariant |
| every vertical has a unique id | 4 | Uniqueness constraint |
| every vertical has at least 2 default services | 3 | Data invariant |
| every service has positive duration and non-negative price | 4 | Domain invariant |
| every vertical has valid hours | 4 | Data format validation |
| includes hair-beauty vertical | 3 | Existence check |
| includes other as catch-all | 3 | Existence check |
| getVerticalById returns correct vertical | 4 | Lookup function |
| getVerticalById returns undefined for unknown | 4 | Negative lookup |

### src/entities/project-step/__tests__/derive-step.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns Planning when no cards exist | 5 | Pure logic: empty state |
| ignores milestone cards (parentId === null) | 5 | Pure logic: filtering |
| returns Complete when all subtasks are built | 5 | Pure logic: completion |
| returns next card title for partial progress | 5 | Pure logic: step derivation |
| picks the lowest-position non-built card | 5 | Pure logic: ordering |
| truncates long card titles to 30 characters | 5 | Pure logic: truncation |

### src/features/auth/__tests__/sign-out.test.ts
| Test | Score | Reason |
|------|-------|--------|
| calls DELETE /api/auth/me | 4 | Verifies fetch call shape |
| returns ok on 200 response | 4 | Happy path |
| returns failure message on non-2xx | 4 | Error path |
| returns network error message on fetch throw | 4 | Network error |

### src/features/kanban/__tests__/derive-milestone-state.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns not_started for empty subtask array | 5 | Pure state machine: empty |
| returns not_started when all draft | 5 | Pure state machine |
| returns complete when all built | 5 | Pure state machine |
| returns needs_attention when any failed | 5 | Pure state machine |
| returns needs_attention when any needs_rework | 5 | Pure state machine |
| returns in_progress when a subtask is queued | 5 | Pure state machine |
| returns in_progress when a subtask is building | 5 | Pure state machine |
| returns in_progress for mixed draft and ready | 5 | Pure state machine |
| returns in_progress when some built and some draft | 5 | Pure state machine |
| prioritizes needs_attention over in_progress | 5 | Priority ordering |

### src/features/kanban/__tests__/group-cards.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns empty milestones and empty map for empty input | 5 | Pure logic: empty |
| separates milestones from subtasks | 5 | Pure logic: partitioning |
| sorts milestones by position | 5 | Pure logic: ordering |
| sorts subtasks within a milestone by position | 5 | Pure logic: nested ordering |
| handles milestones with no subtasks | 5 | Pure logic: edge case |
| handles subtasks whose milestone is missing | 5 | Pure logic: orphan handling |

### src/features/kanban/__tests__/parse-prompt-anatomy.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns score 0 and all 5 missing for empty string | 5 | Pure parsing logic |
| returns score 0 for whitespace-only | 5 | Pure parsing |
| detects role and task in simple prompt | 5 | Pure parsing: segment detection |
| detects all 5 segments in full prompt | 5 | Pure parsing: complete |
| detects constraints without role | 5 | Pure parsing: partial match |
| matches case-insensitively | 5 | Pure parsing |
| only captures first match per segment type | 5 | Pure parsing: dedup |
| returns correct startIndex and endIndex | 5 | Pure parsing: position |
| detects context with "Based on" trigger | 5 | Pure parsing |
| detects format with "as a list" trigger | 5 | Pure parsing |

### src/features/kanban/__tests__/topological-sort.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns empty sorted array for empty input | 5 | Pure algorithm: base case |
| preserves a single subtask | 5 | Pure algorithm: trivial |
| sorts subtasks with linear dependencies | 5 | Pure algorithm: chain |
| handles diamond dependencies | 5 | Pure algorithm: DAG |
| detects a simple cycle | 5 | Pure algorithm: error case |
| detects a 3-node cycle | 5 | Pure algorithm: error case |
| handles subtasks with no dependencies | 5 | Pure algorithm: independent |
| ignores external dependencies | 5 | Pure algorithm: robustness |

### src/features/project-onboarding/__tests__/schemas.test.ts
| Test | Score | Reason |
|------|-------|--------|
| generatePlanRequestSchema: accepts valid messages | 5 | Pure Zod schema validation |
| generatePlanRequestSchema: accepts 1 message | 5 | Pure schema |
| generatePlanRequestSchema: rejects empty messages | 5 | Pure schema |
| generatePlanRequestSchema: rejects empty content | 5 | Pure schema |
| planOutputSchema: accepts valid plan | 5 | Pure schema |
| planOutputSchema: rejects fewer than 2 milestones | 5 | Pure schema |
| planOutputSchema: rejects empty acceptance criteria | 5 | Pure schema |
| askQuestionRequestSchema: accepts valid | 5 | Pure schema |
| askQuestionRequestSchema: rejects out of range | 5 | Pure schema |
| getTokenCostRange: returns known ranges | 5 | Pure lookup |
| getTokenCostRange: returns default for unknown | 5 | Pure lookup |

### src/features/share-flow/__tests__/SharePanel.test.tsx
| Test | Score | Reason |
|------|-------|--------|
| renders the subdomain URL | 3 | Component render with jsdom; verifies URL construction |
| copies the full URL to clipboard on click | 3 | Tests navigator.clipboard.writeText mock |
| shows "Copied!" after clicking copy | 3 | UI state transition |
| links WhatsApp button to wa.me with the URL | 3 | Link construction |
| opens WhatsApp link in a new tab | 3 | target="_blank" check |
| has aria-labels on all share buttons | 3 | Accessibility |
| shows Instagram tooltip on click | 3 | UI interaction |

### src/features/teaching-hints/__tests__/hints.test.ts
| Test | Score | Reason |
|------|-------|--------|
| has at least 5 hints | 2 | Weak: checks array length, not behavior |
| every hint has a unique id | 4 | Uniqueness invariant |
| every hint has non-empty text | 2 | Weak: truthy check on data |
| no hint text contains forbidden words | 4 | Brand voice enforcement |
| includes the onboarding hint | 2 | Existence check on specific data |
| exports HintId type covering all hint ids | 2 | Type coverage check -- tests TS not behavior |

### src/features/token-economy/ui/__tests__/TokenBalancePill.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns green for balance above 50 | 5 | Pure function: threshold logic |
| returns amber for balance between 10 and 50 | 5 | Pure function: range boundaries |
| returns red for balance below 10 | 5 | Pure function: threshold |

### src/features/visual-feedback/__tests__/FeedbackBar.test.tsx
| Test | Score | Reason |
|------|-------|--------|
| renders textarea and Send button | 3 | Component render check |
| Send is disabled when textarea is empty | 3 | Disabled state |
| shows clarification chips for short instructions | 3 | Conditional UI |
| shows Stitch suggestion for "logo" keyword | 3 | Keyword detection in UI |
| reference button has aria-label | 3 | Accessibility |

### src/features/workspace/__tests__/context.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (est. 12) | 3 | Tests Jotai atom state transitions via mock store; meaningful but heavily mocked |

### src/server/agents/__tests__/agent-task-service.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (23) | 4 | Mocked DB but tests state machine transitions: propose, approve, reject, fail, complete, escalate, reap stuck, with status guards |

### src/server/build-orchestration/__tests__/build-journey.test.ts
| Test | Score | Reason |
|------|-------|--------|
| full build journey: create project -> apply template -> build -> SSE events | 5 | Integration test: full pipeline with in-memory storage, SSE stream, Anthropic mock |
| build with unsafe path traversal triggers failed event | 5 | Security: path traversal detection |
| build with reserved path segment triggers failed event | 5 | Security: node_modules write prevention |
| deploy gracefully skips when no sandbox provider | 4 | Graceful degradation |

### src/server/build-orchestration/__tests__/build-pipeline-integration.test.ts
| Test | Score | Reason |
|------|-------|--------|
| commits multiple realistic files and makes them readable | 5 | Integration: AI output -> validation -> storage roundtrip |
| file_written events carry correct contentHash and sizeBytes | 5 | Integration: event data integrity |
| preserves untouched files, updates modified, adds new | 5 | Multi-build: incremental update semantics |
| second build references first build as parentBuildId | 5 | Build lineage |
| Anthropic receives current project files in prompt | 4 | Prompt assembly verification |
| rejects: path traversal with .. | 5 | Security |
| rejects: nested path traversal | 5 | Security |
| rejects: write to node_modules | 5 | Security |
| rejects: write to .env | 5 | Security |
| rejects: write to .env.local | 5 | Security |
| rejects: write to .env.production | 5 | Security |
| rejects: write to .git directory | 5 | Security |
| rejects: write to .next build output | 5 | Security |
| rejects: write to .vercel config | 5 | Security |
| rejects: absolute path | 5 | Security |
| rejects: redundant dot segment | 5 | Security |
| rejects: write to dist directory | 5 | Security |
| rejects: write to .turbo directory | 5 | Security |
| rejects path with backslash | 5 | Security: Windows-style path |
| rejects path with null byte injection | 5 | Security |
| rejects empty path | 5 | Security |
| rejects path with control characters | 5 | Security |
| accepts valid safe paths | 5 | Positive case |
| SSE encode -> stream -> decode preserves all fields | 5 | Integration: SSE roundtrip |
| event order is started -> prompt_sent -> file_written -> committed | 5 | Integration: event ordering |
| committed event carries tokenCost, actualCents, fileCount | 5 | Event data completeness |
| file_written events have monotonically increasing fileIndex | 5 | Event ordering invariant |
| emits committed without sandbox_ready when sandbox is null | 4 | Graceful degradation |
| sandbox failure post-commit does not prevent committed | 4 | Fault isolation |
| ledger is not debited when Sonnet returns no tool_use | 4 | Token economy: no-charge on bad response |
| ledger is not debited when Sonnet response is truncated | 4 | Token economy: no-charge on truncation |
| ledger is not debited when path safety rejects all files | 4 | Token economy: no-charge on rejection |
| ledger IS debited on successful build | 4 | Token economy: charge on success |
| pre-flight ceiling check prevents Sonnet call | 4 | Cost guard |
| first build on project with only genesis file works | 4 | Edge case |
| build on project with many existing files includes all in prompt | 4 | Prompt assembly |
| Zod rejects tool_use with missing content field | 4 | AI output validation |
| Zod rejects tool_use with numeric path | 4 | AI output validation |
| build with abort signal stops the pipeline | 4 | Cancellation |
| global spend guard blocks build when paused | 4 | Spend guard |
| global spend guard blocks build when ceiling exceeded | 4 | Spend guard |

### src/server/build-orchestration/__tests__/routes-tracked.test.ts
| Test | Score | Reason |
|------|-------|--------|
| found route files on disk | 5 | Meta-test: verifies test infra sees route files |
| each route file is tracked by git | 5 | Real git ls-files check; caught actual .gitignore bug |

### src/server/build/__tests__/first-build-email-toctou.test.ts
| Test | Score | Reason |
|------|-------|--------|
| does not send email when UPDATE rowCount is 0 | 4 | TOCTOU fix: concurrent call already sent |
| sends email when UPDATE rowCount is 1 | 4 | TOCTOU fix: first caller wins |

### src/server/deploy/__tests__/guarded-deploy-call.test.ts
| Test | Score | Reason |
|------|-------|--------|
| does not waste rate-limit slot when hourly cap is at limit | 4 | Pre-flight check before incrementing |
| does not waste rate-limit slot when daily cap is at limit | 4 | Pre-flight check |

### src/server/deploy/__tests__/sleep-listener-leak.test.ts
| Test | Score | Reason |
|------|-------|--------|
| removes abort listener after timer fires normally | 5 | Real getEventListeners check: memory leak prevention |
| cleans up timer when signal aborts | 5 | Real abort signal: cleanup verification |

### src/server/deploy/__tests__/vercel-deploy.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns not_configured when MELDAR_DEPLOY_TOKEN is missing | 4 | Env guard |
| runs the full 6-step sequence on happy path | 4 | Full deploy pipeline mock |
| handles 409 on project create by looking up existing | 4 | Idempotent project creation |
| maps ERROR readyState to deployment_build_failed | 4 | State mapping |
| maps upload failure to upload_failed with path | 4 | Error with context |
| accepts 409 on addDomain as idempotent success | 4 | Idempotent domain |

### src/server/discovery/__tests__/adaptive.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (est. 8) | 4 | AI call verification with mock, Zod output validation, prompt assembly |

### src/server/discovery/__tests__/analyze.test.ts
| Test | Score | Reason |
|------|-------|--------|
| always includes Quiz Picks and AI Comfort Level | 4 | Prompt assembly: required sections |
| formats aiComfort label as "Never touched AI" for value 1 | 4 | Label mapping |
| formats aiComfort label as "Use it daily" for value 4 | 4 | Label mapping |
| includes Screen Time Data section only when defined | 4 | Conditional section |
| includes ChatGPT Usage section | 4 | Conditional section |
| includes Claude Usage section independently of chatgpt | 4 | Independence check |
| includes Google Search Topics section | 4 | Conditional section |
| includes YouTube Watch Categories only when non-empty | 4 | Conditional section |
| includes App Subscriptions section | 4 | Conditional section |
| includes Battery Usage section | 4 | Conditional section |
| includes Storage Usage section | 4 | Conditional section |
| includes Calendar Week View with events capped at 15 | 4 | Cap enforcement |
| includes Health Data section with highlights | 4 | Conditional section |
| includes Adaptive Follow-Up Data section | 4 | Conditional section |
| omits all optional sections when data is undefined | 4 | Exclusion verification |
| calls Sonnet with ANALYSIS_TOOL and forced tool_choice | 4 | AI call shape |
| returns DiscoveryAnalysis with all required fields | 4 | Zod output validation |
| merges BASE_LEARNING_MODULES with personalized modules | 4 | Module merge logic |
| throws "no tool response" when no tool_use | 4 | Error handling |
| throws with Zod message when schema fails | 4 | Validation error |
| throws when complexity is not beginner/intermediate | 4 | Domain constraint |

### src/server/discovery/__tests__/extract-from-text.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns error for empty string | 5 | Input validation: pure check |
| returns error for whitespace-only | 5 | Input validation |
| calls Haiku with correct tool name for each sourceType (6 tests) | 4 | Tool routing per platform |
| wraps ocrText inside ocr-data tags | 4 | Prompt injection defense |
| system prompt contains anti-injection instruction | 4 | Security prompt verification |
| returns { data } with tool input on success | 4 | Happy path |
| returns error when no tool_use block | 4 | AI failure handling |
| returns error when Anthropic API throws | 4 | Network error handling |

### src/server/discovery/__tests__/extract-topics.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns empty arrays for empty messages | 5 | Early return: pure logic |
| truncates to first 300 messages | 4 | Token budget enforcement |
| joins with "---" separator | 4 | Prompt formatting |
| includes platform name in system prompt | 4 | Prompt parameterization |
| returns parsed topTopics and repeatedQuestions | 4 | Happy path |
| returns empty arrays when no tool_use block | 4 | Graceful degradation |
| returns empty arrays when Zod fails | 4 | Graceful degradation |
| extractGoogleTopics: returns empty for empty inputs | 5 | Early return |
| extractGoogleTopics: search only | 4 | Conditional section |
| extractGoogleTopics: YouTube only | 4 | Conditional section |
| extractGoogleTopics: both sections | 4 | Combined case |
| extractGoogleTopics: truncates to 300 each | 4 | Cap enforcement |
| extractGoogleTopics: returns parsed result | 4 | Happy path |
| extractGoogleTopics: returns empty for no tool_use | 4 | Graceful degradation |
| extractGoogleTopics: returns empty when Zod fails | 4 | Graceful degradation |

### src/server/discovery/__tests__/ocr.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (est. 6) | 4 | AI call verification with Vision API mock, base64 encoding, error handling |

### src/server/discovery/__tests__/preprocess-ocr.test.ts
| Test | Score | Reason |
|------|-------|--------|
| strips non-printable characters | 5 | Pure text processing |
| collapses multiple blank lines | 5 | Pure text processing |
| trims leading/trailing whitespace per line | 5 | Pure text processing |
| returns empty for blank input | 5 | Pure: edge case |
| handles whitespace-only input | 5 | Pure: edge case |
| extracts total screen time in h+m format | 5 | Pure regex extraction |
| extracts total screen time with only hours | 5 | Pure regex |
| extracts total screen time with only minutes | 5 | Pure regex |
| extracts daily average format | 5 | Pure regex |
| extracts pickups count | 5 | Pure regex |
| extracts notification count | 5 | Pure regex |
| extracts app entries with hours and minutes | 5 | Pure regex + categorization |
| extracts first used after pickup entries | 5 | Pure regex |
| handles Cyrillic app names | 5 | Unicode robustness |
| handles messy Tesseract output from real screenshot | 5 | Realistic data |
| includes structured summary section | 5 | Output format |
| includes app list in clean format | 5 | Output format |
| preserves original text as fallback | 5 | Fallback behavior |
| detects iOS from Screen Time keywords | 5 | Platform detection |
| detects Android from Digital Wellbeing keywords | 5 | Platform detection |
| returns unknown when no platform indicators | 5 | Default |
| categorizes social apps correctly | 5 | App categorization |
| categorizes communication apps correctly | 5 | App categorization |
| falls back to utility for unknown apps | 5 | Default category |
| cleans text for subscriptions without screen time regex | 5 | Platform-specific behavior |
| cleans text for battery source | 5 | Platform-specific behavior |

### src/server/discovery/parsers/__tests__/chatgpt.test.ts
| Test | Score | Reason |
|------|-------|--------|
| counts total conversations correctly | 5 | Pure parser with real ZIP |
| extracts user messages by traversing mapping tree | 5 | Complex tree traversal |
| truncates individual message text to 200 chars | 5 | Size guard |
| caps _rawMessages at 500 entries | 5 | Cap enforcement |
| returns platform: "chatgpt" | 5 | Platform tag |
| returns empty topTopics and repeatedQuestions | 5 | Placeholder fields |
| computes timePatterns via extractTimePatterns | 5 | Time analysis |
| throws for zip bomb (total > 500 MB) | 5 | Security: zip bomb |
| throws before any file content is extracted | 5 | Security: early rejection |
| throws for missing conversations.json | 5 | Error: missing file |
| throws for invalid JSON | 5 | Error: parse failure |
| throws for non-array root | 5 | Error: wrong shape |
| throws for null in array | 5 | Malformed data |
| throws for primitive in array | 5 | Malformed data |
| throws when mapping is not an object | 5 | Malformed data |
| skips conversation nodes with no mapping | 5 | Graceful skip |
| tolerates mapping: null | 5 | Soft-deleted conversations |
| skips non-user message nodes | 5 | Role filtering |

### src/server/discovery/parsers/__tests__/claude-export.test.ts
| Test | Score | Reason |
|------|-------|--------|
| parses conversations with chat_messages field | 5 | Real parser with real File |
| parses .messages format | 5 | Format variation |
| accepts sender === "human" | 5 | Sender mapping |
| accepts role === "user" | 5 | Role mapping |
| skips messages with no text/content | 5 | Graceful skip |
| truncates to 200 chars | 5 | Size guard |
| converts created_at to Unix timestamp | 5 | Time conversion |
| caps at 500 entries | 5 | Cap enforcement |
| returns platform: "claude" | 5 | Platform tag |
| extracts from root.conversations object format | 5 | Alternative format |
| throws for invalid JSON | 5 | Error handling |
| throws for primitive root | 5 | Schema enforcement |
| throws for number root | 5 | Schema enforcement |
| throws for null root | 5 | Schema enforcement |
| throws when .conversations is not array | 5 | Schema enforcement |

### src/server/discovery/parsers/__tests__/google-takeout.test.ts
| Test | Score | Reason |
|------|-------|--------|
| throws when file.size > 200 MB | 5 | Pre-extraction size guard |
| throws for zip bomb > 500 MB uncompressed | 5 | Zip bomb protection |
| throws before any entry content is read | 5 | Early rejection |
| extracts searches from ZIP paths | 5 | Path matching + extraction |
| strips "Searched for" prefix | 5 | Text cleanup |
| truncates each search to 100 chars | 5 | Size guard |
| caps _rawSearches at 500 | 5 | Cap enforcement |
| skips non-"Searched for" items | 5 | Filtering |
| reports malformed-JSON files as _skippedFileCount | 5 | Graceful error reporting |
| reports malformed items as _skippedItemCount | 5 | Graceful error reporting |
| extracts YouTube watches | 5 | Path matching |
| strips "Watched" prefix | 5 | Text cleanup |
| truncates watch title to 100 chars | 5 | Size guard |
| caps _rawYoutubeWatches at 500 | 5 | Cap enforcement |
| returns searchTopics: [] and youtubeTopCategories: null | 5 | Placeholder fields |
| returns emailVolume: null | 5 | Placeholder field |
| skips null item in search array | 5 | Zod boundary |
| skips item whose title is not a string | 5 | Zod boundary |
| skips primitive item in array | 5 | Zod boundary |
| handles malformed YouTube items | 5 | Zod boundary |
| matches non-English ZIP path | 5 | Locale tolerance |

### src/server/domains/__tests__/provision-subdomain.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (est. 6) | 4 | Mocked DB but tests slug generation + collision retry loop |

### src/server/domains/__tests__/slug.test.ts
| Test | Score | Reason |
|------|-------|--------|
| lowercases and replaces spaces | 5 | Pure string transform |
| strips possessive apostrophes | 5 | Pure string transform |
| collapses multiple spaces and hyphens | 5 | Pure string transform |
| removes leading/trailing hyphens | 5 | Pure string transform |
| strips accented characters via NFD | 5 | Unicode normalization |
| handles emoji and non-latin | 5 | Unicode robustness |
| returns "project" for empty/whitespace | 5 | Default fallback |
| preserves numbers | 5 | Pure string transform |
| handles already-slugified input | 5 | Idempotent |
| generateSubdomain appends .meldar.ai | 5 | Pure string concat |
| works with single-word slugs | 5 | Edge case |
| appendCollisionSuffix appends 4-char suffix | 5 | Format verification |
| produces different suffixes on repeated calls | 5 | Randomness check |

### src/server/identity/__tests__/auth-cookie.test.ts
| Test | Score | Reason |
|------|-------|--------|
| sets meldar-auth cookie with correct flags | 5 | Real NextResponse: HttpOnly, SameSite, Max-Age, Path |
| sets Secure flag in production | 5 | Environment-conditional flag |
| omits Secure flag in development | 5 | Environment-conditional flag |

### src/server/identity/__tests__/jwt.test.ts
| Test | Score | Reason |
|------|-------|--------|
| signToken returns a valid JWT string | 5 | Real JWT signing |
| verifyToken verifies valid token | 5 | Real JWT verification |
| returns null for invalid token | 5 | Rejection |
| returns null for tampered token | 5 | Integrity check |
| returns null for expired token | 5 | Expiry check |
| returns null for different secret | 5 | Secret isolation |
| defaults emailVerified to false for legacy tokens | 4 | Backward compat |
| preserves emailVerified: true through roundtrip | 5 | Claim roundtrip |
| rejects tokens signed with different algorithm | 5 | CWE-347 alg-confusion defense |
| getUserFromRequest: returns payload for valid cookie | 4 | Cookie extraction + verification |
| getUserFromRequest: returns null when no cookie header | 4 | Missing header |
| getUserFromRequest: returns null when no meldar-auth | 4 | Missing specific cookie |
| getUserFromRequest: returns null when tampered | 4 | Tampered cookie |
| getUserFromRequest: extracts from multiple cookies | 4 | Multi-cookie parsing |
| getSecret: throws if not set | 5 | Env guard |
| getSecret: throws if shorter than 32 chars | 5 | Minimum length |
| getSecret: accepts exactly 32 chars | 5 | Boundary |

### src/server/identity/__tests__/password.test.ts
| Test | Score | Reason |
|------|-------|--------|
| hashes and verifies correctly | 5 | Real bcrypt roundtrip |
| returns false for incorrect password | 5 | Real bcrypt negative case |
| generates different hashes for same password (salt) | 5 | Salt verification |
| handles empty string password | 5 | Edge case |

### src/server/identity/__tests__/require-auth.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (est. 7) | 4 | JWT verification + token version check with mocked DB |

### src/server/identity/__tests__/token-hash.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns correct SHA-256 for known test vector | 5 | Known-answer test |
| returns 64-character hex string | 5 | Format invariant |
| produces different hashes for different tokens | 5 | Collision resistance |
| produces same hash for same token | 5 | Determinism |

### src/server/lib/__tests__/cron-auth.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns false when CRON_SECRET is empty | 5 | Guard: empty secret |
| returns false when CRON_SECRET is shorter than 16 chars | 5 | Guard: weak secret |
| returns false when CRON_SECRET is undefined | 5 | Guard: missing env |
| returns false when authorization header is missing | 5 | Missing header |
| returns false when header does not match | 5 | Wrong value |
| returns true when header matches | 5 | Happy path |
| pads buffers to equal length before comparison | 5 | Timing-safe: no length oracle |

### src/server/projects/__tests__/list-user-projects.test.ts
| Test | Score | Reason |
|------|-------|--------|
| All tests (est. 6) | 4 | Mocked DB with subquery assembly verification for project stats |

### src/shared/lib/__tests__/format-relative.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns "just now" for timestamps within 5 seconds | 5 | Pure function: boundary |
| clamps future timestamps to "just now" | 5 | Pure function: negative delta |
| returns seconds between 5 and 59 | 5 | Pure function: second range |
| returns minutes between 1 and 59 | 5 | Pure function: minute range |
| returns hours between 1 and 23 | 5 | Pure function: hour range |
| returns days for >= 24 hours | 5 | Pure function: day range |

### src/shared/lib/__tests__/sanitize-next-param.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns /workspace for null | 5 | Pure function: null default |
| returns /workspace for undefined | 5 | Pure function |
| returns /workspace for empty string | 5 | Pure function |
| passes through /workspace | 5 | Pure function: valid path |
| passes through /workspace/abc | 5 | Pure function |
| passes through bare root / | 5 | Pure function |
| passes through /foo | 5 | Pure function |
| rejects //evil.com | 5 | Security: protocol-relative |
| rejects ///evil | 5 | Security |
| rejects http://evil | 5 | Security: absolute URL |
| rejects https://evil | 5 | Security |
| rejects javascript:alert(1) | 5 | Security: XSS |
| rejects data:text/html,foo | 5 | Security |
| rejects percent-encoded //evil.com | 5 | Security: encoding bypass |
| rejects backslash prefix | 5 | Security |
| rejects leading-space | 5 | Security |
| rejects bare hostname | 5 | Security |
| allows : inside query string | 5 | Colon handling |
| allows : inside query value | 5 | Colon handling |
| rejects : in path segment | 5 | Security |
| returns custom fallback for null | 5 | Options: fallback |
| returns custom fallback for empty | 5 | Options |
| returns custom fallback for rejected | 5 | Options |
| passes through valid with custom fallback | 5 | Options |
| mustStartWith: passes through matching | 5 | Options: prefix |
| mustStartWith: rejects non-matching | 5 | Options: prefix |
| mustStartWith: exact match | 5 | Options: boundary |

### src/widgets/workspace/__tests__/build-status.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns building when activeBuildCardId is set | 5 | Pure function: priority logic |
| returns building even when failureMessage is set | 5 | Pure function: building wins |
| returns failed when no active build but failure exists | 5 | Pure function |
| returns idle when both null | 5 | Pure function |
| buildPreviewSrc: appends ? when no query | 5 | Pure URL construction |
| buildPreviewSrc: appends & when query exists | 5 | Pure URL construction |
| buildPreviewSrc: handles localhost | 5 | Pure URL construction |

### src/widgets/workspace/__tests__/PreviewPane.test.ts
| Test | Score | Reason |
|------|-------|--------|
| rejects null | 5 | Pure validation |
| rejects empty string | 5 | Pure validation |
| rejects javascript: scheme | 5 | Security: XSS |
| rejects data: scheme | 5 | Security |
| rejects file: scheme | 5 | Security |
| rejects malformed URLs | 5 | Validation |
| accepts https URLs | 5 | Positive case |
| accepts http URLs | 5 | Positive case |

### src/widgets/workspace/__tests__/StepIndicator.test.ts
| Test | Score | Reason |
|------|-------|--------|
| returns 0% for first of N steps | 5 | Pure math |
| returns rounded percentage for mid-progress | 5 | Pure math |
| returns 100% when current equals total | 5 | Pure math |
| clamps over-100% to 100% | 5 | Pure math: overflow |
| clamps negative to 0% | 5 | Pure math: underflow |
| returns 0% when total is 0 | 5 | Pure math: division by zero |
| returns 0% when total is negative | 5 | Pure math: invalid input |

### src/__tests__/integration/auth-routes.test.ts
| Test | Score | Reason |
|------|-------|--------|
| inserts user with bcrypt-hashed password and retrieves by email | 5 | Real DB: bcrypt hash insert + eq() lookup + verifyPassword roundtrip (positive and negative) |
| selects exactly 1 row by email with eq() | 5 | Real DB: single-row email lookup, verifies id match |
| stores hashed reset token with expiry and retrieves by token + validity | 5 | Real DB: SHA-256 hashed token + composite WHERE with gt() expiry check |
| consumes reset token atomically — second UPDATE returns 0 rows | 5 | Real DB: atomic token consumption proving TOCTOU safety; second call returns empty |
| verifies email via token lookup and marks emailVerified=true | 5 | Real DB: token-based lookup + state transition + null-out consumed token columns |
| increments tokenVersion from 0 → 1 → 2 | 5 | Real DB: SQL expression `tokenVersion + 1` twice, verifies each intermediate value |
| inserts user with authProvider=google and emailVerified=true | 5 | Real DB: OAuth user creation with all columns verified including default tokenVersion=0 |
| throws unique constraint error on duplicate email insert | 5 | Real DB: unique constraint enforcement via rejects.toThrow |
| incrementing tokenVersion invalidates sessions holding the old version | 5 | Real DB: version bump + proof that old version no longer matches (session invalidation logic) |

### src/__tests__/integration/workspace-routes.test.ts
| Test | Score | Reason |
|------|-------|--------|
| create user → create project → list by userId → verify count=1 | 5 | Real DB: FK-scoped project listing with count and id verification |
| stores templateId correctly | 5 | Real DB: templateId column persistence and readback |
| inserts parent + children and verifies parentId relationships | 5 | Real DB: hierarchical kanban card insert with parent-child FK, count=3, child filtering |
| streaming → completed sets completedAt | 5 | Real DB: build status transition with sql`now()` timestamp column |
| inserts build file and verifies shape | 5 | Real DB: buildFile with content-addressed r2Key, contentHash, sizeBytes |
| updates same (projectId, path) with new contentHash and increments version | 5 | Real DB: projectFiles upsert with SQL `version + 1`, composite WHERE on projectId+path |
| debit + credit ordered by createdAt | 5 | Real DB: signed token amounts with orderBy(asc) verification |
| JSONB round-trips correctly | 5 | Real DB: nested JSONB (theme + pages array + features object) write + deep equality readback |
| soft-deleted project excluded from WHERE deletedAt IS NULL | 5 | Real DB: soft delete with sql`now()` then isNull filter returns empty |
| user B cannot see user A projects | 5 | Real DB: cross-user isolation with two users, user B query returns zero rows |

### src/__tests__/integration/agent-operations.test.ts
| Test | Score | Reason |
|------|-------|--------|
| transitions proposed → approved → executing → verifying → done with all timestamps | 5 | Real DB: full 5-state agent task lifecycle with timestamp instanceof Date checks at every step |
| transitions proposed → approved → executing → failed → escalated | 5 | Real DB: failure path with escalation, result JSON payload verified |
| transitions proposed → rejected | 5 | Real DB: rejection shortcut path with final readback |
| tasks in project A do not appear in project B queries | 5 | Real DB: cross-project task isolation, payload source verified |
| inserts 5 events and verifies order and types | 5 | Real DB: batch event insert with orderBy(asc(createdAt)), type sequence verification |
| inserts agent event with userId=null for system-initiated events | 5 | Real DB: nullable FK userId for system-initiated events, payload roundtrip |
| stores and retrieves autoApprove JSONB structure in wishes | 5 | Real DB: nested JSONB with boolean flags, deep property access verification |

### src/__tests__/integration/billing-flows.test.ts
| Test | Score | Reason |
|------|-------|--------|
| debits and credits token balance correctly | 5 | Real DB: SQL arithmetic `tokenBalance - 50` then `+ 25`, verifies intermediate balances 150 → 175 |
| inserts token transaction and verifies shape | 5 | Real DB: full tokenTransaction columns including referenceId and createdAt instanceof Date |
| inserts ai call log entry and verifies kind, model, tokens | 5 | Real DB: aiCallLog with all metrics (inputTokens, outputTokens, cachedRead/Write, centsCharged, latencyMs, status) |
| throws CHECK constraint when balance would go negative | 5 | Real DB: CHECK constraint enforcement via rejects.toThrow on negative balance arithmetic |
