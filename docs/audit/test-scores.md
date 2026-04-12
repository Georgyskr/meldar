# Test Validity Audit -- Complete Scorecard

## Summary
- Total: 1025
- Score 5 (real behavior, minimal mocks): 175 (17%)
- Score 4 (good logic through necessary mocks): 521 (51%)
- Score 3 (adequate but heavy mocks): 262 (26%)
- Score 2 (weak, mostly tests mock wiring): 56 (5%)
- Score 1 (tautological, passes regardless): 11 (1%)

## Scores by File

### src/__tests__/integration/critical-flows.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "creates user, creates project, verifies project loads with userId filter" | 5 | integration | Real DB CRUD with actual Drizzle queries, skipped without DB |
| 2 | "inserts agent task and queries by project + status" | 5 | integration | Full insert/query cycle against real Postgres |
| 3 | "inserts project domain and queries active domains" | 5 | integration | Real DB relational query, verifies domain state |

### src/__tests__/integration/schema.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "users: insert + select + delete" | 5 | integration | Full lifecycle against real DB, verifies defaults |
| 2 | "projects: insert + select + delete" | 5 | integration | Real DB lifecycle |
| 3 | "builds: insert + select + delete" | 5 | integration | Real DB lifecycle, verifies triggeredBy |
| 4 | "buildFiles: insert + select + delete" | 5 | integration | Real DB with FK constraints |
| 5 | "projectFiles: insert + select + delete" | 5 | integration | Real DB lifecycle |
| 6 | "kanbanCards: insert + select + delete" | 5 | integration | Real DB, verifies default state='draft' |
| 7 | "tokenTransactions: insert + select + delete" | 5 | integration | Real DB lifecycle |
| 8 | "aiCallLog: insert + select + delete" | 5 | integration | Real DB lifecycle |
| 9 | "deploymentLog: insert + select + delete" | 5 | integration | Real DB lifecycle |
| 10 | "agentEvents: insert + select + delete" | 5 | integration | Real DB with user/project FKs |
| 11 | "agentTasks: insert + select + delete" | 5 | integration | Real DB, verifies default status |
| 12 | "projectDomains: insert + select + delete" | 5 | integration | Real DB lifecycle |
| 13 | "xrayResults: insert + select + delete" | 5 | integration | Real DB with JSON column |
| 14 | "auditOrders: insert + select + delete" | 5 | integration | Real DB, verifies default currency |
| 15 | "subscribers: insert + select + delete" | 5 | integration | Real DB lifecycle |
| 16 | "discoverySessions: insert + select + delete" | 5 | integration | Real DB lifecycle |

### src/server/identity/__tests__/password.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "hashes a password and verifies it correctly" | 5 | unit | Tests real bcrypt with no mocks |
| 2 | "returns false for incorrect password" | 5 | unit | Real bcrypt verification |
| 3 | "generates different hashes for the same password (salt)" | 5 | unit | Verifies salt randomization |
| 4 | "handles empty string password" | 5 | unit | Edge case with real bcrypt |

### src/server/identity/__tests__/jwt.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns a valid JWT string" | 5 | unit | Real JWT sign with env-stubbed secret |
| 2 | "verifies and returns payload for a valid token" | 5 | unit | Real sign+verify roundtrip |
| 3 | "returns null for an invalid token" | 5 | unit | Real JWT rejection |
| 4 | "returns null for a tampered token" | 5 | unit | Real tamper detection |
| 5 | "returns null for an expired token" | 5 | unit | Real expiry check |
| 6 | "returns null for a token signed with a different secret" | 5 | unit | Real secret mismatch |
| 7 | "defaults emailVerified to false for legacy tokens" | 5 | unit | Backward compat with real JWT |
| 8 | "preserves emailVerified: true through roundtrip" | 5 | unit | Real roundtrip |
| 9 | "rejects tokens signed with a different algorithm (CWE-347)" | 5 | unit | Security: algorithm confusion attack |
| 10 | "returns payload for valid meldar-auth cookie" | 5 | unit | Real cookie parsing + JWT |
| 11 | "returns null when no cookie header present" | 5 | unit | Real edge case |
| 12 | "returns null when cookie header has no meldar-auth" | 5 | unit | Real cookie parsing |
| 13 | "returns null when meldar-auth cookie has tampered value" | 5 | unit | Real tamper |
| 14 | "extracts token from cookie with multiple cookies" | 5 | unit | Real multi-cookie parsing |
| 15 | "throws if AUTH_SECRET is not set" | 5 | unit | Real env validation |
| 16 | "throws if AUTH_SECRET is shorter than 32 characters" | 5 | unit | Real length check |
| 17 | "accepts AUTH_SECRET that is exactly 32 characters" | 5 | unit | Boundary test |

### src/server/identity/__tests__/token-hash.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns the correct SHA-256 hex digest for a known test vector" | 5 | unit | Pure function, known test vector |
| 2 | "returns a 64-character hex string" | 5 | unit | Format validation |
| 3 | "produces different hashes for different tokens" | 5 | unit | Collision resistance |
| 4 | "produces the same hash for the same token (deterministic)" | 5 | unit | Determinism check |

### src/server/identity/__tests__/auth-cookie.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "sets meldar-auth cookie with correct flags" | 5 | unit | Real NextResponse, verifies HttpOnly/SameSite/MaxAge |
| 2 | "sets Secure flag in production" | 5 | unit | Env-conditional security flag |
| 3 | "omits Secure flag in development" | 5 | unit | Env-conditional, correct for dev |

### src/server/identity/__tests__/require-auth.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns 401 when no cookie present" | 4 | unit | Tests auth logic through mocked verifyToken + DB |
| 2 | "returns 401 when cookie has invalid JWT" | 4 | unit | Tests rejection path |
| 3 | "returns 401 when JWT is expired" | 3 | unit | Same as invalid JWT test -- identical mock setup |
| 4 | "returns 401 when tokenVersion in JWT does not match DB" | 4 | unit | Tests critical version-mismatch security logic |
| 5 | "returns session object when token is valid and tokenVersion matches" | 4 | unit | Happy path through mocked layers |
| 6 | "returns 401 when user does not exist in DB (deleted account)" | 4 | unit | Tests deleted-user path |
| 7 | "propagates DB errors (fail-closed)" | 4 | unit | Verifies fail-closed security |

### src/server/lib/__tests__/cron-auth.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns false when CRON_SECRET is empty string" | 5 | unit | Real function with env stub |
| 2 | "returns false when CRON_SECRET is shorter than 16 characters" | 5 | unit | Length validation |
| 3 | "returns false when CRON_SECRET is undefined" | 5 | unit | Missing env |
| 4 | "returns false when authorization header is missing" | 5 | unit | Missing header |
| 5 | "returns false when authorization header does not match" | 5 | unit | Real constant-time comparison |
| 6 | "returns true when authorization header matches" | 5 | unit | Happy path |
| 7 | "pads buffers to equal length before comparison (no length oracle)" | 5 | unit | Timing-safe comparison |

