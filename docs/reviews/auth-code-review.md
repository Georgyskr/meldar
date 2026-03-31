# Auth System Code Review

**Reviewer:** Code Review Agent
**Date:** 2026-03-31
**Scope:** All auth-related files (schema, JWT, password hashing, register, login, forgot-password, reset-password, verify-email, me/logout)

---

## Summary

The auth system is clean, well-structured, and follows reasonable conventions for an early-stage product. However, several security gaps need attention before scaling, and a few correctness issues could cause subtle bugs under load.

---

## Findings

### BLOCKER-1: No Rate Limiting on Auth Endpoints

**Files:** `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`

The project has Upstash rate limiting (`src/server/lib/rate-limit.ts`) configured for screentime, subscribe, and quiz endpoints, but **none of the auth endpoints use it**. This is the most critical gap:

- **Login:** No brute-force protection. An attacker can attempt unlimited password guesses.
- **Register:** No protection against mass account creation (spam/abuse).
- **Forgot password:** No protection against email bombing a target address.
- **Reset password:** No protection against brute-forcing reset tokens.

**Recommendation:** Add rate limiters per IP (and per email for login/forgot-password):
- Login: 5 attempts per 15 minutes per email, 20 per IP
- Register: 3 per hour per IP
- Forgot password: 3 per hour per email, 10 per IP
- Reset password: 5 per hour per IP

---

### BLOCKER-2: Race Condition on Registration (Duplicate Email)

**File:** `src/app/api/auth/register/route.ts`, lines 36-47

The code performs a SELECT to check for existing email, then an INSERT. Between these two operations, another concurrent request could register the same email. The database has a `UNIQUE` constraint on `users.email`, which will throw an unhandled Postgres error (code 23505) rather than returning the friendly 409 response.

```typescript
// Current: check-then-insert (TOCTOU race)
const existing = await db.select(...).where(eq(users.email, email))
if (existing.length > 0) return 409
// ...another request could insert here...
const [user] = await db.insert(users).values(...)
```

**Recommendation:** Catch the unique constraint violation from Postgres and map it to 409, or use `INSERT ... ON CONFLICT DO NOTHING` and check the result. Example:

```typescript
try {
  const [user] = await db.insert(users).values({...}).returning(...)
} catch (err) {
  if (err.code === '23505') return 409
  throw err
}
```

---

### HIGH-1: No CSRF Protection

**Files:** All POST auth endpoints

The JWT cookie is set with `sameSite: 'lax'`, which provides partial CSRF protection (blocks cross-site POST from forms). However, `lax` still allows top-level navigations (GET requests) to send the cookie. Since the auth endpoints are all POST, this is acceptable for now, but:

- If any state-changing GET endpoint is added (e.g., verify-email is already a GET that mutates state), it is vulnerable to CSRF.
- **verify-email (`GET /api/auth/verify-email?token=...`)** is a GET request that changes database state. While the token provides protection, a CSRF attack could verify someone's email if the token is known (e.g., leaked via referrer header).

**Recommendation:**
- Convert verify-email to POST with a form/page intermediary, or ensure the token is single-use (already done) and not leaked via Referer.
- Consider adding a CSRF token for future state-changing operations.

---

### HIGH-2: Verify Token Has No Expiry

**File:** `src/server/db/schema.ts` (line 64), `src/app/api/auth/register/route.ts`, `src/app/api/auth/verify-email/route.ts`

The `verifyToken` has no corresponding `verifyTokenExpiresAt` column. Verification tokens are valid forever. If a verification email is intercepted months later, it can still be used.

**Recommendation:** Add `verify_token_expires_at` timestamp column and check it during verification. Set expiry to 24-48 hours.

---

### HIGH-3: Login Returns Full User Object Including Sensitive Fields

**File:** `src/app/api/auth/login/route.ts`, line 29

The login route uses `db.select()` (no column filter) which fetches ALL columns including `passwordHash`, `verifyToken`, `resetToken`, and `resetTokenExpiresAt`. While these fields are not returned in the JSON response (only specific fields are spread into the response), they are loaded into memory and could leak through logging, error serialization, or future refactoring.

```typescript
const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
// user.passwordHash is in memory, user.resetToken is in memory, etc.
```

