#!/usr/bin/env bash
#
# verify-deployment.sh — end-to-end contract check for the Meldar sandbox Worker.
#
# Exercises the 5 contract endpoints from packages/sandbox/src/cloudflare-provider.ts
# against a real deployed Worker. Asserts HMAC verification is enforced, that each
# endpoint returns a valid response shape, and that the happy-path prewarm → start
# → write → status → fetch-preview → stop flow completes.
#
# Usage:
#   export CF_SANDBOX_WORKER_URL="https://meldar-sandbox-worker.<account>.workers.dev"
#   export CF_SANDBOX_HMAC_SECRET="<secret>"
#   ./scripts/verify-deployment.sh
#
# Exits 0 on full success, non-zero on any failed check. Compatible with
# macOS bash 3.2 (no readarray, no associative arrays, no [[ -v ]]).
#
# Dependencies: curl, openssl, jq — all standard on macOS and Linux.

set -eu

# ── colors ────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
	GREEN=$(printf '\033[32m')
	RED=$(printf '\033[31m')
	YELLOW=$(printf '\033[33m')
	BOLD=$(printf '\033[1m')
	RESET=$(printf '\033[0m')
else
	GREEN=""
	RED=""
	YELLOW=""
	BOLD=""
	RESET=""
fi

info() {
	printf '%s[verify]%s %s\n' "$BOLD" "$RESET" "$1"
}

pass() {
	printf '       %s✓%s %s\n' "$GREEN" "$RESET" "$1"
}

fail() {
	printf '       %s✗%s %s\n' "$RED" "$RESET" "$1" >&2
	exit 1
}

warn() {
	printf '       %s!%s %s\n' "$YELLOW" "$RESET" "$1"
}

# ── env sanity ────────────────────────────────────────────────────────────────
if [ -z "${CF_SANDBOX_WORKER_URL:-}" ]; then
	printf '%sCF_SANDBOX_WORKER_URL is not set.%s\n' "$RED" "$RESET" >&2
	printf 'Example: export CF_SANDBOX_WORKER_URL="https://meldar-sandbox-worker.my-account.workers.dev"\n' >&2
	exit 2
fi

if [ -z "${CF_SANDBOX_HMAC_SECRET:-}" ]; then
	printf '%sCF_SANDBOX_HMAC_SECRET is not set.%s\n' "$RED" "$RESET" >&2
	printf 'Get it from your password manager or regenerate and redeploy both ends.\n' >&2
	exit 2
fi

# Strip trailing slash from worker URL (matches the orchestrator client).
WORKER_URL=$(printf '%s' "$CF_SANDBOX_WORKER_URL" | sed 's:/*$::')
SECRET_LEN=$(printf '%s' "$CF_SANDBOX_HMAC_SECRET" | wc -c | tr -d ' ')

info "worker URL: $WORKER_URL"
info "secret length: $SECRET_LEN chars"

if [ "$SECRET_LEN" -lt 32 ]; then
	warn "secret is unusually short — expect 43 chars for a base64url-encoded 32-byte value"
fi

# Dependency checks.
for cmd in curl openssl jq; do
	if ! command -v "$cmd" >/dev/null 2>&1; then
		printf '%smissing dependency: %s%s\n' "$RED" "$cmd" "$RESET" >&2
		exit 2
	fi
done

PROJECT_ID="verify-test-$(date +%s)-$$"
info "generated test projectId: $PROJECT_ID"
printf '\n'

# ── hmac signing helper ───────────────────────────────────────────────────────
# Matches the orchestrator client at packages/sandbox/src/cloudflare-provider.ts:
#   signature = hex(HMAC-SHA256(secret, "${timestamp}.${body}"))
# The signed message uses the EXACT bytes the worker receives as the body.
hmac_sign() {
	# $1 = message, reads $CF_SANDBOX_HMAC_SECRET
	printf '%s' "$1" | openssl dgst -sha256 -hmac "$CF_SANDBOX_HMAC_SECRET" \
		| sed 's/^.*= //' \
		| tr -d ' \n'
}

# Temp files for capturing curl output. Cleaned up on exit.
TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'meldar-verify')
trap 'rm -rf "$TMP_DIR"' EXIT

RESPONSE_BODY="$TMP_DIR/body"
RESPONSE_STATUS="$TMP_DIR/status"