### src/server/lib/__tests__/rate-limit-prefixes.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "verify-email uses a distinct prefix" | 3 | structural | Reads source file to verify unique prefixes; source-coupled |
| 2 | "verify-email route imports verifyEmailLimit" | 2 | structural | Checks source for import string; brittle |
| 3 | "forgot-password route imports forgotPasswordLimit" | 2 | structural | Same as above |
| 4 | "reset-password route imports resetPasswordLimit" | 2 | structural | Same as above |

### src/server/domains/__tests__/slug.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "lowercases and replaces spaces with hyphens" | 5 | unit | Pure function |
| 2 | "strips possessive apostrophes and special chars" | 5 | unit | Pure function |
| 3 | "collapses multiple spaces and hyphens" | 5 | unit | Pure function |
| 4 | "removes leading and trailing hyphens" | 5 | unit | Pure function |
| 5 | "strips accented characters via NFD normalization" | 5 | unit | Pure function |
| 6 | "handles emoji and non-latin characters" | 5 | unit | Pure function |
| 7 | "returns 'project' for empty or whitespace-only input" | 5 | unit | Edge case |
| 8 | "preserves numbers" | 5 | unit | Pure function |
| 9 | "handles already-slugified input" | 5 | unit | Idempotency |
| 10 | "appends .meldar.ai to the slug" | 5 | unit | Pure function |
| 11 | "works with single-word slugs" | 5 | unit | Pure function |
| 12 | "appends a hyphen and 4-character suffix" | 5 | unit | Random suffix format |
| 13 | "produces different suffixes on repeated calls" | 5 | unit | Randomness validation |

### src/server/domains/__tests__/provision-subdomain.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "generates a subdomain from the project name and inserts it" | 4 | unit | Tests slug generation + insert logic through mocked DB |
| 2 | "appends a collision suffix when slug already exists" | 4 | unit | Retry logic with mock-queued results |
| 3 | "retries up to 5 times on repeated collisions" | 4 | unit | Exhaustion path |
| 4 | "handles names that normalize to 'project'" | 4 | unit | Edge case through mocked DB |
| 5 | "succeeds on the third attempt after two collisions" | 4 | unit | Multi-retry happy path |

### src/server/discovery/parsers/__tests__/google-takeout.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "throws 'File too large' when file.size > 200 MB" | 5 | unit | Real JSZip with size override |
| 2 | "throws 'Archive too large when decompressed'" | 4 | unit | Real JSZip with spy on uncompressed size |
| 3 | "throws before any entry content is read" | 4 | unit | Early-exit verification |
| 4 | "extracts searches from ZIP paths matching patterns" | 5 | unit | Real JSZip, real parser logic |
| 5 | "strips the 'Searched for ' prefix" | 5 | unit | Real parser |
| 6 | "truncates each search query to 100 chars" | 5 | unit | Real parser |
| 7 | "caps _rawSearches at 500 entries" | 5 | unit | Real parser with 600 items |
| 8 | "skips items where title does not start with 'Searched for'" | 5 | unit | Filter logic |
| 9 | "reports malformed-JSON files as _skippedFileCount" | 5 | unit | Real error handling |
| 10 | "reports malformed items as _skippedItemCount" | 5 | unit | Real resilience |
| 11 | "extracts watches from ZIP paths matching YouTube patterns" | 5 | unit | Real parser |
| 12 | "strips the 'Watched ' prefix" | 5 | unit | Real parser |
| 13 | "truncates each watch title to 100 chars" | 5 | unit | Real parser |
| 14 | "caps _rawYoutubeWatches at 500 entries" | 5 | unit | Real parser |
| 15 | "returns searchTopics: [] and youtubeTopCategories: null" | 5 | unit | Shape verification |
| 16 | "returns emailVolume: null" | 5 | unit | Shape verification |
| 17 | "skips a null item in the search array" | 5 | unit | Zod boundary resilience |
| 18 | "skips an item whose title is not a string (number)" | 5 | unit | Zod boundary |
| 19 | "skips a primitive (string) item in the array" | 5 | unit | Zod boundary |
| 20 | "handles the same malformed-item resilience for YouTube" | 5 | unit | Zod boundary |
| 21 | "matches a non-English ZIP path" | 5 | unit | Locale tolerance |

### src/server/discovery/parsers/__tests__/chatgpt.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "counts total conversations correctly" | 5 | unit | Real JSZip + parser |
| 2 | "extracts user messages by traversing the mapping tree" | 5 | unit | Real parser logic |
| 3 | "truncates individual message text to 200 chars" | 5 | unit | Real parser |
| 4 | "caps _rawMessages at 500 entries" | 5 | unit | Real parser with 600 items |
| 5 | "returns platform: 'chatgpt'" | 5 | unit | Shape check |
| 6 | "returns empty topTopics and repeatedQuestions" | 5 | unit | Shape check |
| 7 | "computes timePatterns via extractTimePatterns" | 5 | unit | Real time pattern extraction |
| 8 | "throws 'Archive too large when decompressed'" | 4 | unit | Spy-based bomb test |
| 9 | "throws before any file content is extracted" | 4 | unit | Early-exit verification |
| 10 | "throws 'No conversations.json found'" | 5 | unit | Real error path |
| 11 | "throws 'invalid JSON'" | 5 | unit | Real error path |
| 12 | "throws 'Invalid ChatGPT conversations.json shape'" | 5 | unit | Zod validation |
| 13 | "throws when null in array" | 5 | unit | Zod validation |
| 14 | "throws when string in array" | 5 | unit | Zod validation |
| 15 | "throws when mapping is not an object" | 5 | unit | Zod validation |
| 16 | "skips conversation nodes with no mapping" | 5 | unit | Resilience |
| 17 | "tolerates mapping: null" | 5 | unit | Soft-delete resilience |
| 18 | "skips message nodes where author.role is not 'user'" | 5 | unit | Filter logic |