**Recommendation:** Select only the needed columns:
```typescript
const [user] = await db.select({
  id: users.id,
  email: users.email,
  name: users.name,
  passwordHash: users.passwordHash,
  emailVerified: users.emailVerified,
  xrayUsageCount: users.xrayUsageCount,
}).from(users).where(eq(users.email, email)).limit(1)
```

---

### HIGH-4: Email Verification Link Leaked via Referer Header

**File:** `src/app/api/auth/verify-email/route.ts`

The verify-email endpoint redirects to `/?verified=1` or `/?error=invalid-token`. After the redirect, the browser may send the original URL (containing the token) in the `Referer` header to any third-party resources loaded on the landing page (GA scripts, fonts, etc.).

**Recommendation:** Add a `Referrer-Policy: no-referrer` header to the redirect response, or redirect through an intermediate page that strips the token from the URL.

---

### MEDIUM-1: JWT Secret via Environment Variable Without Rotation Strategy

**File:** `src/server/identity/jwt.ts`

The JWT is signed with a single `AUTH_SECRET`. There is no key rotation mechanism. If the secret is compromised, all tokens must be invalidated by changing the secret, which logs out every user simultaneously.

**Recommendation:** For the current stage this is acceptable, but plan for:
- Key ID (`kid`) in JWT header to support rotation
- A `/auth/logout-all` endpoint that bumps a per-user token version

---

### MEDIUM-2: Password Policy Too Permissive

**Files:** `src/app/api/auth/register/route.ts`, `src/app/api/auth/reset-password/route.ts`

The password requirement is `min(8)` only. No complexity requirements. Common passwords like "12345678" or "password" are accepted.

**Recommendation:** At minimum, check against the top 1000 most common passwords. Consider adding:
- Maximum length (to prevent bcrypt DoS -- bcrypt truncates at 72 bytes but processing very long inputs still costs CPU)
- Breach check via HaveIBeenPwned API (k-anonymity model, privacy-safe)

---

### MEDIUM-3: bcrypt Cost Factor May Be Insufficient for Future

**File:** `src/server/identity/password.ts`

Salt rounds = 12. This is currently acceptable (roughly 250ms on modern hardware). However:
- bcrypt silently truncates passwords longer than 72 bytes. Users with very long passwords get weaker security than expected.
- No maximum password length is enforced, which could lead to confusion.

**Recommendation:** Add `z.string().max(128)` to password schemas. Document the bcrypt 72-byte truncation. Consider migrating to Argon2id for new installs.

---

### MEDIUM-4: Resend Client Instantiated at Module Level

**Files:** `src/app/api/auth/register/route.ts` (line 11), `src/app/api/auth/forgot-password/route.ts` (line 9)

```typescript
const resend = new Resend(process.env.RESEND_API_KEY)
```

This captures `RESEND_API_KEY` at module load time. If the env var is not set, the Resend client is created with `undefined`, which will fail silently or with a confusing error when `resend.emails.send()` is called.

**Recommendation:** Validate the API key at call time or use a lazy getter, consistent with how `getDb()` and `getSecret()` work:

```typescript
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}
```

---

### MEDIUM-5: Registration Email Send Failure Doesn't Rollback User Creation

**File:** `src/app/api/auth/register/route.ts`, lines 76-95

If `resend.emails.send()` fails (network error, invalid API key, etc.), the user is already inserted in the database and a JWT is set. The user exists but never received a verification email. They have no way to re-trigger verification.

**Recommendation:** Either:
1. Wrap user creation + email in a try/catch that rolls back on failure
2. Add a "resend verification email" endpoint
3. Accept the risk but add monitoring/alerts for email failures

---

### MEDIUM-6: No Middleware / No Global Auth Guard

**Finding:** There is no `middleware.ts` file. All auth checking is done per-route via `getUserFromRequest()`. This is fine for now but:
- Easy to forget auth checks on new routes
- No centralized place for rate limiting, CORS, security headers

**Recommendation:** Add a Next.js middleware for:
- Rate limiting on `/api/auth/*` routes
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- CORS policy

---

### LOW-1: `getDb()` Creates New Connection Per Call

