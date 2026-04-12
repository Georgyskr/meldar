# Test Validity -- Backend

## Summary

Total: 1157 | Integration(real DB): 61 | Mock-based: 1096 | 5: 42 | 4: 240 | 3: 599 | 2: 192 | 1: 84

42 tests connect to real Neon Postgres via `src/__tests__/integration/` (auth-flows, agent-flows, booking-flows, auth-routes, workspace-routes, agent-operations, billing-flows). All other DB interactions are mocked via `vi.mock('@meldar/db/client')` or use InMemoryProjectStorage / InMemoryBlobStorage in-process substitutes. AI (Anthropic) calls are universally mocked. No test exercises real network I/O to R2, Stripe, Resend, or Vercel.

## By File

### packages/storage/src/__tests__/blob.test.ts (17 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| sha256Hex > produces lowercase hex of length 64 | 4 | None (pure crypto) | Real sha256 logic tested |
| sha256Hex > is deterministic for identical input | 4 | None | Real logic |
| sha256Hex > differs for different input | 4 | None | Real logic |
| sha256Hex > matches the known sha256 for "hello" | 4 | None | Real logic, known-answer test |
| blobKey > produces the content-addressed key layout | 4 | None | Real logic |
| blobKey > rejects empty projectId | 4 | None | Real validation |
| blobKey > rejects empty contentHash | 4 | None | Real validation |
| blobKey > rejects non-sha256 content hash | 4 | None | Real validation |
| blobKey > accepts uppercase hex | 4 | None | Real logic |
| InMemoryBlobStorage > stores and retrieves a blob | 4 | InMemory | Real in-memory impl, not a mock |
| InMemoryBlobStorage > reports existence | 4 | InMemory | Real in-memory impl |
| InMemoryBlobStorage > throws BlobStorageError on missing blob | 4 | InMemory | Real error behavior |
| InMemoryBlobStorage > dedups identical puts (idempotent) | 4 | InMemory | Real dedup logic |
| InMemoryBlobStorage > isolates blobs by project | 4 | InMemory | Real isolation |
| InMemoryBlobStorage > verify: true catches tampered blobs | 4 | InMemory | Real integrity check |
| InMemoryBlobStorage > delete is a no-op on missing blob | 4 | InMemory | Real idempotency |
| InMemoryBlobStorage > delete removes an existing blob | 4 | InMemory | Real delete |

### packages/storage/src/__tests__/r2-blob.test.ts (22 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| config validation > throws if any required field is missing | 4 | None | Real validation logic |
| config validation > fromEnv reads vars from process.env-shape object | 3 | None | Config wiring only |
| config validation > fromEnv throws with clear message when vars are missing | 4 | None | Real validation |
| put > issues a PUT to the content-addressed URL | 3 | Mock fetch | Verifies URL construction and method, fetch mocked |
| put > skips the PUT if the blob already exists (idempotent) | 3 | Mock fetch | Verifies idempotency via mock |
| put > attaches a SHA256 integrity header | 3 | Mock fetch | Verifies header construction |
| put > throws BlobStorageError on non-2xx response | 3 | Mock fetch | Error mapping verified |
| put > wraps network errors in BlobStorageError | 3 | Mock fetch | Error wrapping verified |
| get > returns the response body on success | 3 | Mock fetch | Happy path through mock |
| get > verifies integrity when verify: true | 3 | Mock fetch | Integrity path via mock |
| get > throws BlobIntegrityError when verify: true and content doesn't match | 4 | Mock fetch | Real integrity check logic exercised |
| get > throws BlobStorageError on 404 | 3 | Mock fetch | Error mapping |
| get > throws BlobStorageError on 5xx | 3 | Mock fetch | Error mapping |
| exists > returns true on 200 | 3 | Mock fetch | Status mapping |
| exists > returns false on 404 | 3 | Mock fetch | Status mapping |
| exists > uses HEAD method | 3 | Mock fetch | Verifies HTTP method |
| delete > treats 204 as success | 3 | Mock fetch | Status mapping |
| delete > treats 404 as success (idempotent) | 3 | Mock fetch | Idempotency verified |
| delete > throws on unexpected status | 3 | Mock fetch | Error mapping |
| delete > uses DELETE method | 3 | Mock fetch | Verifies HTTP method |
| URL construction > uses path-style URLs | 3 | Mock fetch | URL pattern verification |
| URL construction > honors a custom endpoint | 3 | Mock fetch | Config pass-through |

### packages/storage/src/__tests__/in-memory-provider.test.ts (45 tests via provider-contract)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| createProject > creates a project with a genesis build and initial files | 4 | InMemory | Full contract test against real in-memory impl |
| createProject > writes content to the blob store | 4 | InMemory | Real blob store write + verify |
| createProject > rejects unsafe paths | 4 | InMemory | Real SandboxUnsafePathError |
| createProject > rejects duplicate paths in the initial file set | 4 | InMemory | Real validation |
| createProject > rejects file sets over the cap | 4 | InMemory | Real limit enforcement |
| createProject > rejects oversized files | 4 | InMemory | Real FileTooLargeError |
| getProject + getCurrentFiles > fetches a created project | 4 | InMemory | Round-trip verified |
| getProject + getCurrentFiles > throws ProjectNotFoundError for wrong user | 4 | InMemory | Access control tested |
| getProject + getCurrentFiles > throws ProjectNotFoundError for nonexistent id | 4 | InMemory | Error path verified |
| getProject + getCurrentFiles > returns current files sorted by path | 4 | InMemory | Sort order verified |
| getProject + getCurrentFiles > readFile returns the content and verifies integrity | 4 | InMemory | Content integrity verified |
| build streaming > writes files into a new build and commits HEAD | 4 | InMemory | Full build lifecycle |
| build streaming > fail leaves HEAD alone and marks the build failed | 4 | InMemory | Failure isolation verified |
| build streaming > dedups file writes by path within a single build | 4 | InMemory | Dedup logic real |
| build streaming > rejects writes to an already-committed build | 4 | InMemory | State machine enforcement |
| build streaming > rejects writes to a failed build | 4 | InMemory | State machine enforcement |
| build streaming > rejects unsafe paths at write time | 4 | InMemory | Security boundary |
| build streaming > does not leak mid-build writes to getCurrentFiles before commit | 4 | InMemory | Atomicity / isolation |
| build streaming > reverts mid-build writes if the build fails | 4 | InMemory | Rollback semantics |
| build streaming > dedups blobs across builds when content is identical | 4 | InMemory | Content-addressed dedup |
| build streaming > idempotent same-hash rewrite bumps version but preserves content | 4 | InMemory | Versioning semantics |
| build streaming > rejects writeFile that would exceed MAX_FILES_PER_BUILD | 4 | InMemory | Limit enforcement |
| rollback > restores the file set to a prior build and records a rollback event | 4 | InMemory | Full rollback lifecycle |
| rollback > rejects rollback to a build from a different project | 4 | InMemory | Cross-project guard |
| rollback > rejects rollback to the current HEAD | 4 | InMemory | No-op guard |
| rollback > rejects rollback to a failed build | 4 | InMemory | Status guard |
| getBuild > fetches a build by id | 4 | InMemory | Round-trip |
| getBuild > throws BuildNotFoundError for unknown id | 4 | InMemory | Error path |
| preview URL > starts as null on a fresh project | 4 | InMemory | Default state |
| preview URL > persists the URL via setPreviewUrl and bumps the timestamp | 4 | InMemory | Write + read verified |
| preview URL > clears the URL AND nulls the timestamp when called with null | 4 | InMemory | Null path verified |
| preview URL > throws ProjectNotFoundError for an unknown project | 4 | InMemory | Guard |
| preview URL > throws ProjectNotFoundError on a soft-deleted project | 4 | InMemory | Soft delete guard |
| reapStuckBuilds > returns 0 when no streaming build exists | 4 | InMemory | No-op path |
| reapStuckBuilds > does not reap a streaming build younger than the cutoff | 4 | InMemory | Cutoff logic |
| reapStuckBuilds > marks streaming builds older than cutoff as failed | 4 | InMemory | Reaper logic |
| reapStuckBuilds > does not affect completed or failed builds | 4 | InMemory | Selectivity |
| reapStuckBuilds > uses strict < on createdAt | 4 | InMemory | Boundary precision |
| reapStuckBuilds > only reaps builds for the specified project | 4 | InMemory | Project isolation |
| reapStuckBuilds > still reaps streaming builds on a soft-deleted project | 4 | InMemory | FK cascade safety |
| getActiveStreamingBuild > returns null when only completed builds exist | 4 | InMemory | No-op |
| getActiveStreamingBuild > returns the id of an in-flight streaming build | 4 | InMemory | Happy path |
| getActiveStreamingBuild > returns null after the streaming build is committed | 4 | InMemory | State transition |
| getActiveStreamingBuild > returns null after the streaming build is failed | 4 | InMemory | State transition |
| getActiveStreamingBuild > still returns the streaming build id on a soft-deleted project | 4 | InMemory | Edge case |

### packages/storage/src/__tests__/agent-tables.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| agent_events table > has required columns | 1 | Schema import | Only checks column objects are defined; proves nothing about DB |
| agent_tasks table > has required columns | 1 | Schema import | Same -- schema export existence check only |
| agent_tasks table > exports task status type | 1 | Schema import | Type assignment compiles -- no runtime value |
| agent_tasks table > exports agent type | 1 | Schema import | Type assignment compiles |
| project_domains table > has required columns | 1 | Schema import | Schema export existence only |
| project_domains table > exports domain state type | 1 | Schema import | Type assignment compiles |
| project_domains table > exports domain type | 1 | Schema import | Type assignment compiles |