### src/server/discovery/parsers/__tests__/claude-export.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "parses conversations where messages are in chat_messages" | 5 | unit | Real parser, no mocks |
| 2 | "parses when messages are in .messages instead of .chat_messages" | 5 | unit | Format variant |
| 3 | "accepts sender === 'human' as user messages" | 5 | unit | Filter logic |
| 4 | "accepts role === 'user' as user messages" | 5 | unit | Filter logic |
| 5 | "skips messages with no text or content" | 5 | unit | Resilience |
| 6 | "truncates message text to 200 chars" | 5 | unit | Real parser |
| 7 | "converts created_at ISO string to Unix timestamp" | 5 | unit | Real conversion |
| 8 | "caps _rawMessages at 500 entries" | 5 | unit | Real parser |
| 9 | "returns platform: 'claude'" | 5 | unit | Shape check |
| 10 | "extracts conversations from root.conversations array" | 5 | unit | Object format variant |
| 11 | "throws 'invalid JSON' for non-JSON file content" | 5 | unit | Error path |
| 12 | "throws on a root that is a primitive (string)" | 5 | unit | Zod validation |
| 13 | "throws on a root that is a primitive (number)" | 5 | unit | Zod validation |
| 14 | "throws on a root that is null" | 5 | unit | Zod validation |
| 15 | "throws when .conversations is present but not an array" | 5 | unit | Zod validation |

### src/server/discovery/__tests__/preprocess-ocr.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "strips non-printable characters" | 5 | unit | Pure function |
| 2 | "collapses multiple blank lines" | 5 | unit | Pure function |
| 3 | "trims leading and trailing whitespace per line" | 5 | unit | Pure function |
| 4 | "returns empty cleanedText for blank input" | 5 | unit | Edge case |
| 5 | "handles null-like whitespace-only input" | 5 | unit | Edge case |
| 6 | "extracts total screen time in hours and minutes" | 5 | unit | Regex extraction |
| 7 | "extracts total screen time with only hours" | 5 | unit | Regex variant |
| 8 | "extracts total screen time with only minutes" | 5 | unit | Regex variant |
| 9 | "extracts daily average format" | 5 | unit | Regex extraction |
| 10 | "extracts pickups count" | 5 | unit | Regex extraction |
| 11 | "extracts notification count" | 5 | unit | Regex extraction |
| 12 | "extracts app entries with hours and minutes" | 5 | unit | Real regex + categorization |
| 13 | "extracts app entries with pickup counts" | 5 | unit | Regex extraction |
| 14 | "handles Cyrillic app names" | 5 | unit | Internationalization |
| 15 | "handles messy Tesseract output from real screenshot" | 5 | unit | Realistic OCR input |
| 16 | "includes a structured summary section" | 5 | unit | Output format |
| 17 | "includes app list in clean format" | 5 | unit | Output format |
| 18 | "preserves original text as fallback" | 5 | unit | Fallback behavior |
| 19 | "detects iOS from Screen Time keywords" | 5 | unit | Platform detection |
| 20 | "detects Android from Digital Wellbeing" | 5 | unit | Platform detection |
| 21 | "returns unknown when no platform indicators" | 5 | unit | Default case |
| 22 | "categorizes social apps correctly" | 5 | unit | Categorization |
| 23 | "categorizes communication apps correctly" | 5 | unit | Categorization |
| 24 | "falls back to utility for unknown apps" | 5 | unit | Default category |
| 25 | "cleans text for subscriptions without screen time regex" | 5 | unit | Platform branching |
| 26 | "cleans text for battery source" | 5 | unit | Platform branching |

### src/server/discovery/__tests__/extract-from-text.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns { error } for empty string" | 4 | unit | Tests validation, confirms no API call |
| 2 | "returns { error } for whitespace-only string" | 4 | unit | Same validation path |
| 3 | "returns { error } for string shorter than 10 chars" | 4 | unit | Length validation |
| 4 | "returns { error } for unknown sourceType" | 4 | unit | Type validation |
| 5 | "returns { error } for sourceType 'adaptive'" | 4 | unit | Boundary validation |
| 6-11 | "calls Haiku with correct tool name for [type]" (x6) | 3 | unit | Verifies mock was called with right tool name -- tests wiring |
| 12 | "wraps ocrText inside XML tags" | 4 | unit | Prompt injection protection |
| 13 | "system prompt contains anti-injection instruction" | 4 | unit | Security: prompt injection defense |
| 14 | "returns { data } with tool input on success" | 3 | unit | Tests mock returns through function |
| 15 | "returns { error } when no tool_use block" | 4 | unit | Error handling |
| 16 | "returns { error } when API throws" | 4 | unit | Error propagation |

### src/server/discovery/__tests__/extract-topics.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns empty arrays immediately when messages empty" | 4 | unit | Short-circuit, no API call |
| 2 | "truncates to first 300 messages" | 3 | unit | Tests truncation via mock assertion |
| 3 | "joins message texts with separator" | 3 | unit | Checks prompt formatting |
| 4 | "includes platform name in system prompt" | 3 | unit | Checks prompt content |
| 5 | "returns parsed topTopics and repeatedQuestions" | 3 | unit | Tests mock passthrough |
| 6 | "returns empty arrays when no tool_use block" | 4 | unit | Graceful fallback |
| 7 | "returns empty arrays when Zod validation fails" | 4 | unit | Zod validation boundary |
| 8 | "returns empty arrays immediately when both inputs empty" | 4 | unit | Short-circuit |
| 9 | "includes only search section when youtube empty" | 3 | unit | Prompt assembly |
| 10 | "includes only YouTube section when searches empty" | 3 | unit | Prompt assembly |
| 11 | "includes both sections when both provided" | 3 | unit | Prompt assembly |
| 12 | "truncates to 300 searches and 300 watches independently" | 3 | unit | Truncation via prompt check |
| 13 | "returns { searchTopics, youtubeTopCategories }" | 3 | unit | Mock passthrough |
| 14 | "returns empty arrays when no tool_use block" | 4 | unit | Graceful fallback |
| 15 | "returns empty arrays when Zod validation fails" | 4 | unit | Zod validation |

### src/server/discovery/__tests__/ocr.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns { data } matching schema for valid tool output" | 3 | unit | Tests mock passthrough |
| 2 | "passes focusMode=true appending FOCUS_MODE prompt" | 3 | unit | Prompt assembly |
| 3 | "passes focusMode=false with base prompt only" | 3 | unit | Prompt assembly |
| 4 | "sets tool_choice to extract_screen_time" | 3 | unit | Wiring check |
| 5 | "returns { error: 'not_screen_time' }" | 4 | unit | Error branching logic |
| 6 | "returns { error: 'unreadable' }" | 4 | unit | Error branching |
| 7 | "throws 'No tool use in response'" | 4 | unit | Error handling |
| 8 | "throws with Zod error when schema fails" | 4 | unit | Zod validation |