**File:** `src/server/db/client.ts`

Every call to `getDb()` creates a new `neon()` connection and `drizzle()` instance. On Neon serverless this is acceptable (HTTP-based, connectionless), but it's slightly wasteful.

**Recommendation:** Cache the drizzle instance in a module-level variable (common pattern for serverless):

```typescript
let _db: ReturnType<typeof drizzle> | null = null
export function getDb() {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!)
    _db = drizzle(sql, { schema })
  }
  return _db
}
```

---

### LOW-2: Error Messages Expose Internal Details

**File:** `src/app/api/auth/register/route.ts`, line 27

The Zod error's `.message` is returned directly to the client. Zod error messages can be verbose and reveal schema structure. This is a minor information disclosure risk.

**Recommendation:** Map Zod errors to user-friendly messages or return a generic "Invalid input" message with field-level errors.

---

### LOW-3: Missing `Content-Type` Validation

**Files:** All POST auth endpoints

None of the endpoints check that the incoming request has `Content-Type: application/json`. Calling `request.json()` on a non-JSON body will throw, which is caught by the generic catch block. This is mostly fine but could produce confusing error messages.

**Recommendation:** Consider validating the Content-Type header before parsing.

---

### LOW-4: DELETE /api/auth/me Ignores Auth Status

**File:** `src/app/api/auth/me/route.ts`, line 37

The logout (DELETE) endpoint doesn't verify the user is authenticated -- it simply deletes the cookie. This is actually fine behavior (idempotent logout), but worth noting for consistency.

---

### LOW-5: No Cookie `domain` Attribute

**Files:** `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`

The cookie is set without an explicit `domain`. This means it defaults to the exact host, which is correct behavior for most setups. However, if `meldar.ai` and `www.meldar.ai` are both in use, the cookie won't be shared.

**Recommendation:** Verify domain configuration and set `domain: '.meldar.ai'` if subdomains need to share auth.

---

## GDPR Compliance

| Area | Status | Notes |
|------|--------|-------|
| Password storage | OK | bcrypt with salt rounds 12 |
| Data minimization | OK | Only email, name (optional), password hash stored |
| Marketing consent | OK | Explicit opt-in, defaults to false |
| Right to deletion | MISSING | No account deletion endpoint exists |
| Token cleanup | PARTIAL | Reset tokens cleared after use; verify tokens cleared after verification. No periodic cleanup of expired reset tokens. |
| Data export | MISSING | No GDPR data export (portability) endpoint |

**Recommendation:** Add:
- `DELETE /api/auth/account` for account deletion (GDPR Article 17)
- `GET /api/auth/export` for data portability (GDPR Article 20)
- A cron job or scheduled cleanup for expired reset tokens

---

## Security Summary Matrix

| Threat | Protected? | How |
|--------|-----------|-----|
| SQL Injection | Yes | Drizzle ORM parameterizes all queries |
| XSS (cookie theft) | Yes | httpOnly cookies |
| Password brute force | **No** | No rate limiting on login |
| Account enumeration | Partial | Login uses same error message; forgot-password returns success for unknown emails; BUT register returns 409 for existing emails |
| Timing attacks on password | Yes | bcrypt.compare is constant-time |
| Token entropy | Yes | nanoid(32) provides ~192 bits of entropy |
| CSRF | Partial | sameSite=lax on cookies; GET verify-email mutates state |
| Credential stuffing | **No** | No rate limiting, no CAPTCHA |
| Email bombing | **No** | No rate limiting on forgot-password |

---

## Overall Assessment

The auth system is **solid for a pre-scale product**. The code is clean, uses proper libraries (bcrypt, JWT, Zod, parameterized queries), and handles most edge cases well. The two blockers (rate limiting and race condition) should be fixed before any significant traffic, and the HIGH-severity items should be addressed before the system stores sensitive user data.

**Priority order:**
1. BLOCKER-1: Add rate limiting to auth endpoints
2. BLOCKER-2: Handle duplicate email race condition
3. HIGH-1: Evaluate CSRF for verify-email
4. HIGH-2: Add verify token expiry
5. HIGH-3: Restrict selected columns in login query
6. HIGH-4: Prevent token leakage via Referer