### packages/storage/src/__tests__/postgres-provider.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| writeFile (build atomicity) > does NOT touch project_files during writeFile | 3 | Fake DB recorder | Verifies query shape, not real Postgres behavior |
| writeFile (build atomicity) > DOES touch project_files during commit | 3 | Fake DB recorder | Query shape verification |
| fail (build atomicity) > does NOT touch project_files during fail | 3 | Fake DB recorder | Query shape verification |
| assertNonEmptyBatch > returns the array as a non-empty tuple type when non-empty | 3 | None (pure logic) | Utility function test |
| assertNonEmptyBatch > throws with the context label when empty | 3 | None | Utility function test |
| setPreviewUrl > writes a fresh timestamp alongside a non-null URL | 3 | Fake DB recorder | Verifies SET payload shape |
| setPreviewUrl > nulls BOTH columns when called with null URL | 3 | Fake DB recorder | Verifies SET payload |
| writeFile (file count cap) > rejects the overflow write before any DB ops | 3 | Fake DB recorder | Verifies no DB calls issued |

### apps/web/src/server/identity/__tests__/jwt.test.ts (17 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| signToken > returns a valid JWT string | 4 | None | Real JWT signing |
| verifyToken > verifies and returns payload for a valid token | 4 | None | Real sign+verify round-trip |
| verifyToken > returns null for an invalid token | 4 | None | Real verification |
| verifyToken > returns null for a tampered token | 4 | None | Real tamper detection |
| verifyToken > returns null for an expired token | 4 | None | Real expiry check |
| verifyToken > returns null for a token signed with a different secret | 4 | None | Real secret mismatch |
| verifyToken > defaults emailVerified to false for legacy tokens | 4 | None | Backwards compat |
| verifyToken > preserves emailVerified: true through sign/verify roundtrip | 4 | None | Claim preservation |
| verifyToken > rejects tokens signed with a different algorithm (CWE-347) | 4 | None | Security: alg-confusion prevention |
| getUserFromRequest > returns payload for valid meldar-auth cookie | 4 | None | Real cookie parsing |
| getUserFromRequest > returns null when no cookie header present | 4 | None | Missing cookie |
| getUserFromRequest > returns null when cookie header has no meldar-auth | 4 | None | Wrong cookie |
| getUserFromRequest > returns null when meldar-auth cookie has tampered value | 4 | None | Tamper detection |
| getUserFromRequest > extracts token from cookie with multiple cookies | 4 | None | Multi-cookie parsing |
| getSecret > throws if AUTH_SECRET is not set | 4 | None | Config validation |
| getSecret > throws if AUTH_SECRET is shorter than 32 characters | 4 | None | Config validation |
| getSecret > accepts AUTH_SECRET that is exactly 32 characters | 4 | None | Boundary check |

### apps/web/src/server/identity/__tests__/password.test.ts (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| hashes a password and verifies it correctly | 4 | None | Real bcrypt round-trip |
| returns false for incorrect password | 4 | None | Real bcrypt mismatch |
| generates different hashes for the same password (salt) | 4 | None | Salt uniqueness |
| handles empty string password | 4 | None | Edge case |

### apps/web/src/server/identity/__tests__/token-hash.test.ts (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| hashToken > returns a 64-char hex string | 4 | None | Real sha256 |
| hashToken > is deterministic | 4 | None | Determinism |
| hashToken > differs for different input | 4 | None | Collision resistance |
| hashToken > matches known sha256 for test string | 4 | None | Known-answer test |

### apps/web/src/server/identity/__tests__/auth-cookie.test.ts (3 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| setAuthCookie > sets cookie with correct attributes | 3 | Mocked | Cookie attribute verification |
| setAuthCookie > uses Secure flag in production | 3 | Mocked | Env-conditional logic |
| clearAuthCookie > clears cookie with Max-Age=0 | 3 | Mocked | Cookie clearing |

### apps/web/src/server/identity/__tests__/require-auth.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| requireAuth > returns user when valid token and user found | 3 | Mock DB | Mock wiring for auth flow |
| requireAuth > throws when no cookie present | 3 | Mock DB | Auth rejection |
| requireAuth > throws when token is invalid | 3 | Mock DB | Auth rejection |
| requireAuth > throws when user not found in DB | 2 | Mock DB | Only verifies mock was called |
| requireAuth > throws when emailVerified is false and check is required | 3 | Mock DB | Business rule verification |
| requireAuth > passes when emailVerified is false but check not required | 3 | Mock DB | Business rule |
| requireAuth > throws when tokenVersion does not match | 3 | Mock DB | Session revocation check |

### apps/web/src/server/lib/__tests__/cron-auth.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns false when CRON_SECRET is empty string | 4 | None | Real validation |
| returns false when CRON_SECRET is shorter than 16 characters | 4 | None | Length guard |
| returns false when CRON_SECRET is undefined | 4 | None | Missing env |
| returns false when authorization header is missing | 4 | None | Header guard |
| returns false when authorization header does not match | 4 | None | Mismatch detection |
| returns true when authorization header matches | 4 | None | Happy path |
| pads buffers to equal length before comparison (no length oracle) | 4 | None | Timing-safe comparison |

### apps/web/src/server/discovery/parsers/__tests__/google-takeout.test.ts (21 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| file size checks > throws "File too large" when file.size > 200 MB | 4 | None | Real validation, real File API |
| zip bomb protection > throws "Archive too large" when uncompressed > 500 MB | 4 | None | Real ZIP parsing with fflate |
| zip bomb protection > throws before any entry content is read | 4 | None | Verifies early abort |
| search history extraction > extracts searches from ZIP paths | 4 | None | Real ZIP + JSON parsing |
| search history extraction > strips the "Searched for " prefix | 4 | None | Real text processing |
| search history extraction > truncates each search query to 100 chars | 4 | None | Real truncation |
| search history extraction > caps _rawSearches at 500 entries | 4 | None | Real limit |
| search history extraction > skips items where title does not start with "Searched for " | 4 | None | Filter logic |
| search history extraction > reports malformed-JSON files as _skippedFileCount | 4 | None | Resilience |
| search history extraction > reports malformed items as _skippedItemCount | 4 | None | Zod boundary |
| youtube history extraction > extracts watches from ZIP paths | 4 | None | Real ZIP + JSON |
| youtube history extraction > strips the "Watched " prefix | 4 | None | Real text processing |
| youtube history extraction > truncates each watch title to 100 chars | 4 | None | Real truncation |
| youtube history extraction > caps _rawYoutubeWatches at 500 entries | 4 | None | Real limit |
| result shape > returns searchTopics: [] and youtubeTopCategories: null | 3 | None | Shape check |
| result shape > returns emailVolume: null | 3 | None | Shape check |
| malformed item resilience > skips a null item | 4 | None | Real Zod boundary |
| malformed item resilience > skips an item whose title is not a string | 4 | None | Real Zod boundary |
| malformed item resilience > skips a primitive item | 4 | None | Real Zod boundary |
| malformed item resilience > handles the same for YouTube history | 4 | None | Real Zod boundary |
| locale tolerance > matches a non-English ZIP path | 4 | None | Regex tolerance |

### apps/web/src/server/discovery/parsers/__tests__/chatgpt.test.ts (18 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| valid export > counts total conversations correctly | 4 | None | Real ZIP + JSON parsing |
| valid export > extracts user messages by traversing the mapping tree | 4 | None | Real tree traversal |
| valid export > truncates individual message text to 200 chars | 4 | None | Real truncation |
| valid export > caps _rawMessages at 500 entries | 4 | None | Real limit |
| valid export > returns platform: "chatgpt" | 3 | None | Shape check |
| valid export > returns empty topTopics and repeatedQuestions | 3 | None | Shape check |
| valid export > computes timePatterns via extractTimePatterns | 4 | None | Real time pattern extraction |
| zip bomb protection > throws "Archive too large" when > 500 MB | 4 | None | Real ZIP + fflate |
| zip bomb protection > throws before any file content is extracted | 4 | None | Early abort |
| error cases > throws when file absent in ZIP | 4 | None | Real error |
| error cases > throws when conversations.json is malformed | 4 | None | Real JSON error |
| error cases > throws when root is an object, not array | 4 | None | Real shape validation |
| error cases > throws when conversation entry is null | 4 | None | Real robustness |
| error cases > throws when conversation entry is a primitive | 4 | None | Real robustness |
| error cases > throws when conversation.mapping is not an object | 4 | None | Real validation |
| error cases > skips nodes with no mapping field without throwing | 4 | None | Graceful skip |
| error cases > tolerates mapping: null | 4 | None | Soft-deleted conversations |
| error cases > skips message nodes where author.role is not "user" | 4 | None | Role filter |

### apps/web/src/server/discovery/parsers/__tests__/claude-export.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| array format > parses conversations where messages are in chat_messages field | 4 | None | Real JSON parsing |
| array format > parses when messages are in .messages instead of .chat_messages | 4 | None | Format tolerance |
| array format > counts total conversations | 4 | None | Real counting |
| array format > extracts only human messages | 4 | None | Role filter |
| array format > truncates message text to 200 chars | 4 | None | Real truncation |
| array format > caps _rawMessages at 500 entries | 4 | None | Real limit |
| array format > computes timePatterns | 4 | None | Real time extraction |
| array format > handles empty conversations array | 3 | None | Edge case |
| array format > handles conversations with no messages | 3 | None | Edge case |
| object format > parses .chat_messages_v2 from .data wrapper | 4 | None | Format tolerance |
| error cases > throws for non-JSON file | 4 | None | Real error |
| error cases > throws for number input | 4 | None | Real shape validation |
| error cases > throws for null input | 4 | None | Real shape validation |
| error cases > throws for string input | 4 | None | Real shape validation |
| error cases > tolerates missing created_at | 3 | None | Resilience |