# Send a signed POST. Writes the response body to $RESPONSE_BODY and the
# HTTP status code to $RESPONSE_STATUS. Returns curl's exit code.
# Arguments:
#   $1 = path (e.g. /api/v1/start)
#   $2 = request body (JSON string)
#   $3 = optional override signature (for tamper tests)
signed_post() {
	path=$1
	body=$2
	override_sig=${3:-}

	ts=$(perl -e 'print int(time * 1000)' 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')
	msg="${ts}.${body}"

	if [ -n "$override_sig" ]; then
		sig=$override_sig
	else
		sig=$(hmac_sign "$msg")
	fi

	# -w writes the http code to stdout AFTER the body; -o sends the body
	# to a file; we split the two and parse the code separately.
	http_code=$(curl -sS \
		-X POST \
		-H "content-type: application/json" \
		-H "x-meldar-timestamp: $ts" \
		-H "x-meldar-signature: $sig" \
		-d "$body" \
		-o "$RESPONSE_BODY" \
		-w '%{http_code}' \
		"${WORKER_URL}${path}")

	printf '%s' "$http_code" >"$RESPONSE_STATUS"
	return 0
}

# Expect the response status is exactly $1. Otherwise fail.
expect_status() {
	expected=$1
	step_name=$2
	actual=$(cat "$RESPONSE_STATUS")
	if [ "$actual" != "$expected" ]; then
		printf '\n'
		printf 'response body:\n'
		cat "$RESPONSE_BODY" 2>/dev/null || true
		printf '\n'
		fail "$step_name — expected HTTP $expected, got $actual"
	fi
}

# Extract a field from the response body using jq. Fails if the field is
# missing. Usage: get_json .previewUrl
get_json() {
	field=$1
	value=$(jq -r "$field" <"$RESPONSE_BODY" 2>/dev/null || printf 'null')
	if [ "$value" = "null" ] || [ -z "$value" ]; then
		printf '\n'
		printf 'response body:\n'
		cat "$RESPONSE_BODY"
		printf '\n'
		fail "missing or null field: $field"
	fi
	printf '%s' "$value"
}

# Millisecond timer. Echoes the delta vs start_ms ($1).
elapsed_ms() {
	start=$1
	now=$(perl -e 'print int(time * 1000)' 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')
	printf '%s' "$((now - start))"
}

now_ms() {
	perl -e 'print int(time * 1000)' 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))'
}

# ── [1/8] prewarm ─────────────────────────────────────────────────────────────
info "[1/8] POST /api/v1/prewarm"
body="{\"projectId\":\"$PROJECT_ID\"}"
t0=$(now_ms)
signed_post /api/v1/prewarm "$body"
dt=$(elapsed_ms "$t0")
expect_status 200 "prewarm"
pass "200 (${dt} ms)"

# ── [2/8] start (cold) ────────────────────────────────────────────────────────
info "[2/8] POST /api/v1/start (cold boot)"
body="{\"projectId\":\"$PROJECT_ID\",\"userId\":\"verify-user\",\"template\":\"next-landing-v1\",\"files\":[]}"
t0=$(now_ms)
signed_post /api/v1/start "$body"
cold_dt=$(elapsed_ms "$t0")
expect_status 200 "start (cold)"
PREVIEW_URL=$(get_json .previewUrl)
SANDBOX_ID=$(get_json .sandboxId)
pass "200 (${cold_dt} ms)"
printf '       previewUrl = %s\n' "$PREVIEW_URL"
printf '       sandboxId  = %s\n' "$SANDBOX_ID"
if [ "$cold_dt" -gt 10000 ]; then
	warn "cold start took ${cold_dt}ms — >10s is a concern, investigate worker logs"
fi

# ── [3/8] start (warm) ────────────────────────────────────────────────────────
info "[3/8] POST /api/v1/start (warm reuse)"
t0=$(now_ms)
signed_post /api/v1/start "$body"
warm_dt=$(elapsed_ms "$t0")
expect_status 200 "start (warm)"
pass "200 (${warm_dt} ms)"
if [ "$warm_dt" -gt 500 ]; then
	warn "warm reuse took ${warm_dt}ms — >500ms suggests the worker isn't memoizing correctly"
fi

