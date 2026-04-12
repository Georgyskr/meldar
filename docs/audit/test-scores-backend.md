# Test Validity -- Backend (Final)

## Summary

Total: 1208 | Integration(real DB): 78 (skipped, need DATABASE_URL) | Mock-based: 1130 | 5: 167 | 4: 430 | 3: 537 | 2: 27 | 1: 47

78 integration tests under `apps/web/src/__tests__/integration/` target real Neon Postgres but are `describe.skipIf(!HAS_DATABASE)` -- they only run when DATABASE_URL is set. All 1130 running tests mock the DB layer via `vi.mock('@meldar/db/client')`, use InMemoryProjectStorage/InMemoryBlobStorage, or test pure logic with no DB at all. AI (Anthropic) calls are universally mocked. No test hits real R2, Stripe, Resend, or Vercel.

## By File

### packages/storage/src/__tests__/blob.test.ts (17 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| sha256Hex > produces lowercase hex of length 64 | 4 | None (pure crypto) | |
| sha256Hex > is deterministic for identical input | 4 | None | |
| sha256Hex > differs for different input | 4 | None | |
| sha256Hex > matches the known sha256 for "hello" | 4 | None | Known-answer test |
| blobKey > produces the content-addressed key layout | 4 | None | |
| blobKey > rejects empty projectId | 4 | None | |
| blobKey > rejects empty contentHash | 4 | None | |
| blobKey > rejects non-sha256 content hash | 4 | None | |
| blobKey > accepts uppercase hex | 4 | None | |
| InMemoryBlobStorage > stores and retrieves a blob | 4 | InMemory | Real in-memory impl |
| InMemoryBlobStorage > reports existence | 4 | InMemory | |
| InMemoryBlobStorage > throws BlobStorageError on missing blob | 4 | InMemory | |
| InMemoryBlobStorage > dedups identical puts (idempotent) | 4 | InMemory | |
| InMemoryBlobStorage > isolates blobs by project | 4 | InMemory | |
| InMemoryBlobStorage > verify: true catches tampered blobs | 4 | InMemory | |
| InMemoryBlobStorage > delete is a no-op on missing blob | 4 | InMemory | |
| InMemoryBlobStorage > delete removes an existing blob | 4 | InMemory | |

### packages/storage/src/__tests__/in-memory-provider.test.ts (48 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| createProject > creates a project with a genesis build and initial files | 5 | InMemory | Full contract test against real provider impl |
| createProject > writes content to the blob store | 5 | InMemory | |
| createProject > rejects unsafe paths | 5 | InMemory | Security validation |
| createProject > rejects duplicate paths in the initial file set | 5 | InMemory | |
| createProject > rejects file sets over the cap | 5 | InMemory | |
| createProject > rejects oversized files | 5 | InMemory | |
| getProject + getCurrentFiles > fetches a created project | 5 | InMemory | |
| getProject + getCurrentFiles > throws ProjectNotFoundError for wrong user (no existence leak) | 5 | InMemory | Security: ownership enforcement |
| getProject + getCurrentFiles > throws ProjectNotFoundError for nonexistent id | 5 | InMemory | |
| getProject + getCurrentFiles > returns current files sorted by path | 5 | InMemory | |
| getProject + getCurrentFiles > readFile returns the content and verifies integrity | 5 | InMemory | Integrity verification |
| build streaming > writes files into a new build and commits HEAD | 5 | InMemory | Full lifecycle |
| build streaming > fail leaves HEAD alone and marks the build failed | 5 | InMemory | |
| build streaming > dedups file writes by path within a single build (last write wins) | 5 | InMemory | |
| build streaming > rejects writes to an already-committed build | 5 | InMemory | State machine |
| build streaming > rejects writes to a failed build | 5 | InMemory | State machine |
| build streaming > rejects unsafe paths at write time | 5 | InMemory | Security |
| build streaming > does not leak mid-build writes to getCurrentFiles before commit | 5 | InMemory | Atomicity |
| build streaming > reverts mid-build writes if the build fails (live files unchanged) | 5 | InMemory | Atomicity |
| build streaming > dedups blobs across builds when content is identical | 5 | InMemory | Content-addressing |
| build streaming > idempotent same-hash rewrite of an existing path bumps version but preserves content | 5 | InMemory | |
| build streaming > rejects writeFile that would exceed MAX_FILES_PER_BUILD distinct paths | 5 | InMemory | |
| rollback > restores the file set to a prior build and records a rollback event | 5 | InMemory | |
| rollback > rejects rollback to a build from a different project | 5 | InMemory | Security |
| rollback > rejects rollback to the current HEAD | 5 | InMemory | |
| rollback > rejects rollback to a failed build | 5 | InMemory | |
| getBuild > fetches a build by id | 5 | InMemory | |
| getBuild > throws BuildNotFoundError for unknown id | 5 | InMemory | |
| preview URL > starts as null on a fresh project | 4 | InMemory | |
| preview URL > persists the URL via setPreviewUrl and bumps the timestamp | 4 | InMemory | |
| preview URL > clears the URL AND nulls the timestamp when called with null | 4 | InMemory | |
| preview URL > throws ProjectNotFoundError for an unknown project | 4 | InMemory | |
| preview URL > throws ProjectNotFoundError on a soft-deleted project | 4 | InMemory | |
| reapStuckBuilds > returns 0 when no streaming build exists for the project | 4 | InMemory | |
| reapStuckBuilds > does not reap a streaming build younger than the cutoff | 4 | InMemory | |
| reapStuckBuilds > marks streaming builds older than the cutoff as failed and returns the count | 4 | InMemory | |
| reapStuckBuilds > does not affect completed or failed builds | 4 | InMemory | |
| reapStuckBuilds > uses strict < on createdAt -- a build at exactly the cutoff is NOT reaped | 4 | InMemory | Edge case |
| reapStuckBuilds > only reaps builds for the specified project | 4 | InMemory | Isolation |
| reapStuckBuilds > still reaps streaming builds on a soft-deleted project (FK cascade safety) | 4 | InMemory | |
| getActiveStreamingBuild > returns null when only completed builds exist | 4 | InMemory | |
| getActiveStreamingBuild > returns the id of an in-flight streaming build | 4 | InMemory | |
| getActiveStreamingBuild > returns null after the streaming build is committed | 4 | InMemory | |
| getActiveStreamingBuild > returns null after the streaming build is failed | 4 | InMemory | |
| getActiveStreamingBuild > still returns the streaming build id on a soft-deleted project | 4 | InMemory | |

### packages/storage/src/__tests__/r2-blob.test.ts (24 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| config validation > throws if any required field is missing | 4 | None | |
| config validation > fromEnv reads vars from process.env-shape object | 4 | None | |
| config validation > fromEnv throws with a clear message when vars are missing | 4 | None | |
| put > issues a PUT to the content-addressed URL | 3 | Mock fetch | Mocked HTTP, validates request shape |
| put > skips the PUT if the blob already exists (idempotent) | 3 | Mock fetch | |
| put > attaches a SHA256 integrity header | 3 | Mock fetch | |
| put > throws BlobStorageError on a non-2xx response | 3 | Mock fetch | |
| put > wraps network errors in BlobStorageError | 3 | Mock fetch | |
| get > returns the response body on success | 3 | Mock fetch | |
| get > verifies integrity when verify: true | 4 | Mock fetch | Tests real sha256 verify logic |
| get > throws BlobIntegrityError when verify: true and content doesn't match hash | 4 | Mock fetch | |
| get > throws BlobStorageError on 404 | 3 | Mock fetch | |
| get > throws BlobStorageError on 5xx | 3 | Mock fetch | |
| exists > returns true on 200 | 3 | Mock fetch | |
| exists > returns false on 404 | 3 | Mock fetch | |
| exists > uses HEAD method | 3 | Mock fetch | |
| delete > treats 204 as success | 3 | Mock fetch | |
| delete > treats 404 as success (idempotent) | 3 | Mock fetch | |
| delete > throws on unexpected status | 3 | Mock fetch | |
| delete > uses DELETE method | 3 | Mock fetch | |
| URL construction > uses path-style URLs | 4 | None | |
| URL construction > honors a custom endpoint | 4 | None | |
| sha256Hex sanity check (hello -> expected hash) | 4 | None | |

### packages/storage/src/__tests__/agent-tables.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| agent_events table > has required columns | 2 | None (schema import) | Only checks column exports exist, not DB |
| agent_tasks table > has required columns | 2 | None (schema import) | Only checks column exports exist |
| agent_tasks table > exports task status type | 2 | None (type check) | Compile-time assertion |
| agent_tasks table > exports agent type | 2 | None (type check) | Compile-time assertion |
| project_domains table > has required columns | 2 | None (schema import) | Only checks column exports |
| project_domains table > exports domain state type | 2 | None (type check) | Compile-time assertion |
| project_domains table > exports domain type | 2 | None (type check) | Compile-time assertion |

### packages/storage/src/__tests__/postgres-provider.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| writeFile (build atomicity) > does NOT touch project_files during writeFile (only build_files) | 4 | Fake DB recorder | Verifies query shape against fake DB |
| writeFile (build atomicity) > DOES touch project_files during commit | 4 | Fake DB recorder | |
| fail (build atomicity) > does NOT touch project_files during fail | 4 | Fake DB recorder | |
| assertNonEmptyBatch > returns the array as a non-empty tuple type when non-empty | 4 | None (pure logic) | |
| assertNonEmptyBatch > throws with the context label when empty | 4 | None (pure logic) | |
| setPreviewUrl > writes a fresh timestamp alongside a non-null URL | 4 | Fake DB recorder | Validates SET payload shape |
| setPreviewUrl > nulls BOTH columns when called with null URL | 4 | Fake DB recorder | |
| writeFile (file count cap) > rejects the overflow write before any DB ops are issued | 4 | Fake DB recorder | |

### apps/web/src/server/identity/__tests__/password.test.ts (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| hashes a password and verifies it correctly | 5 | None (real bcrypt) | Real crypto, ~1s |
| returns false for incorrect password | 5 | None (real bcrypt) | |
| generates different hashes for the same password (salt) | 5 | None (real bcrypt) | |
| handles empty string password | 5 | None (real bcrypt) | |

### apps/web/src/server/identity/__tests__/jwt.test.ts (17 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| signToken > returns a valid JWT string | 5 | None (real JWT) | Real jose signing |
| verifyToken > verifies and returns payload for a valid token | 5 | None (real JWT) | |
| verifyToken > returns null for an invalid token | 5 | None | |
| verifyToken > returns null for a tampered token | 5 | None | Security: tamper detection |
| verifyToken > returns null for an expired token | 5 | None | |
| verifyToken > returns null for a token signed with a different secret | 5 | None | Security |
| verifyToken > defaults emailVerified to false for legacy tokens without the claim | 4 | None | |
| verifyToken > preserves emailVerified: true through sign/verify roundtrip | 4 | None | |
| verifyToken > rejects tokens signed with a different algorithm (CWE-347 alg-confusion) | 5 | None | Security: alg confusion |
| getUserFromRequest > returns payload for valid meldar-auth cookie | 4 | None | |
| getUserFromRequest > returns null when no cookie header present | 3 | None | |
| getUserFromRequest > returns null when cookie header has no meldar-auth | 3 | None | |
| getUserFromRequest > returns null when meldar-auth cookie has tampered value | 4 | None | |
| getUserFromRequest > extracts token from cookie with multiple cookies | 4 | None | |
| getSecret > throws if AUTH_SECRET is not set | 3 | None | |
| getSecret > throws if AUTH_SECRET is shorter than 32 characters | 3 | None | |
| getSecret > accepts AUTH_SECRET that is exactly 32 characters | 3 | None | |

### apps/web/src/server/identity/__tests__/token-hash.test.ts (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| hashToken > returns the correct SHA-256 hex digest for a known test vector | 5 | None | Known-answer test |
| hashToken > returns a 64-character hex string | 4 | None | |
| hashToken > produces different hashes for different tokens | 4 | None | |
| hashToken > produces the same hash for the same token (deterministic) | 4 | None | |

### apps/web/src/server/identity/__tests__/auth-cookie.test.ts (3 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| sets meldar-auth cookie with correct flags | 4 | None | Real NextResponse |
| sets Secure flag in production | 4 | None | |
| omits Secure flag in development | 4 | None | |

### apps/web/src/server/identity/__tests__/require-auth.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when no cookie present | 3 | Mock DB | |
| returns 401 when cookie has invalid JWT | 3 | Mock DB | |
| returns 401 when JWT is expired | 3 | Mock DB | |
| returns 401 when tokenVersion in JWT does not match DB | 3 | Mock DB | Important security check, but DB is mocked |
| returns session object when token is valid and tokenVersion matches | 3 | Mock DB | |
| returns 401 when user does not exist in DB (deleted account) | 3 | Mock DB | |
| propagates DB errors (fail-closed) | 4 | Mock DB | Tests fail-closed pattern |