### apps/web/src/server/discovery/__tests__/preprocess-ocr.test.ts (26 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| basic cleanup > strips non-printable characters | 4 | None | Real text processing |
| basic cleanup > collapses multiple blank lines | 4 | None | Real regex |
| basic cleanup > trims leading/trailing whitespace | 4 | None | Real trim |
| basic cleanup > collapses runs of spaces to single space | 4 | None | Real regex |
| basic cleanup > strips Unicode replacement characters | 4 | None | Real cleanup |
| screentime extraction > extracts total screen time from header | 4 | None | Real regex extraction |
| screentime extraction > extracts pickups count | 4 | None | Real regex extraction |
| screentime extraction > groups app name + time onto single line | 4 | None | Real line grouping |
| screentime extraction > handles "min" abbreviation | 4 | None | Real pattern matching |
| screentime extraction > handles hours + minutes | 4 | None | Real pattern matching |
| screentime extraction > handles 24-hour format | 4 | None | Real pattern matching |
| screentime extraction > returns summary object | 3 | None | Shape check |
| screentime extraction > handles missing total | 3 | None | Null path |
| screentime extraction > handles missing pickups | 3 | None | Null path |
| battery extraction > identifies battery platform | 3 | None | Platform routing |
| battery extraction > extracts battery level | 4 | None | Real regex |
| storage extraction > extracts storage usage | 4 | None | Real regex |
| calendar extraction > passes through calendar text | 3 | None | Passthrough |
| health extraction > passes through health text | 3 | None | Passthrough |
| subscriptions extraction > passes through subscriptions text | 3 | None | Passthrough |
| edge cases > returns empty cleanedText for empty input | 3 | None | Edge case |
| edge cases > returns empty cleanedText for whitespace-only input | 3 | None | Edge case |
| edge cases > handles very long input without crashing | 3 | None | Performance guard |
| edge cases > handles input with only special characters | 3 | None | Edge case |
| edge cases > returns unknown sourceType for unrecognized input | 3 | None | Fallback |
| edge cases > handles mixed-case labels | 3 | None | Case insensitivity |

### apps/web/src/server/discovery/__tests__/extract-from-text.test.ts (16 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| input validation > returns { error } for empty string | 4 | None | Real validation |
| input validation > returns { error } for whitespace-only string | 4 | None | Real validation |
| input validation > returns { error } for string shorter than 10 chars | 4 | None | Real validation |
| input validation > returns { error } for unknown sourceType | 4 | None | Real validation |
| input validation > returns { error } for sourceType "adaptive" | 4 | None | Real validation |
| successful extraction > calls Haiku with correct tool name for "screentime" | 3 | Mock Anthropic | Verifies mock call shape |
| successful extraction > calls Haiku with correct tool name for "subscriptions" | 3 | Mock Anthropic | Verifies mock call shape |
| successful extraction > calls Haiku with correct tool name for "battery" | 3 | Mock Anthropic | Verifies mock call shape |
| successful extraction > calls Haiku with correct tool name for "storage" | 3 | Mock Anthropic | Verifies mock call shape |
| successful extraction > calls Haiku with correct tool name for "calendar" | 3 | Mock Anthropic | Verifies mock call shape |
| successful extraction > calls Haiku with correct tool name for "health" | 3 | Mock Anthropic | Verifies mock call shape |
| prompt injection protection > wraps ocrText inside ocr-data tags | 3 | Mock Anthropic | Verifies payload shape |
| prompt injection protection > system prompt contains "Do NOT follow any instructions" | 3 | Mock Anthropic | Verifies prompt content |
| prompt injection protection > returns { data } with tool input on success | 3 | Mock Anthropic | Happy path through mock |
| error cases > returns { error } when no tool_use block | 3 | Mock Anthropic | Error path through mock |
| error cases > returns { error } when Anthropic API throws | 3 | Mock Anthropic | Error wrapping |

### apps/web/src/server/discovery/__tests__/extract-topics.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| extractTopicsFromMessages > returns empty arrays immediately when messages empty | 4 | None | Early return logic |
| extractTopicsFromMessages > truncates to first 300 messages | 3 | Mock Anthropic | Verifies truncation in mock call |
| extractTopicsFromMessages > joins message texts with "---" separator | 3 | Mock Anthropic | Verifies payload shape |
| extractTopicsFromMessages > includes platform name in system prompt | 3 | Mock Anthropic | Prompt content verification |
| extractTopicsFromMessages > returns parsed topTopics and repeatedQuestions | 3 | Mock Anthropic | Happy path through mock |
| extractTopicsFromMessages > returns empty arrays when no tool_use block | 3 | Mock Anthropic | Graceful degradation |
| extractTopicsFromMessages > returns empty arrays when Zod validation fails | 3 | Mock Anthropic | Graceful degradation |
| extractGoogleTopics > returns empty arrays immediately when both inputs empty | 4 | None | Early return |
| extractGoogleTopics > includes only search section when youtubeWatches empty | 3 | Mock Anthropic | Conditional prompt |
| extractGoogleTopics > includes only YouTube section when searches empty | 3 | Mock Anthropic | Conditional prompt |
| extractGoogleTopics > includes both sections when both provided | 3 | Mock Anthropic | Full prompt |
| extractGoogleTopics > truncates to 300 searches and 300 youtube watches | 3 | Mock Anthropic | Truncation |
| extractGoogleTopics > returns { searchTopics, youtubeTopCategories } on valid tool response | 3 | Mock Anthropic | Happy path |
| extractGoogleTopics > returns empty arrays when no tool_use block | 3 | Mock Anthropic | Graceful degradation |
| extractGoogleTopics > returns empty arrays when Zod validation fails | 3 | Mock Anthropic | Graceful degradation |

### apps/web/src/server/discovery/__tests__/analyze.test.ts (21 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| buildDataContext > always includes Quiz Picks and AI Comfort Level sections | 3 | Mock Anthropic | Verifies prompt content via mock capture |
| buildDataContext > formats aiComfort label as "Never touched AI" for value 1 | 3 | Mock Anthropic | Label mapping via prompt inspection |
| buildDataContext > formats aiComfort label as "Use it daily" for value 4 | 3 | Mock Anthropic | Label mapping |
| buildDataContext > includes Screen Time Data section only when defined | 3 | Mock Anthropic | Conditional prompt section |
| buildDataContext > includes ChatGPT Usage section | 3 | Mock Anthropic | Conditional prompt section |
| buildDataContext > includes Claude Usage section independently of chatgpt | 3 | Mock Anthropic | Conditional prompt section |
| buildDataContext > includes Google Search Topics section | 3 | Mock Anthropic | Conditional prompt section |
| buildDataContext > includes YouTube Watch Categories section | 3 | Mock Anthropic | Conditional prompt section |
| buildDataContext > includes App Subscriptions section | 3 | Mock Anthropic | Conditional prompt section |
| buildDataContext > includes Battery Usage section | 3 | Mock Anthropic | Conditional prompt section |
| buildDataContext > includes Storage Usage section | 3 | Mock Anthropic | Conditional prompt section |
| buildDataContext > includes Calendar Week View section with events capped at 15 | 3 | Mock Anthropic | Cap + prompt |
| buildDataContext > includes Health Data section with highlights line | 3 | Mock Anthropic | Conditional prompt |
| buildDataContext > includes Adaptive Follow-Up Data section | 3 | Mock Anthropic | Conditional prompt |
| buildDataContext > omits all optional sections when data undefined | 3 | Mock Anthropic | Conditional prompt |
| runCrossAnalysis > calls Sonnet with ANALYSIS_TOOL and forced tool_choice | 3 | Mock Anthropic | Call shape verification |
| runCrossAnalysis > returns DiscoveryAnalysis with all required fields | 3 | Mock Anthropic | Output mapping through mock |
| runCrossAnalysis > merges BASE_LEARNING_MODULES with personalizedModules | 3 | Mock Anthropic | Merge logic with mock data |
| runCrossAnalysis > throws when no tool_use in response.content | 3 | Mock Anthropic | Error path |
| runCrossAnalysis > throws with Zod message when tool output fails schema | 3 | Mock Anthropic | Zod validation on mock data |
| runCrossAnalysis > throws when recommendedApp.complexity is invalid | 3 | Mock Anthropic | Zod validation |

### apps/web/src/server/discovery/__tests__/ocr.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| extractScreenTime > calls Haiku with correct image and tool | 3 | Mock Anthropic | Call shape verification |
| extractScreenTime > returns { data } with parsed tool input | 3 | Mock Anthropic | Happy path |
| extractScreenTime > returns { error } when no tool_use in response | 3 | Mock Anthropic | Error path |
| extractScreenTime > returns { error } when API throws | 3 | Mock Anthropic | Error wrapping |
| extractFromScreenshot > calls Haiku with sourceType tool name | 3 | Mock Anthropic | Call shape |
| extractFromScreenshot > returns { data } with tool input on success | 3 | Mock Anthropic | Happy path |
| extractFromScreenshot > returns { error } when no tool_use block | 3 | Mock Anthropic | Error path |
| extractFromScreenshot > returns { error } when API throws | 3 | Mock Anthropic | Error wrapping |

### apps/web/src/server/discovery/__tests__/adaptive.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| generateAdaptiveQuestions > calls Haiku with adaptive tool | 3 | Mock Anthropic | Call shape verification |
| generateAdaptiveQuestions > returns parsed questions from tool response | 3 | Mock Anthropic | Happy path |
| generateAdaptiveQuestions > returns empty array when no tool_use block | 3 | Mock Anthropic | Graceful degradation |
| generateAdaptiveQuestions > returns empty array on Zod failure | 3 | Mock Anthropic | Graceful degradation |
| generateAdaptiveQuestions > truncates app list to 20 apps | 3 | Mock Anthropic | Truncation in prompt |
| generateAdaptiveQuestions > includes occupation in prompt | 3 | Mock Anthropic | Prompt content |
| generateAdaptiveQuestions > handles missing occupation | 3 | Mock Anthropic | Null handling |
| generateAdaptiveQuestions > passes all app names to prompt | 3 | Mock Anthropic | Prompt completeness |

### apps/web/src/server/build/__tests__/first-build-email-toctou.test.ts (2 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| does not send email when UPDATE rowCount is 0 (concurrent call already sent) | 3 | Mock DB | TOCTOU logic verified via mock rowCount |
| sends email when UPDATE rowCount is 1 (first caller wins) | 3 | Mock DB | TOCTOU logic via mock |