# ── [4/8] write ───────────────────────────────────────────────────────────────
info "[4/8] POST /api/v1/write (single file)"
# Escape the file content so it survives JSON embedding. Use a trivial payload.
write_body="{\"projectId\":\"$PROJECT_ID\",\"files\":[{\"path\":\"src/app/page.tsx\",\"content\":\"export default function Page(){return <main>verified</main>}\"}]}"
t0=$(now_ms)
signed_post /api/v1/write "$write_body"
write_dt=$(elapsed_ms "$t0")
expect_status 200 "write"
WRITE_URL=$(get_json .previewUrl)
pass "200 (${write_dt} ms)"
if [ "$WRITE_URL" != "$PREVIEW_URL" ]; then
	warn "write returned a different previewUrl than start (may be correct if worker rotates URLs)"
fi

# ── [5/8] status ──────────────────────────────────────────────────────────────
info "[5/8] POST /api/v1/status"
status_body="{\"projectId\":\"$PROJECT_ID\"}"
t0=$(now_ms)
signed_post /api/v1/status "$status_body"
status_dt=$(elapsed_ms "$t0")
expect_status 200 "status"
STATUS_URL=$(get_json .previewUrl)
pass "200 (${status_dt} ms)"
if [ "$STATUS_URL" = "" ]; then
	fail "status returned no previewUrl for a running sandbox"
fi

# ── [6/8] fetch preview URL ───────────────────────────────────────────────────
info "[6/8] GET <previewUrl>"
t0=$(now_ms)
preview_code=$(curl -sS -o "$RESPONSE_BODY" -w '%{http_code}' "$PREVIEW_URL" || printf '000')
fetch_dt=$(elapsed_ms "$t0")
if [ "$preview_code" != "200" ]; then
	printf '       got HTTP %s\n' "$preview_code"
	cat "$RESPONSE_BODY" | head -c 500
	printf '\n'
	fail "preview URL did not return 200"
fi
# The rendered page should contain SOMETHING identifiable (html tag, or the
# 'verified' text we wrote earlier). Don't be too strict — Next.js dev server
# HTML output is verbose and varies across versions.
if grep -qE '<html|<body|verified|Meldar' "$RESPONSE_BODY"; then
	pass "200 (${fetch_dt} ms) — page rendered"
else
	cat "$RESPONSE_BODY" | head -c 500
	printf '\n'
	fail "preview URL returned 200 but the body doesn't look like a Next.js page"
fi

# ── [7/8] HMAC tamper test ────────────────────────────────────────────────────
info "[7/8] HMAC tamper test"
# Send a request with a sig that definitely isn't valid. The worker MUST
# reject it with 401.
bad_sig="0000000000000000000000000000000000000000000000000000000000000000"
signed_post /api/v1/status "$status_body" "$bad_sig"
actual=$(cat "$RESPONSE_STATUS")
if [ "$actual" = "401" ] || [ "$actual" = "403" ]; then
	pass "$actual (rejected as expected)"
else
	printf '       response body:\n'
	cat "$RESPONSE_BODY" 2>/dev/null
	printf '\n'
	fail "tampered signature was NOT rejected — got $actual. The worker is NOT verifying HMAC."
fi

# ── [8/8] stop ────────────────────────────────────────────────────────────────
info "[8/8] POST /api/v1/stop"
stop_body="{\"projectId\":\"$PROJECT_ID\"}"
t0=$(now_ms)
signed_post /api/v1/stop "$stop_body"
stop_dt=$(elapsed_ms "$t0")
expect_status 200 "stop"
pass "200 (${stop_dt} ms)"

printf '\n'
info "${GREEN}all checks passed${RESET}"
printf '\n'
printf 'Summary:\n'
printf '  cold start        : %s ms\n' "$cold_dt"
printf '  warm reuse        : %s ms\n' "$warm_dt"
printf '  write round-trip  : %s ms\n' "$write_dt"
printf '  status            : %s ms\n' "$status_dt"
printf '  preview fetch     : %s ms\n' "$fetch_dt"
printf '  stop              : %s ms\n' "$stop_dt"
printf '\n'
printf 'Next step: trigger a Vercel redeploy (vercel --prod) so the orchestrator\n'
printf 'picks up the CF_SANDBOX_* env vars, then test a real Build end-to-end\n'
printf 'from the Meldar workspace UI.\n'