### src/server/discovery/__tests__/adaptive.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "calls Haiku with APP_TO_SCREENSHOT_MAP in system prompt" | 3 | unit | Prompt assembly check |
| 2 | "includes occupation and ageBracket in user message" | 3 | unit | Prompt content check |
| 3 | "returns [] when no tool_use block" | 4 | unit | Graceful fallback |
| 4 | "returns [] and logs warn when Zod fails" | 4 | unit | Zod validation |
| 5 | "caps result at 5 follow-ups" | 4 | unit | Business logic cap |
| 6 | "returns valid AdaptiveFollowUp[] with required fields" | 3 | unit | Shape check via mock |
| 7 | "returns accept field on screenshot-type items" | 3 | unit | Shape check via mock |
| 8 | "returns options array on question-type items" | 3 | unit | Shape check via mock |

### src/server/discovery/__tests__/analyze.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-13 | "buildDataContext -- includes/omits sections" (x13) | 4 | unit | Tests data context building through runCrossAnalysis, verifies prompt content for each data type |
| 14 | "calls Sonnet with ANALYSIS_TOOL and tool_choice" | 3 | unit | Wiring check |
| 15 | "returns DiscoveryAnalysis with all required fields" | 3 | unit | Mock passthrough |
| 16 | "merges BASE_LEARNING_MODULES with personalizedModules" | 4 | unit | Business logic: locked module merging |
| 17 | "throws 'no tool response from Claude'" | 4 | unit | Error handling |
| 18 | "throws with Zod message when schema fails" | 4 | unit | Zod validation |
| 19 | "throws when complexity is invalid" | 4 | unit | Enum validation |
| 20-21 | remaining error cases | 4 | unit | Error handling paths |

### src/server/deploy/__tests__/guarded-deploy-call.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "does not waste a rate-limit slot when hourly cap at limit" | 4 | unit | Tests check-before-increment logic through mock Redis |
| 2 | "does not waste a rate-limit slot when daily cap at limit" | 4 | unit | Same pattern |

### src/server/deploy/__tests__/sleep-listener-leak.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "removes abort listener after timer fires normally" | 5 | unit | Real event listener check, no mocks |
| 2 | "cleans up timer when signal aborts" | 5 | unit | Real AbortController behavior |

### src/server/deploy/__tests__/vercel-deploy.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns not_configured when MELDAR_DEPLOY_TOKEN is missing" | 5 | unit | Real function, env check |
| 2 | "runs the full 6-step sequence on the happy path" | 4 | unit | Tests real deploy flow through injected fetch mock |
| 3 | "handles a 409 on project create by looking up existing" | 4 | unit | Idempotency logic |
| 4 | "maps ERROR readyState to deployment_build_failed" | 4 | unit | Error mapping |
| 5 | "maps upload failure to upload_failed with the path" | 4 | unit | Error mapping with context |
| 6 | "accepts 409 on addDomain as idempotent success" | 4 | unit | Idempotency |

### src/server/build/__tests__/first-build-email-toctou.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "does not send email when UPDATE rowCount is 0" | 3 | unit | Tests TOCTOU fix through heavily mocked DB |
| 2 | "sends email when UPDATE rowCount is 1" | 3 | unit | Same; verifies the CAS-like logic |

### src/server/build-orchestration/__tests__/build-pipeline-integration.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "commits multiple realistic files and makes them readable" | 5 | integration | In-memory storage + real orchestrator, verifies full file lifecycle |
| 2 | "file_written events carry correct contentHash and sizeBytes" | 5 | integration | Verifies content-addressed storage |
| 3 | "preserves untouched files, updates modified, adds new" | 5 | integration | Multi-build file persistence |
| 4 | "second build references the first build as parentBuildId" | 5 | integration | Build chain integrity |
| 5 | "Anthropic receives current project files in prompt" | 5 | integration | Verifies context window assembly |
| 6-18 | "rejects: [dangerous path]" (x13) | 5 | integration | Path traversal/injection rejection through real orchestrator |
| 19 | "rejects path with backslash" | 5 | integration | Windows-style path rejection |
| 20 | "rejects path with null byte injection" | 5 | integration | Null byte rejection |
| 21 | "rejects empty path" | 5 | integration | Edge case |
| 22 | "rejects path with control characters" | 5 | integration | Security |
| 23 | "accepts valid safe paths" | 5 | integration | Happy path with multiple files |
| 24 | "encode -> stream -> decode preserves every field" | 5 | integration | SSE roundtrip fidelity |
| 25 | "event order is started -> prompt_sent -> file_written* -> committed" | 5 | integration | Event ordering |
| 26 | "committed event carries tokenCost, actualCents, fileCount, cache" | 5 | integration | Event payload completeness |
| 27 | "file_written events have monotonically increasing fileIndex" | 5 | integration | Index ordering |
| 28 | "emits committed without sandbox_ready when sandbox is null" | 5 | integration | Null sandbox handling |
| 29 | "sandbox failure post-commit does not prevent committed event" | 5 | integration | Failure isolation |
| 30 | "ledger is not debited when Sonnet returns no tool_use" | 5 | integration | Token economy correctness |
| 31 | "ledger is not debited when Sonnet response is truncated" | 5 | integration | max_tokens handling |
| 32+ | remaining ledger/safety tests | 5 | integration | Token economy + path safety |

### src/server/build-orchestration/__tests__/build-journey.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "full build journey: create project -> cards -> build -> SSE" | 5 | integration | End-to-end build with in-memory deps |
| 2 | "build with unsafe path traversal triggers failed event" | 5 | integration | Security through SSE stream |
| 3 | "build with node_modules triggers failed event" | 5 | integration | Reserved path rejection |
| 4 | "deploy gracefully skips when no sandbox provider" | 5 | integration | Null sandbox handling |

### src/server/build-orchestration/__tests__/routes-tracked.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "found route files on disk" | 5 | structural | Verifies routes exist |
| 2-46 | "[route] is tracked by git" (x45) | 5 | structural | Prevents .gitignore from eating route files; real git ls-files |

### src/server/projects/__tests__/list-user-projects.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-8 | All tests | 3 | unit | Tests list/filter logic through mocked DB chain; adequate but heavy mocks |

### src/server/agents/__tests__/agent-task-service.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-25 | All tests | 3 | unit | Tests agent task state machine through heavily mocked DB; adequate assertions on state transitions |