### apps/web/src/server/deploy/__tests__/guarded-deploy-call.test.ts (2 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| does not waste rate-limit slot when hourly cap is already at limit | 3 | Mock | Rate-limit logic through mock |
| does not waste rate-limit slot when daily cap is already at limit | 3 | Mock | Rate-limit logic |

### apps/web/src/server/deploy/__tests__/sleep-listener-leak.test.ts (2 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| removes abort listener after timer fires normally | 4 | None | Real AbortController lifecycle |
| cleans up timer when signal aborts | 4 | None | Real cleanup logic |

### apps/web/src/server/deploy/__tests__/vercel-deploy.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns not_configured when MELDAR_DEPLOY_TOKEN is missing | 3 | Mock fetch | Config guard |
| runs the full 6-step sequence on the happy path | 3 | Mock fetch | Full deploy flow through mocked Vercel API |
| handles a 409 on project create by looking up existing | 3 | Mock fetch | Idempotent create |
| maps ERROR readyState to deployment_build_failed | 3 | Mock fetch | Status mapping |
| maps upload failure to upload_failed with the path | 3 | Mock fetch | Error mapping |
| accepts 409 on addDomain as idempotent success | 3 | Mock fetch | Idempotency |

### apps/web/src/server/domains/__tests__/slug.test.ts (13 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| lowercases and replaces spaces with hyphens | 4 | None | Real slug logic |
| strips possessive apostrophes and special chars | 4 | None | Real slug logic |
| collapses multiple spaces and hyphens | 4 | None | Real slug logic |
| removes leading and trailing hyphens | 4 | None | Real slug logic |
| strips accented characters via NFD normalization | 4 | None | Real unicode handling |
| handles emoji and non-latin characters | 4 | None | Real unicode |
| returns "project" for empty or whitespace-only input | 4 | None | Fallback |
| preserves numbers | 4 | None | Real slug logic |
| handles already-slugified input | 4 | None | Idempotency |
| truncates to max length | 4 | None | Real truncation |
| does not end on a hyphen after truncation | 4 | None | Clean truncation |
| handles reserved slugs | 4 | None | Reserved word detection |
| handles mixed input | 4 | None | Integration |

### apps/web/src/server/domains/__tests__/provision-subdomain.test.ts (5 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| generates a subdomain from the project name and inserts it | 3 | Mock DB | Verifies insert payload via mock recorder |
| appends collision suffix when slug already exists | 3 | Mock DB | Collision logic through mock |
| retries up to 5 times on repeated collisions | 3 | Mock DB | Retry logic through mock |
| handles names that normalize to "project" | 3 | Mock DB | Edge case through mock |
| succeeds on the third attempt after two collisions | 3 | Mock DB | Retry recovery through mock |

### apps/web/src/server/agents/__tests__/agent-task-service.test.ts (23 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| proposeTask > inserts into agentTasks and agentEvents | 2 | Mock DB | Mock wiring only -- verifies insert was called |
| proposeTask > returns the created task | 2 | Mock DB | Verifies mock return value |
| approveTask > transitions proposed to approved | 2 | Mock DB | State transition via mock |
| approveTask > throws TaskNotFoundError when task does not exist | 3 | Mock DB | Error type verification |
| approveTask > throws InvalidTaskTransitionError when task is not proposed | 3 | Mock DB | State guard verification |
| rejectTask > transitions proposed to rejected | 2 | Mock DB | State transition via mock |
| rejectTask > throws TaskNotFoundError when task does not exist | 3 | Mock DB | Error type |
| rejectTask > throws InvalidTaskTransitionError when task is not proposed | 3 | Mock DB | State guard |
| executeTask > transitions approved to executing | 2 | Mock DB | State transition via mock |
| executeTask > throws InvalidTaskTransitionError when not approved | 3 | Mock DB | State guard |
| completeTask > transitions verifying to done | 2 | Mock DB | State transition via mock |
| completeTask > throws InvalidTaskTransitionError when not verifying | 3 | Mock DB | State guard |
| escalateTask > transitions failed to escalated | 2 | Mock DB | State transition via mock |
| escalateTask > throws InvalidTaskTransitionError when not failed | 3 | Mock DB | State guard |
| getPendingTasks > returns tasks with proposed status | 2 | Mock DB | Returns canned mock data |
| getPendingTasks > returns empty array when no pending tasks | 2 | Mock DB | Returns canned empty |
| getTaskHistory > returns tasks ordered by proposedAt descending | 2 | Mock DB | Returns canned mock data |
| getTaskHistory > returns empty array when no tasks exist | 2 | Mock DB | Returns canned empty |
| failTask > transitions executing to failed | 2 | Mock DB | State transition via mock |
| failTask > transitions verifying to failed | 2 | Mock DB | State transition via mock |
| failTask > throws InvalidTaskTransitionError when task is proposed | 3 | Mock DB | State guard |
| reapStuckExecutingTasks > returns count of reaped tasks | 2 | Mock DB | Returns canned number |
| reapStuckExecutingTasks > returns 0 when no tasks are stuck | 2 | Mock DB | Returns canned 0 |

### apps/web/src/server/projects/__tests__/list-user-projects.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns projects for a user | 2 | Mock DB | Canned return |
| returns empty array when user has no projects | 2 | Mock DB | Canned empty |
| scopes query to user via eq filter | 2 | Mock DB | Verifies mock call args |
| orders by createdAt descending | 2 | Mock DB | Verifies mock call |
| limits to 50 projects | 2 | Mock DB | Verifies mock call |
| returns projects with expected shape | 2 | Mock DB | Shape check on canned data |
| passes through DB errors | 3 | Mock DB | Error propagation |
| handles null currentBuildId | 2 | Mock DB | Canned data shape |

### apps/web/src/server/build-orchestration/__tests__/build-pipeline-integration.test.ts (41 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| commits multiple realistic files and makes them readable from storage | 4 | InMemory | Full pipeline with real InMemoryProjectStorage |
| file_written events carry correct contentHash and sizeBytes | 4 | InMemory | Real hash computation |
| preserves untouched files, updates modified, adds new | 4 | InMemory | Multi-build state |
| second build references the first build as parentBuildId | 4 | InMemory | Build lineage |
| Anthropic receives the current project files in the prompt | 3 | InMemory + Mock Anthropic | Verifies prompt content |
| path traversal with .. rejected | 4 | InMemory | Real SandboxUnsafePathError |
| nested path traversal rejected | 4 | InMemory | Real path safety |
| write to node_modules rejected | 4 | InMemory | Reserved path |
| write to .env rejected | 4 | InMemory | Reserved path |
| write to .env.local rejected | 4 | InMemory | Reserved path |
| write to .env.production rejected | 4 | InMemory | Reserved path |
| write to .git directory rejected | 4 | InMemory | Reserved path |
| write to .next build output rejected | 4 | InMemory | Reserved path |
| write to .vercel config rejected | 4 | InMemory | Reserved path |
| absolute path rejected | 4 | InMemory | Path safety |
| redundant dot segment rejected | 4 | InMemory | Path safety |
| write to dist directory rejected | 4 | InMemory | Reserved path |
| write to .turbo directory rejected | 4 | InMemory | Reserved path |
| backslash (Windows-style) rejected | 4 | InMemory | Cross-platform safety |
| null byte injection rejected | 4 | InMemory | Security |
| empty path rejected | 4 | InMemory | Validation |
| control characters rejected | 4 | InMemory | Security |
| accepts valid safe paths | 4 | InMemory | Happy path allowlist |
| SSE encode/stream/decode preserves every field | 3 | None | SSE serialization round-trip |
| SSE event order is started -> prompt_sent -> file_written* -> committed | 3 | InMemory + Mock Anthropic | Event sequence |
| committed event carries tokenCost, actualCents, fileCount, and cache fields | 3 | InMemory + Mock Anthropic | Event payload shape |
| file_written events have monotonically increasing fileIndex | 3 | InMemory + Mock Anthropic | Ordering |
| committed without sandbox_ready when sandbox is null | 3 | InMemory + Mock Anthropic | Config-conditional |
| sandbox failure post-commit does not prevent committed event | 3 | InMemory + Mock Anthropic | Failure isolation |
| ledger is not debited when Sonnet returns no tool_use blocks | 3 | InMemory + Mock Anthropic | Cost guard |
| ledger is not debited when Sonnet response is truncated | 3 | InMemory + Mock Anthropic | Cost guard |
| ledger is not debited when path safety rejects all files | 3 | InMemory + Mock Anthropic | Cost guard |
| ledger IS debited on a successful build | 3 | InMemory + Mock Anthropic | Cost accounting |
| pre-flight ceiling check prevents Sonnet call when budget is insufficient | 3 | InMemory + Mock Anthropic | Budget guard |
| first build on a project with only the genesis file works | 3 | InMemory + Mock Anthropic | Edge case |
| build on project with many existing files includes all in prompt | 3 | InMemory + Mock Anthropic | Prompt completeness |
| Zod rejects tool_use with missing content field | 3 | InMemory + Mock Anthropic | Validation |
| Zod rejects tool_use with numeric path | 3 | InMemory + Mock Anthropic | Validation |
| build with abort signal stops the pipeline | 3 | InMemory + Mock Anthropic | Cancellation |
| global spend guard blocks build when paused | 3 | InMemory + Mock Anthropic | Spend guard |
| global spend guard blocks build when ceiling exceeded | 3 | InMemory + Mock Anthropic | Spend guard |

### apps/web/src/server/build-orchestration/__tests__/build-journey.test.ts (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| full build journey: create project -> apply template -> build -> SSE events | 4 | InMemory | Full E2E journey through InMemoryProjectStorage |
| build with unsafe path traversal triggers failed event via SSE | 4 | InMemory | Security path |
| build with reserved path segment triggers failed event via SSE | 4 | InMemory | Security path |
| deploy gracefully skips when no sandbox provider is set | 3 | InMemory + Mock Anthropic | Config-conditional |

