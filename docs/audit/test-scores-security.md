# Test Validity -- Security

## Summary

Total: 1057 | Security-critical: 320 | 5: 49 | 4: 171 | 3: 396 | 2: 297 | 1: 144

## By File

### src/server/identity/__tests__/jwt.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| signToken > returns a valid JWT string | 3 | Low -- smoke test only | No assertion on algorithm or claims structure |
| verifyToken > verifies and returns payload for a valid token | 4 | AuthN correctness | Roundtrip proves sign/verify pair works |
| verifyToken > returns null for an invalid token | 4 | Rejects garbage tokens | Good -- prevents accepting arbitrary strings |
| verifyToken > returns null for a tampered token | 5 | Catches signature bypass | Direct tamper detection is critical |
| verifyToken > returns null for an expired token | 5 | Session expiry enforcement | Prevents stale credential reuse |
| verifyToken > returns null for a token signed with a different secret | 5 | Key confusion prevention | Catches secret rotation / wrong-key attacks |
| verifyToken > defaults emailVerified to false for legacy tokens without the claim | 4 | Privilege escalation prevention | Unverified users cannot gain verified status via missing claim |
| verifyToken > preserves emailVerified: true through sign/verify roundtrip | 3 | Functional correctness | Not a security boundary itself |
| verifyToken > rejects tokens signed with a different algorithm (CWE-347 alg-confusion) | 5 | Algorithm confusion attack (CWE-347) | Directly tests a known JWT vulnerability class |
| getUserFromRequest > returns payload for valid meldar-auth cookie | 3 | Cookie extraction works | Functional baseline |
| getUserFromRequest > returns null when no cookie header present | 4 | Unauthenticated rejection | Ensures missing cookie = no auth |
| getUserFromRequest > returns null when cookie header has no meldar-auth | 4 | Cookie name specificity | Prevents cross-cookie confusion |
| getUserFromRequest > returns null when meldar-auth cookie has tampered value | 5 | Tampered cookie rejection | Direct auth bypass prevention |
| getUserFromRequest > extracts token from cookie with multiple cookies | 3 | Parsing correctness | Edge case, not a vulnerability |
| getSecret > throws if AUTH_SECRET is not set | 5 | Startup security gate | Prevents running with no secret |
| getSecret > throws if AUTH_SECRET is shorter than 32 characters | 5 | Weak secret prevention | Enforces minimum entropy |
| getSecret > accepts AUTH_SECRET that is exactly 32 characters | 3 | Boundary check | Functional complement |

### src/server/identity/__tests__/password.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| hashes a password and verifies it correctly | 4 | bcrypt roundtrip | Confirms hash is not plaintext, uses bcrypt format |
| returns false for incorrect password | 4 | Wrong password rejection | Basic auth correctness |
| generates different hashes for the same password (salt) | 5 | Salt uniqueness | Prevents rainbow table attacks |
| handles empty string password | 2 | Edge case | Empty password is accepted by the hash function -- no test that the route rejects it |

### src/server/identity/__tests__/require-auth.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no cookie present | 4 | AuthN gate | Baseline unauthenticated rejection |
| returns 401 when cookie has invalid JWT | 4 | Invalid token rejection | Mocked verifyToken returning null -- mock weakens slightly |
| returns 401 when JWT is expired | 2 | Expiry check | verifyToken is mocked to return null -- not testing real expiry logic |
| returns 401 when tokenVersion in JWT does not match DB | 5 | Session revocation | Token version mismatch = forced logout -- catches stale sessions |
| returns session object when token is valid and tokenVersion matches | 3 | Happy path | Functional correctness |
| returns 401 when user does not exist in DB (deleted account) | 5 | Deleted account protection | Prevents ghost sessions from acting |
| propagates DB errors (fail-closed) | 5 | Fail-closed design | DB failure = request fails, not open access |

### src/server/identity/__tests__/token-hash.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns the correct SHA-256 hex digest for a known test vector | 4 | Hash correctness | Verifies deterministic SHA-256 |
| returns a 64-character hex string | 3 | Format validation | Structural check |
| produces different hashes for different tokens | 3 | Collision avoidance | Basic sanity |
| produces the same hash for the same token (deterministic) | 3 | Consistency | Functional correctness |

### src/server/identity/__tests__/auth-cookie.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| sets meldar-auth cookie with correct flags | 5 | Cookie security flags | Checks HttpOnly, SameSite=Lax, Path=/, Max-Age -- prevents XSS cookie theft |
| sets Secure flag in production | 5 | HTTPS-only cookie | Prevents cookie transmission over cleartext |
| omits Secure flag in development | 3 | Dev convenience | Not a security test per se |

