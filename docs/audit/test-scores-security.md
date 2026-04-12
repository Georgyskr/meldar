# Test Validity -- Security (Final)

## Summary

Total: 1030 | Security-critical: 347 | 5: 62 | 4: 185 | 3: 383 | 2: 262 | 1: 138

### Iteration Notes

1. **Security fixes verified**: All prior audit findings hold. JWT alg-confusion (CWE-347), timing-safe cron auth, atomic reset-password, hashed tokens in DB, open redirect sanitization, prompt injection wrapping, zip bomb protection, stack stripping in production -- all still tested and passing.
2. **Sandbox wiring attack surface**: New sandbox-preview and sandbox-provider-factory tests cover the sandbox lifecycle. No new auth bypass surface -- sandbox start is gated behind the same requireAuth + verifyProjectOwnership chain. HMAC secret required for CloudflareSandboxProvider construction. Preview URLs pass through `isSafePreviewUrl` which blocks javascript:/data:/file: schemes. No SSRF vector -- sandbox URLs are output-only (rendered in iframe), not fetched server-side.
3. **Per-test scoring**: Every test scored 1-5 from a security lens. Score 5 = catches a real exploitable vulnerability. Score 1 = pure UI/logic with no security bearing.

## By File

### src/server/identity/__tests__/jwt.test.ts (17 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns a valid JWT string | 3 | Smoke test for token generation | None |
| verifies and returns payload for a valid token | 4 | Ensures valid tokens are accepted | None |
| returns null for an invalid token | 5 | Rejects forged tokens -- prevents authentication bypass | None |
| returns null for a tampered token | 5 | Detects payload tampering -- integrity check | None |
| returns null for an expired token | 5 | Enforces token expiry -- limits session lifetime | None |
| returns null for a token signed with a different secret | 5 | Prevents cross-system token reuse | None |
| defaults emailVerified to false for legacy tokens | 4 | Fail-secure default for missing claim | None |
| preserves emailVerified: true through roundtrip | 3 | Correctness of claim propagation | None |
| rejects tokens signed with a different algorithm (CWE-347) | 5 | Prevents algorithm confusion attack -- critical JWT vuln | None |
| returns payload for valid meldar-auth cookie | 4 | Cookie extraction works correctly | None |
| returns null when no cookie header present | 4 | No auth = no access | None |
| returns null when cookie header has no meldar-auth | 4 | Rejects unrelated cookies | None |
| returns null when meldar-auth cookie has tampered value | 5 | Forged cookie rejected | None |
| extracts token from cookie with multiple cookies | 3 | Parsing correctness | None |
| throws if AUTH_SECRET is not set | 5 | Fail-closed when secret missing | None |
| throws if AUTH_SECRET is shorter than 32 characters | 5 | Prevents weak signing keys | None |
| accepts AUTH_SECRET that is exactly 32 characters | 3 | Boundary validation | None |

### src/server/identity/__tests__/password.test.ts (4 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| hashes a password and verifies it correctly | 4 | Bcrypt roundtrip works | None |
| returns false for incorrect password | 4 | Wrong password rejected | None |
| generates different hashes for the same password (salt) | 5 | Verifies unique salts -- prevents rainbow table attacks | None |
| handles empty string password | 3 | Edge case coverage | None |

### src/server/identity/__tests__/auth-cookie.test.ts (3 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| sets meldar-auth cookie with correct flags | 5 | Verifies HttpOnly, SameSite=Lax, Path=/, Max-Age -- prevents XSS cookie theft | None |
| sets Secure flag in production | 5 | Prevents cleartext cookie transmission | None |
| omits Secure flag in development | 3 | Dev ergonomics | None |

### src/server/identity/__tests__/require-auth.test.ts (7 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 when no cookie present | 5 | Unauthenticated access blocked | None |
| returns 401 when cookie has invalid JWT | 5 | Forged tokens rejected | None |
| returns 401 when JWT is expired | 5 | Expired sessions rejected | None |
| returns 401 when tokenVersion in JWT does not match DB | 5 | Session revocation works -- logout invalidates all tokens | None |
| returns session object when token is valid and tokenVersion matches | 4 | Happy path correctness | None |
| returns 401 when user does not exist in DB (deleted account) | 5 | Deleted user cannot re-authenticate | None |
| propagates DB errors (fail-closed) | 5 | DB failure = denied access, not open access | None |

### src/server/identity/__tests__/token-hash.test.ts (4 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns the correct SHA-256 hex digest for a known test vector | 4 | Deterministic hashing verified | None |
| returns a 64-character hex string | 3 | Format correctness | None |
| produces different hashes for different tokens | 4 | No collisions on distinct inputs | None |
| produces the same hash for the same token (deterministic) | 3 | Idempotency | None |

### src/app/api/auth/__tests__/login.test.ts (10 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| logs in successfully with correct credentials | 3 | Happy path | None |
| rejects wrong password with 401 | 4 | Wrong password denied | None |
| rejects non-existent email with 401 (same message) | 5 | Prevents user enumeration -- same error for missing vs wrong | None |
| returns same error message for wrong password and non-existent email | 5 | Timing-oracle and enumeration prevention | None |
| rejects invalid input with 400 | 4 | Input validation | None |
| returns 500 on unexpected error | 3 | Error handling | None |
| returns 400 with INVALID_JSON for malformed body | 3 | Rejects malformed input | None |
| calls verifyPassword even when user is not found (timing parity) | 5 | Prevents timing-based user enumeration | None |
| calls setAuthCookie on successful login | 3 | Cookie issuance correctness | None |
| returns 429 when email-based rate limit exceeded | 5 | Per-email brute force protection | None |