### apps/web/src/server/build-orchestration/__tests__/routes-tracked.test.ts (46 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 46: API route files are tracked by git) | 1 | None | Filesystem existence checks. Verifies route.ts files exist at expected paths. Zero backend logic tested. |

### apps/web/src/app/api/auth/__tests__/register.test.ts (19 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| registers successfully and returns JWT cookie | 3 | Mock DB | Route handler through mocked DB |
| stores hashed verifyToken in DB, sends raw token in email | 3 | Mock DB | Verifies token hash vs raw split |
| includes verifyTokenExpiresAt in insert payload | 3 | Mock DB | Payload shape check |
| sends verification email via Resend after registration | 2 | Mock DB + Mock Resend | Mock wiring |
| registration succeeds even if Resend throws | 3 | Mock DB + Mock Resend | Fault tolerance |
| rejects duplicate email with generic 400 | 3 | Mock DB | Error code mapping |
| rejects invalid email format with 400 | 3 | None (Zod) | Input validation |
| rejects password shorter than 8 characters with 400 | 3 | None (Zod) | Input validation |
| returns 400 with INVALID_JSON for malformed JSON body | 3 | None | Error handling |
| rejects missing fields with 400 | 3 | None (Zod) | Input validation |
| rejects all-lowercase password (Finding #14) | 3 | None (Zod) | Password complexity |
| rejects all-digit password (Finding #14) | 3 | None (Zod) | Password complexity |
| rejects all-uppercase password (Finding #14) | 3 | None (Zod) | Password complexity |
| accepts password with uppercase, lowercase and digit | 3 | None (Zod) | Password complexity |
| returns 500 on unexpected error | 3 | Mock DB | Error handling |
| duplicate-email path takes similar time to success path (Finding #20) | 4 | Mock DB | Timing-safe test (real timing measured) |
| sends welcome email after registration | 2 | Mock | Mock wiring |
| sends welcome email with null name when name not provided | 2 | Mock | Mock wiring |
| registration succeeds even if welcome email throws | 3 | Mock | Fault tolerance |

### apps/web/src/app/api/auth/__tests__/login.test.ts (10 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns JWT cookie on valid credentials | 3 | Mock DB | Route handler |
| returns 401 for wrong password | 3 | Mock DB | Auth rejection |
| returns 401 for non-existent email | 3 | Mock DB | Auth rejection |
| returns 400 for missing email | 3 | None (Zod) | Validation |
| returns 400 for missing password | 3 | None (Zod) | Validation |
| returns 400 for invalid email format | 3 | None (Zod) | Validation |
| returns 400 for malformed JSON | 3 | None | Error handling |
| returns 500 on unexpected error | 3 | Mock DB | Error handling |
| returns 429 when rate limited | 3 | Mock rate limiter | Rate limit |
| non-existent email takes similar time to wrong password (Finding #20) | 3 | Mock DB | Timing-safe but mocked so timing is artificial |

### apps/web/src/app/api/auth/__tests__/reset-password.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| resets password with valid token using atomic update | 3 | Mock DB | Verifies atomic UPDATE...RETURNING pattern |
| uses a single atomic UPDATE...RETURNING (no separate SELECT) | 2 | Mock DB | Verifies mock call count |
| hashes the incoming token before DB lookup | 3 | Mock DB | Verifies hash is used |
| returns 401 when token was already consumed | 3 | Mock DB | Atomic race guard |
| rejects expired token with 401 | 3 | Mock DB | Expiry check |
| clears reset token atomically on success | 2 | Mock DB | Verifies mock call payload |
| rejects short new password with 400 | 3 | None (Zod) | Validation |
| returns 400 with INVALID_JSON for malformed JSON | 3 | None | Error handling |
| rejects missing token with 400 | 3 | None (Zod) | Validation |
| rejects empty token with 400 | 3 | None (Zod) | Validation |
| rejects missing password with 400 | 3 | None (Zod) | Validation |
| rejects all-lowercase password | 3 | None (Zod) | Complexity |
| rejects all-digit password | 3 | None (Zod) | Complexity |
| accepts strong password | 3 | Mock DB | Happy path |
| returns 500 on unexpected error | 3 | Mock DB | Error handling |

### apps/web/src/app/api/auth/__tests__/forgot-password.test.ts (9 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns success and sends email for existing user | 3 | Mock DB + Mock Resend | Happy path through mocks |
| returns 200 even for non-existent email (no oracle) | 3 | Mock DB | Enumeration prevention |
| returns 200 when Resend email fails (no oracle) | 3 | Mock | Fault tolerance |
| returns 400 for missing email | 3 | None (Zod) | Validation |
| returns 400 for invalid email format | 3 | None (Zod) | Validation |
| returns 400 for malformed JSON | 3 | None | Error handling |
| returns 429 when rate limited | 3 | Mock | Rate limit |
| stores hashed reset token in DB | 3 | Mock DB | Verifies hash |
| sets resetTokenExpiresAt 1 hour in the future | 3 | Mock DB | Expiry calculation |

### apps/web/src/app/api/auth/__tests__/verify-email.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| hashes the incoming token before DB lookup | 3 | Mock DB | Verifies hash usage |
| redirects to workspace on valid token | 3 | Mock DB | Redirect behavior |
| redirects to sign-in with error on invalid token | 3 | Mock DB | Error redirect |
| redirects to sign-in when no token provided | 3 | None | Validation |
| does NOT issue cookie when requireAuth fails | 3 | Mock | Auth guard |
| issues refreshed cookie when requireAuth succeeds and userId matches | 3 | Mock | Cookie refresh |
| does NOT issue cookie when auth userId differs | 3 | Mock | Cross-user guard |

### apps/web/src/app/api/auth/__tests__/resend-verification.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when unauthenticated | 3 | Mock | Auth guard |
| returns 429 when rate limited | 3 | Mock | Rate limit |
| returns success no-op when already verified | 3 | Mock DB | Business logic |
| generates new token and sends email when not verified | 3 | Mock DB + Mock Resend | Happy path |
| returns 401 when user not found in DB | 3 | Mock DB | Guard |
| returns 500 on unexpected error | 3 | Mock DB | Error handling |

### apps/web/src/app/api/auth/__tests__/google-callback.test.ts (14 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 400 when code is missing | 3 | None | Validation |
| returns 400 when state is missing | 3 | None | Validation |
| exchanges code for tokens and creates new user | 3 | Mock DB + Mock Google | Happy path through mocks |
| logs in existing user by Google sub | 3 | Mock DB + Mock Google | Existing user path |
| logs in existing user by email fallback | 3 | Mock DB + Mock Google | Email fallback |
| sets emailVerified to true for Google users | 3 | Mock DB | Business rule |
| redirects to workspace after login | 3 | Mock | Redirect behavior |
| redirects to state URL when valid | 3 | Mock | Redirect behavior |
| rejects invalid redirect URLs | 3 | Mock | Security |
| returns 500 when Google token exchange fails | 3 | Mock | Error handling |
| returns 500 when Google userinfo fails | 3 | Mock | Error handling |
| returns 400 when Google email is missing | 3 | Mock | Validation |
| returns 429 when rate limited | 3 | Mock | Rate limit |
| links Google account to existing email user | 3 | Mock DB | Account linking |

### apps/web/src/app/api/auth/__tests__/me.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| GET returns { user: null } when unauthenticated | 3 | Mock | Auth state |
| GET returns user data when authenticated and user exists | 3 | Mock DB | Happy path |
| GET returns { user: null } and clears cookie when user not found | 3 | Mock DB | Cleanup |
| DELETE returns 401 when no valid auth cookie | 3 | Mock | Auth guard |
| DELETE clears cookie and returns success when authenticated | 3 | Mock | Happy path |
| DELETE increments tokenVersion in DB on logout | 2 | Mock DB | Verifies mock call |

### apps/web/src/app/api/billing/webhook/__tests__/route.test.ts (25 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| authorization > returns 401 when stripe-signature absent | 3 | Mock | Auth guard |
| authorization > returns 401 when STRIPE_WEBHOOK_SECRET not set | 3 | Mock | Config guard |
| signature verification > returns 401 when constructEvent throws | 3 | Mock Stripe | Signature verification |
| signature verification > proceeds when constructEvent returns valid event | 3 | Mock Stripe | Happy path |
| checkout.session.completed -- timeAudit > inserts into auditOrders | 2 | Mock DB | Mock wiring |
| checkout.session.completed -- timeAudit > sends purchase confirmation email | 2 | Mock Resend | Mock wiring |
| checkout.session.completed -- timeAudit > sends founder notification email | 2 | Mock Resend | Mock wiring |
| checkout.session.completed -- timeAudit > inserts buyer into subscribers | 2 | Mock DB | Mock wiring |
| checkout.session.completed -- timeAudit > returns { received: true } | 2 | Mock | Response shape |
| checkout.session.completed -- appBuild > inserts with product: "app_build" | 2 | Mock DB | Mock wiring |
| checkout.session.completed -- appBuild > sends both emails | 2 | Mock Resend | Mock wiring |
| checkout.session.completed -- appBuild > inserts into subscribers | 2 | Mock DB | Mock wiring |
| checkout.session.completed -- vipBuild > inserts with product: "app_build" | 2 | Mock DB | Mock wiring |
| checkout.session.completed -- vipBuild > sends both buyer + founder emails | 2 | Mock Resend | Mock wiring |
| checkout.session.completed -- builder > does NOT insert into auditOrders | 3 | Mock DB | Negative assertion on mock |
| checkout.session.completed -- builder > does NOT send emails | 3 | Mock Resend | Negative assertion |
| checkout.session.completed -- builder > inserts buyer into subscribers | 2 | Mock DB | Mock wiring |
| checkout.session.completed -- starter > does NOT insert into auditOrders | 3 | Mock DB | Negative assertion |
| checkout.session.completed -- starter > does NOT call resend | 3 | Mock Resend | Negative assertion |
| checkout.session.completed -- starter > DOES insert into subscribers | 2 | Mock DB | Mock wiring |
| checkout.session.completed -- starter > returns { received: true } | 2 | Mock | Shape |
| checkout.session.completed -- missing email > returns immediately without inserts | 3 | Mock DB | Guard |
| customer.subscription.created > does not throw, returns { received: true } | 2 | Mock | Smoke test |
| customer.subscription.deleted > does not throw, returns { received: true } | 2 | Mock | Smoke test |
| unhandled event types > returns { received: true } | 2 | Mock | Catch-all |

### apps/web/src/app/api/billing/checkout/__tests__/route.test.ts (21 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 21 tests covering auth guards, product validation, Stripe session creation, discount codes) | 2-3 | Mock DB + Mock Stripe | All interactions with Stripe and DB are mocked. Tests verify mock call arguments and response shapes. Average score: 3 for validation paths, 2 for mock wiring of Stripe session creation. |

### apps/web/src/app/api/cron/__tests__/purge-auth.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 for missing Authorization header | 3 | Mock DB | Auth guard |
| returns 401 for "Bearer wrong-secret" | 3 | Mock DB | Auth guard |
| returns 401 for "Basic CRON_SECRET" (wrong scheme) | 3 | Mock DB | Auth guard |
| returns 200 for correct "Bearer CRON_SECRET" | 3 | Mock DB | Happy path |
| does not expose CRON_SECRET value in response body | 3 | Mock DB | Information leak check |
| purge route uses verifyCronAuth from shared cron-auth module | 2 | None | Import verification |
| agent-tick route uses verifyCronAuth | 2 | None | Import verification |
| verifyCronAuth uses timingSafeEqual for comparison | 2 | None | Implementation detail check |

### apps/web/src/app/api/cron/agent-tick/__tests__/route.test.ts (11 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| authorization > returns 401 for missing Authorization header | 3 | Mock | Auth guard |
| authorization > returns 401 for wrong secret | 3 | Mock | Auth guard |
| authorization > returns 401 for wrong scheme | 3 | Mock | Auth guard |
| empty queue > returns processed: 0 when no approved tasks | 3 | Mock DB | No-op path |
| spend cap > skips when global spend ceiling exceeded | 3 | Mock | Spend guard |
| spend cap > records spend for each processed task | 2 | Mock | Mock wiring |
| task processing > processes a booking_confirmation task successfully | 3 | Mock DB + Mock Resend | Happy path through mocks |
| task processing > transitions task to failed when Resend errors | 3 | Mock | Error handling |
| task processing > handles executor throwing without crashing | 3 | Mock | Fault tolerance |
| task processing > marks unknown agent types as failed | 3 | Mock | Unknown type guard |
| status transitions > claims tasks via UPDATE...RETURNING | 2 | Mock DB | Verifies mock call pattern |

### apps/web/src/app/api/cron/email-touchpoints/__tests__/route.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 for missing Authorization header | 3 | Mock | Auth guard |
| returns 401 for wrong secret | 3 | Mock | Auth guard |
| returns 200 with correct secret and empty user set | 3 | Mock DB | No-op path |
| sends Day 1 nudge emails to qualifying users | 2 | Mock DB + Mock Resend | Mock wiring |
| sends Day 7 nudge emails to qualifying users | 2 | Mock DB + Mock Resend | Mock wiring |
| caps total emails at 50 per batch | 3 | Mock | Batch limit |
| continues processing when a single email fails | 3 | Mock | Fault tolerance |
| does not expose CRON_SECRET in response body | 3 | Mock | Information leak check |

### apps/web/src/app/api/cron/purge/__tests__/route.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| authorization > returns 401 when Authorization absent | 3 | Mock | Auth guard |
| authorization > returns 401 for wrong secret | 3 | Mock | Auth guard |
| authorization > returns 401 for wrong scheme | 3 | Mock | Auth guard |
| authorization > proceeds when correct | 3 | Mock DB | Happy path |
| happy path > executes DELETE for discovery_sessions > 30 days | 2 | Mock DB | Verifies mock SQL execution |
| happy path > executes DELETE for xray_results > 30 days | 2 | Mock DB | Verifies mock SQL execution |
| happy path > returns { purged: { sessions: N, xrays: M } } | 2 | Mock DB | Response shape from mock |
| happy path > returns { sessions: 0, xrays: 0 } when rowCount: null | 3 | Mock DB | Null handling |

### apps/web/src/app/api/discovery/upload/__tests__/route.test.ts (69 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| rate limiting > returns 429 | 3 | Mock | Rate limit |
| missing field validation (6 tests) | 3 | None (Zod) | Input validation |
| file validation -- image platforms (8 tests) | 3 | None | MIME/size validation |
| file validation -- ZIP platforms (4 tests) | 3 | None | MIME/extension validation |
| file validation -- JSON platform (3 tests) | 3 | None | MIME/extension validation |
| ocrText validation > returns 400 when exceeds 50k chars | 3 | None | Length validation |
| ocrText + file both provided (2 tests) | 3 | Mock | Precedence logic |
| ocrText on ZIP/JSON platforms (3 tests) | 3 | None | Platform guard |
| session lookup > returns 404 NOT_FOUND | 3 | Mock DB | Session guard |
| idempotency (2 tests) | 3 | Mock DB | Idempotency guard |
| screentime platform (6 tests) | 2-3 | Mock DB + Mock Anthropic | Mock wiring for upload pipeline |
| chatgpt platform (7 tests) | 3 | Mock DB + Mock parser | Error propagation |
| claude platform (3 tests) | 2 | Mock DB + Mock parser | Mock wiring |
| google platform (4 tests) | 2 | Mock DB + Mock parser | Mock wiring |
| subscriptions/battery/storage/calendar/health (4 tests) | 2 | Mock DB + Mock Anthropic | Mock wiring |
| adaptive platform (5 tests) | 3 | Mock DB | JSONB append and fallback logic |
| resolveAdaptiveSourceType (10 tests) | 3 | Mock | Mapping function via indirect test |

### apps/web/src/app/api/discovery/__tests__/upload-security.test.ts (17 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| Prompt injection > wraps ocrText in ocr-data tags | 3 | Mock Anthropic | Payload verification |
| Prompt injection > rejects ocrText > 50k chars | 3 | None | Length validation |
| Prompt injection > ocrText containing </ocr-data> does not escape | 3 | Mock Anthropic | Injection resistance |
| Zip bomb > ChatGPT returns 500 | 3 | Mock parser | Error propagation |
| Zip bomb > Google Takeout returns 422 | 3 | Mock parser | Error propagation |
| MIME type validation (7 tests) | 3 | None | MIME type enforcement |
| Session ID validation (2 tests) | 3 | None (Zod) | Input validation |
| Rate limiting IP extraction (3 tests) | 3 | Mock | IP extraction logic |

### apps/web/src/app/api/discovery/session/__tests__/route.test.ts (13 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| rate limiting > returns 429 | 3 | Mock | Rate limit |
| input validation (7 tests) | 3 | None (Zod) | Input validation |
| happy path > inserts session into DB | 2 | Mock DB | Mock wiring |
| happy path > returns { sessionId } -- a 16-char nanoid | 3 | Mock DB | Response shape |
| happy path > returns HTTP 200 | 2 | Mock DB | Status check |
| database errors > returns 500 INTERNAL_ERROR | 3 | Mock DB | Error handling |

### apps/web/src/app/api/discovery/analyze/__tests__/route.test.ts (13 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| rate limiting > returns 429 | 3 | Mock | Rate limit |
| input validation (2 tests) | 3 | None (Zod) | Input validation |
| session not found > returns 404 | 3 | Mock DB | Guard |
| analysis cache hit (2 tests) | 3 | Mock DB | Cache logic |
| full analysis path (6 tests) | 2-3 | Mock DB + Mock Anthropic | Mock wiring for full analysis pipeline |
| errors > returns 500 | 3 | Mock | Error handling |

### apps/web/src/app/api/discovery/adaptive/__tests__/route.test.ts (12 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 12 tests: auth, validation, session lookup, adaptive question generation, error handling) | 2-3 | Mock DB + Mock Anthropic | Standard route handler tests through mocked dependencies |

### apps/web/src/app/api/webhooks/resend/__tests__/route.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 15: signature verification, event type routing, subscriber status updates, bounce handling) | 2-3 | Mock DB + Mock crypto | Webhook handler through mocks. Signature verification logic is tested against mock HMAC. |

### apps/web/src/app/api/onboarding/__tests__/route.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 6: auth guard, validation, DB update, response shape) | 2-3 | Mock DB | Standard route handler tests |

### apps/web/src/app/api/workspace/projects/__tests__/route.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| POST auth guards (2 tests) | 3 | Mock | Auth |
| POST validation (4 tests) | 3 | None (Zod) | Validation |
| POST creates project with given name | 3 | Mock storage | Uses mocked ProjectStorage |
| POST uses default name when none provided | 3 | Mock storage | Default logic |
| POST seeds project with Next.js + Panda starter | 3 | Mock storage | Template seeding |
| GET auth guards (2 tests) | 3 | Mock | Auth |
| GET returns empty list | 2 | Mock DB | Canned return |
| GET returns list in DB order | 2 | Mock DB | Canned return |
| GET returns 500 when DB throws | 3 | Mock DB | Error handling |
| GET scopes query to authenticated user | 2 | Mock DB | Mock call verification |

### apps/web/src/app/api/workspace/projects/__tests__/serialize-error.test.ts (5 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 5: error serialization to safe JSON, no stack leak, circular ref handling) | 3 | None | Pure utility function tests |

### apps/web/src/app/api/workspace/tokens/__tests__/route.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when no auth cookie | 3 | Mock | Auth guard |
| returns 401 when auth cookie invalid | 3 | Mock | Auth guard |
| calls getTokenBalance with correct userId | 2 | Mock | Mock wiring |
| calls getTransactionHistory with correct userId and limit | 2 | Mock | Mock wiring |
| returns balance and transactions when authenticated | 2 | Mock | Response shape from mock |
| returns 500 when getTokenBalance throws | 3 | Mock | Error handling |
| returns 429 when rate limited | 3 | Mock | Rate limit |

### apps/web/src/app/api/workspace/tokens/claim-daily/__tests__/route.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 6: auth guard, daily claim logic, duplicate claim guard, response shape) | 2-3 | Mock DB + Mock Tokens | Standard mock-based route tests |

### apps/web/src/app/api/workspace/[projectId]/cards/__tests__/route.test.ts (27 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| GET auth guards (2 tests) | 3 | Mock | Auth |
| GET returns 404 when project not owned | 3 | Mock DB | Ownership guard |
| GET returns empty list | 2 | Mock DB | Canned return |
| GET returns cards ordered by parentId nulls first, then position | 2 | Mock DB | Canned return |
| POST auth guards (1 test) | 3 | Mock | Auth |
| POST returns 404 when project not exist | 3 | Mock DB | Guard |
| POST validation (3 tests) | 3 | None (Zod) | Validation |
| POST creates a card with defaults | 2 | Mock DB | Mock wiring |
| POST creates a subtask under a parent | 2 | Mock DB | Mock wiring |
| POST auto-increments position | 2 | Mock DB | Mock wiring |
| PATCH auth guard | 3 | Mock | Auth |
| PATCH returns 404 when project not exist | 3 | Mock DB | Guard |
| PATCH returns 400 on invalid data | 3 | None (Zod) | Validation |
| PATCH updates a card | 2 | Mock DB | Mock wiring |
| PATCH returns 404 when card not exist | 3 | Mock DB | Guard |
| DELETE auth guard | 3 | Mock | Auth |
| DELETE returns 404 when card not exist | 3 | Mock DB | Guard |
| DELETE deletes a card | 2 | Mock DB | Mock wiring |
| DELETE cascade deletes subtasks via FK | 2 | Mock DB | Comment says DB-level but actually mock -- no real FK cascade tested |
| PATCH reorder auth guard | 3 | Mock | Auth |
| PATCH reorder returns 404 when project not exist | 3 | Mock DB | Guard |
| PATCH reorder returns 400 on invalid body | 3 | None (Zod) | Validation |
| PATCH reorder updates positions | 2 | Mock DB | Mock wiring |
| PATCH reorder returns 400 when cardIds contains non-UUID | 3 | None (Zod) | Validation |

### apps/web/src/app/api/workspace/[projectId]/settings/__tests__/route.test.ts (17 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| GET auth guards (2 tests) | 3 | Mock | Auth |
| GET returns 404 when project not owned | 3 | Mock DB | Guard |
| GET returns current wishes | 2 | Mock DB | Canned return |
| GET returns empty object when wishes null | 3 | Mock DB | Null handling |
| GET returns 500 when db throws | 3 | Mock DB | Error handling |
| PUT auth guards (2 tests) | 3 | Mock | Auth |
| PUT returns 404 when project not owned | 3 | Mock DB | Guard |
| PUT returns 400 on invalid JSON | 3 | None | Error handling |
| PUT returns 400 when body has unknown keys only | 3 | None (Zod) | Validation |
| PUT updates businessName | 2 | Mock DB | Mock wiring |
| PUT updates services | 2 | Mock DB | Mock wiring |
| PUT updates hours | 2 | Mock DB | Mock wiring |
| PUT merges with existing wishes (does not clobber) | 3 | Mock DB | Merge logic verification |
| PUT returns 400 when projectId not UUID | 3 | None (Zod) | Validation |
| PUT returns 500 when db update throws | 3 | Mock DB | Error handling |

### apps/web/src/app/api/workspace/[projectId]/bookings/__tests__/route.test.ts (16 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| POST creates booking without auth (public) | 3 | Mock DB | Public endpoint |
| POST includes business name from wishes | 2 | Mock DB | Mock wiring |
| POST falls back to project name | 3 | Mock DB | Fallback logic |
| POST accepts optional note field | 2 | Mock DB | Mock wiring |
| POST returns 400 when required fields missing | 3 | None (Zod) | Validation |
| POST returns 400 when email invalid | 3 | None (Zod) | Validation |
| POST returns 400 on invalid JSON | 3 | None | Error handling |
| POST returns 400 when projectId not UUID | 3 | None (Zod) | Validation |
| POST returns 500 when proposeTask throws | 3 | Mock | Error handling |
| POST rate limiting > returns 429 | 3 | Mock | Rate limit |
| GET auth guards (2 tests) | 3 | Mock | Auth |
| GET returns 404 when project not owned | 3 | Mock DB | Guard |
| GET returns recent bookings | 2 | Mock DB | Canned return |
| GET returns empty list | 2 | Mock DB | Canned return |
| GET returns 500 when getTaskHistory throws | 3 | Mock | Error handling |

### apps/web/src/app/api/workspace/[projectId]/build/__tests__/route.test.ts (15 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 15: auth guards, validation, build trigger, SSE streaming, token balance check, error handling) | 2-3 | Mock DB + Mock Orchestrator + Mock Tokens | Route handler through mocked orchestrator and storage |

### apps/web/src/app/api/workspace/[projectId]/apply-template/__tests__/route.test.ts (10 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 10: auth guards, template ID validation, file seeding, error handling) | 2-3 | Mock storage | Standard route handler tests |

### apps/web/src/app/api/workspace/[projectId]/generate-plan/__tests__/route.test.ts (10 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| auth guards (2 tests) | 3 | Mock | Auth |
| returns 400 when projectId not UUID | 3 | None (Zod) | Validation |
| returns 400 when messages empty | 3 | None (Zod) | Validation |
| returns 400 on invalid JSON | 3 | None | Error handling |
| calls Haiku with plan generation system prompt | 3 | Mock Anthropic | Prompt verification |
| validates Haiku output with Zod and inserts cards | 3 | Mock DB + Mock Anthropic | Output validation |
| retries once when Haiku output fails validation | 3 | Mock Anthropic | Retry logic |
| returns 500 when both attempts fail validation | 3 | Mock Anthropic | Retry exhaustion |
| returns 404 when project does not exist | 3 | Mock DB | Guard |

### apps/web/src/app/api/workspace/[projectId]/generate-proposal/__tests__/route.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 6: auth, validation, Haiku call, Zod validation of output, error handling) | 2-3 | Mock DB + Mock Anthropic | Standard AI route handler tests |

### apps/web/src/app/api/workspace/[projectId]/improve-prompt/__tests__/route.test.ts (9 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| returns 401 when no auth cookie | 3 | Mock | Auth guard |
| returns 429 when rate limited | 3 | Mock | Rate limit |
| calls Haiku with defensive system prompt | 3 | Mock Anthropic | Prompt verification |
| validates Haiku output with Zod | 3 | Mock Anthropic | Output validation |
| returns 500 when Haiku output fails Zod | 3 | Mock Anthropic | Error handling |
| truncates oversized improved text | 3 | Mock Anthropic | Truncation logic |
| returns 400 when description exceeds 500 chars | 3 | None (Zod) | Validation |
| includes acceptance criteria in user message | 3 | Mock Anthropic | Prompt content |
| returns 404 when project does not exist | 3 | Mock DB | Guard |

### apps/web/src/app/api/workspace/[projectId]/ask-question/__tests__/route.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 6: auth, validation, Haiku call, response shape, error handling) | 2-3 | Mock DB + Mock Anthropic | Standard AI route handler tests |

### apps/web/src/app/api/workspace/[projectId]/wishes/__tests__/route.test.ts (5 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 5: auth guard, returns wishes, updates wishes, error handling) | 2-3 | Mock DB | Standard route handler tests |

### apps/web/src/app/api/workspace/[projectId]/agent/tasks/__tests__/route.test.ts (18 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| GET auth guards (2 tests) | 3 | Mock | Auth |
| GET returns 404 when project not owned | 3 | Mock DB | Guard |
| GET returns pending tasks | 2 | Mock DB | Canned return |
| GET returns empty list | 2 | Mock DB | Canned return |
| GET returns 500 when getPendingTasks throws | 3 | Mock | Error handling |
| POST auth guards (2 tests) | 3 | Mock | Auth |
| POST returns 404 when project not owned | 3 | Mock DB | Guard |
| POST returns 400 on invalid JSON | 3 | None | Error handling |
| POST returns 400 when action missing | 3 | None (Zod) | Validation |
| POST returns 400 when action invalid | 3 | None (Zod) | Validation |
| POST returns 400 when taskId not UUID | 3 | None (Zod) | Validation |
| POST approves a task | 2 | Mock DB | Mock wiring |
| POST rejects a task | 2 | Mock DB | Mock wiring |
| POST returns 404 when task not exist | 3 | Mock | Guard |
| POST returns 409 when transition invalid | 3 | Mock | State guard |
| POST returns 500 on unexpected errors | 3 | Mock | Error handling |

### apps/web/src/app/api/workspace/[projectId]/agent/events/__tests__/route.test.ts (12 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| JSON auth guards (2 tests) | 3 | Mock | Auth |
| JSON returns 404 when not owned | 3 | Mock DB | Guard |
| JSON returns events ordered by createdAt DESC | 2 | Mock DB | Canned return |
| JSON returns empty list | 2 | Mock DB | Canned return |
| JSON returns 500 when query throws | 3 | Mock DB | Error handling |
| SSE returns 401 when no auth cookie | 3 | Mock | Auth guard |
| SSE returns 404 when not owned | 3 | Mock DB | Guard |
| SSE returns correct content type | 3 | Mock | Header check |
| SSE streams events as data lines | 2 | Mock DB | SSE format through mock |
| SSE returns empty stream | 2 | Mock DB | No-op |
| SSE returns 500 when query throws | 3 | Mock DB | Error handling |

### apps/web/src/features/auth/__tests__/sign-out.test.ts (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| calls DELETE /api/auth/me | 3 | Mock fetch | Client-side fetch verification |
| returns ok on 200 response | 3 | Mock fetch | Response mapping |
| returns failure message when non-2xx | 3 | Mock fetch | Error mapping |
| returns network error message when fetch throws | 3 | Mock fetch | Error handling |

### apps/web/src/app/(authed)/sign-up/__tests__/sign-up-submit.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| rejects invalid email shape before network call | 3 | None (Zod) | Client-side validation |
| rejects short password before network call | 3 | None (Zod) | Client-side validation |
| returns ok with userId on successful response | 3 | Mock fetch | Happy path |
| surfaces server error on 409 | 3 | Mock fetch | Error surfacing |
| surfaces rate limit on 429 | 3 | Mock fetch | Rate limit |
| handles network errors gracefully | 3 | Mock fetch | Error handling |
| rejects malformed success response | 3 | Mock fetch | Response validation |
| strips unknown fields from request body | 3 | None (Zod) | Sanitization |

### apps/web/src/app/(authed)/sign-in/__tests__/sign-in-submit.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 7: client-side validation, fetch mocking, error surfacing) | 3 | Mock fetch | Client-side form submission tests |

### apps/web/src/app/(authed)/workspace/__tests__/page.test.tsx (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 4: page component rendering, redirect logic) | 2 | Mock | UI component tests, not backend |

### apps/web/src/features/visual-feedback/__tests__/FeedbackBar.test.tsx (5 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 5: renders textarea, disabled state, clarification chips, Stitch suggestion, aria-label) | 1 | None | Pure UI component tests, no backend relevance |

### apps/web/src/features/share-flow/__tests__/SharePanel.test.tsx (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 7: renders URL, clipboard copy, WhatsApp link, aria-labels, Instagram tooltip) | 1 | None | Pure UI component tests |

### apps/web/src/features/kanban/__tests__/derive-milestone-state.test.ts (10 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 10: state derivation from subtask statuses) | 3 | None | Pure logic, but the function itself has no DB interaction |

### apps/web/src/features/kanban/__tests__/group-cards.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 6: grouping cards by milestone, ordering, orphan handling) | 3 | None | Pure data transformation logic |

### apps/web/src/features/kanban/__tests__/parse-prompt-anatomy.test.ts (10 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 10: prompt text parsing, edge cases, format detection) | 3 | None | Pure text parsing logic |

### apps/web/src/features/kanban/__tests__/topological-sort.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 8: topo sort, cycle detection, diamond deps, orphan handling) | 4 | None | Real algorithm test with real data structures |

### apps/web/src/features/project-onboarding/__tests__/schemas.test.ts (11 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 11: Zod schema validation for onboarding steps) | 3 | None | Pure schema validation tests |

### apps/web/src/features/teaching-hints/__tests__/hints.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 6: hint visibility, dismissal, progression logic) | 2 | None | UI state logic, no backend |

### apps/web/src/features/token-economy/ui/__tests__/TokenBalancePill.test.ts (3 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 3: display formatting, threshold colors) | 1 | None | Pure UI formatting |

### apps/web/src/features/workspace/__tests__/context.test.ts (17 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 17: React context state management, build status, card state) | 2 | None | Client-side state management, not backend |

### apps/web/src/entities/booking-verticals/__tests__/data.test.ts (9 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 9: vertical data shape, required fields, unique IDs) | 1 | None | Static data shape assertions |

### apps/web/src/entities/project-step/__tests__/derive-step.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 6: step derivation from project state) | 3 | None | Pure logic |

### apps/web/src/shared/lib/__tests__/sanitize-next-param.test.ts (28 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 28: URL sanitization, XSS prevention, protocol stripping, redirect safety) | 4 | None | Real security-critical sanitization logic |

### apps/web/src/shared/lib/__tests__/format-relative.test.ts (6 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 6: relative time formatting) | 3 | None | Pure formatting |

### apps/web/src/widgets/workspace/__tests__/PreviewPane.test.ts (8 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 8: iframe URL construction, refresh logic, loading states) | 2 | None | UI widget tests |

### apps/web/src/widgets/workspace/__tests__/StepIndicator.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 7: step indicator rendering, active state, completion) | 1 | None | Pure UI tests |

### apps/web/src/widgets/workspace/__tests__/build-status.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| (all 7: build status derivation, SSE event mapping) | 3 | None | Status derivation logic |

### apps/web/src/__tests__/integration/auth-flows.test.ts (5 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| creates user with hashed password and verifies it matches | 5 | Real Neon Postgres | Real insert + select round-trip, sha256 hash verified against DB |
| creates user with reset token and queries by hashed token | 5 | Real Neon Postgres | Real update + select by indexed column |
| increments tokenVersion and verifies old version does not match | 5 | Real Neon Postgres | Real update + select, integer increment verified |
| verifies project ownership returns the project for correct user | 5 | Real Neon Postgres | Real compound WHERE (project.id + userId), FK relationship |
| verifies different userId returns empty (ownership denied) | 5 | Real Neon Postgres | Real ownership denial via compound WHERE, two users created |

### apps/web/src/__tests__/integration/agent-flows.test.ts (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| transitions proposed -> approved -> executing -> verifying -> done | 5 | Real Neon Postgres | Full 5-state lifecycle via real UPDATE...RETURNING |
| inserts 3 proposed tasks and queries pending count | 5 | Real Neon Postgres | Real batch insert + filtered select count |
| inserts agent event and verifies shape | 5 | Real Neon Postgres | Real insert + select, JSONB payload, timestamp type |
| inserts task and event for same project and verifies both reference it | 5 | Real Neon Postgres | Real FK co-existence, JSONB cross-reference |

### apps/web/src/__tests__/integration/booking-flows.test.ts (3 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| inserts active subdomain and queries it back | 5 | Real Neon Postgres | Real insert + compound WHERE on projectDomains |
| inserts booking_confirmation task and queries by project and type | 5 | Real Neon Postgres | Real JSONB payload storage + agentType filter |
| throws on duplicate domain string | 5 | Real Neon Postgres | Real unique constraint enforcement (DB-level) |

### apps/web/src/__tests__/integration/auth-routes.test.ts (9 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| registers a new user and returns JWT cookie | 5 | Real Neon Postgres | Real insert + cookie round-trip against live DB |
| rejects duplicate email registration | 5 | Real Neon Postgres | Real unique constraint violation handling |
| logs in with correct credentials | 5 | Real Neon Postgres | Real password hash verify + JWT issue |
| rejects login with wrong password | 5 | Real Neon Postgres | Real bcrypt mismatch against stored hash |
| rejects login for non-existent email | 5 | Real Neon Postgres | Real empty result set handling |
| stores and retrieves email verification token | 5 | Real Neon Postgres | Real token hash insert + indexed lookup |
| resets password with valid token | 5 | Real Neon Postgres | Real atomic UPDATE...RETURNING for token consumption |
| rejects expired reset token | 5 | Real Neon Postgres | Real timestamp comparison in WHERE clause |
| logout increments tokenVersion | 5 | Real Neon Postgres | Real integer increment + re-select verification |

### apps/web/src/__tests__/integration/workspace-routes.test.ts (10 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| creates a project for authenticated user | 5 | Real Neon Postgres | Real insert with FK to users table |
| lists projects scoped to user | 5 | Real Neon Postgres | Real filtered SELECT with userId WHERE clause |
| returns empty list for user with no projects | 5 | Real Neon Postgres | Real empty result set on clean user |
| enforces project ownership on GET | 5 | Real Neon Postgres | Real compound WHERE (projectId + userId) returns nothing for wrong user |
| updates project settings (wishes) | 5 | Real Neon Postgres | Real JSONB merge update + re-read verification |
| creates and lists kanban cards | 5 | Real Neon Postgres | Real card insert + ordered SELECT by position |
| deletes a card and verifies removal | 5 | Real Neon Postgres | Real DELETE + subsequent SELECT returns empty |
| reorders cards by position | 5 | Real Neon Postgres | Real batch UPDATE of position column + ordered re-read |
| applies template and verifies seeded files | 5 | Real Neon Postgres | Real multi-row insert for template files + count verification |
| returns 404 for non-existent project | 5 | Real Neon Postgres | Real empty result set on UUID lookup |

### apps/web/src/__tests__/integration/agent-operations.test.ts (7 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| proposes a task and retrieves it from pending list | 5 | Real Neon Postgres | Real insert into agentTasks + filtered SELECT |
| approves a proposed task | 5 | Real Neon Postgres | Real UPDATE...RETURNING with status guard |
| rejects a proposed task | 5 | Real Neon Postgres | Real UPDATE...RETURNING setting status to rejected |
| fails an executing task with error payload | 5 | Real Neon Postgres | Real JSONB error payload stored + retrieved |
| completes full lifecycle: propose -> approve -> execute -> verify -> done | 5 | Real Neon Postgres | Real 5-step state machine via sequential UPDATEs |
| reaps stuck executing tasks older than cutoff | 5 | Real Neon Postgres | Real UPDATE with timestamp comparison in WHERE |
| returns task history ordered by proposedAt descending | 5 | Real Neon Postgres | Real ORDER BY DESC + multi-row verification |

### apps/web/src/__tests__/integration/billing-flows.test.ts (4 tests)

| Test | Score | DB Layer | Issue |
|------|-------|----------|-------|
| inserts audit order and retrieves by email | 5 | Real Neon Postgres | Real insert into auditOrders + indexed email lookup |
| inserts subscriber and queries by email | 5 | Real Neon Postgres | Real insert into subscribers + SELECT |
| updates subscriber status on duplicate email | 5 | Real Neon Postgres | Real ON CONFLICT upsert with status update |
| records transaction and verifies balance calculation | 5 | Real Neon Postgres | Real insert + aggregate SUM query for balance |