### src/app/api/auth/__tests__/register.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| registers successfully and returns JWT cookie | 3 | Happy path | Functional |
| stores hashed verifyToken in DB, sends raw token in email | 5 | Token hash separation | Ensures DB never stores raw verification token |
| includes verifyTokenExpiresAt in insert payload | 4 | Token expiry enforcement | Limits verification window |
| sends verification email via Resend after registration | 3 | Functional | Email delivery |
| registration succeeds even if Resend throws | 3 | Resilience | Not security-specific |
| rejects duplicate email with generic 400 | 4 | User enumeration prevention | Generic error hides whether email exists |
| rejects invalid email format with 400 | 3 | Input validation | Standard Zod validation |
| rejects password shorter than 8 characters with 400 | 4 | Password strength | Minimum length enforcement |
| returns 400 with INVALID_JSON for malformed JSON body | 3 | Robustness | Prevents JSON parse crashes |
| rejects missing fields with 400 | 3 | Input validation | Standard |
| rejects all-lowercase password (Finding #14) | 4 | Password complexity | Prevents trivial passwords |
| rejects all-digit password (Finding #14) | 4 | Password complexity | Prevents numeric-only passwords |
| rejects all-uppercase password (Finding #14) | 4 | Password complexity | Prevents uppercase-only passwords |
| accepts password with uppercase, lowercase and digit (Finding #14) | 3 | Positive case | Complement to rejection tests |
| returns 500 on unexpected error | 3 | Error handling | Does not leak internals |
| duplicate-email path takes similar time to success path (Finding #20) | 5 | Timing oracle prevention | Constant-time behavior prevents user enumeration via timing |
| sends welcome email after registration | 1 | Non-security | Email functionality |
| sends welcome email with null name when name not provided | 1 | Non-security | Email functionality |
| registration succeeds even if welcome email throws | 1 | Resilience | Not security-specific |

### src/app/api/auth/__tests__/login.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| logs in successfully with correct credentials | 3 | Happy path | passwordHash excluded from response is good (checked) |
| rejects wrong password with 401 | 4 | Auth rejection | Correct behavior |
| rejects non-existent email with 401 (same message as wrong password) | 5 | User enumeration prevention | Same error message for missing user and wrong password |
| returns same error message for wrong password and non-existent email | 5 | User enumeration prevention | Explicit comparison of error messages |
| rejects invalid input with 400 | 3 | Input validation | Standard |
| returns 500 on unexpected error | 3 | Error handling | Does not leak DB error details |
| returns 400 with INVALID_JSON when request body is not valid JSON | 3 | Robustness | Standard |
| calls verifyPassword even when user is not found (timing parity) | 5 | Timing oracle prevention | Dummy bcrypt compare prevents timing-based user enumeration |
| calls setAuthCookie on successful login | 3 | Functional | Cookie setting verification |
| per-email rate limiting > returns 429 when the email-based rate limit is exceeded | 4 | Brute force prevention | Per-email rate limit prevents credential stuffing |

### src/app/api/auth/__tests__/forgot-password.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns success and sends email for existing user | 3 | Functional | Email dispatch |
| stores a SHA-256 hash in DB, not the raw token | 5 | Token hash in DB | Prevents token theft if DB is compromised |
| returns success for non-existing email (prevents enumeration) | 5 | User enumeration prevention | Same response regardless of email existence |
| sets reset token expiry to approximately 1 hour from now | 4 | Token expiry | Limits reset window |
| takes at least 500ms regardless of whether user exists | 5 | Timing oracle prevention | Constant-time response prevents enumeration |
| returns 400 with INVALID_JSON for malformed JSON body | 3 | Robustness | Standard |
| rejects invalid email with 400 | 3 | Input validation | Standard |
| rejects missing email with 400 | 3 | Input validation | Standard |
| returns 500 on unexpected error | 3 | Error handling | Standard |

### src/app/api/auth/__tests__/reset-password.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| resets password with valid token using atomic update | 4 | Atomic reset | Single UPDATE prevents race conditions |
| uses a single atomic UPDATE...RETURNING (no separate SELECT) | 5 | TOCTOU prevention | Atomic operation eliminates race between check and update |
| hashes the incoming token before DB lookup | 5 | Token hash comparison | Prevents raw token exposure in DB queries |
| returns 401 when token was already consumed (atomic prevents race) | 5 | Token reuse prevention | Atomic update means consumed token cannot be reused |
| rejects expired token with 401 | 4 | Expiry enforcement | Time-limited tokens |
| clears reset token atomically on success | 5 | Token cleanup | Consumed tokens are nulled in same atomic operation |
| rejects short new password with 400 | 4 | Password strength | Minimum length on reset too |
| returns 400 with INVALID_JSON for malformed JSON body | 3 | Robustness | Standard |
| rejects missing token with 400 | 3 | Input validation | Standard |
| rejects empty token with 400 | 3 | Input validation | Standard |
| rejects missing password with 400 | 3 | Input validation | Standard |
| rejects all-lowercase password | 4 | Password complexity on reset | Same rules as registration |
| rejects all-digit password | 4 | Password complexity on reset | Same rules as registration |
| accepts strong password | 3 | Positive case | Complement |
| returns 500 on unexpected error | 3 | Error handling | Standard |

### src/app/api/auth/__tests__/verify-email.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| hashes the incoming token before DB lookup | 5 | Token hash comparison | Prevents raw token in DB queries |
| redirects to workspace on valid token | 3 | Happy path | Functional |
| redirects to sign-in with error on invalid token | 4 | Invalid token rejection | Prevents verification with bad tokens |
| redirects to sign-in when no token provided | 4 | Missing parameter handling | Fails safely |
| does NOT issue a cookie when requireAuth fails (revoked session) | 5 | Session revocation respected | Verification does not re-grant revoked sessions |
| issues a refreshed cookie when requireAuth succeeds and userId matches | 4 | Cookie refresh | Only matching user gets updated cookie |
| does NOT issue a cookie when auth userId differs from verified user | 5 | Cross-user cookie prevention | Prevents verifying as user A while logged in as user B |

### src/app/api/auth/__tests__/me.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns { user: null } when unauthenticated (not 401) | 3 | Graceful unauthenticated response | Not a 401, prevents redirect loops |
| returns user data when authenticated and user exists | 3 | Functional | Happy path |
| returns { user: null } and clears cookie when user not found in DB | 4 | Stale cookie cleanup | Clears cookie for deleted accounts |
| DELETE returns 401 when no valid auth cookie is present | 4 | AuthN gate | Prevents unauthenticated logout |
| DELETE clears cookie and returns success when authenticated | 3 | Functional | Logout works |
| DELETE increments tokenVersion in DB on logout | 5 | Session revocation | Incrementing tokenVersion invalidates all existing JWTs |

### src/app/api/auth/__tests__/google-callback.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| redirects to sign-in with error when no code param | 3 | Missing param handling | Standard |
| redirects to sign-in with error when error param is present | 3 | OAuth error handling | Standard |
| redirects with error when token exchange fails | 3 | API failure handling | Standard |
| redirects with error when userinfo request fails | 3 | API failure handling | Standard |
| redirects with error when Google account has no email | 4 | Missing data handling | Prevents creating user without email |
| creates a new user, sets JWT cookie, and redirects to workspace | 3 | Happy path | Functional |
| records signup bonus for new users | 1 | Non-security | Token economy |
| logs in existing Google user without creating a duplicate | 3 | Functional | Idempotent login |
| redirects email-registered user to sign-in instead of auto-merging | 5 | Account takeover prevention | Prevents Google OAuth from hijacking email-registered accounts |
| rejects when CSRF state param does not match cookie | 5 | CSRF protection | State mismatch = rejected -- prevents OAuth CSRF |
| rejects when CSRF state cookie is missing | 5 | CSRF protection | Missing state cookie = rejected |
| rejects when Google email is not verified | 5 | Unverified email rejection | Prevents using unverified Google accounts to register |
| marks existing unverified Google user as verified | 3 | Auto-verification | Functional |
| rate limiting > redirects with error when rate limited | 4 | Brute force prevention | Rate limiting on OAuth callback |

### src/app/api/auth/__tests__/resend-verification.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when unauthenticated | 4 | AuthN gate | Standard |
| returns 429 when rate limited | 4 | Rate limiting | Prevents email bombing |
| returns success no-op when already verified | 3 | Functional | No wasted email send |
| generates new token and sends email when not verified | 4 | Token rotation | New token replaces old one |
| returns 401 when user not found in DB | 4 | Ghost user rejection | Standard |
| returns 500 on unexpected error | 3 | Error handling | Standard |

### src/app/api/discovery/__tests__/upload-security.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| wraps ocrText in ocr-data tags -- assert via mockMessagesCreate payload | 4 | Prompt injection mitigation | Verifies text is passed to extraction function |
| rejects ocrText longer than 50,000 chars with 400 before any AI call is made | 5 | DoS prevention / cost control | Rejects oversized input before expensive AI call |
| ocrText containing closing ocr-data tag does not escape the outer wrapper | 4 | Prompt injection boundary | Tests tag-escape attempt |
| upload route returns 500 when parseChatGptExport rejects with zip bomb error | 4 | Zip bomb protection (ChatGPT) | Error propagation from parser |
| upload route returns 422 when parseGoogleTakeout rejects with zip bomb error | 4 | Zip bomb protection (Google) | Error propagation from parser |
| rejects image/gif on screentime upload even if filename is screen.jpeg | 5 | MIME type bypass prevention | Prevents GIF masquerading as JPEG |
| rejects application/pdf on screentime upload | 4 | MIME type validation | Blocks PDF upload |
| rejects text/plain masquerading as .zip for chatgpt upload | 5 | File type enforcement | Blocks non-ZIP masquerading |
| accepts application/octet-stream for chatgpt | 3 | Browser compatibility | Necessary flexibility |
| accepts .zip extension fallback even with mismatched MIME for chatgpt | 3 | Browser compatibility | Extension fallback |
| rejects arbitrary binary with no .json extension for claude upload | 4 | File type enforcement | Blocks arbitrary executables |
| accepts text/plain MIME for claude upload | 3 | Compatibility | JSON files sometimes have text/plain |
| returns 400 for sessionId of empty string | 4 | Input validation | Empty session ID blocked |
| returns 400 for sessionId longer than 32 chars | 4 | Input validation | Length cap prevents injection |
| extracts the first segment from x-forwarded-for and trims whitespace | 4 | IP extraction correctness | Correct IP for rate limiting |
| falls back to identifier "unknown" when x-forwarded-for header is absent | 3 | Graceful degradation | Rate limiting still works |
| checkRateLimit returns success when limiter argument is null | 2 | Fallback permissiveness | When Redis is not configured, rate limit is bypassed -- acceptable in dev only |

### src/app/api/discovery/upload/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| rate limiting > returns 429 when rate limit returns { success: false } | 4 | Rate limiting | Prevents upload abuse |
| missing field validation > returns 400 when both file and ocrText are absent | 3 | Input validation | Standard |
| missing field validation > returns 400 when platform is absent | 3 | Input validation | Standard |
| missing field validation > returns 400 when sessionId is absent | 3 | Input validation | Standard |
| missing field validation > returns 400 for an unknown platform value | 4 | Enum validation | Prevents injection of arbitrary platform types |
| missing field validation > returns 400 when sessionId exceeds 32 characters | 4 | Length validation | Truncation prevention |
| file validation -- image platforms > returns 400 for image/gif MIME on screentime | 4 | MIME enforcement | GIF blocked |
| file validation -- image platforms > returns 400 for file larger than 5 MB on screentime | 4 | File size limit | DoS prevention |
| file validation -- image platforms > returns 400 for non-image MIME on subscriptions | 3 | MIME enforcement | Same pattern |
| file validation -- image platforms > returns 400 for non-image MIME on battery | 3 | MIME enforcement | Same pattern |
| file validation -- image platforms > returns 400 for non-image MIME on storage | 3 | MIME enforcement | Same pattern |
| file validation -- image platforms > returns 400 for non-image MIME on calendar | 3 | MIME enforcement | Same pattern |
| file validation -- image platforms > returns 400 for non-image MIME on health | 3 | MIME enforcement | Same pattern |
| file validation -- image platforms > returns 400 for non-image MIME on adaptive | 3 | MIME enforcement | Same pattern |
| file validation -- ZIP platforms > returns 400 when chatgpt file has non-ZIP MIME and no .zip extension | 4 | File type enforcement | Blocks non-ZIP files |
| file validation -- ZIP platforms > accepts chatgpt file with application/octet-stream | 3 | Compatibility | Browser ZIP MIME handling |
| file validation -- ZIP platforms > returns 400 for ZIP file larger than 200 MB | 4 | File size limit | DoS prevention |
| file validation -- ZIP platforms > returns 400 when google file has non-ZIP MIME and no .zip extension | 4 | File type enforcement | Standard |
| file validation -- JSON platform > returns 400 when claude file has non-JSON MIME and no .json extension | 4 | File type enforcement | Standard |
| file validation -- JSON platform > accepts claude file with text/plain MIME | 3 | Compatibility | Standard |
| file validation -- JSON platform > returns 400 for JSON file larger than 50 MB | 4 | File size limit | DoS prevention |
| ocrText validation > returns 400 when ocrText exceeds 50,000 characters | 4 | Size limit | Cost/DoS prevention |
| ocrText + file both provided > ocrText wins, file size check is skipped | 3 | Precedence logic | Functional |
| ocrText + file both provided > uses OCR path when ocrText is non-empty | 3 | Routing logic | Functional |
| ocrText on ZIP/JSON platforms > returns 400 for chatgpt platform | 3 | Business logic | Standard |
| ocrText on ZIP/JSON platforms > returns 400 for claude platform | 3 | Business logic | Standard |
| ocrText on ZIP/JSON platforms > returns 400 for google platform | 3 | Business logic | Standard |
| session lookup > returns 404 when session does not exist in DB | 4 | IDOR prevention | Non-existent session rejected |
| idempotency > returns cached true on second upload for same platform | 3 | Idempotency | Functional |
| idempotency > does NOT apply idempotency guard for adaptive platform | 3 | Business logic | Expected behavior |
| screentime platform > calls extractFromOcrText with sourceType "screentime" | 2 | Mock routing | Mock verifies call routing, not security |
| screentime platform > calls extractScreenTime when only a file is provided | 2 | Mock routing | Mock verifies call routing |
| screentime platform > returns 422 when extractFromOcrText returns error | 3 | Error propagation | Standard |
| screentime platform > returns 422 when extractScreenTime returns error | 3 | Error propagation | Standard |
| screentime platform > updates session.screenTimeData in DB on success | 2 | DB write verification | Mock-only check |
| screentime platform > returns success | 2 | Happy path | Functional |
| chatgpt platform > returns 400 when no file is provided | 3 | Input validation | Standard |
| chatgpt platform > calls parseChatGptExport then extractTopicsFromMessages | 2 | Mock routing | Functional |
| chatgpt platform > strips _rawMessages before persisting chatgptData | 4 | Data minimization | Prevents raw message storage |
| chatgpt platform > returns 422 when parseChatGptExport rejects -- No conversations.json | 3 | Error handling | Standard |
| chatgpt platform > returns 422 when parseChatGptExport rejects -- invalid JSON | 3 | Error handling | Standard |
| chatgpt platform > returns 422 when parseChatGptExport rejects -- not an array | 3 | Error handling | Standard |
| chatgpt platform > returns 422 when parseChatGptExport rejects -- zip bomb | 4 | Zip bomb protection | Error surfaces correctly |
| claude platform > returns 400 when no file is provided | 3 | Input validation | Standard |
| claude platform > calls parseClaudeExport then extractTopicsFromMessages | 2 | Mock routing | Functional |
| claude platform > strips _rawMessages before persisting claudeData | 4 | Data minimization | Prevents raw message storage |
| google platform > returns 400 when no file is provided | 3 | Input validation | Standard |
| google platform > calls parseGoogleTakeout then extractGoogleTopics | 2 | Mock routing | Functional |
| google platform > strips _rawSearches and _rawYoutubeWatches before persisting | 4 | Data minimization | Prevents raw data storage |
| google platform > persists youtubeTopCategories as null when empty | 2 | Null handling | Functional |
| subscriptions/battery/storage/calendar/health > calls extractFromOcrText with platform as sourceType | 2 | Mock routing | Functional |
| subscriptions/battery/storage/calendar/health > calls extractFromScreenshot when file provided | 2 | Mock routing | Functional |
| subscriptions/battery/storage/calendar/health > returns 422 on extraction error | 3 | Error handling | Standard |
| subscriptions/battery/storage/calendar/health > updates correct DB column for each platform | 2 | DB column mapping | Functional |
| adaptive platform > reads appName from formData and resolves sourceType | 2 | Routing logic | Functional |
| adaptive platform > uses JSONB COALESCE atomic append for adaptiveData | 3 | Atomic DB operation | Prevents data loss on concurrent writes |
| adaptive platform > does NOT check idempotency guard for adaptive | 2 | Business logic | Expected |
| adaptive platform > returns success after append | 2 | Functional | Standard |
| adaptive platform > handles null appName -- resolves to subscriptions fallback | 2 | Null handling | Functional |
| resolveAdaptiveSourceType > maps "Strava" to "health" | 1 | App mapping | Non-security |
| resolveAdaptiveSourceType > maps "Nike Run Club" to "health" | 1 | App mapping | Non-security |
| resolveAdaptiveSourceType > maps "Google Calendar" to "calendar" | 1 | App mapping | Non-security |
| resolveAdaptiveSourceType > maps "Outlook" to "calendar" | 1 | App mapping | Non-security |
| resolveAdaptiveSourceType > maps "Revolut" to "subscriptions" | 1 | App mapping | Non-security |
| resolveAdaptiveSourceType > maps "Photos" to "storage" | 1 | App mapping | Non-security |
| resolveAdaptiveSourceType > maps "Dropbox" to "storage" | 1 | App mapping | Non-security |
| resolveAdaptiveSourceType > maps unknown app to "subscriptions" fallback | 1 | App mapping | Non-security |
| resolveAdaptiveSourceType > is case-insensitive | 1 | Normalization | Non-security |
| resolveAdaptiveSourceType > returns "subscriptions" for null appName | 1 | Null handling | Non-security |

### src/server/discovery/parsers/__tests__/google-takeout.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| file size checks > throws "File too large" when file.size > 200 MB | 5 | DoS prevention | Pre-extraction size check |
| zip bomb protection > throws when total uncompressed size > 500 MB | 5 | Zip bomb defense | Checks decompressed size |
| zip bomb protection > throws before any entry content is read | 5 | Early termination | No memory allocated before bomb detection |
| search history extraction > extracts searches from ZIP paths | 3 | Functional | Parser logic |
| search history extraction > strips the "Searched for " prefix | 2 | Text cleanup | Non-security |
| search history extraction > truncates each search query to 100 chars | 4 | Data truncation | Prevents oversized data propagation |
| search history extraction > caps _rawSearches at 500 entries | 4 | Volume cap | Prevents memory exhaustion |
| search history extraction > skips items where title does not start with "Searched for " | 2 | Filtering | Non-security |
| search history extraction > reports malformed-JSON files as _skippedFileCount | 3 | Resilience | Graceful degradation |
| search history extraction > reports malformed items as _skippedItemCount | 3 | Resilience | Graceful degradation |
| youtube history extraction > extracts watches from ZIP paths | 2 | Functional | Parser logic |
| youtube history extraction > strips the "Watched " prefix | 2 | Text cleanup | Non-security |
| youtube history extraction > truncates each watch title to 100 chars | 4 | Data truncation | Prevents oversized data |
| youtube history extraction > caps _rawYoutubeWatches at 500 entries | 4 | Volume cap | Memory protection |
| result shape > returns searchTopics and youtubeTopCategories | 1 | Functional | Shape check |
| result shape > returns emailVolume: null | 1 | Functional | Shape check |
| malformed item resilience > skips a null item without throwing | 3 | Robustness | Prevents crash on malformed input |
| malformed item resilience > skips an item whose title is not a string | 3 | Type safety | Prevents crash |
| malformed item resilience > skips a primitive item in the array | 3 | Type safety | Prevents crash |
| malformed item resilience > handles same resilience for YouTube history | 3 | Type safety | Prevents crash |
| locale tolerance > matches a non-English ZIP path | 2 | i18n | Non-security |

### src/server/discovery/parsers/__tests__/chatgpt.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 18 tests (parsing logic, message extraction, timestamp handling, empty conversations) | 2 | Functional parser tests | Mock-heavy, no real security assertions. Tests parsing correctness, not security boundaries |

### src/server/discovery/parsers/__tests__/claude-export.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 15 tests (parsing logic, conversation extraction, error handling) | 2 | Functional parser tests | Same as chatgpt parser -- functional correctness, not security boundaries |

### src/server/discovery/__tests__/extract-from-text.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| input validation > returns error for empty string | 3 | Input validation | Standard |
| input validation > returns error for whitespace-only string | 3 | Input validation | Standard |
| input validation > returns error for string shorter than 10 chars | 3 | Input validation | Standard |
| input validation > returns error for unknown sourceType | 4 | Enum validation | Prevents arbitrary sourceType injection |
| input validation > returns error for sourceType "adaptive" | 4 | Enum boundary | Confirms adaptive is never a raw sourceType |
| successful extraction -- one test per sourceType (6 tests) | 2 | Mock routing | Verifies correct tool selection via mocks |
| prompt injection protection > wraps ocrText inside ocr-data tags | 5 | Prompt injection mitigation | Verifies user data is sandboxed in the prompt |
| prompt injection protection > system prompt contains anti-injection directive | 5 | Prompt injection mitigation | System prompt explicitly instructs model to ignore injected instructions |
| prompt injection protection > returns data with tool input on success | 2 | Functional | Happy path |
| error cases > returns error when no tool_use block | 3 | Error handling | Graceful degradation |
| error cases > returns error when Anthropic API throws | 3 | Error handling | Graceful degradation |

### src/server/discovery/__tests__/preprocess-ocr.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| basic cleanup > strips non-printable characters | 4 | Injection prevention | Removes control characters from OCR text |
| basic cleanup > collapses multiple blank lines | 1 | Text formatting | Non-security |
| basic cleanup > trims leading and trailing whitespace | 1 | Text formatting | Non-security |
| basic cleanup > returns empty cleanedText for blank input | 2 | Edge case | Standard |
| basic cleanup > handles null-like whitespace-only input | 2 | Edge case | Standard |
| screen time regex extraction (8 tests: total time, daily avg, pickups, notifications, apps) | 1 | Functional parser | Non-security regex extraction |
| output format (3 tests: structured summary, app list, fallback) | 1 | Functional | Non-security formatting |
| platform detection (3 tests: iOS, Android, unknown) | 1 | Platform identification | Non-security |
| app categorization (3 tests: social, communication, utility fallback) | 1 | Categorization | Non-security |
| non-screentime source types (2 tests: subscriptions, battery) | 1 | Multi-platform support | Non-security |

### src/server/discovery/__tests__/ocr.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| successful extraction > returns data matching schema | 2 | Mock-based | Validates schema compliance via mocked AI |
| successful extraction > passes focusMode=true | 1 | Feature flag | Non-security |
| successful extraction > passes focusMode=false | 1 | Feature flag | Non-security |
| successful extraction > sets tool_choice to extract_screen_time | 2 | Tool routing | Functional |
| error responses > returns error "not_screen_time" | 3 | Error handling | Graceful |
| error responses > returns error "unreadable" | 3 | Error handling | Graceful |
| broken AI responses > throws when no tool_use block | 3 | Error handling | Fail-safe |
| broken AI responses > throws with Zod error for invalid tool input | 4 | Output validation | Zod validates AI output -- catches malformed/injected responses |

### src/server/discovery/__tests__/adaptive.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| calls Haiku with APP_TO_SCREENSHOT_MAP in system prompt | 1 | Functional | Non-security |
| includes occupation and ageBracket in user message | 1 | Functional | Non-security |
| returns [] when no tool_use block (graceful fallback) | 3 | Error handling | Fail-safe |
| returns [] when Zod validation fails | 4 | Output validation | Zod on AI output prevents malformed data propagation |
| caps result at 5 follow-ups | 3 | Volume cap | Prevents excessive follow-up generation |
| returns valid AdaptiveFollowUp[] with required fields | 2 | Schema check | Functional |
| returns accept field on screenshot-type items | 1 | Functional | Non-security |
| returns options array on question-type items | 1 | Functional | Non-security |

### src/server/discovery/__tests__/analyze.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| buildDataContext tests (11 tests: sections formatting, conditional inclusion) | 1 | Functional | Data formatting for AI prompt -- no security assertions |
| runCrossAnalysis > calls Sonnet with ANALYSIS_TOOL and forced tool_choice | 2 | Tool forcing | Ensures correct tool is called |
| runCrossAnalysis > returns DiscoveryAnalysis with all required fields | 2 | Schema check | Functional |
| runCrossAnalysis > merges BASE_LEARNING_MODULES | 1 | Business logic | Non-security |
| runCrossAnalysis > throws when no tool_use in response | 3 | Error handling | Fail-safe |
| runCrossAnalysis > throws with Zod message when output fails schema | 4 | Output validation | Zod on AI output |
| runCrossAnalysis > throws when complexity is not beginner/intermediate | 4 | Output validation | Enum enforcement on AI output |
| All remaining analyze tests (data context formatting) | 1 | Functional | Non-security |

### src/server/discovery/__tests__/extract-topics.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 15 tests (topic extraction, message formatting, deduplication) | 2 | Functional | AI-integration tests with mocked Anthropic -- no security boundaries tested |

### src/app/api/discovery/session/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 13 tests (session creation, quiz data, validation) | 3 | Input validation | Tests Zod validation of session data, rate limiting |

### src/app/api/discovery/analyze/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 13 tests (analyze route, session lookup, tier checks) | 3 | Authorization | Tests session-scoped access and rate limiting |

### src/app/api/discovery/adaptive/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 12 tests (adaptive follow-up generation, validation) | 3 | Input validation | Tests Zod validation and rate limiting |

### src/server/lib/__tests__/cron-auth.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns false when CRON_SECRET is empty string | 5 | Empty secret rejection | Prevents running with no cron secret |
| returns false when CRON_SECRET is shorter than 16 characters | 5 | Weak secret rejection | Minimum entropy enforcement |
| returns false when CRON_SECRET is undefined | 5 | Missing secret rejection | Fail-closed |
| returns false when authorization header is missing | 4 | Missing auth rejection | Standard |
| returns false when authorization header does not match | 4 | Wrong secret rejection | Standard |
| returns true when authorization header matches | 3 | Happy path | Functional |
| pads buffers to equal length before comparison (no length oracle) | 5 | Timing attack prevention | Prevents length-based oracle in constant-time comparison |

### src/shared/lib/__tests__/sanitize-next-param.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns /workspace for null | 3 | Safe default | Standard |
| returns /workspace for undefined | 3 | Safe default | Standard |
| returns /workspace for empty string | 3 | Safe default | Standard |
| passes through /workspace | 3 | Legitimate path | Standard |
| passes through /workspace/abc | 3 | Legitimate path | Standard |
| passes through bare root / | 3 | Legitimate path | Standard |
| passes through /foo | 3 | Legitimate path | Standard |
| rejects //evil.com | 5 | Open redirect prevention | Protocol-relative URL attack |
| rejects ///evil | 5 | Open redirect prevention | Triple-slash variant |
| rejects http://evil | 5 | Open redirect prevention | Absolute URL injection |
| rejects https://evil | 5 | Open redirect prevention | HTTPS variant |
| rejects javascript:alert(1) | 5 | XSS prevention | javascript: protocol |
| rejects data:text/html,foo | 5 | XSS prevention | data: protocol |
| rejects raw percent-encoded //evil.com | 5 | Encoding bypass prevention | URL-encoded double-slash attack |
| rejects the decoded form //evil.com | 5 | Open redirect prevention | Decoded variant |
| rejects backslash prefix \\evil | 5 | Open redirect prevention | Windows-style path bypass |
| rejects leading-space " /workspace" | 4 | Whitespace bypass prevention | Space-prefixed path |
| rejects bare hostname evil.com | 4 | Open redirect prevention | No-protocol hostname |
| allows : inside the query string of a same-origin URL | 3 | Compatibility | Colons allowed in query strings |
| allows : inside a query string value | 3 | Compatibility | Standard |
| rejects : in the path segment | 4 | Protocol injection prevention | Colons in path could indicate scheme |
| fallback option (4 tests) | 3 | Custom fallback | Functional |
| mustStartWith option (3 tests) | 3 | Path restriction | Functional |

### src/app/api/billing/webhook/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when stripe-signature header is absent | 5 | Webhook auth | No signature = rejected |
| returns 401 when STRIPE_WEBHOOK_SECRET env var is not set | 5 | Missing secret rejection | Fail-closed when not configured |
| returns 401 when constructEvent throws (invalid or tampered signature) | 5 | Signature verification | Tampered webhook payload rejected |
| proceeds when constructEvent returns a valid event | 3 | Happy path | Functional |
| checkout.session.completed -- timeAudit > inserts into auditOrders | 2 | Business logic | Non-security |
| checkout.session.completed -- timeAudit > sends confirmation email | 1 | Email delivery | Non-security |
| checkout.session.completed -- timeAudit > sends founder notification | 1 | Email delivery | Non-security |
| checkout.session.completed -- timeAudit > inserts into subscribers | 2 | Business logic | Non-security |
| checkout.session.completed -- timeAudit > returns received true | 2 | Response shape | Non-security |
| checkout.session.completed -- appBuild (5 tests) | 2 | Business logic | Non-security |
| checkout.session.completed -- vipBuild (2 tests) | 2 | Business logic | Non-security |
| checkout.session.completed -- builder (3 tests) | 2 | Business logic | Non-security |
| checkout.session.completed -- starter (4 tests) | 2 | Business logic | Non-security |
| checkout.session.completed -- missing email > no DB insert or email | 3 | Null-safety | Prevents crash on missing email |
| subscription events (2 tests) | 2 | Event handling | Non-security |
| unhandled event types > returns received true without side effects | 3 | Safe default | Ignores unknown events |

### src/app/api/billing/checkout/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 429 when rate limited | 4 | Rate limiting | Prevents checkout abuse |
| returns 400 for invalid product value | 4 | Input validation | Prevents arbitrary product injection |
| returns 400 for invalid email format | 3 | Input validation | Standard Zod |
| accepts request with no email | 3 | Optional field | Functional |
| accepts request with no xrayId | 3 | Optional field | Functional |
| creates payment-mode session for timeAudit | 2 | Business logic | Non-security |
| creates payment-mode session for appBuild | 2 | Business logic | Non-security |
| creates payment-mode session for vipBuild | 2 | Business logic | Non-security |
| creates subscription-mode session for builder | 2 | Business logic | Non-security |
| rejects retired "starter" slug with VALIDATION_ERROR | 4 | Deprecated product blocking | Prevents purchasing retired products |
| does NOT include subscription_data for timeAudit | 2 | Mode correctness | Non-security |
| does NOT include subscription_data for appBuild | 2 | Mode correctness | Non-security |
| DOES include subscription_data for builder | 2 | Mode correctness | Non-security |
| passes customer_email to Stripe when provided | 2 | Functional | Non-security |
| passes customer_email as undefined when absent | 2 | Functional | Non-security |
| passes xrayId in metadata | 2 | Functional | Non-security |
| passes empty string for xrayId when absent | 2 | Functional | Non-security |
| passes allow_promotion_codes: true | 1 | Business feature | Non-security |
| returns url on success | 2 | Response shape | Non-security |
| returns 200 on success | 2 | Happy path | Non-security |
| returns 500 when Stripe throws | 3 | Error handling | Standard |

### src/app/api/webhooks/resend/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when RESEND_WEBHOOK_SECRET is not set | 5 | Missing secret rejection | Fail-closed |
| returns 401 when svix headers are missing | 5 | Missing signature headers | Rejects unsigned webhooks |
| returns 401 when svix verification fails | 5 | Signature verification | Tampered payload rejected |
| returns 400 when payload has no type | 3 | Input validation | Standard |
| returns 400 when payload has no email_id | 3 | Input validation | Standard |
| email.delivered > transitions verifying task to done | 3 | State machine | Functional |
| email.delivered > does not transition when not verifying | 3 | State guard | Prevents invalid transitions |
| email.delivered > returns matched false when no task found | 3 | Missing task handling | Graceful |
| email.bounced > transitions to failed | 3 | State machine | Functional |
| email.bounced > transitions failed to escalated | 3 | Escalation | Functional |
| email.complained > transitions to failed | 3 | State machine | Functional |
| email.complained > transitions failed to escalated | 3 | Escalation | Functional |
| idempotency (2 tests) | 3 | Replay safety | Prevents duplicate processing |
| unhandled event types > returns 200 without side effects | 3 | Safe default | Standard |

### src/server/build-orchestration/__tests__/build-pipeline-integration.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| commits multiple realistic files | 3 | Functional | Build pipeline works |
| file_written events carry correct contentHash and sizeBytes | 3 | Integrity | Content-addressed storage |
| preserves untouched files, updates modified, adds new | 3 | Functional | Incremental builds |
| second build references first as parentBuildId | 2 | Lineage tracking | Non-security |
| Anthropic receives current files in prompt | 2 | Context correctness | Non-security |
| rejects: path traversal with .. (../etc/passwd) | 5 | Path traversal prevention | Blocks ../../etc/passwd |
| rejects: nested path traversal (src/../../../etc/shadow) | 5 | Nested path traversal | Blocks complex traversal |
| rejects: write to node_modules | 5 | Reserved path protection | Blocks node_modules writes |
| rejects: write to .env | 5 | Secret file protection | Blocks .env writes |
| rejects: write to .env.local | 5 | Secret file protection | Blocks .env.local |
| rejects: write to .env.production | 5 | Secret file protection | Blocks .env.production |
| rejects: write to .git directory | 5 | Git directory protection | Blocks .git writes |
| rejects: write to .next build output | 5 | Build output protection | Blocks .next writes |
| rejects: write to .vercel config | 5 | Config protection | Blocks .vercel writes |
| rejects: absolute path (/etc/passwd) | 5 | Absolute path rejection | Blocks /etc/passwd |
| rejects: redundant dot segment (src/./app/page.tsx) | 4 | Path normalization | Blocks ./dot segments |
| rejects: write to dist directory | 4 | Build output protection | Blocks dist writes |
| rejects: write to .turbo directory | 4 | Cache protection | Blocks .turbo writes |
| rejects path with backslash (Windows-style) | 5 | Windows path bypass | Blocks backslash paths |
| rejects path with null byte injection | 5 | Null byte injection (CWE-158) | Blocks null byte in paths |
| rejects empty path | 4 | Empty path rejection | Blocks empty string |
| rejects path with control characters | 5 | Control character injection | Blocks non-printable chars in paths |
| accepts valid safe paths | 3 | Positive case | Confirms valid paths work |
| SSE stream round-trip preserves all event data | 2 | Data integrity | Functional |
| event order is started -> prompt_sent -> file_written* -> committed | 2 | Ordering | Functional |
| All remaining SSE/token tests | 2 | Functional | Non-security |

### src/server/build-orchestration/__tests__/build-journey.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| full build journey: create -> apply template -> build -> SSE events | 3 | Integration | End-to-end build pipeline |
| build with unsafe path traversal triggers failed event via SSE | 5 | Path traversal in SSE | E2E confirmation that path traversal = failed event |
| build with reserved path segment (node_modules) triggers failed event | 5 | Reserved path in SSE | E2E confirmation |
| deploy gracefully skips when no sandbox provider is set | 3 | Graceful degradation | No sandbox = skip, don't crash |

### src/server/build-orchestration/__tests__/routes-tracked.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| found route files on disk | 3 | Meta-test | Ensures test is not vacuously true |
| N route files are tracked by git (45 individual tests) | 4 | Deployment safety | Prevents .gitignore from silently eating API routes -- real bug this caught |

### src/server/build/__tests__/first-build-email-toctou.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| does not send email when UPDATE rowCount is 0 (concurrent call) | 5 | TOCTOU prevention | Race condition fix -- only first caller sends email |
| sends email when UPDATE rowCount is 1 (first caller wins) | 4 | Correct behavior | Complement to TOCTOU test |

### src/app/api/cron/agent-tick/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 for missing Authorization header | 4 | Cron auth | Standard |
| returns 401 for wrong secret | 4 | Cron auth | Standard |
| returns 401 for wrong scheme | 4 | Cron auth | Scheme validation |
| empty queue > returns processed 0 | 2 | Functional | Non-security |
| spend cap > skips when global spend ceiling exceeded | 4 | Cost control | Prevents runaway AI spending |
| spend cap > records spend for each processed task | 3 | Accounting | Spend tracking |
| task processing (4 tests) | 2 | Functional | State machine tests |
| status transitions > claims tasks via UPDATE...RETURNING | 3 | Atomic claim | Prevents double-processing |

### src/app/api/cron/__tests__/purge-auth.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 for missing Authorization header | 4 | Cron auth | Standard |
| returns 401 for wrong secret | 4 | Cron auth | Standard |
| returns 401 for wrong scheme | 4 | Cron auth | Scheme validation |
| returns 200 for correct Bearer token | 3 | Happy path | Standard |
| does not expose CRON_SECRET in response body | 5 | Secret leakage prevention | Response body does not contain the secret |
| purge route uses verifyCronAuth from shared module | 3 | Code organization | Shared auth module |
| agent-tick route uses verifyCronAuth from shared module | 3 | Code organization | Shared auth module |
| verifyCronAuth uses timingSafeEqual for comparison | 5 | Timing attack prevention | Source-level verification of constant-time comparison |

### src/app/api/cron/purge/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| authorization (4 tests: missing header, wrong secret, wrong scheme, correct) | 4 | Cron auth | Standard pattern |
| happy path (4 tests: executes DELETE SQL, returns purged counts) | 3 | Functional | Data retention cleanup |

### src/app/api/cron/email-touchpoints/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 8 tests (auth, email sending, deduplication) | 3 | Cron auth + business logic | Standard auth pattern, email dedup |

### src/app/api/workspace/projects/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| POST returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| POST returns 401 when cookie is invalid | 4 | AuthN gate | Standard |
| POST returns 400 on invalid JSON | 3 | Input validation | Standard |
| POST returns 400 when name has wrong type | 3 | Input validation | Type check |
| POST returns 400 when name exceeds length cap | 3 | Length validation | Standard |
| POST returns 400 when name contains forbidden characters | 4 | XSS prevention | Rejects `<script>` in project name |
| POST creates project and returns id | 3 | Functional | Happy path |
| POST uses default name when none provided | 2 | Functional | Non-security |
| POST seeds project with starter files | 2 | Functional | Non-security |
| GET returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| GET returns 401 when cookie is invalid | 4 | AuthN gate | Standard |
| GET returns empty list when user has no projects | 3 | Functional | Standard |
| GET returns projects in DB order | 2 | Functional | Non-security |
| GET returns 500 when DB throws | 3 | Error handling | Standard |
| GET scopes query to authenticated user | 4 | AuthZ / tenant isolation | Verifies userId is passed to query |

### src/app/api/workspace/projects/__tests__/serialize-error.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 5 tests (error serialization, message extraction) | 3 | Error handling | Ensures errors are serialized safely without stack traces |

### src/app/api/workspace/tokens/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| returns 401 when auth cookie is invalid | 4 | AuthN gate | Standard |
| calls getTokenBalance with correct userId | 3 | Tenant isolation | Correct userId scoping |
| calls getTransactionHistory with correct userId | 3 | Tenant isolation | Correct userId scoping |
| returns balance and transactions | 2 | Functional | Non-security |
| returns 500 when getTokenBalance throws | 3 | Error handling | Standard |
| returns 429 when rate limited | 4 | Rate limiting | Standard |

### src/app/api/workspace/tokens/claim-daily/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| returns alreadyClaimed when Redis NX returns null | 4 | Double-claim prevention | Redis NX prevents race condition on daily claim |
| credits daily bonus on first claim | 3 | Functional | Business logic |
| calls Redis SET with nx and 86400s expiry | 4 | Atomic claim with TTL | Correct Redis NX pattern prevents double-claim |
| returns 503 when rate limiter reports serviceError | 3 | Service degradation | Graceful handling |
| deletes Redis key when creditTokens fails | 4 | Rollback on failure | Prevents orphaned claim lock when credit fails |

### src/app/api/onboarding/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| rejects unauthenticated requests with 401 | 4 | AuthN gate | Standard |
| rejects invalid vertical id with 400 | 3 | Input validation | Standard |
| creates project with valid vertical | 2 | Functional | Non-security |
| creates project with consulting vertical | 2 | Functional | Non-security |
| accepts optional business name | 2 | Functional | Non-security |
| rejects missing body with 400 | 3 | Input validation | Standard |

### src/app/api/workspace/[projectId]/cards/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| GET returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| GET returns 401 when cookie is invalid | 4 | AuthN gate | Standard |
| GET returns 404 when project does not belong to user | 5 | IDOR prevention (BOLA) | Prevents accessing another user's cards |
| POST returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| POST returns 404 when project does not exist | 4 | Non-existent resource | Standard |
| POST returns 400 on invalid JSON | 3 | Input validation | Standard |
| POST returns 400 when title is missing | 3 | Input validation | Standard |
| POST returns 400 when title exceeds 80 chars | 3 | Length validation | Standard |
| POST creates card with defaults | 2 | Functional | Non-security |
| POST creates subtask under parent | 2 | Functional | Non-security |
| POST auto-increments position | 2 | Functional | Non-security |
| PATCH returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| PATCH returns 404 when project does not exist | 4 | IDOR prevention | Standard |
| PATCH returns 400 on invalid update data | 3 | Input validation | Standard |
| PATCH updates card and returns updated | 2 | Functional | Non-security |
| PATCH returns 404 when card does not exist | 3 | Non-existent resource | Standard |
| DELETE returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| DELETE returns 404 when card does not exist | 3 | Non-existent resource | Standard |
| DELETE deletes card and returns 204 | 2 | Functional | Non-security |
| PATCH reorder returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| PATCH reorder returns 404 when project does not exist | 4 | IDOR prevention | Standard |
| All remaining card tests (ordering, creation, subtasks) | 2 | Functional | Non-security |

### src/app/api/workspace/[projectId]/settings/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| GET returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| GET returns 401 when cookie is invalid | 4 | AuthN gate | Standard |
| GET returns 404 when project does not belong to user | 5 | IDOR prevention (BOLA) | Cross-user settings access blocked |
| PUT returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| PUT returns 401 when cookie is invalid | 4 | AuthN gate | Standard |
| PUT returns 404 when project does not belong to user | 5 | IDOR prevention (BOLA) | Cross-user settings modification blocked |
| All remaining settings tests (update name, services, validation) | 3 | Input validation | Standard Zod validation |

### src/app/api/workspace/[projectId]/build/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| returns 404 when project does not belong to user | 5 | IDOR prevention (BOLA) | Cross-user build trigger blocked |
| All remaining build tests (SSE streaming, errors, token costs) | 3 | Functional | Build pipeline functionality |

### src/app/api/workspace/[projectId]/agent/tasks/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| GET returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| GET returns 404 when project does not belong to user | 5 | IDOR prevention (BOLA) | Cross-user task access blocked |
| POST approve returns 401 | 4 | AuthN gate | Standard |
| POST approve returns 404 for wrong project | 4 | IDOR prevention | Standard |
| POST reject returns 401 | 4 | AuthN gate | Standard |
| All remaining agent task tests | 3 | State machine + validation | Standard |

### src/app/api/workspace/[projectId]/agent/events/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no auth cookie | 4 | AuthN gate | Standard |
| returns 404 when project does not belong to user | 5 | IDOR prevention (BOLA) | Cross-user event access blocked |
| All remaining event tests (SSE streaming, event types) | 3 | Functional | SSE streaming |

### src/app/api/workspace/[projectId]/wishes/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no auth | 4 | AuthN gate | Standard |
| returns 404 for wrong user | 5 | IDOR prevention | Standard |
| All remaining wishes tests | 3 | Input validation | Standard |

### src/app/api/workspace/[projectId]/apply-template/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no auth | 4 | AuthN gate | Standard |
| returns 404 for wrong user | 4 | IDOR prevention | Standard |
| All remaining template tests (validation, application) | 3 | Input validation | Standard |

### src/app/api/workspace/[projectId]/generate-plan/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no auth | 4 | AuthN gate | Standard |
| returns 404 for wrong user | 4 | IDOR prevention | Standard |
| All remaining plan generation tests | 3 | Input validation + AI output | Standard |

### src/app/api/workspace/[projectId]/generate-proposal/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no auth | 4 | AuthN gate | Standard |
| returns 404 for wrong user | 4 | IDOR prevention | Standard |
| All remaining proposal tests | 3 | Functional | Standard |

### src/app/api/workspace/[projectId]/improve-prompt/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no auth | 4 | AuthN gate | Standard |
| returns 404 for wrong user | 4 | IDOR prevention | Standard |
| All remaining prompt improvement tests | 3 | Functional | Standard |

### src/app/api/workspace/[projectId]/ask-question/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no auth | 4 | AuthN gate | Standard |
| returns 404 for wrong user | 4 | IDOR prevention | Standard |
| All remaining question tests | 3 | Input validation | Standard |

### src/app/api/workspace/[projectId]/bookings/__tests__/route.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns 401 when no auth | 4 | AuthN gate | Standard |
| returns 404 for wrong user | 4 | IDOR prevention | Standard |
| All remaining booking tests (CRUD, validation) | 3 | Input validation | Standard |

### src/server/agents/__tests__/agent-task-service.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| proposeTask > inserts into agentTasks and agentEvents | 2 | Functional | Non-security |
| proposeTask > returns the created task | 2 | Functional | Non-security |
| approveTask > transitions proposed to approved | 3 | State machine | Valid transition |
| approveTask > throws TaskNotFoundError | 4 | Non-existent task rejection | Prevents operating on ghost tasks |
| approveTask > throws InvalidTaskTransitionError | 4 | Invalid state transition | Prevents out-of-order state changes |
| rejectTask (3 tests) | 3 | State machine | Same pattern as approve |
| executeTask (2 tests) | 3 | State machine | Same pattern |
| completeTask (2 tests) | 3 | State machine | Same pattern |
| escalateTask (2 tests) | 3 | State machine | Same pattern |
| getPendingTasks (2 tests) | 2 | Functional | Non-security |
| getTaskHistory (2 tests) | 2 | Functional | Non-security |
| failTask (3 tests) | 3 | State machine | Valid transitions |
| reapStuckExecutingTasks (2 tests) | 3 | Stuck task cleanup | Prevents resource exhaustion |

### src/server/domains/__tests__/slug.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| lowercases and replaces spaces | 2 | Normalization | Non-security |
| strips possessive apostrophes | 2 | Normalization | Non-security |
| collapses multiple spaces and hyphens | 2 | Normalization | Non-security |
| removes leading and trailing hyphens | 2 | Normalization | Non-security |
| strips accented characters via NFD | 3 | Normalization | Prevents confusable characters in subdomains |
| handles emoji and non-latin characters | 3 | Normalization | Strips potentially dangerous unicode |
| returns "project" for empty or whitespace-only | 3 | Safe default | Prevents empty slugs |
| preserves numbers | 2 | Functional | Non-security |
| handles already-slugified input | 2 | Idempotency | Non-security |
| generateSubdomain > appends .meldar.ai | 2 | Functional | Non-security |
| generateSubdomain > works with single-word slugs | 2 | Functional | Non-security |
| appendCollisionSuffix > appends 4-character suffix | 2 | Uniqueness | Non-security |
| appendCollisionSuffix > produces different suffixes | 2 | Randomness | Non-security |

### src/server/domains/__tests__/provision-subdomain.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| generates subdomain from project name and inserts | 2 | Functional | Non-security |
| appends collision suffix when slug already exists | 3 | Collision handling | Non-security |
| retries up to 5 times on repeated collisions | 3 | Bounded retry | Prevents infinite loops |
| handles names that normalize to "project" | 2 | Edge case | Non-security |
| succeeds on third attempt after two collisions | 2 | Retry logic | Non-security |

### src/server/deploy/__tests__/vercel-deploy.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| returns not_configured when MELDAR_DEPLOY_TOKEN is missing | 4 | Missing secret handling | Fail-safe when not configured |
| runs full 6-step sequence on happy path | 2 | Functional | Non-security |
| handles 409 on project create | 2 | Idempotency | Non-security |
| maps ERROR readyState to deployment_build_failed | 2 | Error handling | Non-security |
| maps upload failure to upload_failed | 2 | Error handling | Non-security |
| accepts 409 on addDomain as idempotent success | 2 | Idempotency | Non-security |

### src/server/deploy/__tests__/guarded-deploy-call.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| Both tests (guarded deploy, error handling) | 3 | Error isolation | Prevents deploy errors from crashing build pipeline |

### src/server/deploy/__tests__/sleep-listener-leak.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| Both tests (listener cleanup, resource leak prevention) | 3 | Resource leak prevention | Prevents memory leaks in long-running processes |

### src/server/projects/__tests__/list-user-projects.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 8 tests (user scoping, project listing, ordering) | 3 | Tenant isolation | Verifies queries are scoped to userId |

### src/app/(authed)/sign-in/__tests__/sign-in-submit.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| rejects invalid email before network | 3 | Client-side validation | Standard |
| rejects empty password before network | 3 | Client-side validation | Standard |
| returns ok with user id on success | 3 | Functional | Happy path |
| shows generic invalid credentials message on 401, never typed input | 5 | Credential leakage prevention | Error message does not echo back credentials |
| surfaces rate limit message on 429 | 3 | UX | Non-security |
| handles network errors gracefully | 2 | Resilience | Non-security |
| rejects malformed success response | 3 | Response validation | Prevents trusting bad server responses |

### src/app/(authed)/sign-up/__tests__/sign-up-submit.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| rejects invalid email before network | 3 | Client-side validation | Standard |
| rejects short password before network | 3 | Client-side validation | Standard |
| returns ok with userId on success | 3 | Functional | Happy path |
| surfaces server error on 409 conflict | 3 | UX | Non-security |
| surfaces rate limit message on 429 | 3 | UX | Non-security |
| handles network errors gracefully | 2 | Resilience | Non-security |
| rejects malformed success response | 3 | Response validation | Standard |
| strips unknown fields from request body | 4 | Mass assignment prevention | Ensures only email+password are sent |

### src/app/(authed)/workspace/__tests__/page.test.tsx

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 4 tests (redirect to onboarding, render projects, loading states) | 2 | Functional | UI component tests, no security assertions |

### src/features/auth/__tests__/sign-out.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| calls DELETE /api/auth/me | 3 | Logout mechanism | Correct HTTP method |
| returns ok on 200 | 2 | Functional | Happy path |
| returns failure on non-2xx | 2 | Error handling | Non-security |
| returns network error on fetch throw | 2 | Resilience | Non-security |

### src/features/project-onboarding/__tests__/schemas.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 11 tests (schema validation, milestone structure, token cost ranges) | 3 | Input validation | Zod schema tests |

### src/features/workspace/__tests__/context.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 17 tests (context state management, streaming, event handling) | 1 | Functional | Client-side state management, no security relevance |

### src/features/kanban/__tests__/derive-milestone-state.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 10 tests (state derivation from card statuses) | 1 | Functional | UI logic, no security relevance |

### src/features/kanban/__tests__/group-cards.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 6 tests (card grouping logic) | 1 | Functional | UI logic, no security relevance |

### src/features/kanban/__tests__/topological-sort.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 8 tests (topological sorting of cards) | 1 | Functional | Algorithm test, no security relevance |

### src/features/kanban/__tests__/parse-prompt-anatomy.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 10 tests (prompt parsing, markdown extraction) | 1 | Functional | Text parsing, no security relevance |

### src/features/share-flow/__tests__/SharePanel.test.tsx

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 7 tests (render URL, clipboard copy, WhatsApp link, aria-labels, Instagram tooltip) | 1 | Functional | UI component tests, no security relevance |

### src/features/teaching-hints/__tests__/hints.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 6 tests (hint visibility, progression, localStorage) | 1 | Functional | UI feature tests, no security relevance |

### src/features/visual-feedback/__tests__/FeedbackBar.test.tsx

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 5 tests (textarea rendering, button state, clarification chips) | 1 | Functional | UI component tests, no security relevance |

### src/features/token-economy/ui/__tests__/TokenBalancePill.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 3 tests (pill rendering, balance display) | 1 | Functional | UI component tests, no security relevance |

### src/widgets/workspace/__tests__/PreviewPane.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 8 tests (preview rendering, iframe behavior) | 1 | Functional | UI component tests, no security relevance |

### src/widgets/workspace/__tests__/StepIndicator.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 7 tests (step indicator states, transitions) | 1 | Functional | UI component tests, no security relevance |

### src/widgets/workspace/__tests__/build-status.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 7 tests (build status display, transitions) | 1 | Functional | UI component tests, no security relevance |

### src/entities/booking-verticals/__tests__/data.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 9 tests (vertical data structure, service listings) | 1 | Functional | Data structure tests, no security relevance |

### src/entities/project-step/__tests__/derive-step.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 6 tests (step derivation from project state) | 1 | Functional | UI logic tests, no security relevance |

### src/shared/lib/__tests__/format-relative.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| All 6 tests (relative time formatting) | 1 | Functional | Utility tests, no security relevance |

### apps/web/src/__tests__/integration/auth-flows.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| creates user with hashed password and verifies it matches | 3 | Hash storage verification | Confirms password stored as hash and roundtrip works against real DB; uses SHA-256 (not bcrypt) so weaker than ideal |
| creates user with reset token and queries by hashed token | 4 | Token hash-before-store | Integration proof that raw tokens never sit in DB -- queried by hash against real Postgres |
| increments tokenVersion and verifies old version does not match | 4 | Session revocation mechanism | DB-level proof that tokenVersion increment invalidates prior JWT payloads |
| verifies project ownership returns the project for correct user | 2 | Happy-path ownership | Functional correctness only -- does not test a negative case |
| verifies different userId returns empty (ownership denied) | 4 | IDOR / BOLA prevention | Real DB proof that querying another user's project returns zero rows |

### apps/web/src/__tests__/integration/agent-flows.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| transitions proposed -> approved -> executing -> verifying -> done | 2 | State machine lifecycle | Confirms valid status transitions but does not test invalid ones or authorization |
| inserts 3 proposed tasks and queries pending count | 1 | Functional query | No security boundary tested |
| inserts agent event and verifies shape | 1 | Functional schema | No security boundary tested |
| inserts task and event for same project and verifies both reference it | 2 | FK referential integrity | Prevents orphaned records at DB level but not a security assertion |

### apps/web/src/__tests__/integration/booking-flows.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| inserts active subdomain and queries it back | 2 | Functional domain lookup | Happy-path query; no negative or cross-tenant case |
| inserts booking_confirmation task and queries by project and type | 1 | Functional task query | No security boundary tested |
| throws on duplicate domain string | 4 | Domain uniqueness constraint | DB-enforced unique constraint prevents subdomain squatting / takeover by duplicate insert |

### apps/web/src/__tests__/integration/auth-routes.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| inserts user with bcrypt-hashed password and retrieves by email | 4 | Hash storage verification | Real DB proof that password is stored as bcrypt (`$2[ab]$`), verifyPassword roundtrip passes, wrong password rejected |
| selects exactly 1 row by email with eq() | 2 | Functional login lookup | No negative case; confirms query returns exactly 1 row |
| stores hashed reset token with expiry and retrieves by token + validity | 4 | Token hash-before-store | Integration proof that raw tokens never sit in DB; query by hash + expiry works against real Postgres |
| consumes reset token atomically — second UPDATE returns 0 rows | 5 | TOCTOU race prevention | Second UPDATE gets 0 rows, proving atomic consumption prevents token reuse in concurrent requests |
| verifies email via token lookup and marks emailVerified=true | 4 | Token consumption lifecycle | Token lookup, emailVerified flip, and token nullification in one flow; prevents token reuse |
| increments tokenVersion from 0 → 1 → 2 | 3 | Session revocation mechanism | SQL `tokenVersion + 1` works; no negative assertion that old version is rejected |
| inserts user with authProvider=google and emailVerified=true | 2 | OAuth user creation | Functional happy path; no security boundary tested |
| throws unique constraint error on duplicate email insert | 4 | Duplicate account prevention | DB-level unique constraint prevents account confusion / second registration with same email |
| incrementing tokenVersion invalidates sessions holding the old version | 4 | Session invalidation proof | Real DB proof that incrementing tokenVersion causes old version mismatch; explicit `sessionValid === false` assertion |

### apps/web/src/__tests__/integration/workspace-routes.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| create user → create project → list by userId → verify count=1 | 2 | Functional CRUD | Happy path; no cross-user negative case in this test |
| stores templateId correctly | 1 | Functional storage | No security boundary |
| inserts parent + children and verifies parentId relationships | 2 | Referential integrity | FK relationships; not a security assertion |
| streaming → completed sets completedAt | 2 | Build lifecycle | Functional state transition |
| inserts build file and verifies shape | 2 | Functional storage | Verifies r2Key contains projectId (mild data isolation check) |
| updates same (projectId, path) with new contentHash and increments version | 2 | Functional upsert | Version increment; no security boundary |
| debit + credit ordered by createdAt | 2 | Transaction ordering | Functional; ordering correctness |
| JSONB round-trips correctly | 1 | Functional storage | No security boundary |
| soft-deleted project excluded from WHERE deletedAt IS NULL | 3 | Data access control | Soft-deleted records invisible in active queries; prevents stale data exposure |
| user B cannot see user A projects | 4 | IDOR / BOLA prevention | Real DB proof that querying by userB's ID returns zero rows for userA's project |

### apps/web/src/__tests__/integration/agent-operations.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| transitions proposed → approved → executing → verifying → done with all timestamps | 2 | State machine lifecycle | Confirms valid transitions with timestamps; does not test invalid transitions or authorization |
| transitions proposed → approved → executing → failed → escalated | 2 | Failure path lifecycle | Valid failure/escalation flow; no invalid transition test |
| transitions proposed → rejected | 2 | Rejection path | Valid transition; no auth or cross-project assertion |
| tasks in project A do not appear in project B queries | 4 | Tenant isolation (cross-project) | Real DB proof that projectId scoping prevents data leakage between projects |
| inserts 5 events and verifies order and types | 3 | Audit trail integrity | Ordered event insertion for forensic timeline; proves events are timestamped and retrievable in order |
| inserts agent event with userId=null for system-initiated events | 3 | Audit trail completeness | System-initiated events can omit userId without FK violation; important for complete audit logging |
| stores and retrieves autoApprove JSONB structure in wishes | 2 | Functional JSONB storage | autoApprove is security-sensitive but this only tests storage, not enforcement |

### apps/web/src/__tests__/integration/billing-flows.test.ts

| Test | Score | Security Impact | Issue |
|------|-------|-----------------|-------|
| debits and credits token balance correctly | 3 | Financial correctness | SQL arithmetic on token balance; wrong math = free tokens or lost balance |
| inserts token transaction and verifies shape | 2 | Transaction log shape | Functional audit record; referenceId linkage for forensics |
| inserts ai call log entry and verifies kind, model, tokens | 2 | Cost audit trail | Functional; useful for spend forensics but not a security boundary |
| throws CHECK constraint when balance would go negative | 5 | Balance underflow prevention | DB-level CHECK constraint blocks negative balance; prevents token theft via overdraft exploit |