### apps/web/src/server/identity/__tests__/password.test.ts (already listed above)

### apps/web/src/app/api/auth/__tests__/register.test.ts (19 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| registers successfully and returns JWT cookie | 3 | Mock DB | Full mock chain |
| stores hashed verifyToken in DB, sends raw token in email | 3 | Mock DB | |
| includes verifyTokenExpiresAt in insert payload | 3 | Mock DB | |
| sends verification email via Resend after registration | 3 | Mock DB + Mock Resend | |
| registration succeeds even if Resend throws | 4 | Mock DB + Mock Resend | Resilience pattern |
| rejects duplicate email with generic 400 | 3 | Mock DB | |
| rejects invalid email format with 400 | 4 | None (Zod) | Validates before DB |
| rejects password shorter than 8 characters with 400 | 4 | None (Zod) | |
| returns 400 with INVALID_JSON for malformed JSON body | 4 | None | |
| rejects missing fields with 400 | 4 | None (Zod) | |
| rejects all-lowercase password (Finding #14) | 4 | None (Zod) | Security: password policy |
| rejects all-digit password (Finding #14) | 4 | None (Zod) | |
| rejects all-uppercase password (Finding #14) | 4 | None (Zod) | |
| accepts password with uppercase, lowercase and digit (Finding #14) | 4 | None (Zod) | |
| returns 500 on unexpected error | 3 | Mock DB | |
| duplicate-email path takes similar time to success path (Finding #20) | 5 | Mock DB | Timing-attack mitigation |
| sends welcome email after registration | 3 | Mock DB + Mock Resend | |
| sends welcome email with null name when name not provided | 3 | Mock DB | |
| registration succeeds even if welcome email throws | 4 | Mock DB | Resilience |

### apps/web/src/app/api/auth/__tests__/login.test.ts (10 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| logs in successfully with correct credentials | 3 | Mock DB | |
| rejects wrong password with 401 | 3 | Mock DB | |
| rejects non-existent email with 401 (same message as wrong password) | 4 | Mock DB | Security: no info leak |
| returns same error message for wrong password and non-existent email | 4 | Mock DB | Security |
| rejects invalid input with 400 | 4 | None (Zod) | |
| returns 500 on unexpected error | 3 | Mock DB | |
| returns 400 with INVALID_JSON when request body is not valid JSON | 4 | None | |
| calls verifyPassword even when user is not found (timing parity) | 5 | Mock DB | Security: timing-attack mitigation |
| calls setAuthCookie on successful login | 3 | Mock DB | |
| per-email rate limiting > returns 429 when the email-based rate limit is exceeded | 3 | Mock rate limit | |

### apps/web/src/app/api/auth/__tests__/forgot-password.test.ts (9 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns success and sends email for existing user | 3 | Mock DB + Mock Resend | |
| returns success for non-existing email (prevents enumeration) | 5 | Mock DB | Security: no user enumeration |
| stores a SHA-256 hash in DB, not the raw token | 4 | Mock DB | Security: token hashing |
| sets reset token expiry to approximately 1 hour from now | 3 | Mock DB | |
| takes at least 500ms regardless of whether user exists | 5 | Mock DB | Security: timing-attack mitigation |
| returns 400 with INVALID_JSON for malformed JSON body | 4 | None | |
| rejects invalid email with 400 | 4 | None (Zod) | |
| rejects missing email with 400 | 4 | None (Zod) | |
| returns 500 on unexpected error | 3 | Mock DB | |

### apps/web/src/app/api/auth/__tests__/reset-password.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| resets password with valid token using atomic update | 3 | Mock DB | |
| uses a single atomic UPDATE...RETURNING (no separate SELECT) | 4 | Mock DB | Tests atomicity pattern |
| hashes the incoming token before DB lookup | 4 | Mock DB | Security |
| returns 401 when token was already consumed (atomic prevents race) | 4 | Mock DB | TOCTOU |
| rejects expired token with 401 | 3 | Mock DB | |
| clears reset token atomically on success | 3 | Mock DB | |
| rejects short new password with 400 | 4 | None (Zod) | |
| returns 400 with INVALID_JSON for malformed JSON body | 4 | None | |
| rejects missing token with 400 | 4 | None (Zod) | |
| rejects empty token with 400 | 4 | None (Zod) | |
| rejects missing password with 400 | 4 | None (Zod) | |
| rejects all-lowercase password | 4 | None (Zod) | |
| rejects all-digit password | 4 | None (Zod) | |
| accepts strong password | 3 | Mock DB | |
| returns 500 on unexpected error | 3 | Mock DB | |

### apps/web/src/app/api/auth/__tests__/verify-email.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| hashes the incoming token before DB lookup | 4 | Mock DB | Security |
| redirects to workspace on valid token | 3 | Mock DB | |
| redirects to sign-in with error on invalid token | 3 | Mock DB | |
| redirects to sign-in when no token provided | 3 | None | |
| does NOT issue a cookie when requireAuth fails (revoked session) | 4 | Mock DB | Security |
| issues a refreshed cookie when requireAuth succeeds and userId matches | 3 | Mock DB | |
| does NOT issue a cookie when auth userId differs from verified user | 4 | Mock DB | Security: prevents cross-user |

### apps/web/src/app/api/auth/__tests__/me.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| DELETE returns 200 with cleared cookie | 3 | Mock DB | |
| DELETE returns 401 when not authenticated | 3 | Mock DB | |
| GET returns user data when authenticated | 3 | Mock DB | |
| GET returns 401 when not authenticated | 3 | Mock DB | |
| DELETE increments tokenVersion for session invalidation | 3 | Mock DB | |
| DELETE returns 500 when DB update fails | 3 | Mock DB | |

### apps/web/src/app/api/auth/__tests__/google-callback.test.ts (14 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| exchanges code for tokens and creates new user | 3 | Mock DB + Mock fetch | |
| returns existing user for duplicate email | 3 | Mock DB + Mock fetch | |
| rejects missing code parameter | 4 | None | |
| rejects missing state parameter | 4 | None | |
| returns 401 when token exchange fails | 3 | Mock fetch | |
| returns 401 when userinfo endpoint fails | 3 | Mock fetch | |
| rejects when email is missing from Google profile | 3 | Mock fetch | |
| sets emailVerified: true for Google users | 3 | Mock DB | |
| sets authProvider to google | 3 | Mock DB | |
| creates user with Google profile name | 3 | Mock DB | |
| sets JWT cookie on success | 3 | Mock DB | |
| redirects to sanitized next parameter | 3 | Mock DB | |
| redirects to /workspace when next is missing | 3 | Mock DB | |
| rejects invalid next parameter (open redirect) | 4 | None | Security |

### apps/web/src/app/api/auth/__tests__/resend-verification.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| sends verification email for authenticated user | 3 | Mock DB + Mock Resend | |
| returns 401 when not authenticated | 3 | Mock auth | |
| returns 400 when email is already verified | 3 | Mock DB | |
| stores hashed verify token in DB | 3 | Mock DB | |
| returns 429 when rate limited | 3 | Mock rate limit | |
| succeeds even when Resend throws | 4 | Mock DB | Resilience |

### apps/web/src/app/api/billing/checkout/__tests__/route.test.ts (21 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| rate limiting > returns 429 with RATE_LIMITED code | 3 | Mock rate limit | |
| input validation > returns 400 for invalid product value | 4 | None (Zod) | |
| input validation > returns 400 for invalid email format | 4 | None (Zod) | |
| input validation > accepts request with no email | 3 | Mock Stripe | |
| input validation > accepts request with no xrayId | 3 | Mock Stripe | |
| Stripe session creation > creates payment-mode session for "timeAudit" | 3 | Mock Stripe | |
| Stripe session creation > creates payment-mode session for "appBuild" (legacy slug) | 3 | Mock Stripe | |
| Stripe session creation > creates payment-mode session for "vipBuild" | 3 | Mock Stripe | |
| Stripe session creation > creates subscription-mode session for "builder" | 3 | Mock Stripe | |
| Stripe session creation > rejects retired "starter" slug | 4 | None (Zod) | |
| Stripe session creation > does NOT include subscription_data for timeAudit | 3 | Mock Stripe | |
| Stripe session creation > does NOT include subscription_data for appBuild | 3 | Mock Stripe | |
| Stripe session creation > DOES include trial_period_days: 7 for builder | 3 | Mock Stripe | |
| Stripe session creation > passes customer_email when provided | 3 | Mock Stripe | |
| Stripe session creation > passes customer_email as undefined when absent | 3 | Mock Stripe | |
| Stripe session creation > passes xrayId in metadata | 3 | Mock Stripe | |
| Stripe session creation > passes empty string for xrayId when absent | 3 | Mock Stripe | |
| Stripe session creation > passes allow_promotion_codes: true | 3 | Mock Stripe | |
| response > returns { url: session.url } on success | 3 | Mock Stripe | |
| response > returns HTTP 200 on success | 3 | Mock Stripe | |
| errors > returns 500 when Stripe throws | 3 | Mock Stripe | |

### apps/web/src/app/api/billing/webhook/__tests__/route.test.ts (25 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| authorization checks > returns 401 when stripe-signature header is absent | 4 | None | Security |
| authorization checks > returns 401 when STRIPE_WEBHOOK_SECRET env var is not set | 4 | None | Security |
| signature verification > returns 401 when constructEvent throws | 3 | Mock Stripe | |
| signature verification > proceeds when constructEvent returns a valid event | 3 | Mock DB + Mock Stripe | |
| checkout.session.completed -- timeAudit > inserts into auditOrders | 3 | Mock DB | |
| checkout.session.completed -- timeAudit > sends purchase confirmation email | 3 | Mock Resend | |
| checkout.session.completed -- timeAudit > sends founder notification email | 3 | Mock Resend | |
| checkout.session.completed -- timeAudit > inserts buyer into subscribers | 3 | Mock DB | |
| checkout.session.completed -- timeAudit > returns { received: true } | 3 | Mock DB | |
| checkout.session.completed -- appBuild (legacy) > inserts with product: "app_build" | 3 | Mock DB | |
| checkout.session.completed -- appBuild (legacy) > sends both emails | 3 | Mock Resend | |
| checkout.session.completed -- appBuild (legacy) > inserts into subscribers | 3 | Mock DB | |
| checkout.session.completed -- vipBuild > inserts with product: "app_build" | 3 | Mock DB | |
| checkout.session.completed -- vipBuild > sends both emails | 3 | Mock Resend | |
| checkout.session.completed -- builder > does NOT insert into auditOrders | 3 | Mock DB | |
| checkout.session.completed -- builder > does NOT send emails | 3 | Mock Resend | |
| checkout.session.completed -- builder > inserts into subscribers | 3 | Mock DB | |
| checkout.session.completed -- starter (retired) > does NOT insert into auditOrders | 3 | Mock DB | |
| checkout.session.completed -- starter (retired) > does NOT call resend | 3 | Mock Resend | |
| checkout.session.completed -- starter (retired) > DOES insert into subscribers | 3 | Mock DB | |
| checkout.session.completed -- starter (retired) > returns { received: true } | 3 | Mock DB | |
| checkout.session.completed -- missing email > returns { received: true } without DB/email | 3 | Mock DB | |
| customer.subscription.created > logs and returns { received: true } | 2 | None | Only logs, no real side effects tested |
| customer.subscription.deleted > logs and returns { received: true } | 2 | None | Only logs |
| unhandled event types > returns { received: true } without side effects | 3 | Mock DB | |

### apps/web/src/app/api/cron/__tests__/purge-auth.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when Authorization header is absent | 3 | Mock DB | |
| returns 401 when Authorization header is "Bearer wrong-secret" | 3 | Mock DB | |
| returns 401 when scheme is "Basic" | 3 | Mock DB | |
| proceeds when Authorization is "Bearer <CRON_SECRET>" | 3 | Mock DB | |
| executes DELETE SQL for discovery_sessions older than 30 days | 3 | Mock DB | |
| executes DELETE SQL for xray_results older than 30 days | 3 | Mock DB | |
| returns { purged: { sessions: N, xrays: M } } with rowCount values | 3 | Mock DB | |
| returns { sessions: 0, xrays: 0 } when rowCount is null | 3 | Mock DB | |

### apps/web/src/app/api/cron/purge/__tests__/route.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when Authorization header is absent | 3 | Mock DB | |
| returns 401 when "Bearer wrong-secret" | 3 | Mock DB | |
| returns 401 when scheme is "Basic" | 3 | Mock DB | |
| proceeds when "Bearer <CRON_SECRET>" | 3 | Mock DB | |
| executes DELETE SQL for discovery_sessions older than 30 days | 3 | Mock DB | |
| executes DELETE SQL for xray_results older than 30 days | 3 | Mock DB | |
| returns { purged: { sessions: N, xrays: M } } | 3 | Mock DB | |
| returns { sessions: 0, xrays: 0 } when rowCount is null | 3 | Mock DB | |

### apps/web/src/app/api/cron/agent-tick/__tests__/route.test.ts (11 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| authorization > returns 401 for missing Authorization header | 3 | Mock DB | |
| authorization > returns 401 for wrong secret | 3 | Mock DB | |
| authorization > returns 401 for wrong scheme | 3 | Mock DB | |
| empty queue > returns processed: 0 when no approved tasks exist | 3 | Mock DB | |
| spend cap > skips when global spend ceiling is exceeded | 3 | Mock DB | |
| spend cap > records spend for each processed task | 3 | Mock DB | |
| task processing > processes a booking_confirmation task | 3 | Mock DB + Mock Resend | |
| task processing > transitions task to failed when Resend errors | 3 | Mock DB + Mock Resend | |
| task processing > handles executor throwing without crashing | 4 | Mock DB | Resilience |
| task processing > marks unknown agent types as failed | 3 | Mock DB | |
| status transitions > claims tasks via UPDATE...RETURNING | 3 | Mock DB | |

### apps/web/src/app/api/cron/email-touchpoints/__tests__/route.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 for missing Authorization header | 3 | Mock DB | |
| returns 401 for wrong secret | 3 | Mock DB | |
| returns 200 with correct secret and empty user set | 3 | Mock DB | |
| sends Day 1 nudge emails to qualifying users | 3 | Mock DB + Mock Resend | |
| sends Day 7 nudge emails to qualifying users | 3 | Mock DB + Mock Resend | |
| caps total emails at 50 per batch | 3 | Mock DB | |
| continues processing when a single email fails | 4 | Mock DB + Mock Resend | Resilience |
| does not expose CRON_SECRET in response body | 4 | Mock DB | Security |

### apps/web/src/app/api/discovery/upload/__tests__/route.test.ts (69 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| rate limiting > returns 429 | 3 | Mock rate limit | |
| missing field validation > returns 400 when both file and ocrText are absent | 4 | None (Zod) | |
| missing field validation > returns 400 when platform is absent | 4 | None (Zod) | |
| missing field validation > returns 400 when sessionId is absent | 4 | None (Zod) | |
| missing field validation > returns 400 for unknown platform value | 4 | None (Zod) | |
| missing field validation > returns 400 when sessionId exceeds 32 characters | 4 | None (Zod) | |
| file validation -- image platforms > returns 400 for image/gif MIME on screentime | 4 | None | |
| file validation -- image platforms > returns 400 for image > 5 MB on screentime | 4 | None | |
| file validation -- image platforms > returns 400 for non-image MIME on subscriptions | 4 | None | |
| file validation -- image platforms > returns 400 for non-image MIME on battery | 4 | None | |
| file validation -- image platforms > returns 400 for non-image MIME on storage | 4 | None | |
| file validation -- image platforms > returns 400 for non-image MIME on calendar | 4 | None | |
| file validation -- image platforms > returns 400 for non-image MIME on health | 4 | None | |
| file validation -- image platforms > returns 400 for non-image MIME on adaptive | 4 | None | |
| file validation -- ZIP platforms > returns 400 when chatgpt file has non-ZIP MIME | 4 | None | |
| file validation -- ZIP platforms > accepts chatgpt with application/octet-stream | 4 | None | |
| file validation -- ZIP platforms > returns 400 for ZIP > 200 MB on chatgpt | 4 | None | |
| file validation -- ZIP platforms > returns 400 when google file has non-ZIP MIME | 4 | None | |
| file validation -- JSON platform > returns 400 when claude has non-JSON MIME | 4 | None | |
| file validation -- JSON platform > accepts claude with text/plain MIME | 4 | None | |
| file validation -- JSON platform > returns 400 for JSON > 50 MB on claude | 4 | None | |
| ocrText validation > returns 400 when ocrText exceeds 50,000 characters | 4 | None | |
| ocrText + file both provided > ocrText wins | 3 | Mock DB + Mock AI | |
| ocrText + file both provided > uses OCR path when ocrText is non-empty | 3 | Mock DB + Mock AI | |
| ocrText on ZIP/JSON platforms > returns 400 "File required for ChatGPT export." | 4 | None | |
| ocrText on ZIP/JSON platforms > returns 400 "File required for Claude export." | 4 | None | |
| ocrText on ZIP/JSON platforms > returns 400 "File required for Google Takeout." | 4 | None | |
| session lookup > returns 404 NOT_FOUND when session does not exist | 3 | Mock DB | |
| idempotency > returns { success: true, cached: true } on second upload | 3 | Mock DB | |
| idempotency > does NOT apply idempotency for adaptive platform | 3 | Mock DB | |
| screentime platform > calls extractFromOcrText with sourceType "screentime" | 3 | Mock DB + Mock AI | |
| screentime platform > calls extractScreenTime (Vision) when only file is provided | 3 | Mock DB + Mock AI | |
| screentime platform > returns 422 when extractFromOcrText returns { error } | 3 | Mock DB + Mock AI | |
| screentime platform > returns 422 when extractScreenTime returns { error } | 3 | Mock DB + Mock AI | |
| screentime platform > updates session.screenTimeData in DB | 3 | Mock DB | |
| screentime platform > returns { success: true, platform: "screentime" } | 3 | Mock DB | |
| chatgpt platform > returns 400 when no file is provided | 4 | None | |
| chatgpt platform > calls parseChatGptExport then extractTopicsFromMessages | 3 | Mock DB + Mock parsers | |
| chatgpt platform > strips _rawMessages before persisting | 3 | Mock DB | |
| chatgpt platform > returns 422 for "No conversations.json found" | 3 | Mock parsers | |
| chatgpt platform > returns 422 for "invalid JSON" | 3 | Mock parsers | |
| chatgpt platform > returns 422 for "not an array" | 3 | Mock parsers | |
| chatgpt platform > returns 422 for "Archive too large" (zip bomb) | 3 | Mock parsers | |
| claude platform > returns 400 when no file is provided | 4 | None | |
| claude platform > calls parseClaudeExport then extractTopicsFromMessages | 3 | Mock DB + Mock parsers | |
| claude platform > strips _rawMessages before persisting | 3 | Mock DB | |
| google platform > returns 400 when no file is provided | 4 | None | |
| google platform > calls parseGoogleTakeout then extractGoogleTopics | 3 | Mock DB + Mock parsers | |
| google platform > strips _rawSearches and _rawYoutubeWatches | 3 | Mock DB | |
| google platform > persists youtubeTopCategories as null when empty array | 3 | Mock DB | |
| subscriptions/battery/storage/calendar/health > calls extractFromOcrText | 3 | Mock DB + Mock AI | |
| subscriptions/battery/storage/calendar/health > calls extractFromScreenshot (Vision) | 3 | Mock DB + Mock AI | |
| subscriptions/battery/storage/calendar/health > returns 422 on extraction error | 3 | Mock DB + Mock AI | |
| subscriptions/battery/storage/calendar/health > updates correct DB column | 3 | Mock DB | |
| adaptive platform > reads appName from formData and resolves sourceType | 3 | Mock DB + Mock AI | |
| adaptive platform > uses JSONB COALESCE atomic append for adaptiveData | 3 | Mock DB | |
| adaptive platform > does NOT check idempotency guard | 3 | Mock DB | |
| adaptive platform > returns { success: true, platform: "adaptive" } | 3 | Mock DB | |
| adaptive platform > handles null appName | 3 | Mock DB | |
| resolveAdaptiveSourceType > maps "Strava" to "health" | 3 | Mock DB + Mock AI | Pure logic via integration |
| resolveAdaptiveSourceType > maps "Nike Run Club" to "health" | 3 | Mock DB + Mock AI | |
| resolveAdaptiveSourceType > maps "Google Calendar" to "calendar" | 3 | Mock DB + Mock AI | |
| resolveAdaptiveSourceType > maps "Outlook" to "calendar" | 3 | Mock DB + Mock AI | |
| resolveAdaptiveSourceType > maps "Revolut" to "subscriptions" | 3 | Mock DB + Mock AI | |
| resolveAdaptiveSourceType > maps "Photos" to "storage" | 3 | Mock DB + Mock AI | |
| resolveAdaptiveSourceType > maps "Dropbox" to "storage" | 3 | Mock DB + Mock AI | |
| resolveAdaptiveSourceType > maps unknown app to "subscriptions" fallback | 3 | Mock DB + Mock AI | |
| resolveAdaptiveSourceType > is case-insensitive | 3 | Mock DB + Mock AI | |
| resolveAdaptiveSourceType > returns "subscriptions" for null appName | 3 | Mock DB + Mock AI | |

### apps/web/src/app/api/discovery/__tests__/upload-security.test.ts (17 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| Prompt injection > wraps ocrText in <ocr-data> tags | 4 | Mock DB + Mock AI | Security: injection defense |
| Prompt injection > rejects ocrText > 50,000 chars before AI call | 4 | None | |
| Prompt injection > ocrText containing </ocr-data> does not escape | 5 | Mock DB + Mock AI | Security: tag escape attack |
| Zip bomb -- ChatGPT > returns 500 on "Archive too large" | 3 | Mock parsers | |
| Zip bomb -- Google Takeout > returns 422 on "Archive too large" | 3 | Mock parsers | |
| MIME type validation > rejects image/gif on screentime | 4 | None | |
| MIME type validation > rejects application/pdf on screentime | 4 | None | |
| MIME type validation > rejects text/plain masquerading as .zip for chatgpt | 4 | None | |
| MIME type validation > accepts application/octet-stream for chatgpt | 4 | None | |
| MIME type validation > accepts .zip extension fallback for chatgpt | 4 | None | |
| MIME type validation > rejects arbitrary binary with no .json extension for claude | 4 | None | |
| MIME type validation > accepts text/plain for claude | 4 | None | |
| Session ID validation > returns 400 for empty string | 4 | None (Zod) | |
| Session ID validation > returns 400 for sessionId > 32 chars | 4 | None (Zod) | |
| Rate limiting IP extraction > extracts first x-forwarded-for segment | 3 | None | |
| Rate limiting IP extraction > falls back to "unknown" | 3 | None | |
| Rate limiting IP extraction > returns { success: true } when limiter is null | 3 | None | |

### apps/web/src/app/api/discovery/session/__tests__/route.test.ts (13 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| rate limiting > returns 429 | 3 | Mock rate limit | |
| input validation > returns 400 when occupation is missing | 4 | None (Zod) | |
| input validation > returns 400 when occupation exceeds 50 chars | 4 | None (Zod) | |
| input validation > returns 400 when ageBracket is missing | 4 | None (Zod) | |
| input validation > returns 400 when quizPicks is empty array | 4 | None (Zod) | |
| input validation > returns 400 when quizPicks has > 12 entries | 4 | None (Zod) | |
| input validation > returns 400 when aiComfort is 0 (below min) | 4 | None (Zod) | |
| input validation > returns 400 when aiComfort is 5 (above max) | 4 | None (Zod) | |
| input validation > returns 400 when aiToolsUsed has > 10 entries | 4 | None (Zod) | |
| happy path > inserts session into DB with all provided fields | 3 | Mock DB | |
| happy path > returns { sessionId } -- a 16-character nanoid string | 3 | Mock DB | |
| happy path > returns HTTP 200 | 3 | Mock DB | |
| database errors > returns 500 INTERNAL_ERROR when DB insert throws | 3 | Mock DB | |

### apps/web/src/app/api/discovery/analyze/__tests__/route.test.ts (13 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 429 when rate limited | 3 | Mock rate limit | |
| returns 400 VALIDATION_ERROR when sessionId is missing | 4 | None (Zod) | |
| returns 404 NOT_FOUND when session does not exist | 3 | Mock DB | |
| returns 400 INCOMPLETE_DATA when quizPicks is empty | 3 | Mock DB | |
| calls runCrossAnalysis with the correct input shape | 3 | Mock DB + Mock AI | |
| persists analysis result to xray_results table | 3 | Mock DB | |
| updates session.tierPurchased to "free" | 3 | Mock DB | |
| returns the analysis result with xrayId | 3 | Mock DB | |
| returns 500 ANALYSIS_FAILED when runCrossAnalysis throws | 3 | Mock DB + Mock AI | |
| returns 400 when sessionId exceeds 32 characters | 4 | None (Zod) | |
| returns 400 when sessionId is empty string | 4 | None (Zod) | |
| returns 400 on invalid JSON body | 4 | None | |
| returns 500 when xray insert fails | 3 | Mock DB | |

### apps/web/src/app/api/discovery/adaptive/__tests__/route.test.ts (12 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 429 when rate limited | 3 | Mock rate limit | |
| returns 400 when sessionId is missing | 4 | None (Zod) | |
| returns 400 when sessionId exceeds 32 characters | 4 | None (Zod) | |
| returns 404 when session does not exist | 3 | Mock DB | |
| returns 400 when screenTimeData is null | 3 | Mock DB | |
| returns 200 with follow-up questions on success | 3 | Mock DB + Mock AI | |
| calls generateAdaptiveFollowUps with correct input | 3 | Mock DB + Mock AI | |
| returns 500 when AI generation throws | 3 | Mock DB + Mock AI | |
| includes subscriptionsData in input when present | 3 | Mock DB + Mock AI | |
| includes all platform data fields in input | 3 | Mock DB + Mock AI | |
| returns 500 when DB query throws | 3 | Mock DB | |
| passes null for missing platform data fields | 3 | Mock DB + Mock AI | |

### apps/web/src/app/api/onboarding/__tests__/route.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| rejects unauthenticated requests with 401 | 3 | Mock auth | |
| rejects invalid vertical id with 400 | 4 | None (Zod) | |
| creates project with valid hair-beauty vertical | 3 | Mock DB | |
| creates project with consulting vertical | 3 | Mock DB | |
| accepts optional business name | 3 | Mock DB | |
| rejects missing body with 400 | 4 | None | |

### apps/web/src/app/api/webhooks/resend/__tests__/route.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| signature verification > returns 401 when RESEND_WEBHOOK_SECRET is not set | 4 | None | Security |
| signature verification > returns 401 when svix headers are missing | 4 | None | Security |
| signature verification > returns 401 when svix verification fails | 3 | Mock svix | |
| payload validation > returns 400 when payload has no type | 4 | None (Zod) | |
| payload validation > returns 400 when payload has no email_id | 4 | None (Zod) | |
| email.delivered > transitions verifying task to done | 3 | Mock DB | |
| email.delivered > does not transition when task is not in verifying status | 3 | Mock DB | State machine |
| email.delivered > returns matched: false when no task found | 3 | Mock DB | |
| email.bounced > transitions verifying task to failed | 3 | Mock DB | |
| email.bounced > transitions already-failed task to escalated | 3 | Mock DB | State machine |
| email.complained > transitions verifying task to failed | 3 | Mock DB | |
| email.complained > transitions already-failed task to escalated | 3 | Mock DB | State machine |
| idempotency > processing same delivered event twice does not crash | 4 | Mock DB | Resilience |
| idempotency > processing same bounced event twice does not crash | 4 | Mock DB | Resilience |
| unhandled event types > returns 200 without side effects | 3 | Mock DB | |

### apps/web/src/app/api/workspace/projects/__tests__/route.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| POST > returns 401 when no auth cookie | 3 | Mock auth | |
| POST > returns 401 when cookie is invalid | 3 | Mock auth | |
| POST > returns 400 on invalid JSON | 4 | None | |
| POST > returns 400 when name has wrong type | 4 | None (Zod) | |
| POST > returns 400 when name exceeds length cap | 4 | None (Zod) | |
| POST > returns 400 when name contains forbidden characters | 4 | None (Zod) | |
| POST > creates a project with the given name | 3 | Mock DB | |
| POST > uses a default name when none is provided | 3 | Mock DB | |
| POST > seeds the project with Next.js + Panda starter | 3 | Mock DB + Mock storage | |
| GET > returns 401 when no auth cookie | 3 | Mock auth | |
| GET > returns 401 when cookie is invalid | 3 | Mock auth | |
| GET > returns empty list when no projects | 3 | Mock DB | |
| GET > returns the list of projects in DB order | 3 | Mock DB | |
| GET > returns 500 when the database query throws | 3 | Mock DB | |
| GET > scopes the query to the authenticated user | 3 | Mock DB | |

### apps/web/src/app/api/workspace/projects/__tests__/serialize-error.test.ts (5 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| omits stack in production | 4 | None | Security: info leak prevention |
| includes stack in development | 4 | None | |
| returns empty object for non-Error | 3 | None | |
| includes message property | 3 | None | |
| handles error without stack | 3 | None | |

### apps/web/src/app/api/workspace/tokens/__tests__/route.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when no auth cookie | 3 | Mock auth | |
| returns 401 when auth cookie is invalid | 3 | Mock auth | |
| calls getTokenBalance with correct userId | 3 | Mock DB | |
| calls getTransactionHistory with correct userId and limit | 3 | Mock DB | |
| returns balance and transactions when authenticated | 3 | Mock DB | |
| returns 500 when getTokenBalance throws | 3 | Mock DB | |
| returns 429 when rate limited | 3 | Mock rate limit | |

### apps/web/src/app/api/workspace/tokens/claim-daily/__tests__/route.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when no auth cookie | 3 | Mock auth | |
| returns 429 when rate limited | 3 | Mock rate limit | |
| credits tokens on first daily claim | 3 | Mock DB | |
| returns 409 when already claimed today | 3 | Mock DB | |
| returns the new balance after claim | 3 | Mock DB | |
| returns 500 when creditTokens throws | 3 | Mock DB | |

### apps/web/src/app/api/workspace/[projectId]/settings/__tests__/route.test.ts (16 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| GET > returns 401 when no auth cookie | 3 | Mock auth | |
| GET > returns 401 when the cookie is invalid | 3 | Mock auth | |
| GET > returns 404 when project does not belong to user | 3 | Mock DB | |
| GET > returns current wishes for the project | 3 | Mock DB | |
| GET > returns empty object when wishes is null | 3 | Mock DB | |
| GET > returns 500 when db query throws | 3 | Mock DB | |
| PUT > returns 401 when no auth cookie | 3 | Mock auth | |
| PUT > returns 401 when the cookie is invalid | 3 | Mock auth | |
| PUT > returns 404 when project does not belong to user | 3 | Mock DB | |
| PUT > returns 400 on invalid JSON | 4 | None | |
| PUT > updates businessName in wishes | 3 | Mock DB | |
| PUT > updates services in wishes | 3 | Mock DB | |
| PUT > updates hours in wishes | 3 | Mock DB | |
| PUT > merges with existing wishes (does not clobber) | 3 | Mock DB | |
| PUT > returns 400 when projectId is not a UUID | 4 | None (Zod) | |
| PUT > returns 500 when db update throws | 3 | Mock DB | |

### apps/web/src/app/api/workspace/[projectId]/wishes/__tests__/route.test.ts (5 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| GET > returns 401 when no auth cookie | 3 | Mock auth | |
| GET > returns wishes from DB | 3 | Mock DB | |
| PUT > returns 401 when no auth cookie | 3 | Mock auth | |
| PUT > updates wishes in DB | 3 | Mock DB | |
| PUT > returns 400 on invalid JSON | 4 | None | |

### apps/web/src/app/api/workspace/[projectId]/bookings/__tests__/route.test.ts (16 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| POST > creates a booking without auth (public endpoint) | 3 | Mock DB | |
| POST > includes business name from project wishes | 3 | Mock DB | |
| POST > falls back to project name when no businessName | 3 | Mock DB | |
| POST > accepts an optional note field | 3 | Mock DB | |
| POST > returns 400 when required fields are missing | 4 | None (Zod) | |
| POST > returns 400 when email is invalid | 4 | None (Zod) | |
| POST > returns 400 on invalid JSON | 4 | None | |
| POST > returns 400 when projectId is not a UUID | 4 | None (Zod) | |
| POST > returns 500 when proposeTask throws | 3 | Mock DB | |
| POST > rate limiting > returns 429 | 3 | Mock rate limit | |
| GET > returns 401 when no auth cookie | 3 | Mock auth | |
| GET > returns 401 when the cookie is invalid | 3 | Mock auth | |
| GET > returns 404 when project does not belong to user | 3 | Mock DB | |
| GET > returns recent bookings for the project | 3 | Mock DB | |
| GET > returns an empty list when no bookings | 3 | Mock DB | |
| GET > returns 500 when getTaskHistory throws | 3 | Mock DB | |

### apps/web/src/app/api/workspace/[projectId]/cards/__tests__/route.test.ts (27 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| GET > returns 401 when no auth cookie | 3 | Mock auth | |
| GET > returns 401 when the cookie is invalid | 3 | Mock auth | |
| GET > returns 404 when project does not belong to user | 3 | Mock DB | |
| GET > returns empty list when no cards | 3 | Mock DB | |
| GET > returns cards ordered by parentId nulls first, then position | 3 | Mock DB | |
| POST > returns 401 when no auth cookie | 3 | Mock auth | |
| POST > returns 404 when the project does not exist | 3 | Mock DB | |
| POST > returns 400 on invalid JSON | 4 | None | |
| POST > returns 400 when title is missing | 4 | None (Zod) | |
| POST > returns 400 when title exceeds 80 chars | 4 | None (Zod) | |
| POST > creates a card with defaults and returns 201 | 3 | Mock DB | |
| POST > creates a subtask under a parent milestone | 3 | Mock DB | |
| POST > auto-increments position based on existing siblings | 3 | Mock DB | |
| PATCH > returns 401 when no auth cookie | 3 | Mock auth | |
| PATCH > returns 404 when project does not exist | 3 | Mock DB | |
| PATCH > returns 400 on invalid update data | 4 | None (Zod) | |
| PATCH > updates a card and returns the updated record | 3 | Mock DB | |
| PATCH > returns 404 when the card does not exist | 3 | Mock DB | |
| DELETE > returns 401 when no auth cookie | 3 | Mock auth | |
| DELETE > returns 404 when the card does not exist | 3 | Mock DB | |
| DELETE > deletes a card and returns success | 3 | Mock DB | |
| DELETE > cascade deletes subtasks via the FK (DB-level) | 1 | Mock DB | Claims DB cascade but DB is mocked -- cascade not tested |
| PATCH reorder > returns 401 when no auth cookie | 3 | Mock auth | |
| PATCH reorder > returns 404 when project does not exist | 3 | Mock DB | |
| PATCH reorder > returns 400 on invalid body | 4 | None (Zod) | |
| PATCH reorder > reorders cards by updating positions sequentially | 3 | Mock DB | |
| PATCH reorder > returns 400 when cardIds contains non-UUID strings | 4 | None (Zod) | |

### apps/web/src/app/api/workspace/[projectId]/agent/events/__tests__/route.test.ts (12 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| JSON > returns 401 when no auth cookie | 3 | Mock auth | |
| JSON > returns 401 when the cookie is invalid | 3 | Mock auth | |
| JSON > returns 404 when project does not belong to user | 3 | Mock DB | |
| JSON > returns events ordered by createdAt DESC | 3 | Mock DB | |
| JSON > returns empty list when no events | 3 | Mock DB | |
| JSON > returns 500 when the query throws | 3 | Mock DB | |
| SSE > returns 401 when no auth cookie | 3 | Mock auth | |
| SSE > returns 404 when project does not belong to user | 3 | Mock DB | |
| SSE > returns SSE stream with correct content type | 3 | Mock DB | |
| SSE > streams events as SSE data lines | 3 | Mock DB | |
| SSE > returns empty stream when no events | 3 | Mock DB | |
| SSE > returns 500 when the SSE query throws | 3 | Mock DB | |

### apps/web/src/app/api/workspace/[projectId]/agent/tasks/__tests__/route.test.ts (18 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| GET > returns 401 when no auth cookie | 3 | Mock auth | |
| GET > returns 401 when the cookie is invalid | 3 | Mock auth | |
| GET > returns 404 when project does not belong to user | 3 | Mock DB | |
| GET > returns tasks for the project | 3 | Mock DB | |
| GET > returns empty list when no tasks | 3 | Mock DB | |
| GET > returns 500 when query throws | 3 | Mock DB | |
| PATCH > returns 401 when no auth cookie | 3 | Mock auth | |
| PATCH > returns 404 when project does not belong to user | 3 | Mock DB | |
| PATCH > returns 400 on invalid JSON | 4 | None | |
| PATCH > returns 400 when taskId is not a UUID | 4 | None (Zod) | |
| PATCH > returns 400 when action is invalid | 4 | None (Zod) | |
| PATCH > approves a proposed task | 3 | Mock DB | |
| PATCH > rejects a proposed task | 3 | Mock DB | |
| PATCH > returns 404 when task does not exist | 3 | Mock DB | |
| PATCH > returns 409 when task is not in proposed state | 3 | Mock DB | |
| PATCH > returns 500 when update throws | 3 | Mock DB | |
| PATCH > inserts agent_event for approve action | 3 | Mock DB | |
| PATCH > inserts agent_event for reject action | 3 | Mock DB | |

### apps/web/src/app/api/workspace/[projectId]/apply-template/__tests__/route.test.ts (10 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when no auth cookie | 3 | Mock auth | |
| returns 401 when the cookie is invalid | 3 | Mock auth | |
| returns 400 when projectId is not a UUID | 4 | None (Zod) | |
| returns 400 on invalid JSON body | 4 | None | |
| returns 400 when templateId is missing | 4 | None (Zod) | |
| returns 404 when project does not exist | 3 | Mock DB | |
| returns 404 when templateId does not match any template | 3 | None (static lookup) | |
| returns 201 and inserts cards for a valid template | 3 | Mock DB | |
| calls db.insert with kanbanCards table | 3 | Mock DB | |
| works with each template id | 3 | Mock DB | |

### apps/web/src/app/api/workspace/[projectId]/build/__tests__/route.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| sseStreamFromGenerator > encodes events as SSE frames | 4 | None | Pure logic |
| sseStreamFromGenerator > ends with [DONE] sentinel | 4 | None | |
| sseStreamFromGenerator > handles empty generator | 4 | None | |
| POST > returns 401 when no auth cookie | 3 | Mock auth | |
| POST > returns 401 when cookie is invalid | 3 | Mock auth | |
| POST > returns 404 when project does not belong to user | 3 | Mock DB | |
| POST > returns 400 on invalid JSON | 4 | None | |
| POST > returns 400 when description is empty | 4 | None (Zod) | |
| POST > returns 400 when description exceeds 2000 chars | 4 | None (Zod) | |
| POST > returns SSE stream with correct content type | 3 | Mock DB + Mock orchestrator | |
| POST > returns 429 when rate limited | 3 | Mock rate limit | |
| POST > emits started and committed events for a successful build | 3 | Mock DB + Mock orchestrator | |
| POST > returns 400 when projectId is not a UUID | 4 | None (Zod) | |
| POST > returns 400 when cardId is not a UUID | 4 | None (Zod) | |
| POST > returns 403 when token balance is insufficient | 3 | Mock DB | |

### apps/web/src/app/api/workspace/[projectId]/improve-prompt/__tests__/route.test.ts (9 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when no auth cookie | 3 | Mock auth | |
| returns 429 when rate limited | 3 | Mock rate limit | |
| calls Haiku with the defensive system prompt | 3 | Mock AI | |
| validates Haiku output with Zod and returns improved + explanation | 3 | Mock AI | |
| returns 500 when Haiku output fails Zod validation | 3 | Mock AI | |
| truncates oversized improved text and notes in explanation | 3 | Mock AI | |
| returns 400 when description exceeds 500 chars | 4 | None (Zod) | |
| includes acceptance criteria in the user message when provided | 3 | Mock AI | |
| returns 404 when project does not exist | 3 | Mock DB | |

### apps/web/src/app/api/workspace/[projectId]/generate-plan/__tests__/route.test.ts (10 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when no auth cookie | 3 | Mock auth | |
| returns 401 when the cookie is invalid | 3 | Mock auth | |
| returns 400 when projectId is not a UUID | 4 | None (Zod) | |
| returns 400 when messages array is empty | 4 | None (Zod) | |
| returns 400 on invalid JSON body | 4 | None | |
| calls Haiku with the plan generation system prompt | 3 | Mock AI + Mock DB | |
| validates Haiku output with Zod and inserts cards | 3 | Mock AI + Mock DB | |
| retries once when Haiku output fails validation | 4 | Mock AI + Mock DB | Retry logic |
| returns 500 when both Haiku attempts fail validation | 3 | Mock AI + Mock DB | |
| returns 404 when project does not exist | 3 | Mock DB | |

### apps/web/src/app/api/workspace/[projectId]/generate-proposal/__tests__/route.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when no auth cookie | 3 | Mock auth | |
| returns 429 when rate limited | 3 | Mock rate limit | |
| calls Haiku with correct system prompt | 3 | Mock AI | |
| validates Haiku output with Zod | 3 | Mock AI | |
| returns 404 when project does not exist | 3 | Mock DB | |
| returns 500 when Haiku output fails Zod validation | 3 | Mock AI | |

### apps/web/src/app/api/workspace/[projectId]/ask-question/__tests__/route.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when no auth cookie | 3 | Mock auth | |
| returns 429 when rate limited | 3 | Mock rate limit | |
| calls Haiku with correct user message | 3 | Mock AI | |
| returns the answer from Haiku | 3 | Mock AI | |
| returns 404 when project does not exist | 3 | Mock DB | |
| returns 400 when questionIndex is out of range | 4 | None (Zod) | |

### apps/web/src/server/build-orchestration/__tests__/build-pipeline-integration.test.ts (41 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| realistic AI output > commits multiple realistic files | 5 | InMemory storage | Full pipeline, real storage impl |
| realistic AI output > file_written events carry correct contentHash and sizeBytes | 5 | InMemory storage | |
| second build > preserves untouched files, updates modified, adds new | 5 | InMemory storage | Multi-build lifecycle |
| second build > references the first build as parentBuildId | 5 | InMemory storage | |
| second build > Anthropic receives current project files in prompt | 4 | InMemory storage + Mock AI | Validates prompt construction |
| path safety > rejects path traversal with .. | 5 | InMemory storage | Security |
| path safety > rejects nested path traversal | 5 | InMemory storage | Security |
| path safety > rejects write to node_modules | 5 | InMemory storage | Security |
| path safety > rejects write to .env | 5 | InMemory storage | Security |
| path safety > rejects write to .env.local | 5 | InMemory storage | Security |
| path safety > rejects write to .env.production | 5 | InMemory storage | Security |
| path safety > rejects write to .git directory | 5 | InMemory storage | Security |
| path safety > rejects write to .next build output | 5 | InMemory storage | Security |
| path safety > rejects write to .vercel config | 5 | InMemory storage | Security |
| path safety > rejects absolute path (/etc/passwd) | 5 | InMemory storage | Security |
| path safety > rejects redundant dot segment | 5 | InMemory storage | Security |
| path safety > rejects write to dist directory | 5 | InMemory storage | Security |
| path safety > rejects write to .turbo directory | 5 | InMemory storage | Security |
| path safety > rejects path with backslash (Windows-style) | 5 | InMemory storage | Security |
| path safety > rejects path with null byte injection | 5 | InMemory storage | Security |
| path safety > rejects empty path | 5 | InMemory storage | Security |
| path safety > rejects path with control characters | 5 | InMemory storage | Security |
| path safety > accepts valid safe paths | 4 | InMemory storage | |
| SSE stream round-trip > encode -> stream -> decode preserves every field | 4 | None | Pure serialization |
| SSE stream round-trip > event order is started -> prompt_sent -> file_written* -> committed | 4 | None | |
| SSE stream round-trip > committed event carries tokenCost, actualCents, fileCount, and cache fields | 4 | None | |
| SSE stream round-trip > file_written events have monotonically increasing fileIndex | 4 | None | |
| build without sandbox > emits committed without sandbox_ready | 3 | InMemory storage + Mock AI | |
| build without sandbox > sandbox failure post-commit does not prevent committed | 4 | InMemory storage | Resilience |
| token ledger > not debited when Sonnet returns no tool_use blocks | 4 | InMemory storage + InMemory ledger | |
| token ledger > not debited when Sonnet response is truncated | 4 | InMemory storage + InMemory ledger | |
| token ledger > not debited when path safety rejects all files | 4 | InMemory storage + InMemory ledger | |
| token ledger > IS debited on a successful build | 4 | InMemory storage + InMemory ledger | |
| token ledger > pre-flight ceiling check prevents Sonnet call when budget insufficient | 4 | InMemory ledger | |
| edge cases > first build on project with only genesis file | 4 | InMemory storage + Mock AI | |
| edge cases > build on project with many existing files includes all in prompt | 4 | InMemory storage + Mock AI | |
| edge cases > Zod rejects tool_use with missing content field | 4 | None (Zod) | |
| edge cases > Zod rejects tool_use with numeric path | 4 | None (Zod) | |
| edge cases > build with abort signal stops the pipeline | 4 | InMemory storage + Mock AI | |
| edge cases > global spend guard blocks build when paused | 3 | Mock spend guard | |
| edge cases > global spend guard blocks build when ceiling exceeded | 3 | Mock spend guard | |

### apps/web/src/server/build-orchestration/__tests__/build-journey.test.ts (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| full build journey: create project -> apply template cards -> build -> SSE events | 5 | InMemory storage | End-to-end pipeline |
| build with unsafe path traversal triggers failed event | 5 | InMemory storage | Security |
| build with reserved path segment (node_modules) triggers failed event | 5 | InMemory storage | Security |
| deploy gracefully skips when no sandbox provider is set | 4 | InMemory storage | |

### apps/web/src/server/build-orchestration/__tests__/routes-tracked.test.ts (46 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| found route files on disk | 1 | None | Filesystem check, not a behavior test |
| auth/login is tracked by git | 1 | None | |
| auth/register is tracked by git | 1 | None | |
| auth/me is tracked by git | 1 | None | |
| auth/forgot-password is tracked by git | 1 | None | |
| auth/reset-password is tracked by git | 1 | None | |
| auth/verify-email is tracked by git | 1 | None | |
| auth/google is tracked by git | 1 | None | |
| auth/google/callback is tracked by git | 1 | None | |
| auth/resend-verification is tracked by git | 1 | None | |
| billing/checkout is tracked by git | 1 | None | |
| billing/webhook is tracked by git | 1 | None | |
| cron/agent-tick is tracked by git | 1 | None | |
| cron/email-touchpoints is tracked by git | 1 | None | |
| cron/purge is tracked by git | 1 | None | |
| cron/spend-alert is tracked by git | 1 | None | |
| discovery/adaptive is tracked by git | 1 | None | |
| discovery/analyze is tracked by git | 1 | None | |
| discovery/session is tracked by git | 1 | None | |
| discovery/upload is tracked by git | 1 | None | |
| onboarding is tracked by git | 1 | None | |
| subscribe is tracked by git | 1 | None | |
| upload/screentime is tracked by git | 1 | None | |
| webhooks/resend is tracked by git | 1 | None | |
| workspace/[projectId]/agent/auto-approve is tracked by git | 1 | None | |
| workspace/[projectId]/agent/events is tracked by git | 1 | None | |
| workspace/[projectId]/agent/tasks is tracked by git | 1 | None | |
| workspace/[projectId]/apply-template is tracked by git | 1 | None | |
| workspace/[projectId]/ask-question is tracked by git | 1 | None | |
| workspace/[projectId]/auto-build is tracked by git | 1 | None | |
| workspace/[projectId]/bookings is tracked by git | 1 | None | |
| workspace/[projectId]/build is tracked by git | 1 | None | |
| workspace/[projectId]/build-decisions is tracked by git | 1 | None | |
| workspace/[projectId]/cards/[cardId] is tracked by git | 1 | None | |
| workspace/[projectId]/cards/reorder is tracked by git | 1 | None | |
| workspace/[projectId]/cards is tracked by git | 1 | None | |
| workspace/[projectId]/files is tracked by git | 1 | None | |
| workspace/[projectId]/generate-plan is tracked by git | 1 | None | |
| workspace/[projectId]/generate-proposal is tracked by git | 1 | None | |
| workspace/[projectId]/improve-prompt is tracked by git | 1 | None | |
| workspace/[projectId]/settings is tracked by git | 1 | None | |
| workspace/[projectId]/wishes is tracked by git | 1 | None | |
| workspace/projects is tracked by git | 1 | None | |
| workspace/templates/[templateId] is tracked by git | 1 | None | |
| workspace/tokens/claim-daily is tracked by git | 1 | None | |
| workspace/tokens is tracked by git | 1 | None | |

### apps/web/src/server/build/__tests__/first-build-email-toctou.test.ts (2 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| does not send email when UPDATE rowCount is 0 (concurrent call already sent) | 4 | Mock DB | TOCTOU race condition test |
| sends email when UPDATE rowCount is 1 (first caller wins) | 4 | Mock DB | |

### apps/web/src/server/build/__tests__/sandbox-preview.test.ts (9 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| emits sandbox_ready after successful deploy | 3 | Mock storage + Mock sandbox | |
| emits sandbox_failed on deploy error | 3 | Mock storage + Mock sandbox | |
| passes all current files to sandbox.deploy | 3 | Mock storage + Mock sandbox | |
| sets preview URL in storage on success | 3 | Mock storage + Mock sandbox | |
| handles empty file set | 3 | Mock storage + Mock sandbox | |
| does not set preview URL on failure | 3 | Mock storage + Mock sandbox | |
| abort signal stops deploy | 3 | Mock storage + Mock sandbox | |
| reads file content for each file | 3 | Mock storage + Mock sandbox | |
| handles sandbox returning null URL | 3 | Mock storage + Mock sandbox | |

### apps/web/src/server/build/__tests__/sandbox-provider-factory.test.ts (5 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns SandboxProvider when both env vars are set | 3 | None | |
| returns null when CF_SANDBOX_WORKER_URL is missing | 3 | None | |
| returns null when CF_SANDBOX_HMAC_SECRET is missing | 3 | None | |
| returns null when both are missing | 3 | None | |
| caches the provider instance | 3 | None | |

### apps/web/src/server/deploy/__tests__/vercel-deploy.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns not_configured when MELDAR_DEPLOY_TOKEN is missing | 3 | None | |
| runs the full 6-step sequence on the happy path | 3 | Mock fetch | |
| handles a 409 on project create by looking up existing project | 3 | Mock fetch | |
| maps ERROR readyState to deployment_build_failed | 3 | Mock fetch | |
| maps upload failure to upload_failed with the path | 3 | Mock fetch | |
| accepts 409 on addDomain as idempotent success | 3 | Mock fetch | |

### apps/web/src/server/deploy/__tests__/sleep-listener-leak.test.ts (2 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| removes abort listener after timer fires normally | 4 | None | Resource leak prevention |
| cleans up timer when signal aborts | 4 | None | |

### apps/web/src/server/deploy/__tests__/guarded-deploy-call.test.ts (2 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| does not waste a rate-limit slot when hourly cap is already at limit | 4 | None | Pre-flight cap check |
| does not waste a rate-limit slot when daily cap is already at limit | 4 | None | |

### apps/web/src/server/discovery/__tests__/analyze.test.ts (21 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| buildDataContext > always includes ## Quiz Picks and ## AI Comfort Level sections | 4 | Mock AI | Tests prompt construction |
| buildDataContext > formats aiComfort label as "Never touched AI" for value 1 | 4 | Mock AI | |
| buildDataContext > formats aiComfort label as "Use it daily" for value 4 | 4 | Mock AI | |
| buildDataContext > includes ## Screen Time Data section only when defined | 4 | Mock AI | |
| buildDataContext > includes ## ChatGPT Usage section | 4 | Mock AI | |
| buildDataContext > includes ## Claude Usage section independently of chatgpt | 4 | Mock AI | |
| buildDataContext > includes ## Google Search Topics section | 4 | Mock AI | |
| buildDataContext > includes ## YouTube Watch Categories section | 4 | Mock AI | |
| buildDataContext > includes ## App Subscriptions section | 4 | Mock AI | |
| buildDataContext > includes ## Battery Usage section | 4 | Mock AI | |
| buildDataContext > includes ## Storage Usage section | 4 | Mock AI | |
| buildDataContext > includes ## Calendar Week View section capped at 15 | 4 | Mock AI | |
| buildDataContext > includes ## Health Data section with highlights line | 4 | Mock AI | |
| buildDataContext > includes ## Adaptive Follow-Up Data section | 4 | Mock AI | |
| buildDataContext > omits all optional sections when data undefined | 4 | Mock AI | |
| runCrossAnalysis > calls Sonnet with ANALYSIS_TOOL and forced tool_choice | 3 | Mock AI | |
| runCrossAnalysis > returns DiscoveryAnalysis with all required fields | 3 | Mock AI | |
| runCrossAnalysis > merges BASE_LEARNING_MODULES with personalizedModules | 3 | Mock AI | |
| runCrossAnalysis > throws "no tool response" when no tool_use in response | 4 | Mock AI | Error handling |
| runCrossAnalysis > throws with Zod message when tool output fails schema | 4 | Mock AI | Zod boundary |
| runCrossAnalysis > throws when complexity is not "beginner" or "intermediate" | 4 | Mock AI | Zod boundary |

### apps/web/src/server/discovery/__tests__/extract-topics.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| truncates to first 300 messages when given more than 300 | 3 | Mock AI | |
| joins message texts with "---" separator | 3 | Mock AI | |
| includes platform name in system prompt | 3 | Mock AI | |
| returns parsed topTopics and repeatedQuestions on valid tool response | 3 | Mock AI | |
| returns empty arrays when no tool_use block | 3 | Mock AI | Graceful degradation |
| returns empty arrays when Zod validation fails on tool input | 3 | Mock AI | Graceful degradation |
| uses the correct tool name | 3 | Mock AI | |
| forces tool_choice to extract_topics | 3 | Mock AI | |
| passes the correct model | 3 | Mock AI | |
| uses max_tokens of 500 | 3 | Mock AI | |
| includes timePatterns in result when present | 3 | Mock AI | |
| omits timePatterns when null | 3 | Mock AI | |
| passes all messages to AI when fewer than 300 | 3 | Mock AI | |
| handles empty messages array | 3 | Mock AI | |
| maps platform "claude" to "Claude" in system prompt | 3 | Mock AI | |

### apps/web/src/server/discovery/__tests__/extract-from-text.test.ts (16 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns structured data for screentime source | 3 | Mock AI | |
| returns structured data for subscriptions source | 3 | Mock AI | |
| wraps ocrText in <ocr-data> tags | 4 | Mock AI | Security: injection defense |
| forces tool_choice to the correct tool name | 3 | Mock AI | |
| returns { error: "not_screen_time" } for error tool response | 3 | Mock AI | |
| returns { error: "unreadable" } for unreadable | 3 | Mock AI | |
| throws "No tool use in response" when no tool_use block | 3 | Mock AI | |
| throws with Zod error when tool input fails schema | 3 | Mock AI | |
| uses focusMode system prompt addendum when focusMode is true | 3 | Mock AI | |
| does not include focusMode addendum when false | 3 | Mock AI | |
| maps sourceType to correct tool name for battery | 3 | Mock AI | |
| maps sourceType to correct tool name for storage | 3 | Mock AI | |
| maps sourceType to correct tool name for calendar | 3 | Mock AI | |
| maps sourceType to correct tool name for health | 3 | Mock AI | |
| maps sourceType to correct tool name for subscriptions | 3 | Mock AI | |
| maps sourceType to correct tool name for screentime | 3 | Mock AI | |

### apps/web/src/server/discovery/__tests__/ocr.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns { data } matching screenTimeExtractionSchema for valid tool output | 3 | Mock AI | |
| passes focusMode=true by appending FOCUS_MODE_PROMPT_ADDENDUM | 3 | Mock AI | |
| passes focusMode=false (default) with base prompt only | 3 | Mock AI | |
| sets tool_choice to extract_screen_time | 3 | Mock AI | |
| returns { error: "not_screen_time" } when tool input.error is "not_screen_time" | 3 | Mock AI | |
| returns { error: "unreadable" } when tool input.error is "unreadable" | 3 | Mock AI | |
| throws "No tool use in response" when no tool_use block | 3 | Mock AI | |
| throws with Zod error when tool input fails schema | 3 | Mock AI | |

### apps/web/src/server/discovery/__tests__/adaptive.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns follow-up questions on valid tool response | 3 | Mock AI | |
| forces tool_choice to generate_adaptive_questions | 3 | Mock AI | |
| includes screenTime apps in user message | 3 | Mock AI | |
| includes subscriptions in user message when provided | 3 | Mock AI | |
| throws "No tool use in response" when no tool_use | 3 | Mock AI | |
| throws with Zod error when tool input fails schema | 3 | Mock AI | |
| uses max_tokens of 1000 | 3 | Mock AI | |
| includes battery, storage, calendar, health data when provided | 3 | Mock AI | |

### apps/web/src/server/discovery/__tests__/preprocess-ocr.test.ts (26 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| strips non-printable characters except newlines and tabs | 4 | None (pure logic) | |
| replaces tabs with spaces | 4 | None | |
| collapses runs of 3+ whitespace chars to a single space | 4 | None | |
| trims leading and trailing whitespace | 4 | None | |
| returns empty string for empty input | 4 | None | |
| returns empty string for whitespace-only input | 4 | None | |
| strips common OCR artifacts (|, ~, ^, `) | 4 | None | |
| strips isolated single characters between whitespace | 4 | None | |
| handles mixed clean and artifact-laden lines | 4 | None | |
| preserves a line like "Instagram 5h 30m" | 4 | None | |
| preserves percentage strings like "42%" | 4 | None | |
| preserves a line like "Screen Time: 6h 15m" | 4 | None | |
| preserves actual colons in legitimate context | 4 | None | |
| collapses multiple blank lines to one | 4 | None | |
| collapses 3 or more blank lines to one | 4 | None | |
| handles input with only artifacts and whitespace | 4 | None | |
| handles input with unicode characters | 4 | None | |
| strips zero-width characters | 4 | None | |
| handles very long input without crashing | 4 | None | |
| handles newline-only input | 4 | None | |
| preserves time format "12:34 PM" | 4 | None | |
| handles mixed encodings gracefully | 4 | None | |
| preserves "Daily Average: 2h 30m" | 4 | None | |
| strips a leading BOM character | 4 | None | |
| preserves app category lines | 4 | None | |
| handles realistic Screen Time OCR output | 4 | None | |

### apps/web/src/server/discovery/parsers/__tests__/google-takeout.test.ts (21 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| file size checks > throws "File too large" when > 200 MB | 4 | None | |
| zip bomb protection > throws "Archive too large when decompressed" when > 500 MB | 5 | None | Security: zip bomb |
| zip bomb protection > throws before any entry content is read | 5 | None | Security: early exit |
| search history extraction > extracts from ZIP paths matching "My Activity" | 4 | None (real JSZip) | |
| search history extraction > strips "Searched for " prefix | 4 | None | |
| search history extraction > truncates each search query to 100 chars | 4 | None | |
| search history extraction > caps _rawSearches at 500 entries | 4 | None | |
| search history extraction > skips items without "Searched for " prefix | 4 | None | |
| search history extraction > reports malformed-JSON files as _skippedFileCount | 4 | None | Resilience |
| search history extraction > reports malformed items as _skippedItemCount | 4 | None | Resilience |
| youtube history extraction > extracts from ZIP paths matching "YouTube" | 4 | None (real JSZip) | |
| youtube history extraction > strips "Watched " prefix | 4 | None | |
| youtube history extraction > truncates each watch title to 100 chars | 4 | None | |
| youtube history extraction > caps _rawYoutubeWatches at 500 entries | 4 | None | |
| result shape > returns searchTopics: [] and youtubeTopCategories: null | 3 | None | |
| result shape > returns emailVolume: null | 3 | None | |
| malformed item resilience > skips null item in search array | 4 | None | Zod boundary |
| malformed item resilience > skips item whose title is not a string | 4 | None | |
| malformed item resilience > skips primitive (string) item | 4 | None | |
| malformed item resilience > handles malformed-item for YouTube | 4 | None | |
| locale tolerance > matches non-English ZIP path containing "My Activity" and "Search" | 4 | None | |

### apps/web/src/server/discovery/parsers/__tests__/chatgpt.test.ts (18 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| valid export > counts total conversations correctly | 4 | None (real JSZip) | |
| valid export > extracts user messages by traversing the mapping tree | 4 | None | |
| valid export > truncates individual message text to 200 chars | 4 | None | |
| valid export > caps _rawMessages at 500 entries | 4 | None | |
| valid export > returns platform: "chatgpt" | 3 | None | |
| valid export > returns empty topTopics and repeatedQuestions | 3 | None | |
| valid export > computes timePatterns via extractTimePatterns | 4 | None | |
| zip bomb protection > throws "Archive too large when decompressed" | 5 | None | Security: zip bomb |
| zip bomb protection > throws before any file content is extracted | 5 | None | Security: early exit |
| error cases > throws "No conversations.json found" when absent | 4 | None | |
| error cases > throws "invalid JSON" when conversations.json is malformed | 4 | None | |
| error cases > throws "Invalid shape" when root is object, not array | 4 | None | |
| error cases > throws when conversation entry is null | 4 | None | |
| error cases > throws when conversation entry is a primitive | 4 | None | |
| error cases > throws when mapping is not an object | 4 | None | |
| error cases > skips conversation nodes with no mapping field | 4 | None | Resilience |
| error cases > tolerates mapping: null (soft-deleted conversations) | 4 | None | Resilience |
| error cases > skips non-"user" author.role messages | 4 | None | |

### apps/web/src/server/discovery/parsers/__tests__/claude-export.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| valid export > counts total conversations correctly | 4 | None (pure JSON parsing) | |
| valid export > extracts user messages from chat_messages array | 4 | None | |
| valid export > truncates individual message text to 200 chars | 4 | None | |
| valid export > caps _rawMessages at 500 entries | 4 | None | |
| valid export > returns platform: "claude" | 3 | None | |
| valid export > returns empty topTopics and repeatedQuestions | 3 | None | |
| valid export > computes timePatterns via extractTimePatterns | 4 | None | |
| error cases > throws "No conversations found" when empty array | 4 | None | |
| error cases > throws "invalid JSON" when file is malformed | 4 | None | |
| error cases > throws "Invalid shape" when root is not array | 4 | None | |
| error cases > skips conversations with missing chat_messages | 4 | None | Resilience |
| error cases > skips messages where sender is not "human" | 4 | None | |
| error cases > handles nested array conversations | 4 | None | |
| file size > throws when file exceeds 50 MB | 4 | None | |
| file size > accepts file at exactly 50 MB | 3 | None | |

### apps/web/src/server/agents/__tests__/agent-task-service.test.ts (23 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| proposeTask > inserts a task with status "proposed" | 3 | Mock DB | |
| proposeTask > returns the inserted task | 3 | Mock DB | |
| proposeTask > auto-approves when auto-approve is enabled | 3 | Mock DB | |
| proposeTask > does not auto-approve when disabled | 3 | Mock DB | |
| approveTask > transitions from proposed to approved | 3 | Mock DB | |
| approveTask > throws when task is not proposed | 3 | Mock DB | |
| rejectTask > transitions from proposed to rejected | 3 | Mock DB | |
| rejectTask > throws when task is not proposed | 3 | Mock DB | |
| claimTask > transitions from approved to executing | 3 | Mock DB | |
| claimTask > throws when task is not approved | 3 | Mock DB | |
| completeTask > transitions from executing to verifying | 3 | Mock DB | |
| completeTask > throws when task is not executing | 3 | Mock DB | |
| finalizeTask > transitions from verifying to done | 3 | Mock DB | |
| finalizeTask > throws when task is not verifying | 3 | Mock DB | |
| failTask > transitions to failed | 3 | Mock DB | |
| escalateTask > transitions from failed to escalated | 3 | Mock DB | |
| getTaskHistory > returns tasks for project | 3 | Mock DB | |
| getTaskHistory > orders by proposedAt DESC | 3 | Mock DB | |
| getPendingTasks > returns proposed and approved tasks | 3 | Mock DB | |
| recordEvent > inserts agent event | 3 | Mock DB | |
| recordEvent > returns the inserted event | 3 | Mock DB | |
| getEvents > returns events for project | 3 | Mock DB | |
| getEvents > orders by createdAt DESC | 3 | Mock DB | |

### apps/web/src/server/domains/__tests__/slug.test.ts (13 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| generateSlug > lowercases and replaces spaces with hyphens | 4 | None (pure logic) | |
| generateSlug > strips possessive apostrophes and special chars | 4 | None | |
| generateSlug > collapses multiple spaces and hyphens | 4 | None | |
| generateSlug > removes leading and trailing hyphens | 4 | None | |
| generateSlug > strips accented characters via NFD normalization | 4 | None | |
| generateSlug > handles emoji and non-latin characters | 4 | None | |
| generateSlug > returns "project" for empty/whitespace-only input | 4 | None | Edge case |
| generateSlug > preserves numbers | 4 | None | |
| generateSlug > handles already-slugified input | 4 | None | |
| generateSubdomain > appends .meldar.ai to the slug | 4 | None | |
| generateSubdomain > works with single-word slugs | 4 | None | |
| appendCollisionSuffix > appends a hyphen and 4-character suffix | 4 | None | |
| appendCollisionSuffix > produces different suffixes on repeated calls | 4 | None | |

### apps/web/src/server/domains/__tests__/provision-subdomain.test.ts (5 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| generates a subdomain from the project name and inserts it | 3 | Mock DB | |
| appends a collision suffix when the slug already exists | 3 | Mock DB | |
| retries up to 5 times on repeated collisions | 3 | Mock DB | |
| handles names that normalize to "project" | 3 | Mock DB | |
| succeeds on the third attempt after two collisions | 3 | Mock DB | |

### apps/web/src/server/projects/__tests__/list-user-projects.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns projects for a user | 3 | Mock DB | |
| returns empty list when no projects | 3 | Mock DB | |
| passes the userId to the query | 3 | Mock DB | |
| returns domain URL when projectDomains has an active entry | 3 | Mock DB | |
| returns null domain when no active domain | 3 | Mock DB | |
| returns projects with preview URL | 3 | Mock DB | |
| returns projects with createdAt | 3 | Mock DB | |
| returns projects with templateId | 3 | Mock DB | |

### apps/web/src/server/lib/__tests__/cron-auth.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns false when CRON_SECRET is empty string | 4 | None | Security |
| returns false when CRON_SECRET is shorter than 16 characters | 4 | None | Security |
| returns false when Authorization header is missing | 3 | None | |
| returns false when Authorization scheme is not Bearer | 3 | None | |
| returns false when token does not match CRON_SECRET | 3 | None | |
| returns true when Bearer token matches CRON_SECRET | 3 | None | |
| is case-sensitive for token comparison | 4 | None | Security |

### apps/web/src/features/workspace/__tests__/context.test.ts (17 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| workspaceBuildInitialState > has correct initial values | 3 | None (pure logic) | |
| workspaceBuildReducer > BUILD_START sets activeBuildCardId | 3 | None | |
| workspaceBuildReducer > BUILD_COMMITTED clears activeBuildCardId | 3 | None | |
| workspaceBuildReducer > BUILD_FAILED sets failureMessage | 3 | None | |
| workspaceBuildReducer > BUILD_FAILED clears activeBuildCardId | 3 | None | |
| workspaceBuildReducer > CLEAR_FAILURE resets failureMessage | 3 | None | |
| workspaceBuildReducer > BUILD_COMMITTED sets lastPreviewUrl | 3 | None | |
| workspaceBuildReducer > BUILD_COMMITTED updates buildVersion | 3 | None | |
| workspaceBuildReducer > BUILD_COMMITTED updates cards with state=built | 3 | None | |
| workspaceBuildReducer > BUILD_COMMITTED preserves other card states | 3 | None | |
| workspaceBuildReducer > BUILD_START clears previous failure | 3 | None | |
| workspaceBuildReducer > FILE_WRITTEN increments fileCount | 3 | None | |
| workspaceBuildReducer > FILE_WRITTEN resets on new build | 3 | None | |
| workspaceBuildReducer > BUILD_START resets fileCount to 0 | 3 | None | |
| workspaceBuildReducer > BUILD_COMMITTED captures tokenCost from committed event | 3 | None | |
| workspaceBuildReducer > CLEAR_FAILURE only clears failureMessage | 3 | None | |
| workspaceBuildReducer > unknown action type returns state unchanged | 3 | None | |

### apps/web/src/features/kanban/__tests__/topological-sort.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns empty sorted array for empty input | 4 | None (pure algorithm) | |
| preserves a single subtask | 4 | None | |
| sorts subtasks with linear dependencies | 4 | None | |
| handles diamond dependencies | 4 | None | |
| detects a simple cycle | 5 | None | Algorithm correctness |
| detects a 3-node cycle | 5 | None | |
| handles subtasks with no dependencies in any order | 4 | None | |
| ignores dependencies referencing cards outside the input set | 4 | None | |

### apps/web/src/features/kanban/__tests__/group-cards.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns empty milestones and empty map for empty input | 4 | None (pure logic) | |
| separates milestones from subtasks | 4 | None | |
| sorts milestones by position | 4 | None | |
| sorts subtasks within a milestone by position | 4 | None | |
| handles milestones with no subtasks | 4 | None | |
| handles subtasks whose milestone is missing from the card array | 4 | None | Edge case |

### apps/web/src/features/kanban/__tests__/derive-milestone-state.test.ts (10 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns not_started for an empty subtask array | 4 | None (pure logic) | |
| returns not_started when all subtasks are draft | 4 | None | |
| returns complete when all subtasks are built | 4 | None | |
| returns needs_attention when any subtask has failed | 4 | None | |
| returns needs_attention when any subtask needs rework | 4 | None | |
| returns in_progress when a subtask is queued | 4 | None | |
| returns in_progress when a subtask is building | 4 | None | |
| returns in_progress when subtasks have mixed draft and ready states | 4 | None | |
| returns in_progress when some subtasks are built and some are draft | 4 | None | |
| prioritizes needs_attention over in_progress when both exist | 4 | None | Priority logic |

### apps/web/src/features/kanban/__tests__/parse-prompt-anatomy.test.ts (10 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| extracts subject and qualifier from prompt | 4 | None (pure logic) | |
| handles prompt with no qualifier | 4 | None | |
| handles empty string | 4 | None | |
| handles very long prompts | 4 | None | |
| handles prompts with special characters | 4 | None | |
| handles multi-line prompts | 4 | None | |
| trims whitespace | 4 | None | |
| handles prompt with only whitespace | 4 | None | |
| handles prompt with multiple colons | 4 | None | |
| handles prompt with "make" prefix | 4 | None | |

### apps/web/src/features/project-onboarding/__tests__/schemas.test.ts (11 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| generatePlanRequestSchema > accepts a valid messages array | 4 | None (Zod) | |
| generatePlanRequestSchema > accepts messages array with 1 item | 4 | None (Zod) | |
| generatePlanRequestSchema > rejects empty messages array | 4 | None (Zod) | |
| generatePlanRequestSchema > rejects messages with empty content | 4 | None (Zod) | |
| planOutputSchema > accepts a valid plan output | 4 | None (Zod) | |
| planOutputSchema > rejects fewer than 2 milestones | 4 | None (Zod) | |
| planOutputSchema > rejects subtasks with no acceptance criteria | 4 | None (Zod) | |
| askQuestionRequestSchema > accepts valid request | 4 | None (Zod) | |
| askQuestionRequestSchema > rejects questionIndex out of range | 4 | None (Zod) | |
| getTokenCostRange > returns known ranges for known component types | 4 | None (pure logic) | |
| getTokenCostRange > returns default range for unknown component types | 4 | None | |

### apps/web/src/features/share-flow/__tests__/SharePanel.test.tsx (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| renders the subdomain URL | 2 | None (UI) | Frontend component, not backend |
| copies the full URL to clipboard on click | 2 | None (UI) | Frontend |
| shows "Copied!" after clicking copy | 2 | None (UI) | Frontend |
| links WhatsApp button to wa.me with the URL | 2 | None (UI) | Frontend |
| opens WhatsApp link in a new tab | 2 | None (UI) | Frontend |
| has aria-labels on all share buttons | 2 | None (UI) | Frontend |
| shows Instagram tooltip on click | 2 | None (UI) | Frontend |

### apps/web/src/features/visual-feedback/__tests__/FeedbackBar.test.tsx (5 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| renders textarea and Send button | 2 | None (UI) | Frontend component |
| Send is disabled when textarea is empty | 2 | None (UI) | Frontend |
| shows clarification chips for short instructions | 2 | None (UI) | Frontend |
| shows Stitch suggestion for "logo" keyword | 2 | None (UI) | Frontend |
| reference button has aria-label | 2 | None (UI) | Frontend |

### apps/web/src/widgets/workspace/__tests__/PreviewPane.render.test.tsx (2 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| renders empty state text when previewUrl is null | 2 | None (UI) | Frontend component |
| renders an iframe when previewUrl is set | 2 | None (UI) | Frontend |

### apps/web/src/widgets/workspace/__tests__/PreviewPane.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| isSafePreviewUrl > rejects null | 4 | None (pure logic) | Security: URL validation |
| isSafePreviewUrl > rejects empty string | 4 | None | |
| isSafePreviewUrl > rejects javascript: scheme | 5 | None | Security: XSS prevention |
| isSafePreviewUrl > rejects data: scheme | 5 | None | Security |
| isSafePreviewUrl > rejects file: scheme | 5 | None | Security |
| isSafePreviewUrl > rejects malformed URLs | 4 | None | |
| isSafePreviewUrl > accepts https URLs | 4 | None | |
| isSafePreviewUrl > accepts http URLs | 4 | None | |

### apps/web/src/widgets/workspace/__tests__/StepIndicator.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| computeStepWidthPct > returns 0% for the first of N steps | 4 | None (pure logic) | |
| computeStepWidthPct > returns the rounded percentage for mid-progress | 4 | None | |
| computeStepWidthPct > returns 100% when current equals total | 4 | None | |
| computeStepWidthPct > clamps over-100% values to 100% | 4 | None | Edge case |
| computeStepWidthPct > clamps negative current to 0% | 4 | None | Edge case |
| computeStepWidthPct > returns 0% when total is 0 instead of NaN | 4 | None | Edge case |
| computeStepWidthPct > returns 0% when total is negative | 4 | None | Edge case |

### apps/web/src/widgets/workspace/__tests__/build-status.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| deriveBuildStatus > returns building when activeBuildCardId is set | 4 | None (pure logic) | |
| deriveBuildStatus > returns building even when failureMessage is also set | 4 | None | |
| deriveBuildStatus > returns failed when no active build but failure exists | 4 | None | |
| deriveBuildStatus > returns idle when both are null | 4 | None | |
| buildPreviewSrc > appends cache-buster with ? when URL has no query | 4 | None | |
| buildPreviewSrc > appends cache-buster with & when URL already has query params | 4 | None | |
| buildPreviewSrc > handles localhost URLs | 4 | None | |

### apps/web/src/shared/lib/__tests__/sanitize-next-param.test.ts (28 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| falsy and empty inputs > returns /workspace for null | 4 | None (pure logic) | |
| falsy and empty inputs > returns /workspace for undefined | 4 | None | |
| falsy and empty inputs > returns /workspace for empty string | 4 | None | |
| legitimate same-origin paths > passes through /workspace | 4 | None | |
| legitimate same-origin paths > passes through /workspace/abc | 4 | None | |
| legitimate same-origin paths > passes through bare root / | 4 | None | |
| legitimate same-origin paths > passes through /foo | 4 | None | |
| protocol-relative and absolute URL injection > rejects //evil.com | 5 | None | Security: open redirect |
| protocol-relative and absolute URL injection > rejects ///evil | 5 | None | Security |
| protocol-relative and absolute URL injection > rejects http://evil | 5 | None | Security |
| protocol-relative and absolute URL injection > rejects https://evil | 5 | None | Security |
| protocol-relative and absolute URL injection > rejects javascript:alert(1) | 5 | None | Security: XSS |
| protocol-relative and absolute URL injection > rejects data:text/html,foo | 5 | None | Security |
| encoding tricks > rejects raw percent-encoded //evil.com | 5 | None | Security |
| encoding tricks > rejects the decoded form //evil.com | 5 | None | Security |
| encoding tricks > rejects backslash prefix \evil | 5 | None | Security |
| encoding tricks > rejects leading-space " /workspace" | 5 | None | Security |
| encoding tricks > rejects bare hostname evil.com | 5 | None | Security |
| colon handling > allows : inside query string of same-origin URL | 4 | None | |
| colon handling > allows : inside a query string value | 4 | None | |
| colon handling > rejects : in the path segment | 4 | None | |
| fallback option > returns custom fallback for null | 4 | None | |
| fallback option > returns custom fallback for empty string | 4 | None | |
| fallback option > returns custom fallback for rejected input | 4 | None | |
| fallback option > passes through valid path even with custom fallback | 4 | None | |
| mustStartWith option > passes through /workspace/abc when mustStartWith is /workspace | 4 | None | |
| mustStartWith option > rejects /foo when mustStartWith is /workspace | 4 | None | |
| mustStartWith option > passes through /workspace when mustStartWith is /workspace | 4 | None | |

### apps/web/src/shared/lib/__tests__/format-relative.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns "just now" for timestamps within 5 seconds | 4 | None (pure logic) | |
| clamps future timestamps to "just now" | 4 | None | |
| returns seconds between 5 and 59 | 4 | None | |
| returns minutes between 1 and 59 | 4 | None | |
| returns hours between 1 and 23 | 4 | None | |
| returns days for >= 24 hours | 4 | None | |

### apps/web/src/entities/project-step/__tests__/derive-step.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns Planning when no cards exist | 4 | None (pure logic) | |
| ignores milestone cards (parentId === null) | 4 | None | |
| returns Complete when all subtasks are built | 4 | None | |
| returns next card title for partial progress | 4 | None | |
| picks the lowest-position non-built card | 4 | None | |
| truncates long card titles to 30 characters | 4 | None | |

### apps/web/src/entities/booking-verticals/__tests__/data.test.ts (9 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| has at least 5 verticals | 3 | None (static data) | |
| every vertical has a unique id | 3 | None | |
| every vertical has at least 2 default services | 3 | None | |
| every service has positive duration and non-negative price | 3 | None | |
| every vertical has valid hours | 3 | None | |
| includes hair-beauty vertical | 3 | None | |
| includes other as a catch-all | 3 | None | |
| getVerticalById > returns the correct vertical | 3 | None | |
| getVerticalById > returns undefined for unknown id | 3 | None | |

### apps/web/src/features/auth/__tests__/sign-out.test.ts (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| calls DELETE /api/auth/me | 3 | Mock fetch | |
| returns ok on a 200 response | 3 | Mock fetch | |
| returns a failure message when the server responds non-2xx | 3 | Mock fetch | |
| returns a network error message when fetch throws | 3 | Mock fetch | |

### apps/web/src/features/teaching-hints/__tests__/hints.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| has at least 5 hints | 3 | None (static data) | |
| every hint has a unique id | 3 | None | |
| every hint has non-empty text | 3 | None | |
| no hint text contains forbidden words | 3 | None | |
| includes the onboarding hint | 3 | None | |
| exports HintId type covering all hint ids | 3 | None | |

### apps/web/src/features/token-economy/ui/__tests__/TokenBalancePill.test.ts (3 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| balanceColor > returns green for balance above 50 | 4 | None (pure logic) | |
| balanceColor > returns amber for balance between 10 and 50 | 4 | None | |
| balanceColor > returns red for balance below 10 | 4 | None | |

### apps/web/src/app/(authed)/sign-up/__tests__/sign-up-submit.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| rejects an invalid email shape before calling the network | 4 | None (Zod) | Client-side validation |
| rejects a password shorter than 8 chars | 4 | None (Zod) | |
| returns ok with the userId on a successful response | 3 | Mock fetch | |
| surfaces the server error message on 409 conflict | 3 | Mock fetch | |
| surfaces the rate limit message on 429 | 3 | Mock fetch | |
| handles network errors gracefully | 3 | Mock fetch | |
| rejects a malformed success response | 3 | Mock fetch | |
| strips unknown fields from the request body | 3 | Mock fetch | |

### apps/web/src/app/(authed)/sign-in/__tests__/sign-in-submit.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| rejects an invalid email shape before calling the network | 4 | None (Zod) | Client-side validation |
| rejects an empty password | 4 | None (Zod) | |
| returns ok with the user id on a successful response | 3 | Mock fetch | |
| shows the generic invalid credentials message on 401 | 3 | Mock fetch | |
| surfaces the rate limit message on 429 | 3 | Mock fetch | |
| handles network errors gracefully | 3 | Mock fetch | |
| rejects a malformed success response | 3 | Mock fetch | |

### apps/web/src/app/(authed)/workspace/__tests__/page.test.tsx (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| throws when reached without a session | 2 | Mock DB | RSC test, shallow |
| redirects to onboarding when user has zero projects | 2 | Mock DB | |
| renders a card grid when the user has projects | 2 | Mock DB | |
| renders an error banner when the project query throws | 2 | Mock DB | |

### apps/web/src/__tests__/integration/ (78 tests -- ALL SKIPPED, require DATABASE_URL)

### apps/web/src/__tests__/integration/schema.test.ts (16 skipped)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| users > insert + select + delete | 5 | Real DB | Skipped without DATABASE_URL |
| projects > insert + select + delete | 5 | Real DB | Skipped |
| builds > insert + select + delete | 5 | Real DB | Skipped |
| buildFiles > insert + select + delete | 5 | Real DB | Skipped |
| projectFiles > insert + select + delete | 5 | Real DB | Skipped |
| kanbanCards > insert + select + delete | 5 | Real DB | Skipped |
| tokenTransactions > insert + select + delete | 5 | Real DB | Skipped |
| aiCallLog > insert + select + delete | 5 | Real DB | Skipped |
| deploymentLog > insert + select + delete | 5 | Real DB | Skipped |
| agentEvents > insert + select + delete | 5 | Real DB | Skipped |
| agentTasks > insert + select + delete | 5 | Real DB | Skipped |
| projectDomains > insert + select + delete | 5 | Real DB | Skipped |
| xrayResults > insert + select + delete | 5 | Real DB | Skipped |
| auditOrders > insert + select + delete | 5 | Real DB | Skipped |
| subscribers > insert + select + delete | 5 | Real DB | Skipped |
| discoverySessions > insert + select + delete | 5 | Real DB | Skipped |

### apps/web/src/__tests__/integration/core-flows.test.ts (17 skipped)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| 1: create project -> verify all fields | 5 | Real DB | Skipped |
| 2: list user projects -> count grows | 5 | Real DB | Skipped |
| 3: genesis build exists with status=completed | 5 | Real DB | Skipped |
| 4: project_files created for project | 5 | Real DB | Skipped |
| 5: template apply -> kanban cards with parent/child | 5 | Real DB | Skipped |
| 6: subdomain provisioning | 5 | Real DB | Skipped |
| 7: new build -> link to project -> update currentBuildId | 5 | Real DB | Skipped |
| 8: build_files belong to build with content_hash and path | 5 | Real DB | Skipped |
| 9: build ordering by createdAt DESC | 5 | Real DB | Skipped |
| 10: full agent_task lifecycle with JSONB round-trip | 5 | Real DB | Skipped |
| 11: filter agent_tasks by status | 5 | Real DB | Skipped |
| 12: agent_event references correct project | 5 | Real DB | Skipped |
| 13: debit and credit token balance | 5 | Real DB | Skipped |
| 14: token transactions ledger | 5 | Real DB | Skipped |
| 15: CHECK constraint prevents negative balance | 5 | Real DB | Skipped |
| 16: projects isolated between users | 5 | Real DB | Skipped |
| 17: agent_tasks isolated between users | 5 | Real DB | Skipped |

### apps/web/src/__tests__/integration/auth-flows.test.ts (5 skipped)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| password hashing round-trip | 5 | Real DB | Skipped |
| reset token lookup | 5 | Real DB | Skipped |
| tokenVersion increment | 5 | Real DB | Skipped |
| project ownership | 5 | Real DB | Skipped |
| project ownership denied | 5 | Real DB | Skipped |

### apps/web/src/__tests__/integration/auth-routes.test.ts (9 skipped)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| register flow | 5 | Real DB | Skipped |
| login lookup | 5 | Real DB | Skipped |
| forgot-password flow | 5 | Real DB | Skipped |
| reset-password atomic | 5 | Real DB | Skipped |
| email verification | 5 | Real DB | Skipped |
| token version lifecycle | 5 | Real DB | Skipped |
| Google OAuth user creation | 5 | Real DB | Skipped |
| duplicate email rejection | 5 | Real DB | Skipped |
| session invalidation | 5 | Real DB | Skipped |

### apps/web/src/__tests__/integration/agent-flows.test.ts (4 skipped)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| agent task full lifecycle | 5 | Real DB | Skipped |
| query pending tasks | 5 | Real DB | Skipped |
| agent event insertion | 5 | Real DB | Skipped |
| agent task + event co-existence | 5 | Real DB | Skipped |

### apps/web/src/__tests__/integration/agent-operations.test.ts (7 skipped)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| agent task state machine (full) | 5 | Real DB | Skipped |
| agent task failure path | 5 | Real DB | Skipped |
| agent task rejection | 5 | Real DB | Skipped |
| concurrent task isolation | 5 | Real DB | Skipped |
| agent events audit trail | 5 | Real DB | Skipped |
| agent events nullable userId | 5 | Real DB | Skipped |
| auto-approve via wishes | 5 | Real DB | Skipped |

### apps/web/src/__tests__/integration/billing-flows.test.ts (4 skipped)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| token balance debit/credit | 5 | Real DB | Skipped |
| token transaction log | 5 | Real DB | Skipped |
| AI call logging | 5 | Real DB | Skipped |
| non-negative balance constraint | 5 | Real DB | Skipped |

### apps/web/src/__tests__/integration/booking-flows.test.ts (3 skipped)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| project domain active lookup | 5 | Real DB | Skipped |
| booking confirmation task with payload | 5 | Real DB | Skipped |
| domain uniqueness constraint | 5 | Real DB | Skipped |

### apps/web/src/__tests__/integration/workspace-routes.test.ts (10 skipped)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| project CRUD | 5 | Real DB | Skipped |
| project with template | 5 | Real DB | Skipped |
| kanban cards | 5 | Real DB | Skipped |
| build lifecycle | 5 | Real DB | Skipped |
| build files | 5 | Real DB | Skipped |
| project files upsert | 5 | Real DB | Skipped |
| token transactions | 5 | Real DB | Skipped |
| project wishes (settings) | 5 | Real DB | Skipped |
| soft delete | 5 | Real DB | Skipped |
| multi-project isolation | 5 | Real DB | Skipped |

### apps/web/src/__tests__/integration/critical-flows.test.ts (3 skipped)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| user -> project -> load | 5 | Real DB | Skipped |
| user -> project -> agent task -> query pending | 5 | Real DB | Skipped |
| user -> project -> domain -> query active | 5 | Real DB | Skipped |