### src/app/api/auth/__tests__/register.test.ts (19 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| registers successfully and returns JWT cookie | 3 | Happy path | None |
| stores hashed verifyToken in DB, sends raw token in email | 5 | Token not stored in plaintext -- prevents DB leak exploitation | None |
| includes verifyTokenExpiresAt in insert payload | 4 | Token expiry enforced | None |
| sends verification email via Resend | 3 | Functional correctness | None |
| registration succeeds even if Resend throws | 3 | Resilience | None |
| rejects duplicate email with generic 400 | 5 | Prevents user enumeration via registration | None |
| rejects invalid email format with 400 | 4 | Input validation | None |
| rejects password shorter than 8 characters | 4 | Password policy enforcement | None |
| returns 400 with INVALID_JSON for malformed body | 3 | Input validation | None |
| rejects missing fields with 400 | 3 | Input validation | None |
| rejects all-lowercase password (Finding #14) | 4 | Password complexity enforcement | None |
| rejects all-digit password (Finding #14) | 4 | Password complexity enforcement | None |
| rejects all-uppercase password (Finding #14) | 4 | Password complexity enforcement | None |
| accepts password with uppercase, lowercase and digit | 3 | Positive case for policy | None |
| returns 500 on unexpected error | 3 | Error handling | None |
| duplicate-email path takes similar time to success path (Finding #20) | 5 | Timing-based enumeration prevention | None |
| sends welcome email after registration | 2 | Functional | None |
| sends welcome email with null name | 2 | Functional | None |
| registration succeeds even if welcome email throws | 2 | Resilience | None |

### src/app/api/auth/__tests__/forgot-password.test.ts (9 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns success and sends email for existing user | 3 | Happy path | None |
| stores a SHA-256 hash in DB, not the raw token | 5 | Prevents DB leak exploitation for password reset | None |
| returns success for non-existing email (prevents enumeration) | 5 | Prevents user enumeration via forgot-password | None |
| sets reset token expiry to approximately 1 hour | 4 | Limits token lifetime | None |
| takes at least 500ms regardless of whether user exists | 5 | Timing-safe enumeration prevention | None |
| returns 400 with INVALID_JSON for malformed body | 3 | Input validation | None |
| rejects invalid email with 400 | 4 | Input validation | None |
| rejects missing email with 400 | 3 | Input validation | None |
| returns 500 on unexpected error | 3 | Error handling | None |

### src/app/api/auth/__tests__/reset-password.test.ts (15 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| resets password with valid token using atomic update | 4 | Correctness of reset flow | None |
| uses a single atomic UPDATE...RETURNING (no separate SELECT) | 5 | Prevents TOCTOU race on token consumption | None |
| hashes the incoming token before DB lookup | 5 | Prevents plaintext token comparison in DB | None |
| returns 401 when token was already consumed (atomic prevents race) | 5 | Prevents token reuse attack | None |
| rejects expired token with 401 | 4 | Token expiry enforced | None |
| clears reset token atomically on success | 5 | Single-use token guarantee | None |
| rejects short new password with 400 | 4 | Password policy | None |
| returns 400 with INVALID_JSON for malformed body | 3 | Input validation | None |
| rejects missing token with 400 | 3 | Input validation | None |
| rejects empty token with 400 | 3 | Input validation | None |
| rejects missing password with 400 | 3 | Input validation | None |
| rejects all-lowercase password | 4 | Password complexity | None |
| rejects all-digit password | 4 | Password complexity | None |
| accepts strong password | 3 | Positive case | None |
| returns 500 on unexpected error | 3 | Error handling | None |

### src/app/api/auth/__tests__/verify-email.test.ts (7 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| hashes the incoming token before DB lookup | 5 | Prevents plaintext token comparison | None |
| redirects to workspace on valid token | 3 | Happy path | None |
| redirects to sign-in with error on invalid token | 4 | Invalid token rejected | None |
| redirects to sign-in when no token provided | 4 | Missing token rejected | None |
| does NOT issue a cookie when requireAuth fails | 5 | Prevents session fixation on revoked sessions | None |
| issues a refreshed cookie when requireAuth succeeds and userId matches | 4 | Correct session refresh | None |
| does NOT issue a cookie when auth userId differs from verified user | 5 | Prevents cross-user session hijacking | None |

### src/app/api/auth/__tests__/me.test.ts (6 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns { user: null } when unauthenticated (not 401) | 3 | Graceful unauthenticated response | None |
| returns user data when authenticated and user exists | 3 | Happy path | None |
| returns { user: null } and clears cookie when user not found in DB | 4 | Clears stale session | None |
| returns 401 when no valid auth cookie (DELETE) | 4 | Auth enforced on logout | None |
| clears cookie and returns success (DELETE) | 4 | Session termination | None |
| increments tokenVersion in DB on logout | 5 | Invalidates all existing sessions on logout | None |

### src/app/api/auth/__tests__/google-callback.test.ts (14 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| redirects to sign-in with error when no code param | 3 | Missing param handled | None |
| redirects to sign-in with error when error param present | 3 | OAuth error handled | None |
| redirects with error when token exchange fails | 3 | Failed exchange handled | None |
| redirects with error when userinfo request fails | 3 | Failed userinfo handled | None |
| redirects with error when Google account has no email | 4 | No email = rejected | None |
| creates a new user, sets JWT cookie, and redirects | 3 | Happy path | None |
| records signup bonus for new users | 2 | Functional | None |
| logs in existing Google user without creating a duplicate | 3 | Idempotent login | None |
| redirects email-registered user to sign-in instead of auto-merging | 5 | Prevents OAuth account takeover via email collision | None |
| rejects when CSRF state param does not match cookie | 5 | CSRF protection for OAuth flow | None |
| rejects when CSRF state cookie is missing | 5 | CSRF protection | None |
| rejects when Google email is not verified | 5 | Prevents unverified email account takeover | None |
| marks existing unverified Google user as verified | 3 | Correctness | None |
| redirects with error when rate limited | 4 | Rate limiting on OAuth callback | None |

### src/app/api/auth/__tests__/resend-verification.test.ts (6 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 when unauthenticated | 4 | Auth enforced | None |
| returns 429 when rate limited | 4 | Rate limiting prevents email spam | None |
| returns success no-op when already verified | 3 | Idempotent | None |
| generates new token and sends email when not verified | 4 | Hashed token stored in DB | None |
| returns 401 when user not found in DB | 4 | Deleted user cannot resend | None |
| returns 500 on unexpected error | 3 | Error handling | None |

### src/app/api/discovery/__tests__/upload-security.test.ts (17 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| wraps ocrText in ocr-data tags (prompt injection) | 5 | Verifies prompt injection containment | None |
| rejects ocrText longer than 50,000 chars | 5 | Prevents resource exhaustion via oversized input | None |
| ocrText containing closing tag does not escape wrapper | 4 | Tag injection resistance | None |
| upload route returns 422 on zip bomb (ChatGPT) | 5 | Zip bomb protection | None |
| upload route returns 422 on zip bomb (Google Takeout) | 5 | Zip bomb protection | None |
| rejects image/gif on screentime upload | 4 | MIME type enforcement | None |
| rejects application/pdf on screentime upload | 4 | MIME type enforcement | None |
| rejects text/plain masquerading as .zip for chatgpt | 4 | File type enforcement | None |
| accepts application/octet-stream for chatgpt | 3 | Browser compatibility | None |
| accepts .zip extension fallback with mismatched MIME | 3 | Browser compatibility | None |
| rejects arbitrary binary with no .json extension for claude | 4 | File type enforcement | None |
| accepts text/plain MIME for claude upload | 3 | Browser compatibility | None |
| returns 400 for empty sessionId | 4 | Input validation | None |
| returns 400 for sessionId longer than 32 chars | 4 | Input validation prevents injection | None |
| extracts first segment from x-forwarded-for and trims | 4 | Correct IP extraction for rate limiting | None |
| falls back to "unknown" when x-forwarded-for absent | 3 | Graceful degradation | None |
| checkRateLimit returns success when limiter is null | 3 | Graceful degradation without Redis | None |

### src/app/api/discovery/upload/__tests__/route.test.ts (69 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 429 when rate limited | 4 | Rate limiting | None |
| returns 400 when both file and ocrText absent | 3 | Input validation | None |
| returns 400 when platform is absent | 3 | Input validation | None |
| returns 400 when sessionId is absent | 3 | Input validation | None |
| returns 400 for unknown platform value | 4 | Prevents arbitrary platform injection | None |
| returns 400 when sessionId exceeds 32 chars | 4 | Input validation | None |
| returns 400 for image/gif MIME on screentime | 4 | MIME enforcement | None |
| returns 400 for >5 MB image on screentime | 4 | Size limit prevents DoS | None |
| returns 400 for non-image MIME on subscriptions | 4 | MIME enforcement | None |
| returns 400 for non-image MIME on battery | 4 | MIME enforcement | None |
| returns 400 for non-image MIME on storage | 4 | MIME enforcement | None |
| returns 400 for non-image MIME on calendar | 4 | MIME enforcement | None |
| returns 400 for non-image MIME on health | 4 | MIME enforcement | None |
| returns 400 for non-image MIME on adaptive | 4 | MIME enforcement | None |
| returns 400 for non-ZIP chatgpt file | 4 | File type enforcement | None |
| accepts chatgpt file with application/octet-stream | 3 | Browser compat | None |
| returns 400 for >200 MB chatgpt ZIP | 4 | Size limit prevents DoS | None |
| returns 400 for non-ZIP google file | 4 | File type enforcement | None |
| returns 400 for non-JSON claude file | 4 | File type enforcement | None |
| accepts claude file with text/plain MIME | 3 | Browser compat | None |
| returns 400 for >50 MB claude JSON | 4 | Size limit prevents DoS | None |
| returns 400 when ocrText exceeds 50,000 chars | 4 | Size limit | None |
| ocrText wins -- file size check skipped | 3 | Priority logic | None |
| uses OCR path when ocrText non-empty | 3 | Routing correctness | None |
| returns 400 "File required" for chatgpt ocrText-only | 3 | Platform-specific validation | None |
| returns 400 "File required" for claude ocrText-only | 3 | Platform-specific validation | None |
| returns 400 "File required" for google ocrText-only | 3 | Platform-specific validation | None |
| returns 404 when session does not exist | 3 | Session validation | None |
| idempotency: returns cached on second upload | 3 | Prevents duplicate processing | None |
| does NOT apply idempotency guard for adaptive | 3 | Business logic | None |
| calls extractFromOcrText with sourceType screentime | 2 | Routing correctness | None |
| calls extractScreenTime for file-only upload | 2 | Routing correctness | None |
| remaining 37 tests (platform routing, DB persistence, happy paths) | 2-3 | Functional correctness, data flow | None |

### src/app/api/discovery/analyze/__tests__/route.test.ts (13 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 429 when rate limited | 4 | Rate limiting | None |
| returns 400 when sessionId absent | 3 | Input validation | None |
| returns 400 when sessionId exceeds 32 chars | 4 | Input validation | None |
| returns 404 when session not found | 3 | Session validation | None |
| returns cached analysis without re-running | 3 | Idempotency | None |
| remaining 8 tests (analysis flow, defaults, persistence) | 2 | Functional correctness | None |

### src/app/api/discovery/adaptive/__tests__/route.test.ts (12 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 429 when rate limited | 4 | Rate limiting | None |
| returns 400 when sessionId absent | 3 | Input validation | None |
| returns 404 when session not found | 3 | Session validation | None |
| returns 400 when screenTimeData is null | 3 | Input validation | None |
| returns 400 when apps is empty | 3 | Input validation | None |
| remaining 7 tests (happy path, defaults, errors) | 2 | Functional correctness | None |

### src/app/api/discovery/session/__tests__/route.test.ts (13 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 429 when rate limited | 4 | Rate limiting | None |
| returns 400 when occupation missing | 3 | Input validation | None |
| returns 400 when occupation exceeds 50 chars | 3 | Input length limit | None |
| returns 400 when ageBracket missing | 3 | Input validation | None |
| returns 400 when quizPicks is empty | 3 | Input validation | None |
| returns 400 when quizPicks has more than 12 entries | 3 | Array size limit | None |
| returns 400 when aiComfort is 0 | 3 | Range validation | None |
| returns 400 when aiComfort is 5 | 3 | Range validation | None |
| returns 400 when aiToolsUsed has more than 10 entries | 3 | Array size limit | None |
| remaining 4 tests (happy path, DB insert, errors) | 2 | Functional correctness | None |

### src/app/api/billing/webhook/__tests__/route.test.ts (25 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 when stripe-signature header absent | 5 | Unsigned webhook rejected | None |
| returns 401 when STRIPE_WEBHOOK_SECRET not set | 5 | Fail-closed without secret | None |
| returns 401 when constructEvent throws (invalid signature) | 5 | Tampered payload rejected | None |
| proceeds when constructEvent returns valid event | 3 | Happy path | None |
| remaining 21 tests (product routing, email, subscriber insert) | 2 | Functional correctness | None |

### src/app/api/billing/checkout/__tests__/route.test.ts (21 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 429 when rate limited | 4 | Rate limiting | None |
| returns 400 for invalid product value | 4 | Input validation prevents arbitrary products | None |
| returns 400 for invalid email format | 4 | Input validation | None |
| rejects retired "starter" slug | 3 | Business logic | None |
| remaining 17 tests (Stripe session creation, mode, metadata) | 2 | Functional correctness | None |

### src/server/lib/__tests__/cron-auth.test.ts (7 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns false when CRON_SECRET is empty | 5 | Fail-closed without secret | None |
| returns false when CRON_SECRET shorter than 16 chars | 5 | Rejects weak secrets | None |
| returns false when CRON_SECRET is undefined | 5 | Fail-closed | None |
| returns false when authorization header missing | 4 | Missing auth rejected | None |
| returns false when header does not match | 4 | Wrong secret rejected | None |
| returns true when header matches | 3 | Happy path | None |
| pads buffers to equal length (no length oracle) | 5 | Timing-safe comparison prevents length oracle | None |

### src/app/api/cron/__tests__/purge-auth.test.ts (8 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 for missing Authorization header | 4 | Auth enforced | None |
| returns 401 for wrong secret | 4 | Wrong secret rejected | None |
| returns 401 for wrong scheme (Basic) | 4 | Scheme validation | None |
| returns 200 for correct secret | 3 | Happy path | None |
| does not expose CRON_SECRET in response body | 5 | Secret leakage prevention | None |
| purge route uses verifyCronAuth | 3 | Shared auth module | None |
| agent-tick route uses verifyCronAuth | 3 | Shared auth module | None |
| verifyCronAuth uses timingSafeEqual | 5 | Source code verification of timing-safe comparison | None |

### src/app/api/cron/purge/__tests__/route.test.ts (8 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 when Authorization absent | 4 | Auth enforced | None |
| returns 401 for wrong secret | 4 | Auth enforced | None |
| returns 401 for wrong scheme | 4 | Scheme validation | None |
| proceeds with correct secret | 3 | Happy path | None |
| remaining 4 tests (SQL execution, rowCount) | 2 | Functional | None |

### src/app/api/cron/agent-tick/__tests__/route.test.ts (11 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 for missing Authorization | 4 | Auth enforced | None |
| returns 401 for wrong secret | 4 | Auth enforced | None |
| returns 401 for wrong scheme | 4 | Scheme validation | None |
| skips when global spend ceiling exceeded | 4 | Cost control prevents runaway spend | None |
| records spend for each processed task | 3 | Spend tracking | None |
| handles executor throwing without crashing | 3 | Resilience | None |
| marks unknown agent types as failed | 3 | Unknown input rejection | None |
| remaining 4 tests (happy path, status transitions) | 2 | Functional | None |

### src/app/api/cron/email-touchpoints/__tests__/route.test.ts (8 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 for missing Authorization | 4 | Auth enforced | None |
| returns 401 for wrong secret | 4 | Auth enforced | None |
| caps total emails at 50 per batch | 3 | Email volume control | None |
| continues processing when a single email fails | 2 | Resilience | None |
| does not expose CRON_SECRET in response body | 5 | Secret leakage prevention | None |
| remaining 3 tests (happy path, day1/day7 nudges) | 2 | Functional | None |

### src/app/api/webhooks/resend/__tests__/route.test.ts (15 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 when RESEND_WEBHOOK_SECRET not set | 5 | Fail-closed without secret | None |
| returns 401 when svix headers missing | 5 | Unsigned webhook rejected | None |
| returns 401 when svix verification fails | 5 | Tampered webhook rejected | None |
| returns 400 when payload has no type | 3 | Input validation | None |
| returns 400 when payload has no email_id | 3 | Input validation | None |
| transitions verifying task to done on delivered | 3 | State machine correctness | None |
| does not transition non-verifying task | 3 | State guard | None |
| returns matched: false when no task found | 3 | Graceful no-match | None |
| transitions verifying to failed on bounce | 3 | State machine | None |
| transitions failed to escalated on bounce | 3 | Escalation logic | None |
| transitions verifying to failed on complained | 3 | State machine | None |
| transitions failed to escalated on complained | 3 | Escalation logic | None |
| idempotency: same delivered event twice | 3 | Idempotent processing | None |
| idempotency: same bounced event twice | 3 | Idempotent processing | None |
| returns 200 for unknown event types | 3 | Graceful unknown event handling | None |

### src/app/api/workspace/[projectId]/build/__tests__/route.test.ts (15 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 when no auth cookie | 4 | Auth enforced | None |
| returns 401 when cookie is invalid | 4 | Auth enforced | None |
| returns 400 on invalid JSON body | 3 | Input validation | None |
| returns 400 when prompt is missing | 3 | Input validation | None |
| returns 400 when prompt is empty | 3 | Input validation | None |
| returns 400 when projectId is not a UUID | 4 | Prevents path traversal/injection via projectId | None |
| returns 404 when project ownership fails | 5 | IDOR prevention -- user cannot build on other user's project | None |
| streams SSE events on valid request | 2 | Functional | None |
| returns 409 when streaming build already in progress | 3 | Race condition prevention | None |
| does not stream when in-flight build exists | 3 | Double-submit prevention | None |
| remaining 5 SSE tests (sseStreamFromGenerator) | 2 | Functional correctness | None |

### src/app/api/workspace/[projectId]/settings/__tests__/route.test.ts (16 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| GET returns 401 without auth | 4 | Auth enforced | None |
| GET returns 401 with invalid cookie | 4 | Auth enforced | None |
| GET returns 404 for non-owned project | 5 | IDOR prevention | None |
| PUT returns 401 without auth | 4 | Auth enforced | None |
| PUT returns 401 with invalid cookie | 4 | Auth enforced | None |
| PUT returns 404 for non-owned project | 5 | IDOR prevention | None |
| PUT returns 400 on invalid JSON | 3 | Input validation | None |
| PUT returns 400 when projectId not UUID | 4 | Path parameter validation | None |
| remaining 8 tests (merge, read, error handling) | 2 | Functional | None |

### src/app/api/workspace/[projectId]/wishes/__tests__/route.test.ts (5 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth | 4 | Auth enforced | None |
| returns 404 for non-existent project | 4 | IDOR prevention | None |
| remaining 3 tests (save proposal, merge, return) | 2 | Functional | None |

### src/app/api/workspace/projects/__tests__/route.test.ts (15 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| POST returns 401 without auth | 4 | Auth enforced | None |
| POST returns 401 with invalid cookie | 4 | Auth enforced | None |
| POST returns 400 on invalid JSON | 3 | Input validation | None |
| POST returns 400 for wrong type | 3 | Type validation | None |
| POST returns 400 for name exceeding length cap | 3 | Input length limit | None |
| POST returns 400 for forbidden characters (<script>) | 5 | XSS prevention in project names | None |
| GET returns 401 without auth | 4 | Auth enforced | None |
| GET returns 401 with invalid cookie | 4 | Auth enforced | None |
| GET scopes query to authenticated user | 5 | Data isolation -- user sees only own projects | None |
| GET returns 500 on DB error | 3 | Error handling | None |
| remaining 5 tests (happy path, create, seed) | 2 | Functional | None |

### src/app/api/workspace/projects/__tests__/serialize-error.test.ts (5 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| omits stack in production | 5 | Prevents stack trace leakage to attackers | None |
| includes stack in development | 3 | Dev ergonomics | None |
| handles non-Error values | 2 | Robustness | None |
| recursively serializes cause | 2 | Correctness | None |
| truncates cause chain deeper than maxDepth | 4 | Prevents DoS via deeply nested error chains | None |

### src/app/api/workspace/tokens/__tests__/route.test.ts (7 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth | 4 | Auth enforced | None |
| returns 401 with invalid cookie | 4 | Auth enforced | None |
| calls getTokenBalance with correct userId | 3 | Data isolation | None |
| calls getTransactionHistory with correct userId | 3 | Data isolation | None |
| returns balance and transactions | 2 | Functional | None |
| returns 500 on getTokenBalance throw | 3 | Error handling | None |
| returns 429 when rate limited | 4 | Rate limiting | None |

### src/app/api/workspace/tokens/claim-daily/__tests__/route.test.ts (6 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth | 4 | Auth enforced | None |
| returns alreadyClaimed when Redis NX returns null | 4 | Idempotent -- prevents double-claim | None |
| credits daily bonus on first claim | 2 | Functional | None |
| calls Redis SET with nx and 86400s expiry | 4 | Atomic claim with TTL | None |
| returns 503 when rate limiter reports serviceError | 3 | Graceful degradation | None |
| deletes Redis key when creditTokens fails | 4 | Rollback prevents phantom claims | None |

### src/app/api/onboarding/__tests__/route.test.ts (6 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| rejects unauthenticated requests with 401 | 4 | Auth enforced | None |
| rejects invalid vertical id with 400 | 3 | Input validation | None |
| creates project with valid vertical | 2 | Functional | None |
| creates project with consulting vertical | 2 | Functional | None |
| accepts optional business name | 2 | Functional | None |
| rejects missing body with 400 | 3 | Input validation | None |

### src/app/(authed)/sign-in/__tests__/sign-in-submit.test.ts (7 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| rejects invalid email before network call | 4 | Client-side validation | None |
| rejects empty password before network call | 4 | Client-side validation | None |
| returns ok with user id on success | 2 | Functional | None |
| shows generic invalid credentials on 401 | 5 | No credential leakage in error messages | None |
| surfaces rate limit message on 429 | 3 | UX for rate limiting | None |
| handles network errors gracefully | 3 | Error handling | None |
| rejects malformed success response | 4 | Client-side response validation prevents injection | None |

### src/app/(authed)/sign-up/__tests__/sign-up-submit.test.ts (8 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| rejects invalid email before network call | 4 | Client-side validation | None |
| rejects short password before network call | 4 | Client-side validation | None |
| returns ok with userId on success | 2 | Functional | None |
| surfaces server error on 409 conflict | 3 | Error handling | None |
| surfaces rate limit message on 429 | 3 | UX for rate limiting | None |
| handles network errors gracefully | 3 | Error handling | None |
| rejects malformed success response | 4 | Client-side response validation | None |
| strips unknown fields from request body | 4 | Prevents mass assignment -- only email/password sent | None |

### src/shared/lib/__tests__/sanitize-next-param.test.ts (28 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns /workspace for null | 3 | Safe default | None |
| returns /workspace for undefined | 3 | Safe default | None |
| returns /workspace for empty string | 3 | Safe default | None |
| passes through /workspace | 2 | Functional | None |
| passes through /workspace/abc | 2 | Functional | None |
| passes through bare root / | 2 | Functional | None |
| passes through /foo | 2 | Functional | None |
| rejects //evil.com | 5 | Prevents open redirect via protocol-relative URL | None |
| rejects ///evil | 5 | Prevents open redirect | None |
| rejects http://evil | 5 | Prevents open redirect | None |
| rejects https://evil | 5 | Prevents open redirect | None |
| rejects javascript:alert(1) | 5 | Prevents XSS via redirect parameter | None |
| rejects data:text/html,foo | 5 | Prevents data URI injection | None |
| rejects raw percent-encoded //evil.com | 5 | Prevents encoding bypass | None |
| rejects decoded //evil.com | 5 | Double-check on decoded form | None |
| rejects backslash prefix \\evil | 5 | Prevents backslash redirect trick | None |
| rejects leading-space " /workspace" | 4 | Whitespace bypass prevention | None |
| rejects bare hostname evil.com | 4 | No hostname without scheme | None |
| allows : inside query string | 3 | Functional correctness | None |
| allows : inside query string value | 3 | Functional correctness | None |
| rejects : in path segment | 4 | Prevents scheme injection in path | None |
| returns custom fallback for null | 2 | Functional | None |
| returns custom fallback for empty string | 2 | Functional | None |
| returns custom fallback for rejected input | 3 | Config correctness | None |
| passes through valid path with custom fallback | 2 | Functional | None |
| passes through when mustStartWith matches | 2 | Functional | None |
| rejects when mustStartWith does not match | 3 | Path constraint | None |
| passes through /workspace when mustStartWith is /workspace | 2 | Functional | None |

### src/server/discovery/__tests__/extract-from-text.test.ts (16 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns error for empty string | 3 | Input validation | None |
| returns error for whitespace-only string | 3 | Input validation | None |
| returns error for string shorter than 10 chars | 3 | Input validation | None |
| returns error for unknown sourceType | 3 | Input validation | None |
| returns error for sourceType "adaptive" | 3 | Input validation | None |
| calls Haiku with correct tool name (6 source types) | 2 | Routing correctness | None |
| wraps ocrText inside ocr-data tags | 5 | Prompt injection containment | None |
| system prompt contains anti-injection instruction | 5 | Explicit prompt injection defense | None |
| returns data with tool input on success | 2 | Functional | None |
| returns error when no tool_use block | 3 | Error handling | None |
| returns error when Anthropic API throws | 3 | Error handling | None |

### src/server/discovery/parsers/__tests__/chatgpt.test.ts (18 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| counts total conversations correctly | 2 | Functional | None |
| extracts user messages by traversing mapping | 2 | Functional | None |
| truncates individual message text to 200 chars | 4 | Prevents oversized data propagation | None |
| caps _rawMessages at 500 entries | 4 | Resource limit prevents memory exhaustion | None |
| returns platform: "chatgpt" | 1 | Smoke test | None |
| returns empty topTopics and repeatedQuestions | 1 | Smoke test | None |
| computes timePatterns | 1 | Functional | None |
| throws "Archive too large when decompressed" (zip bomb) | 5 | Zip bomb protection | None |
| throws before any file content is extracted (zip bomb) | 5 | Early exit on bomb detection | None |
| throws when conversations.json missing | 2 | Error handling | None |
| throws on malformed JSON | 2 | Error handling | None |
| throws on invalid shape (object not array) | 3 | Schema validation | None |
| throws on null in array | 3 | Schema validation | None |
| throws on primitive in array | 3 | Schema validation | None |
| throws on mapping not an object | 3 | Schema validation | None |
| skips nodes with no mapping without throwing | 2 | Robustness | None |
| tolerates mapping: null (soft-deleted) | 2 | Robustness | None |
| skips non-user messages | 2 | Data filtering | None |

### src/server/discovery/parsers/__tests__/claude-export.test.ts (15 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (parsing, truncation, caps, error handling) | 2-3 | Data handling correctness, some size limits | None |

### src/server/discovery/parsers/__tests__/google-takeout.test.ts (21 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| zip bomb protection test | 5 | Zip bomb protection for Google Takeout | None |
| malformed-JSON files as _skippedFileCount | 3 | Robustness | None |
| malformed items as _skippedItemCount | 3 | Robustness | None |
| remaining 18 tests (parsing, search history, YouTube) | 2 | Data handling correctness | None |

### src/server/discovery/__tests__/ocr.test.ts (8 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (Vision API routing, tool_choice, error handling) | 2-3 | Functional correctness | None |

### src/server/discovery/__tests__/adaptive.test.ts (8 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (AI follow-up generation, error handling) | 2 | Functional correctness | None |

### src/server/discovery/__tests__/analyze.test.ts (21 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (cross-analysis, tool routing, Zod validation of AI output) | 2-3 | Some Zod validation tests (3), rest functional (2) | None |

### src/server/discovery/__tests__/preprocess-ocr.test.ts (26 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| strips non-printable characters | 3 | Input sanitization | None |
| remaining 25 tests (OCR cleanup, whitespace, regex extraction) | 1-2 | Data preprocessing correctness | None |

### src/server/discovery/__tests__/extract-topics.test.ts (15 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (topic extraction, error handling) | 2 | Functional correctness | None |

### src/server/build/__tests__/first-build-email-toctou.test.ts (2 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| does not send email when UPDATE rowCount is 0 | 4 | TOCTOU race condition prevention | None |
| sends email when UPDATE rowCount is 1 | 3 | Happy path | None |

### src/server/build/__tests__/sandbox-preview.test.ts (9 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| emits sandbox_ready after committed | 2 | Functional | None |
| passes through all original events | 2 | Functional | None |
| skips sandbox when no provider given | 2 | Graceful degradation | None |
| logs warning on sandbox.start() throw | 3 | Failure isolation | None |
| does not emit sandbox_ready when no committed event | 2 | Correctness | None |
| passes empty initialFiles when storage empty | 2 | Edge case | None |
| does not emit sandbox_ready when storage.readFile() throws | 3 | Failure isolation | None |
| emits sandbox_ready with undefined previewUrl | 2 | Edge case | None |
| reads files from storage and passes to sandbox.start() | 2 | Data flow | None |

### src/server/build/__tests__/sandbox-provider-factory.test.ts (5 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns SandboxProvider when both env vars set | 3 | Configuration correctness | None |
| returns undefined when CF_SANDBOX_WORKER_URL missing | 4 | Fail-safe without config | None |
| returns undefined when CF_SANDBOX_HMAC_SECRET missing | 4 | Fail-safe without HMAC secret | None |
| caches result -- second call returns same instance | 2 | Performance | None |
| caches null -- once missing, does not re-check | 2 | Stability | None |

### src/server/deploy/__tests__/guarded-deploy-call.test.ts (2 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| does not waste rate-limit slot when hourly cap at limit | 4 | Rate limit correctness -- no slot consumption on deny | None |
| does not waste rate-limit slot when daily cap at limit | 4 | Rate limit correctness | None |

### src/server/deploy/__tests__/vercel-deploy.test.ts (6 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns not_configured when MELDAR_DEPLOY_TOKEN missing | 4 | Fail-safe without deploy token | None |
| runs full 6-step happy path | 2 | Functional | None |
| handles 409 on project create by looking up existing | 2 | Idempotent | None |
| maps ERROR readyState to deployment_build_failed | 2 | Error handling | None |
| maps upload failure to upload_failed with path | 2 | Error handling | None |
| accepts 409 on addDomain as idempotent | 2 | Idempotent | None |

### src/server/deploy/__tests__/sleep-listener-leak.test.ts (2 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| removes abort listener after timer fires normally | 3 | Memory leak prevention | None |
| cleans up timer when signal aborts | 3 | Resource cleanup | None |

### src/server/domains/__tests__/slug.test.ts (13 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| lowercases and replaces spaces | 1 | Formatting | None |
| strips possessive apostrophes and special chars | 3 | Input sanitization | None |
| collapses multiple spaces/hyphens | 1 | Formatting | None |
| removes leading/trailing hyphens | 1 | Formatting | None |
| strips accented characters via NFD | 1 | Normalization | None |
| handles emoji and non-latin characters | 2 | Input sanitization | None |
| returns "project" for empty input | 2 | Safe default | None |
| preserves numbers | 1 | Functional | None |
| handles already-slugified input | 1 | Idempotent | None |
| appends .meldar.ai | 1 | Formatting | None |
| works with single-word slugs | 1 | Formatting | None |
| appends collision suffix | 2 | Uniqueness | None |
| produces different suffixes on repeated calls | 2 | Randomness | None |

### src/server/domains/__tests__/provision-subdomain.test.ts (5 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| generates subdomain and inserts it | 2 | Functional | None |
| appends collision suffix on slug conflict | 2 | Collision handling | None |
| retries up to 5 times on repeated collisions | 3 | DoS resilience | None |
| handles names that normalize to "project" | 2 | Edge case | None |
| succeeds on third attempt after two collisions | 2 | Retry logic | None |

### src/server/agents/__tests__/agent-task-service.test.ts (23 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (state machine transitions, atomic updates, concurrency guards) | 2-3 | State machine correctness, some atomic operations | None |

### src/server/projects/__tests__/list-user-projects.test.ts (8 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (project listing, user scoping, error handling) | 2-3 | Some user-scoping tests (3), rest functional (2) | None |

### src/server/build-orchestration/__tests__/build-journey.test.ts (4 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (orchestrator event flow, token debit, file commit) | 2 | Functional correctness | None |

### src/server/build-orchestration/__tests__/build-pipeline-integration.test.ts (41 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (build pipeline, validation, prompt injection in build, error handling) | 2-3 | Mostly functional (2), some validation tests (3) | None |

### src/server/build-orchestration/__tests__/routes-tracked.test.ts (46 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (git ls-files checks for route files) | 3 | Prevents silent .gitignore exclusion of API routes -- deployment safety | None |

### src/features/auth/__tests__/sign-out.test.ts (4 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| calls DELETE /api/auth/me | 3 | Correct endpoint | None |
| returns ok on 200 | 2 | Functional | None |
| returns failure on non-2xx | 2 | Error handling | None |
| handles network errors | 2 | Error handling | None |

### src/features/project-onboarding/__tests__/schemas.test.ts (11 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (Zod schema validation, message length, plan output) | 3 | Input validation at schema level | None |

### src/features/kanban/__tests__/derive-milestone-state.test.ts (10 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (milestone state derivation) | 1 | Pure UI logic | None |

### src/features/kanban/__tests__/group-cards.test.ts (6 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (card grouping) | 1 | Pure UI logic | None |

### src/features/kanban/__tests__/parse-prompt-anatomy.test.ts (10 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (prompt anatomy parsing) | 1 | Pure UI logic | None |

### src/features/kanban/__tests__/topological-sort.test.ts (8 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (dependency sorting) | 1 | Pure algorithm | None |

### src/features/share-flow/__tests__/SharePanel.test.tsx (7 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (SharePanel rendering, clipboard) | 1 | Pure UI | None |

### src/features/teaching-hints/__tests__/hints.test.ts (6 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| has at least 5 hints | 1 | Content smoke test | None |
| every hint has unique id | 1 | Data integrity | None |
| every hint has non-empty text | 1 | Content validation | None |
| no hint text contains forbidden words | 2 | Content policy | None |
| includes the onboarding hint | 1 | Content smoke test | None |
| exports HintId type covering all ids | 1 | Type safety | None |

### src/features/token-economy/ui/__tests__/TokenBalancePill.test.ts (3 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (balance color thresholds) | 1 | Pure UI logic | None |

### src/features/visual-feedback/__tests__/FeedbackBar.test.tsx (5 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (FeedbackBar rendering) | 1 | Pure UI | None |

### src/features/workspace/__tests__/context.test.ts (17 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (workspace reducer state transitions) | 1 | Pure state management | None |

### src/entities/booking-verticals/__tests__/data.test.ts (9 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (vertical data integrity) | 1 | Data smoke tests | None |

### src/entities/project-step/__tests__/derive-step.test.ts (6 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (step derivation from cards) | 1 | Pure logic | None |

### src/app/(authed)/workspace/__tests__/page.test.tsx (4 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| throws when reached without a session | 3 | Auth guard at page level | None |
| redirects to onboarding when zero projects | 2 | UX routing | None |
| renders a card grid when projects exist | 1 | UI rendering | None |
| renders error banner when query throws | 2 | Error handling | None |

### src/widgets/workspace/__tests__/PreviewPane.test.ts (8 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| rejects null | 3 | Input validation | None |
| rejects empty string | 3 | Input validation | None |
| rejects javascript: scheme | 5 | XSS prevention via iframe URL | None |
| rejects data: scheme | 5 | Data URI injection prevention | None |
| rejects file: scheme | 5 | Local file access prevention | None |
| rejects malformed URLs | 3 | Input validation | None |
| accepts https URLs | 2 | Functional | None |
| accepts http URLs | 2 | Functional | None |

### src/widgets/workspace/__tests__/PreviewPane.render.test.tsx (2 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (PreviewPane rendering) | 1 | Pure UI | None |

### src/widgets/workspace/__tests__/StepIndicator.test.ts (7 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (step width calculation) | 1 | Pure UI math | None |

### src/widgets/workspace/__tests__/build-status.test.ts (7 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (build status derivation, preview src) | 1 | Pure UI logic | None |

### src/shared/lib/__tests__/format-relative.test.ts (6 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| All tests (relative time formatting) | 1 | Pure formatting | None |

### src/app/api/workspace/[projectId]/agent/events/__tests__/route.test.ts (12 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth | 4 | Auth enforced | None |
| returns 404 for non-owned project | 4 | IDOR prevention | None |
| returns 400 for non-UUID projectId | 4 | Path parameter validation | None |
| remaining 9 tests (event insertion, listing, pagination) | 2 | Functional | None |

### src/app/api/workspace/[projectId]/agent/tasks/__tests__/route.test.ts (18 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth | 4 | Auth enforced | None |
| returns 404 for non-owned project | 4 | IDOR prevention | None |
| returns 400 for non-UUID projectId | 4 | Path parameter validation | None |
| remaining 15 tests (task CRUD, state transitions, auto-approve) | 2-3 | Functional, some state guards | None |

### src/app/api/workspace/[projectId]/apply-template/__tests__/route.test.ts (10 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth | 4 | Auth enforced | None |
| returns 404 for non-owned project | 4 | IDOR prevention | None |
| returns 400 for non-UUID projectId | 4 | Path parameter validation | None |
| remaining 7 tests (template application, card creation) | 2 | Functional | None |

### src/app/api/workspace/[projectId]/ask-question/__tests__/route.test.ts (6 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth | 4 | Auth enforced | None |
| returns 404 for non-owned project | 4 | IDOR prevention | None |
| remaining 4 tests (question handling, AI response) | 2 | Functional | None |

### src/app/api/workspace/[projectId]/bookings/__tests__/route.test.ts (16 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth (for authed endpoints) | 4 | Auth enforced | None |
| returns 404 for non-owned project | 4 | IDOR prevention | None |
| returns 429 when rate limited | 4 | Rate limiting on public booking endpoint | None |
| remaining 13 tests (booking CRUD, public GET) | 2 | Functional | None |

### src/app/api/workspace/[projectId]/cards/__tests__/route.test.ts (27 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth | 4 | Auth enforced | None |
| returns 404 for non-owned project | 4 | IDOR prevention | None |
| returns 400 for non-UUID projectId | 4 | Path parameter validation | None |
| remaining 24 tests (card CRUD, ordering, parent/child) | 2 | Functional | None |

### src/app/api/workspace/[projectId]/generate-plan/__tests__/route.test.ts (10 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth | 4 | Auth enforced | None |
| returns 404 for non-owned project | 4 | IDOR prevention | None |
| remaining 8 tests (plan generation, AI response, validation) | 2-3 | Functional, some validation | None |

### src/app/api/workspace/[projectId]/generate-proposal/__tests__/route.test.ts (6 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth | 4 | Auth enforced | None |
| returns 404 for non-owned project | 4 | IDOR prevention | None |
| remaining 4 tests (proposal generation, AI response) | 2 | Functional | None |

### src/app/api/workspace/[projectId]/improve-prompt/__tests__/route.test.ts (9 tests)

| Test | Score | Security Impact | Issue |
|------|-------|----------------|-------|
| returns 401 without auth | 4 | Auth enforced | None |
| returns 404 for non-owned project | 4 | IDOR prevention | None |
| remaining 7 tests (prompt improvement, AI response) | 2 | Functional | None |