### src/app/api/auth/__tests__/register.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "registers successfully and returns JWT cookie" | 4 | route | Tests full registration flow through mocked DB/email |
| 2 | "stores hashed verifyToken in DB, sends raw token in email" | 4 | route | Security: token-hash separation |
| 3 | "includes verifyTokenExpiresAt in insert payload" | 4 | route | Expiry logic |
| 4 | "sends verification email via Resend" | 3 | route | Tests mock was called |
| 5 | "registration succeeds even if Resend throws" | 4 | route | Fault tolerance |
| 6 | "rejects duplicate email with generic 400" | 4 | route | Security: no email enumeration |
| 7 | "rejects invalid email format with 400" | 4 | route | Validation |
| 8 | "rejects password shorter than 8 chars" | 4 | route | Validation |
| 9 | "returns 400 with INVALID_JSON for malformed body" | 4 | route | Error handling |
| 10 | "rejects missing fields with 400" | 4 | route | Validation |
| 11 | "rejects all-lowercase password" | 4 | route | Password strength (Finding #14) |
| 12 | "rejects all-digit password" | 4 | route | Password strength |
| 13 | "rejects all-uppercase password" | 4 | route | Password strength |
| 14 | "accepts password with mixed case and digit" | 4 | route | Happy path |
| 15 | "returns 500 on unexpected error" | 4 | route | Error handling |
| 16 | "duplicate-email path takes similar time (Finding #20)" | 4 | route | Timing-attack mitigation |
| 17 | "sends welcome email after registration" | 3 | route | Mock call verification |
| 18 | "sends welcome email with null name" | 3 | route | Mock call verification |
| 19 | "registration succeeds even if welcome email throws" | 4 | route | Fault tolerance |

### src/app/api/auth/__tests__/login.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "logs in successfully with correct credentials" | 4 | route | Full login flow, verifies no passwordHash leak |
| 2 | "rejects wrong password with 401" | 4 | route | Error path |
| 3 | "rejects non-existent email with 401 (same message)" | 4 | route | Security: no email enumeration |
| 4 | "returns same error message for wrong pwd and no email" | 4 | route | Security: identical error messages |
| 5 | "rejects invalid input with 400" | 4 | route | Validation |
| 6 | "returns 500 on unexpected error" | 4 | route | Error handling |
| 7 | "returns 400 with INVALID_JSON" | 4 | route | Error handling |
| 8 | "calls verifyPassword even when user not found (timing)" | 4 | route | Security: timing-safe comparison |
| 9 | "calls setAuthCookie on successful login" | 3 | route | Mock call verification |
| 10 | "returns 429 when email-based rate limit exceeded" | 4 | route | Rate limiting |

### src/app/api/auth/__tests__/me.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns { user: null } when unauthenticated (not 401)" | 4 | route | Correct non-error unauthenticated behavior |
| 2 | "returns user data when authenticated" | 3 | route | Happy path through mocks |
| 3 | "returns { user: null } and clears cookie when user not found" | 4 | route | Stale-session cleanup |
| 4 | "returns 401 when no valid auth cookie (DELETE)" | 4 | route | Auth guard |
| 5 | "clears cookie and returns success (DELETE)" | 3 | route | Logout behavior |
| 6 | "increments tokenVersion in DB on logout" | 3 | route | Session invalidation wiring |

### src/app/api/auth/__tests__/forgot-password.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns success and sends email for existing user" | 4 | route | Happy path |
| 2 | "stores a SHA-256 hash in DB, not the raw token" | 4 | route | Security: token hashing |
| 3 | "returns success for non-existing email (prevents enumeration)" | 4 | route | Security: no enumeration |
| 4 | "sets reset token expiry to ~1 hour" | 4 | route | Expiry logic |
| 5 | "takes at least 500ms regardless of user existence" | 4 | route | Timing-attack mitigation |
| 6 | "returns 400 with INVALID_JSON" | 4 | route | Error handling |
| 7 | "rejects invalid email with 400" | 4 | route | Validation |
| 8 | "rejects missing email with 400" | 4 | route | Validation |
| 9 | "returns 500 on unexpected error" | 4 | route | Error handling |

### src/app/api/auth/__tests__/verify-email.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "hashes the incoming token before DB lookup" | 4 | route | Security: hashed token lookup |
| 2 | "redirects to workspace on valid token" | 4 | route | Happy path |
| 3 | "redirects to sign-in with error on invalid token" | 4 | route | Error path |
| 4 | "redirects to sign-in when no token provided" | 4 | route | Edge case |
| 5 | "does NOT issue cookie when requireAuth fails" | 4 | route | Revoked-session safety |
| 6 | "issues refreshed cookie when requireAuth succeeds and userId matches" | 4 | route | Cookie refresh logic |
| 7 | "does NOT issue cookie when auth userId differs" | 4 | route | Cross-user safety |

### src/app/api/auth/__tests__/reset-password.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "resets password with valid token using atomic update" | 4 | route | TOCTOU-safe atomic update |
| 2 | "uses a single atomic UPDATE...RETURNING" | 4 | route | No separate SELECT |
| 3 | "hashes the incoming token before DB lookup" | 4 | route | Security |
| 4 | "returns 401 when token already consumed" | 4 | route | Race condition protection |
| 5 | "rejects expired token with 401" | 4 | route | Expiry |
| 6 | "clears reset token atomically on success" | 4 | route | Token consumption |
| 7 | "rejects short new password with 400" | 4 | route | Validation |
| 8 | "returns 400 with INVALID_JSON" | 4 | route | Error handling |
| 9 | "rejects missing token with 400" | 4 | route | Validation |
| 10 | "rejects empty token with 400" | 4 | route | Validation |
| 11 | "rejects missing password with 400" | 4 | route | Validation |
| 12 | "rejects all-lowercase password" | 4 | route | Password strength |
| 13 | "rejects all-digit password" | 4 | route | Password strength |
| 14 | "accepts strong password" | 4 | route | Happy path |
| 15 | "returns 500 on unexpected error" | 4 | route | Error handling |

### src/app/api/auth/__tests__/resend-verification.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-6 | All tests | 4 | route | Tests resend-verification flow through mocked DB/email; includes token hashing, rate limiting, already-verified guard |

### src/app/api/auth/__tests__/google-callback.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "redirects to sign-in with error when no code" | 4 | route | Missing param handling |
| 2 | "redirects when error param is present" | 4 | route | OAuth error handling |
| 3 | "redirects when token exchange fails" | 4 | route | API failure |
| 4 | "redirects when userinfo request fails" | 4 | route | API failure |
| 5 | "redirects when Google account has no email" | 4 | route | Edge case |
| 6 | "creates new user, sets JWT cookie, redirects to workspace" | 4 | route | Full OAuth registration flow |
| 7 | "records signup bonus for new users" | 3 | route | Mock call verification |
| 8 | "logs in existing Google user without creating duplicate" | 4 | route | Existing-user path |
| 9 | "redirects email-registered user to sign-in" | 4 | route | No auto-merge security |
| 10 | "rejects when CSRF state param does not match cookie" | 4 | route | CSRF protection |
| 11 | "rejects when CSRF state cookie is missing" | 4 | route | CSRF protection |
| 12 | "rejects when Google email is not verified" | 4 | route | Unverified email guard |
| 13 | "marks existing unverified Google user as verified" | 3 | route | DB update wiring |
| 14 | "redirects with error when rate limited" | 4 | route | Rate limiting |

### src/app/api/discovery/upload/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns 429 when rate limit returns { success: false }" | 4 | route | Rate limiting |
| 2-7 | "returns 400 when [field] is absent/invalid" (x6) | 4 | route | Input validation |
| 8-15 | "file validation -- image platforms" (x8) | 4 | route | MIME type + size validation per platform |
| 16-19 | "file validation -- ZIP/JSON platforms" (x4) | 4 | route | Platform-specific file validation |
| 20 | "returns 400 when ocrText exceeds 50,000 chars" | 4 | route | Input size limit |
| 21-22 | "ocrText + file both provided" (x2) | 4 | route | Priority logic |
| 23-25 | "ocrText on ZIP/JSON platforms" (x3) | 4 | route | Platform-specific rejection |
| 26 | "returns 404 when session not found" | 4 | route | Lookup failure |
| 27-28 | "idempotency" (x2) | 4 | route | Duplicate upload handling |
| 29-36 | "screentime platform" (x8) | 4 | route | OCR vs Vision path routing |
| 37-43 | "chatgpt platform -- errors" (x7) | 4 | route | Parser error propagation |
| 44-46 | "claude platform" (x3) | 4 | route | Export parsing |
| 47-50 | "google platform" (x4) | 4 | route | Takeout parsing |
| 51-55 | "subscriptions/battery/storage/calendar/health" (x5) | 4 | route | Multi-platform extraction |
| 56-65 | "adaptive platform" (x10) | 4 | route | Adaptive upload + resolveAdaptiveSourceType |
| 66-69 | "resolveAdaptiveSourceType -- indirect" (x4+) | 4 | route | App-to-sourceType mapping |

### src/app/api/discovery/__tests__/upload-security.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-17 | All tests | 4 | route | Security-focused upload tests: MIME validation, size limits, ZIP bomb protection, path traversal in ZIPs |

### src/app/api/discovery/session/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-13 | All tests | 4 | route | Session creation: validation, rate limiting, DB insert, email normalization |

### src/app/api/discovery/adaptive/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-12 | All tests | 4 | route | Adaptive follow-up generation: session lookup, screen time data requirement, AI call, DB persistence |

### src/app/api/discovery/analyze/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-13 | All tests | 4 | route | Cross-analysis route: session lookup, minimum data requirement, AI call, DB persistence, analysis schema validation |

### src/app/api/onboarding/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-6 | All tests | 3 | route | Onboarding route with mocked auth and DB |

### src/app/api/billing/checkout/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-21 | All tests | 4 | route | Stripe checkout: validation, product mapping, session creation, error handling, rate limiting |

### src/app/api/billing/webhook/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-25 | All tests | 4 | route | Stripe webhook: signature verification, event handling, DB operations, idempotency (onConflictDoNothing) |

### src/app/api/webhooks/resend/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-15 | All tests | 4 | route | Resend webhook: signature verification, event type routing, task status updates, error handling |

### src/app/api/cron/__tests__/purge-auth.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-8 | All tests | 4 | route | Cron auth purge: CRON_SECRET verification, SQL execution, error handling |

### src/app/api/cron/agent-tick/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-11 | All tests | 3 | route | Agent tick cron: auth, task query, execution; heavy mock wiring |

### src/app/api/cron/email-touchpoints/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-8 | All tests | 3 | route | Email touchpoint cron: auth, user query, email sends; heavy mocks |

### src/app/api/cron/purge/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-8 | All tests | 4 | route | Data purge cron: auth, SQL execution, retention logic |

### src/app/api/workspace/projects/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-15 | All tests | 3 | route | Project CRUD: auth, creation, listing, template application; heavy mocks |

### src/app/api/workspace/projects/__tests__/serialize-error.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "omits stack in production" | 5 | unit | Real function, env-conditional |
| 2 | "includes stack in development" | 5 | unit | Real function |
| 3 | "handles non-Error values" | 5 | unit | Edge case |
| 4 | "recursively serializes cause" | 5 | unit | Recursive serialization |
| 5 | "truncates cause chain deeper than maxDepth" | 5 | unit | DoS protection |

### src/app/api/workspace/[projectId]/build/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-15 | All tests | 4 | route | Build SSE route: auth, ownership check, SSE stream encoding, validation |

### src/app/api/workspace/[projectId]/cards/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-27 | All tests | 3 | route | Kanban card CRUD: auth, ownership, position management, state transitions; heavy mock DB chain |

### src/app/api/workspace/[projectId]/settings/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-17 | All tests | 3 | route | Project settings: auth, ownership, field updates, name validation; heavy mocks |

### src/app/api/workspace/[projectId]/wishes/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-5 | All tests | 3 | route | Wishes CRUD; heavy mocks |

### src/app/api/workspace/[projectId]/bookings/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-16 | All tests | 3 | route | Booking management: auth, vertical lookup, CRUD; heavy mocks |

### src/app/api/workspace/[projectId]/generate-plan/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-10 | All tests | 3 | route | Plan generation: auth, message validation, AI call, kanban card creation; heavy mocks |

### src/app/api/workspace/[projectId]/generate-proposal/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-6 | All tests | 3 | route | Proposal generation: auth, AI call, response format; heavy mocks |

### src/app/api/workspace/[projectId]/improve-prompt/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-9 | All tests | 3 | route | Prompt improvement: auth, AI call, response format; heavy mocks |

### src/app/api/workspace/[projectId]/ask-question/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-6 | All tests | 3 | route | Question answering: auth, AI call; heavy mocks |

### src/app/api/workspace/[projectId]/apply-template/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-10 | All tests | 3 | route | Template application: auth, template lookup, card creation; heavy mocks |

### src/app/api/workspace/[projectId]/agent/events/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-12 | All tests | 3 | route | Agent event SSE: auth, event query, SSE encoding; heavy mocks |

### src/app/api/workspace/[projectId]/agent/tasks/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-18 | All tests | 3 | route | Agent task CRUD: auth, state machine, approval/rejection; heavy mocks |

### src/app/api/workspace/tokens/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-7 | All tests | 3 | route | Token balance + history: auth, DB query, response format; heavy mocks |

### src/app/api/workspace/tokens/claim-daily/__tests__/route.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-6 | All tests | 3 | route | Daily token claim: auth, idempotency, DB insert; heavy mocks |

### src/app/(authed)/sign-in/__tests__/sign-in-submit.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-7 | All tests | 3 | unit | Client-side submit action: mocked fetch, tests response handling |

### src/app/(authed)/sign-up/__tests__/sign-up-submit.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-8 | All tests | 3 | unit | Client-side submit action: mocked fetch, tests response handling |

### src/app/(authed)/workspace/__tests__/page.test.tsx
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-4 | All tests | 2 | unit | Tests page component exports/shape; minimal behavioral verification |

### src/features/auth/__tests__/sign-out.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "calls DELETE /api/auth/me" | 3 | unit | Mocked fetch, verifies method+URL |
| 2 | "clears meldar-auth cookie on success" | 3 | unit | Mocked fetch + document.cookie |
| 3 | "clears cookie even if response is not ok" | 3 | unit | Fault tolerance |
| 4 | "clears cookie even if fetch throws" | 3 | unit | Error resilience |

### src/features/kanban/__tests__/topological-sort.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns empty sorted array for empty input" | 5 | unit | Pure function |
| 2 | "preserves a single subtask" | 5 | unit | Pure function |
| 3 | "sorts subtasks with linear dependencies" | 5 | unit | Real topological sort |
| 4 | "handles diamond dependencies" | 5 | unit | Complex dependency graph |
| 5 | "detects a simple cycle" | 5 | unit | Cycle detection |
| 6 | "detects a 3-node cycle" | 5 | unit | Cycle detection |
| 7 | "handles subtasks with no dependencies" | 5 | unit | Independent nodes |
| 8 | "ignores dependencies outside the input set" | 5 | unit | External dependency tolerance |

### src/features/kanban/__tests__/derive-milestone-state.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns not_started for empty subtask array" | 5 | unit | Pure function |
| 2 | "returns not_started when all draft" | 5 | unit | Pure function |
| 3 | "returns complete when all built" | 5 | unit | Pure function |
| 4 | "returns needs_attention when any failed" | 5 | unit | State priority |
| 5 | "returns needs_attention when any needs_rework" | 5 | unit | State priority |
| 6 | "returns in_progress when a subtask is queued" | 5 | unit | State detection |
| 7 | "returns in_progress when a subtask is building" | 5 | unit | State detection |
| 8 | "returns in_progress when mixed draft and ready" | 5 | unit | Mixed states |
| 9 | "returns in_progress when some built and some draft" | 5 | unit | Mixed states |
| 10 | "prioritizes needs_attention over in_progress" | 5 | unit | Priority ordering |

### src/features/kanban/__tests__/group-cards.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns empty milestones and empty map" | 5 | unit | Pure function |
| 2 | "separates milestones from subtasks" | 5 | unit | Grouping logic |
| 3 | "sorts milestones by position" | 5 | unit | Sorting |
| 4 | "sorts subtasks within a milestone by position" | 5 | unit | Nested sorting |
| 5 | "handles milestones with no subtasks" | 5 | unit | Edge case |
| 6 | "handles subtasks whose milestone is missing" | 5 | unit | Orphan handling |

### src/features/kanban/__tests__/parse-prompt-anatomy.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns score 0 and all 5 missing for empty string" | 5 | unit | Pure function |
| 2 | "returns score 0 for whitespace-only string" | 5 | unit | Pure function |
| 3 | "detects role and task in a simple prompt" | 5 | unit | NLP parsing |
| 4 | "detects all 5 segments in a full prompt" | 5 | unit | Full detection |
| 5 | "detects constraints without role" | 5 | unit | Partial detection |
| 6 | "matches case-insensitively" | 5 | unit | Case handling |
| 7 | "only captures the first match per segment type" | 5 | unit | Dedup logic |
| 8 | "returns correct startIndex and endIndex" | 5 | unit | Index accuracy |
| 9 | "detects context with 'Based on' trigger" | 5 | unit | Trigger keyword |
| 10 | "detects format with 'as a list' trigger" | 5 | unit | Trigger keyword |

### src/features/project-onboarding/__tests__/schemas.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "accepts a valid messages array" | 5 | unit | Zod schema testing |
| 2 | "accepts messages array with 1 item" | 5 | unit | Minimum array length |
| 3 | "rejects empty messages array" | 5 | unit | Validation |
| 4 | "rejects messages with empty content" | 5 | unit | Validation |
| 5 | "accepts a valid plan output" | 5 | unit | Complex schema |
| 6 | "rejects fewer than 2 milestones" | 5 | unit | Minimum count |
| 7 | "rejects subtasks with no acceptance criteria" | 5 | unit | Nested validation |
| 8 | "accepts valid askQuestionRequest" | 5 | unit | Schema testing |
| 9 | "rejects questionIndex out of range" | 5 | unit | Range validation |
| 10 | "returns known ranges for known component types" | 5 | unit | Pure lookup function |
| 11 | "returns default range for unknown component types" | 5 | unit | Fallback behavior |

### src/features/teaching-hints/__tests__/hints.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "has at least 5 hints" | 4 | unit | Data integrity |
| 2 | "every hint has a unique id" | 5 | unit | Uniqueness constraint |
| 3 | "every hint has non-empty text" | 4 | unit | Data integrity |
| 4 | "no hint text contains forbidden words" | 4 | unit | Brand compliance |
| 5 | "includes the onboarding hint" | 3 | unit | Specific content check |
| 6 | "exports HintId type covering all hint ids" | 2 | unit | Type export existence check |

### src/features/token-economy/ui/__tests__/TokenBalancePill.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns green for balance above 50" | 5 | unit | Pure function |
| 2 | "returns amber for balance between 10 and 50" | 5 | unit | Pure function |
| 3 | "returns red for balance below 10" | 5 | unit | Pure function |

### src/features/share-flow/__tests__/SharePanel.test.tsx
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "renders the subdomain URL" | 3 | component | JSDOM rendering with mocked components |
| 2 | "copies the full URL to clipboard on click" | 3 | component | Mocked clipboard API |
| 3 | "shows 'Copied!' after clicking copy" | 3 | component | UI state transition |
| 4 | "links WhatsApp button to wa.me with the URL" | 3 | component | Link verification |
| 5 | "opens WhatsApp link in a new tab" | 3 | component | Target attribute check |
| 6 | "has aria-labels on all share buttons" | 4 | component | Accessibility |
| 7 | "shows Instagram tooltip on click" | 3 | component | UI interaction |

### src/features/visual-feedback/__tests__/FeedbackBar.test.tsx
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "renders textarea and Send button" | 3 | component | JSDOM rendering |
| 2 | "Send is disabled when textarea is empty" | 3 | component | UI state |
| 3 | "shows clarification chips for short instructions" | 3 | component | Conditional UI |
| 4 | "shows Stitch suggestion for 'logo' keyword" | 3 | component | Keyword detection UI |
| 5 | "reference button has aria-label" | 4 | component | Accessibility |

### src/features/visual-feedback/__tests__/VisualFeedbackPanel.test.tsx
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "exports ModificationRequest type" | 1 | unit | Tautological: tests that a type export exists |
| 2 | "VisualFeedbackPanel is a function component" | 1 | unit | Tautological: typeof check |
| 3 | "formatModificationSummary returns 'No changes' for empty" | 5 | unit | Pure function |
| 4 | "formatModificationSummary returns bullet points" | 5 | unit | Pure function |

### src/features/workspace/__tests__/context.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-17 | All tests | 5 | unit | Tests pure reducer/selector functions: buildReducer, computeProjectStep, milestone state derivation; no mocks |

### src/entities/project-step/__tests__/derive-step.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns Planning when no cards exist" | 5 | unit | Pure function |
| 2 | "ignores milestone cards" | 5 | unit | Filter logic |
| 3 | "returns Complete when all subtasks built" | 5 | unit | State derivation |
| 4 | "returns next card title for partial progress" | 5 | unit | Position-based selection |
| 5 | "picks the lowest-position non-built card" | 5 | unit | Sorting + selection |
| 6 | "truncates long card titles to 30 characters" | 5 | unit | Truncation |

### src/entities/booking-verticals/__tests__/data.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "has at least 5 verticals" | 4 | unit | Data integrity |
| 2 | "every vertical has a unique id" | 5 | unit | Uniqueness |
| 3 | "every vertical has at least 2 default services" | 4 | unit | Data integrity |
| 4 | "every service has positive duration and non-negative price" | 5 | unit | Data validation |
| 5 | "every vertical has valid hours" | 5 | unit | Format validation |
| 6 | "includes hair-beauty vertical" | 3 | unit | Specific content |
| 7 | "includes other as a catch-all" | 3 | unit | Specific content |
| 8 | "getVerticalById returns correct vertical" | 5 | unit | Lookup function |
| 9 | "getVerticalById returns undefined for unknown" | 5 | unit | Missing key |

### src/shared/lib/__tests__/sanitize-next-param.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1-3 | "falsy and empty inputs" (x3) | 5 | unit | Pure function |
| 4-7 | "legitimate same-origin paths" (x4) | 5 | unit | Happy paths |
| 8-13 | "protocol-relative and absolute URL injection" (x6) | 5 | unit | Security: open redirect prevention |
| 14-18 | "encoding tricks and malformed prefixes" (x5) | 5 | unit | Security: encoding bypass prevention |
| 19-21 | "colon handling: query strings vs path" (x3) | 5 | unit | Tricky edge case handling |
| 22-25 | "fallback option" (x4) | 5 | unit | Option handling |
| 26-28 | "mustStartWith option" (x3) | 5 | unit | Option handling |

### src/shared/lib/__tests__/format-relative.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns 'just now' for timestamps within 5 seconds" | 5 | unit | Pure function |
| 2 | "clamps future timestamps to 'just now'" | 5 | unit | Edge case |
| 3 | "returns seconds between 5 and 59" | 5 | unit | Time formatting |
| 4 | "returns minutes between 1 and 59" | 5 | unit | Time formatting |
| 5 | "returns hours between 1 and 23" | 5 | unit | Time formatting |
| 6 | "returns days for >= 24 hours" | 5 | unit | Time formatting |

### src/widgets/workspace/__tests__/PreviewPane.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "rejects null" | 5 | unit | Pure function |
| 2 | "rejects empty string" | 5 | unit | Pure function |
| 3 | "rejects javascript: scheme" | 5 | unit | Security: XSS prevention |
| 4 | "rejects data: scheme" | 5 | unit | Security |
| 5 | "rejects file: scheme" | 5 | unit | Security |
| 6 | "rejects malformed URLs" | 5 | unit | Validation |
| 7 | "accepts https URLs" | 5 | unit | Happy path |
| 8 | "accepts http URLs" | 5 | unit | Happy path |

### src/widgets/workspace/__tests__/StepIndicator.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns 0% for the first of N steps" | 5 | unit | Pure function |
| 2 | "returns the rounded percentage for mid-progress" | 5 | unit | Math calculation |
| 3 | "returns 100% when current equals total" | 5 | unit | Boundary |
| 4 | "clamps over-100% values to 100%" | 5 | unit | Safety clamp |
| 5 | "clamps negative current to 0%" | 5 | unit | Safety clamp |
| 6 | "returns 0% when total is 0 instead of NaN" | 5 | unit | Division-by-zero guard |
| 7 | "returns 0% when total is negative" | 5 | unit | Negative guard |

### src/widgets/workspace/__tests__/build-status.test.ts
| # | Test Name | Score | Type | Reason |
|---|-----------|-------|------|--------|
| 1 | "returns building when activeBuildCardId is set" | 5 | unit | Pure function |
| 2 | "returns building even when failureMessage also set" | 5 | unit | Priority logic |
| 3 | "returns failed when no active build but failure exists" | 5 | unit | State derivation |
| 4 | "returns idle when both are null" | 5 | unit | Default state |
| 5 | "appends cache-buster with ? when URL has no query" | 5 | unit | Pure function |
| 6 | "appends cache-buster with & when URL already has query" | 5 | unit | URL manipulation |
| 7 | "handles localhost URLs" | 5 | unit | Edge case |

---

## Overall Assessment

**Strengths:**
- Pure function tests (parsers, slug, sanitize, format, sort, derive) are excellent -- score 5 across the board with real inputs and meaningful assertions
- Integration tests (build-pipeline, build-journey, schema smoke tests) are genuinely high-value; they use in-memory storage implementations rather than mocking individual DB calls
- Security tests are thorough: JWT algorithm confusion, timing-safe comparisons, token hashing, CSRF, path traversal, open redirect prevention, prompt injection defense
- The routes-tracked test is uniquely valuable -- it caught a real production bug (.gitignore eating route files)

**Weaknesses:**
- Route handler tests (score 3-4) are uniformly structured: mock DB chain, mock auth, call handler, check response. They test control flow well but miss real DB/integration bugs. The heavy DB chain mocking (mockDbSelect -> mockDbFrom -> mockDbWhere -> mockDbLimit) is fragile and coupled to Drizzle's API shape
- Some tests are tautological (VisualFeedbackPanel type export check, workspace page shape check)
- The rate-limit-prefixes test reads source code with regex -- brittle and unusual
- AI-dependent tests (extract-topics, ocr, adaptive, analyze) necessarily mock Anthropic, reducing them to "does the code pass mock data through correctly" -- acceptable but score 3

**Recommendations:**
1. Convert highest-risk route tests (auth, billing) to integration tests using a test DB or real Drizzle queries against SQLite
2. Delete tautological tests (type export checks, typeof checks)
3. Replace source-reading rate-limit-prefix tests with actual rate-limiter invocation tests
4. Add property-based tests for sanitizeNextParam and slug generation
