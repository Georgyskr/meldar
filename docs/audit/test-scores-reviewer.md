# Test Validity -- Reviewer

## Summary
Total: 1057 | 5: 403 | 4: 618 | 3: 29 | 2: 7 | 1: 0

## By File

### src/server/build/__tests__/first-build-email-toctou.test.ts
| Test | Score | Issue |
|------|-------|-------|
| does not send email when UPDATE rowCount is 0 (concurrent call already sent) | 4 | Good TOCTOU logic test through mocks; verifies race condition guard |
| sends email when UPDATE rowCount is 1 (first caller wins) | 4 | Correct complementary case; verifies email sent with right args |

### src/server/discovery/parsers/__tests__/google-takeout.test.ts
| Test | Score | Issue |
|------|-------|-------|
| throws "File too large" when file.size > 200 MB before opening the ZIP | 5 | Real parser with real JSZip; uses Object.defineProperty to simulate large file |
| throws "Archive too large when decompressed" when total uncompressed size > 500 MB | 5 | Realistic zip bomb simulation via JSZip spy |
| throws before any entry content is read | 3 | Duplicate of previous test; same assertion, no new coverage |
| extracts searches from ZIP paths matching "My Activity" + "Search" + ".json" | 5 | Real ZIP creation, real parser execution |
| strips the "Searched for " prefix from item titles | 5 | Verifies actual string transformation |
| truncates each search query to 100 chars | 5 | Real behavior verification |
| caps _rawSearches at 500 entries | 5 | Real behavior with 600 entries |
| skips items where title does not start with "Searched for " | 5 | Real filtering behavior |
| reports malformed-JSON files as _skippedFileCount and continues other files | 5 | Real resilience test |
| reports malformed items as _skippedItemCount | 5 | Real resilience test |
| extracts watches from ZIP paths matching "My Activity" + "YouTube" + ".json" | 5 | Real parser behavior |
| strips the "Watched " prefix from item titles | 5 | Real string transformation |
| truncates each watch title to 100 chars | 5 | Real behavior |
| caps _rawYoutubeWatches at 500 entries | 5 | Real behavior |
| returns searchTopics: [] and youtubeTopCategories: null (filled in AI step) | 5 | Verifies initial shape |
| returns emailVolume: null | 5 | Verifies initial shape |
| skips a null item in the search array without throwing | 5 | Real resilience test |
| skips an item whose title is not a string (number) without throwing | 5 | Real resilience test |
| skips a primitive (string) item in the array without throwing | 5 | Real resilience test |
| handles the same malformed-item resilience for YouTube history | 5 | Real resilience test |
| matches a non-English ZIP path that contains "My Activity" and "Search" | 5 | Real locale tolerance test |

### src/server/discovery/parsers/__tests__/chatgpt.test.ts
| Test | Score | Issue |
|------|-------|-------|
| counts total conversations correctly | 5 | Real ZIP + parser |
| extracts user messages by traversing the mapping tree | 5 | Real tree traversal |
| truncates individual message text to 200 chars | 5 | Real truncation |
| caps _rawMessages at 500 entries | 5 | Real cap behavior |
| returns platform: "chatgpt" | 5 | Shape verification |
| returns empty topTopics and repeatedQuestions | 5 | Shape verification |
| computes timePatterns via extractTimePatterns | 5 | Real computation |
| throws "Archive too large when decompressed" | 5 | Bomb protection |
| throws before any file content is extracted | 3 | Duplicate assertion of bomb test |
| throws "No conversations.json found" | 5 | Real error case |
| throws containing "invalid JSON" | 5 | Real error case |
| throws containing "Invalid ChatGPT conversations.json shape" | 5 | Real validation |
| throws when conversation entry is null | 5 | Zod boundary |
| throws when conversation entry is string | 5 | Zod boundary |
| throws when conversation.mapping is not an object | 5 | Zod boundary |
| skips conversation nodes with no mapping field | 5 | Real resilience |
| tolerates mapping: null (soft-deleted) | 5 | Real resilience |
| skips message nodes where author.role is not "user" | 5 | Real filtering |

### src/server/discovery/parsers/__tests__/claude-export.test.ts
| Test | Score | Issue |
|------|-------|-------|
| parses conversations where messages are in chat_messages field | 5 | Real parser |
| parses when messages are in .messages instead of .chat_messages | 5 | Real alternate format |
| accepts sender === "human" as user messages | 5 | Real role mapping |
| accepts role === "user" as user messages | 5 | Real role mapping |
| skips messages with no text or content | 5 | Real resilience |
| truncates message text to 200 chars | 5 | Real behavior |
| converts created_at ISO string to Unix timestamp | 5 | Real conversion |
| caps _rawMessages at 500 entries | 5 | Real cap |
| returns platform: "claude" | 5 | Shape check |
| extracts conversations from root.conversations array | 5 | Real alternate format |
| throws "invalid JSON" for non-JSON | 5 | Real error |
| throws on a root that is a primitive (string) | 5 | Zod boundary |
| throws on a root that is a primitive (number) | 5 | Zod boundary |
| throws on a root that is null | 5 | Zod boundary |
| throws when .conversations is not an array | 5 | Zod boundary |

### src/server/deploy/__tests__/guarded-deploy-call.test.ts
| Test | Score | Issue |
|------|-------|-------|
| does not waste a rate-limit slot when hourly cap is already at limit | 4 | Good mock-based rate limit logic; verifies Redis counter unchanged |
| does not waste a rate-limit slot when daily cap is already at limit | 4 | Same pattern for daily cap |

### src/server/deploy/__tests__/sleep-listener-leak.test.ts
| Test | Score | Issue |
|------|-------|-------|
| removes abort listener after timer fires normally | 5 | Real event listener cleanup test with getEventListeners |
| cleans up timer when signal aborts | 5 | Real abort behavior |

### src/server/deploy/__tests__/vercel-deploy.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns not_configured when MELDAR_DEPLOY_TOKEN is missing | 4 | Real function with injectable fetch mock |
| runs the full 6-step sequence on the happy path | 4 | Good multi-step fetch mock; verifies discriminated union result |
| handles a 409 on project create by looking up the existing project | 4 | Tests idempotency path |
| maps ERROR readyState to deployment_build_failed | 4 | Error path |
| maps upload failure to upload_failed with the path | 4 | Error detail verification |
| accepts 409 on addDomain as idempotent success | 4 | Idempotency |

### src/server/identity/__tests__/jwt.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns a valid JWT string | 5 | Real JWT signing |
| verifies and returns payload for a valid token | 5 | Real roundtrip |
| returns null for an invalid token | 5 | Real verification |
| returns null for a tampered token | 5 | Real tamper detection |
| returns null for an expired token | 5 | Real expiry handling |
| returns null for a token signed with a different secret | 5 | Real secret mismatch |
| defaults emailVerified to false for legacy tokens | 5 | Backwards compatibility |
| preserves emailVerified: true through roundtrip | 5 | Real roundtrip |
| rejects tokens signed with a different algorithm (CWE-347) | 5 | Security: real alg-confusion test |
| returns payload for valid meldar-auth cookie | 5 | Real cookie parsing + verification |
| returns null when no cookie header present | 5 | Edge case |
| returns null when cookie header has no meldar-auth | 5 | Edge case |
| returns null when meldar-auth cookie has tampered value | 5 | Security edge case |
| extracts token from cookie with multiple cookies | 5 | Real multi-cookie parsing |
| throws if AUTH_SECRET is not set | 5 | Configuration guard |
| throws if AUTH_SECRET is shorter than 32 characters | 5 | Configuration guard |
| accepts AUTH_SECRET that is exactly 32 characters | 5 | Boundary test |

### src/server/identity/__tests__/password.test.ts
| Test | Score | Issue |
|------|-------|-------|
| hashes a password and verifies it correctly | 5 | Real bcrypt roundtrip |
| returns false for incorrect password | 5 | Real bcrypt verification |
| generates different hashes for the same password (salt) | 5 | Salt verification |
| handles empty string password | 5 | Edge case |

### src/server/identity/__tests__/token-hash.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns the correct SHA-256 hex digest for a known test vector | 5 | Known-answer test |
| returns a 64-character hex string | 5 | Format verification |
| produces different hashes for different tokens | 5 | Collision check |
| produces the same hash for the same token (deterministic) | 5 | Determinism check |

### src/server/identity/__tests__/require-auth.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns 401 when no cookie present | 4 | Mock-based auth pipeline test |
| returns 401 when cookie has invalid JWT | 4 | Mock-based |
| returns 401 when JWT is expired | 3 | Identical mock setup as invalid JWT; doesn't distinguish expiry |
| returns 401 when tokenVersion in JWT does not match DB | 4 | Token revocation check |
| returns session object when token is valid and tokenVersion matches | 4 | Happy path |
| returns 401 when user does not exist in DB (deleted account) | 4 | Deleted account guard |
| propagates DB errors (fail-closed) | 4 | Fail-closed security pattern |

### src/server/identity/__tests__/auth-cookie.test.ts
| Test | Score | Issue |
|------|-------|-------|
| sets meldar-auth cookie with correct flags | 5 | Real NextResponse cookie verification |
| sets Secure flag in production | 5 | Environment-conditional behavior |
| omits Secure flag in development | 5 | Environment-conditional behavior |

### src/server/domains/__tests__/slug.test.ts
| Test | Score | Issue |
|------|-------|-------|
| lowercases and replaces spaces with hyphens | 5 | Pure function |
| strips possessive apostrophes and special chars | 5 | Pure function |
| collapses multiple spaces and hyphens | 5 | Pure function |
| removes leading and trailing hyphens | 5 | Pure function |
| strips accented characters via NFD normalization | 5 | Pure function |
| handles emoji and non-latin characters | 5 | Pure function |
| returns "project" for empty or whitespace-only input | 5 | Edge case |
| preserves numbers | 5 | Pure function |
| handles already-slugified input | 5 | Idempotency |
| appends .meldar.ai to the slug | 5 | Pure function |
| works with single-word slugs | 5 | Pure function |
| appends a hyphen and 4-character suffix | 5 | Format check |
| produces different suffixes on repeated calls | 5 | Randomness check |

### src/server/domains/__tests__/provision-subdomain.test.ts
| Test | Score | Issue |
|------|-------|-------|
| generates a subdomain from the project name and inserts it | 4 | Mock DB but tests real slug generation + insert payload |
| appends a collision suffix when the slug already exists | 4 | Collision retry logic |
| retries up to 5 times on repeated collisions | 4 | Retry exhaustion |
| handles names that normalize to "project" | 4 | Edge case |
| succeeds on the third attempt after two collisions | 4 | Partial retry |

### src/server/lib/__tests__/cron-auth.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns false when CRON_SECRET is empty string | 5 | Real function |
| returns false when CRON_SECRET is shorter than 16 characters | 5 | Minimum length guard |
| returns false when CRON_SECRET is undefined | 5 | Missing env var |
| returns false when authorization header is missing | 5 | Missing header |
| returns false when authorization header does not match | 5 | Wrong secret |
| returns true when authorization header matches | 5 | Happy path |
| pads buffers to equal length before comparison (no length oracle) | 5 | Timing-safe verification |

### src/server/projects/__tests__/list-user-projects.test.ts
| Test | Score | Issue |
|------|-------|-------|
| calls getDb and db.execute exactly once per invocation | 3 | Mock wiring check |
| passes the userId as a bound parameter in the SQL | 3 | Inspects SQL serialization; fragile |
| generates SQL that filters by user_id and deleted_at | 3 | SQL inspection |
| generates SQL that orders by last_build_at desc nulls last | 3 | SQL inspection |
| generates SQL that uses LATERAL joins | 3 | SQL inspection |
| returns enriched rows with progress fields coerced to numbers | 4 | Tests actual coercion logic |
| returns empty array when no projects exist | 4 | Edge case |
| coerces null/undefined nextCardTitle to null | 4 | Null coercion |

### src/server/agents/__tests__/agent-task-service.test.ts
| Test | Score | Issue |
|------|-------|-------|
| proposeTask: inserts into agentTasks and agentEvents | 4 | Mock DB but verifies insert count |
| proposeTask: returns the created task | 4 | Return shape |
| approveTask: transitions proposed to approved | 4 | State machine |
| approveTask: throws TaskNotFoundError | 4 | Error case |
| approveTask: throws InvalidTaskTransitionError | 4 | Guard |
| rejectTask: transitions proposed to rejected | 4 | State machine |
| rejectTask: throws TaskNotFoundError | 4 | Error case |
| rejectTask: throws InvalidTaskTransitionError | 4 | Guard |
| executeTask: transitions approved to executing | 4 | State machine |
| executeTask: throws InvalidTaskTransitionError | 4 | Guard |
| completeTask: transitions verifying to done | 4 | State machine |
| completeTask: throws InvalidTaskTransitionError | 4 | Guard |
| escalateTask: transitions failed to escalated | 4 | State machine |
| escalateTask: throws InvalidTaskTransitionError | 4 | Guard |
| getPendingTasks: returns tasks with proposed status | 3 | Returns mock queue data |
| getPendingTasks: returns empty array | 3 | Trivial empty case |
| getTaskHistory: returns tasks ordered | 3 | Returns mock queue data |
| getTaskHistory: returns empty array | 3 | Trivial empty case |
| failTask: transitions executing to failed | 4 | State machine |
| failTask: transitions verifying to failed | 4 | State machine |
| failTask: throws InvalidTaskTransitionError | 4 | Guard |
| reapStuckExecutingTasks: returns count | 3 | Returns mock queue length |
| reapStuckExecutingTasks: returns 0 | 3 | Trivial empty case |

### src/server/discovery/__tests__/preprocess-ocr.test.ts
| Test | Score | Issue |
|------|-------|-------|
| strips non-printable characters | 5 | Real function |
| collapses multiple blank lines | 5 | Real function |
| trims leading and trailing whitespace per line | 5 | Real function |
| returns empty cleanedText for blank input | 5 | Edge case |
| handles null-like whitespace-only input | 5 | Edge case |
| extracts total screen time in hours and minutes format | 5 | Real regex extraction |
| extracts total screen time with only hours | 5 | Real regex |
| extracts total screen time with only minutes | 5 | Real regex |
| extracts daily average format | 5 | Real regex |
| extracts pickups count | 5 | Real regex |
| extracts notification count | 5 | Real regex |
| extracts app entries with hours and minutes | 5 | Real extraction + categorization |
| extracts app entries with pickup counts | 5 | Real extraction |
| handles Cyrillic app names | 5 | i18n support |
| handles messy Tesseract output from real screenshot | 5 | Real-world OCR simulation |
| includes a structured summary section | 5 | Output format |
| includes app list in clean format | 5 | Output format |
| preserves original text as fallback | 5 | Fallback behavior |
| detects iOS from Screen Time keywords | 5 | Platform detection |
| detects Android from Digital Wellbeing keywords | 5 | Platform detection |
| returns unknown when no platform indicators | 5 | Fallback |
| categorizes social apps correctly | 5 | Categorization |
| categorizes communication apps correctly | 5 | Categorization |
| falls back to utility for unknown apps | 5 | Fallback |
| cleans text for subscriptions without screen time regex | 5 | Non-screentime source |
| cleans text for battery source | 5 | Non-screentime source |

### src/server/discovery/__tests__/adaptive.test.ts
| Test | Score | Issue |
|------|-------|-------|
| calls Haiku with APP_TO_SCREENSHOT_MAP in system prompt | 4 | Verifies prompt content via mock spy |
| includes occupation and ageBracket in user message | 4 | Prompt content check |
| returns [] when no tool_use block (graceful fallback) | 4 | Error resilience |
| returns [] and logs warn when Zod validation fails | 4 | Validation failure handling |
| caps result at 5 follow-ups | 4 | Cap enforcement |
| returns valid AdaptiveFollowUp[] with required fields | 4 | Shape verification |
| returns accept field on screenshot-type items | 4 | Conditional field |
| returns options array on question-type items | 4 | Conditional field |

### src/server/discovery/__tests__/analyze.test.ts
| Test | Score | Issue |
|------|-------|-------|
| always includes Quiz Picks and AI Comfort Level sections | 4 | Prompt construction via mock spy |
| formats aiComfort label as "Never touched AI" for value 1 | 4 | Label mapping |
| formats aiComfort label as "Use it daily" for value 4 | 4 | Label mapping |
| includes Screen Time Data section only when defined | 4 | Conditional section |
| includes ChatGPT Usage section | 4 | Conditional section |
| includes Claude Usage section independently of chatgpt | 4 | Conditional section |
| includes Google Search Topics section | 4 | Conditional section |
| includes YouTube Watch Categories section | 4 | Conditional section |
| includes App Subscriptions section | 4 | Conditional section |
| includes Battery Usage section | 4 | Conditional section |
| includes Storage Usage section | 4 | Conditional section |
| includes Calendar Week View section with events capped at 15 | 4 | Cap enforcement in prompt |
| includes Health Data section | 4 | Conditional section |
| includes Adaptive Follow-Up Data section | 4 | Conditional section |
| omits all optional sections when undefined | 4 | Negative case for all sections |
| calls Sonnet with ANALYSIS_TOOL and tool_choice | 4 | API call shape |
| returns DiscoveryAnalysis with all required fields | 4 | Output shape |
| merges BASE_LEARNING_MODULES with personalizedModules | 4 | Merge logic |
| throws "no tool response from Claude" | 4 | Error handling |
| throws with Zod message when tool output fails validation | 4 | Zod boundary |
| throws when complexity is not beginner or intermediate | 4 | Enum guard |

### src/server/discovery/__tests__/extract-from-text.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns error for empty string | 4 | Input validation |
| returns error for whitespace-only string | 4 | Input validation |
| returns error for string shorter than 10 chars | 4 | Input validation |
| returns error for unknown sourceType | 4 | Input validation |
| returns error for sourceType "adaptive" | 4 | Guard against invalid type |
| calls Haiku with correct tool name for "screentime" | 4 | Per-source tool routing |
| calls Haiku with correct tool name for "subscriptions" | 4 | Per-source tool routing |
| calls Haiku with correct tool name for "battery" | 4 | Per-source tool routing |
| calls Haiku with correct tool name for "storage" | 4 | Per-source tool routing |
| calls Haiku with correct tool name for "calendar" | 4 | Per-source tool routing |
| calls Haiku with correct tool name for "health" | 4 | Per-source tool routing |
| wraps ocrText inside ocr-data tags | 4 | Prompt injection protection |
| system prompt contains injection protection warning | 4 | Security verification |
| returns data with tool input on success | 4 | Happy path |
| returns error when no tool_use block | 4 | Error handling |
| returns error when Anthropic API throws | 4 | Error handling |

### src/server/discovery/__tests__/extract-topics.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns empty immediately when messages array is empty | 4 | Early return optimization |
| truncates to first 300 messages | 4 | Cap enforcement |
| joins message texts with separator | 4 | Prompt formatting |
| includes platform name in system prompt | 4 | Platform context |
| returns parsed topTopics and repeatedQuestions | 4 | Happy path |
| returns empty arrays when no tool_use block | 4 | Graceful fallback |
| returns empty arrays when Zod validation fails | 4 | Validation boundary |
| returns empty immediately when both inputs empty | 4 | Early return |
| includes only search section when youtube empty | 4 | Conditional section |
| includes only YouTube section when searches empty | 4 | Conditional section |
| includes both sections when both provided | 4 | Both sections |
| truncates to 300 searches and 300 watches independently | 4 | Independent cap |
| returns searchTopics and youtubeTopCategories on valid response | 4 | Happy path |
| returns empty arrays when no tool_use block (google) | 4 | Graceful fallback |
| returns empty arrays when Zod validation fails (google) | 4 | Validation boundary |

### src/server/discovery/__tests__/ocr.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns data matching schema for valid tool output | 4 | Happy path |
| passes focusMode=true by appending addendum | 4 | Feature flag |
| passes focusMode=false with base prompt only | 4 | Default behavior |
| sets tool_choice correctly | 4 | API call shape |
| returns error "not_screen_time" | 4 | Classification error |
| returns error "unreadable" | 4 | Classification error |
| throws "No tool use in response" | 4 | Error handling |
| throws with Zod error message | 4 | Validation boundary |

### src/server/build-orchestration/__tests__/build-journey.test.ts
| Test | Score | Issue |
|------|-------|-------|
| full build journey: create -> template -> build -> SSE | 5 | True integration with InMemoryStorage + InMemoryTokenLedger |
| build with unsafe path traversal triggers failed event | 5 | Security: path traversal detection |
| build with reserved path segment triggers failed event | 5 | Security: node_modules guard |
| deploy gracefully skips when no sandbox provider | 5 | Graceful degradation |

### src/server/build-orchestration/__tests__/routes-tracked.test.ts
| Test | Score | Issue |
|------|-------|-------|
| found route files on disk | 5 | Real filesystem scan |
| [each route] is tracked by git | 5 | Real git ls-files check; prevents .gitignore accidents |

### src/server/build-orchestration/__tests__/build-pipeline-integration.test.ts
| Test | Score | Issue |
|------|-------|-------|
| commits multiple realistic files and makes them readable | 5 | True integration with InMemoryStorage |
| file_written events carry correct contentHash and sizeBytes | 5 | Content-addressed storage verification |
| preserves untouched files, updates modified, adds new | 5 | Multi-build file management |
| second build references the first build as parentBuildId | 5 | Build chain integrity |
| Anthropic receives current project files in prompt | 5 | Context injection verification |
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
| rejects path with backslash (Windows-style) | 5 | Security |
| rejects path with null byte injection | 5 | Security |
| rejects empty path | 5 | Security |

### src/app/(authed)/sign-up/__tests__/sign-up-submit.test.ts
| Test | Score | Issue |
|------|-------|-------|
| rejects an invalid email shape before calling the network | 4 | Client-side validation with fetch spy |
| rejects a password shorter than 8 chars | 4 | Client-side validation |
| returns ok with the userId on successful response | 4 | Happy path with fetch mock |
| surfaces the server error message on 409 | 4 | Error surface |
| surfaces the rate limit message on 429 | 4 | Error surface |
| handles network errors gracefully | 4 | Network error |
| rejects a malformed success response | 4 | Response validation |
| strips unknown fields from the request body | 4 | Schema stripping |

### src/app/(authed)/sign-in/__tests__/sign-in-submit.test.ts
| Test | Score | Issue |
|------|-------|-------|
| rejects an invalid email shape | 4 | Client-side validation |
| rejects an empty password | 4 | Client-side validation |
| returns ok with the user id | 4 | Happy path |
| shows generic invalid credentials message on 401 | 4 | Security: no credential leak |
| surfaces the rate limit message on 429 | 4 | Error surface |
| handles network errors gracefully | 4 | Network error |
| rejects a malformed success response | 4 | Response validation |

### src/features/auth/__tests__/sign-out.test.ts
| Test | Score | Issue |
|------|-------|-------|
| calls DELETE /api/auth/me | 4 | Correct HTTP method + endpoint |
| returns ok on a 200 response | 4 | Happy path |
| returns a failure message when server responds non-2xx | 4 | Error handling |
| returns a network error message when fetch throws | 4 | Network error |

### src/shared/lib/__tests__/format-relative.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns "just now" for timestamps within 5 seconds | 5 | Pure function |
| clamps future timestamps to "just now" | 5 | Edge case |
| returns seconds between 5 and 59 | 5 | Pure function |
| returns minutes between 1 and 59 | 5 | Pure function |
| returns hours between 1 and 23 | 5 | Pure function |
| returns days for >= 24 hours | 5 | Pure function |

### src/shared/lib/__tests__/sanitize-next-param.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns /workspace for null | 5 | Pure function |
| returns /workspace for undefined | 5 | Pure function |
| returns /workspace for empty string | 5 | Pure function |
| passes through /workspace | 5 | Pure function |
| passes through /workspace/abc | 5 | Pure function |
| passes through bare root / | 5 | Pure function |
| passes through /foo | 5 | Pure function |
| rejects //evil.com | 5 | Security: protocol-relative |
| rejects ///evil | 5 | Security |
| rejects http://evil | 5 | Security |
| rejects https://evil | 5 | Security |
| rejects javascript:alert(1) | 5 | Security: XSS |
| rejects data:text/html,foo | 5 | Security |
| rejects %2F%2Fevil.com | 5 | Security: encoding bypass |
| rejects //evil.com (decoded) | 5 | Security |
| rejects backslash prefix | 5 | Security |
| rejects leading-space | 5 | Security |
| rejects bare hostname | 5 | Security |
| allows : inside query string | 5 | Legitimate query string |
| allows : inside query string value | 5 | Legitimate query string |
| rejects : in path segment | 5 | Security |
| returns custom fallback for null | 5 | Option behavior |
| returns custom fallback for empty string | 5 | Option behavior |
| returns custom fallback for rejected input | 5 | Option behavior |
| passes through valid path with custom fallback | 5 | Option behavior |
| passes through with mustStartWith | 5 | Option behavior |
| rejects /foo when mustStartWith is /workspace | 5 | Option behavior |
| passes through /workspace with mustStartWith | 5 | Option behavior |

### src/features/kanban/__tests__/derive-milestone-state.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns not_started for empty array | 5 | Pure function |
| returns not_started when all draft | 5 | Pure function |
| returns complete when all built | 5 | Pure function |
| returns needs_attention when any failed | 5 | Priority logic |
| returns needs_attention when any needs_rework | 5 | Priority logic |
| returns in_progress when queued | 5 | Progress detection |
| returns in_progress when building | 5 | Progress detection |
| returns in_progress when mixed draft and ready | 5 | Progress detection |
| returns in_progress when some built and some draft | 5 | Progress detection |
| prioritizes needs_attention over in_progress | 5 | Priority ordering |

### src/features/kanban/__tests__/group-cards.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns empty milestones and empty map for empty input | 5 | Pure function |
| separates milestones from subtasks | 5 | Core grouping logic |
| sorts milestones by position | 5 | Sorting |
| sorts subtasks within a milestone by position | 5 | Sorting |
| handles milestones with no subtasks | 5 | Edge case |
| handles subtasks whose milestone is missing | 5 | Orphan handling |

### src/features/kanban/__tests__/topological-sort.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns empty sorted array for empty input | 5 | Pure function |
| preserves a single subtask | 5 | Pure function |
| sorts subtasks with linear dependencies | 5 | Topological ordering |
| handles diamond dependencies | 5 | Complex DAG |
| detects a simple cycle | 5 | Cycle detection |
| detects a 3-node cycle | 5 | Cycle detection |
| handles subtasks with no dependencies in any order | 5 | No-dep case |
| ignores dependencies referencing outside input set | 5 | External ref handling |

### src/features/kanban/__tests__/parse-prompt-anatomy.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns score 0 for empty string | 5 | Pure function |
| returns score 0 for whitespace-only | 5 | Edge case |
| detects role and task in a simple prompt | 5 | Segment detection |
| detects all 5 segments in a full prompt | 5 | Full detection |
| detects constraints without role | 5 | Partial detection |
| matches case-insensitively | 5 | Case insensitivity |
| only captures the first match per segment type | 5 | Dedup logic |
| returns correct startIndex and endIndex | 5 | Position tracking |
| detects context with "Based on" trigger | 5 | Keyword trigger |
| detects format with "as a list" trigger | 5 | Keyword trigger |

### src/features/token-economy/ui/__tests__/TokenBalancePill.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns green for balance above 50 | 5 | Pure function |
| returns amber for balance between 10 and 50 | 5 | Pure function |
| returns red for balance below 10 | 5 | Pure function |

### src/features/project-onboarding/__tests__/schemas.test.ts
| Test | Score | Issue |
|------|-------|-------|
| accepts a valid messages array | 5 | Zod schema |
| accepts messages array with 1 item | 5 | Boundary |
| rejects empty messages array | 5 | Validation |
| rejects messages with empty content | 5 | Validation |
| accepts a valid plan output | 5 | Complex schema |
| rejects fewer than 2 milestones | 5 | Min constraint |
| rejects subtasks with no acceptance criteria | 5 | Validation |
| accepts valid askQuestionRequest | 5 | Schema |
| rejects questionIndex out of range | 5 | Range constraint |
| returns known ranges for known component types | 5 | Pure lookup |
| returns default range for unknown component types | 5 | Fallback |

### src/features/workspace/__tests__/context.test.ts
| Test | Score | Issue |
|------|-------|-------|
| starts with the initial preview URL | 5 | Pure reducer |
| updates previewUrl on sandbox_ready | 5 | Pure reducer |
| overwrites a prior previewUrl | 5 | Pure reducer |
| records lastBuildAt on committed events | 5 | Pure reducer |
| appends to writtenFiles on file_written events | 5 | Pure reducer |
| resets writtenFiles on started events | 5 | Pure reducer |
| clears activeBuildCardId on committed events | 5 | Pure reducer |
| sets failureMessage on failed events | 5 | Pure reducer |
| does not change state on prompt_sent events | 5 | No-op case |
| transitions card to building on started event | 5 | Card state transition |
| does not mutate cards on started without kanbanCardId | 5 | Immutability check |
| transitions card to built and sets receipt on committed | 5 | Card state + receipt |
| transitions card to failed on failed event | 5 | Card state transition |
| does not mutate cards on failed without kanbanCardId | 5 | Immutability check |
| card_started sets currentCardIndex, totalCards | 5 | Pipeline state |
| pipeline_complete clears pipeline state | 5 | Pipeline cleanup |
| card_started marks the referenced card as building | 5 | Card state transition |

### src/features/teaching-hints/__tests__/hints.test.ts
| Test | Score | Issue |
|------|-------|-------|
| has at least 5 hints | 3 | Data inventory check |
| every hint has a unique id | 4 | Uniqueness constraint |
| every hint has non-empty text | 3 | Non-empty check |
| no hint text contains forbidden words | 4 | Content policy |
| includes the onboarding hint | 3 | Presence check |
| exports HintId type covering all hint ids | 2 | Type check at runtime; TypeScript already enforces this |

### src/features/visual-feedback/__tests__/FeedbackBar.test.tsx
| Test | Score | Issue |
|------|-------|-------|
| renders textarea and Send button | 4 | Real DOM render with jsdom |
| Send is disabled when textarea is empty | 4 | Disabled state |
| shows clarification chips for short instructions | 4 | UX behavior |
| shows Stitch suggestion for "logo" keyword | 4 | Keyword detection |
| reference button has aria-label | 4 | Accessibility |

### src/features/share-flow/__tests__/SharePanel.test.tsx
| Test | Score | Issue |
|------|-------|-------|
| renders the subdomain URL | 4 | Real DOM render |
| copies the full URL to clipboard on click | 4 | Click behavior |
| shows "Copied!" after clicking copy | 4 | State transition |
| links WhatsApp button to wa.me with the URL | 4 | Link verification |
| opens WhatsApp link in a new tab | 4 | Target/rel check |
| has aria-labels on all share buttons | 4 | Accessibility |
| shows Instagram tooltip on click | 4 | Tooltip behavior |

### src/entities/project-step/__tests__/derive-step.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns Planning when no cards exist | 5 | Pure function |
| ignores milestone cards | 5 | Filtering logic |
| returns Complete when all subtasks are built | 5 | Terminal state |
| returns next card title for partial progress | 5 | Progress label |
| picks the lowest-position non-built card | 5 | Sorting logic |
| truncates long card titles to 30 characters | 5 | Truncation |

### src/entities/booking-verticals/__tests__/data.test.ts
| Test | Score | Issue |
|------|-------|-------|
| has at least 5 verticals | 3 | Data inventory |
| every vertical has a unique id | 4 | Uniqueness |
| every vertical has at least 2 default services | 3 | Minimum constraint |
| every service has positive duration and non-negative price | 4 | Data integrity |
| every vertical has valid hours | 4 | Format check |
| includes hair-beauty vertical | 3 | Presence check |
| includes other as a catch-all | 3 | Presence check |
| getVerticalById returns the correct vertical | 5 | Pure lookup |
| getVerticalById returns undefined for unknown id | 5 | Missing key |

### src/widgets/workspace/__tests__/PreviewPane.test.ts
| Test | Score | Issue |
|------|-------|-------|
| rejects null | 5 | Pure function |
| rejects empty string | 5 | Pure function |
| rejects javascript: scheme | 5 | Security |
| rejects data: scheme | 5 | Security |
| rejects file: scheme | 5 | Security |
| rejects malformed URLs | 5 | Validation |
| accepts https URLs | 5 | Happy path |
| accepts http URLs | 5 | Happy path (localhost) |

### src/widgets/workspace/__tests__/StepIndicator.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns 0% for the first step | 5 | Pure function |
| returns the rounded percentage for mid-progress | 5 | Pure function |
| returns 100% when current equals total | 5 | Pure function |
| clamps over-100% values | 5 | Edge case |
| clamps negative current to 0% | 5 | Edge case |
| returns 0% when total is 0 | 5 | Division by zero |
| returns 0% when total is negative | 5 | Edge case |

### src/widgets/workspace/__tests__/build-status.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns building when activeBuildCardId is set | 5 | Pure function |
| returns building even when failureMessage is set | 5 | Priority logic |
| returns failed when no active build but failure exists | 5 | State derivation |
| returns idle when both are null | 5 | Default state |
| appends cache-buster with ? | 5 | URL manipulation |
| appends cache-buster with & | 5 | URL manipulation |
| handles localhost URLs | 5 | Edge case |

### src/app/(authed)/workspace/__tests__/page.test.tsx
| Test | Score | Issue |
|------|-------|-------|
| throws when reached without a session | 4 | Guard behavior |
| redirects to onboarding when zero projects | 4 | Redirect logic |
| renders a card grid when user has projects | 4 | Rendering with mocked data |
| renders an error banner when project query throws | 4 | Error boundary |

### src/app/api/auth/__tests__/register.test.ts
| Test | Score | Issue |
|------|-------|-------|
| registers successfully and returns JWT cookie | 4 | Route handler happy path |
| stores hashed verifyToken in DB, sends raw token in email | 4 | Security: token hashing |
| includes verifyTokenExpiresAt in insert payload | 4 | Expiry propagation |
| sends verification email via Resend after registration | 4 | Side effect verification |
| registration succeeds even if Resend throws | 4 | Graceful degradation |
| rejects duplicate email with generic 400 | 4 | Enumeration prevention |
| rejects invalid email format with 400 | 4 | Validation |
| rejects password shorter than 8 characters | 4 | Validation |
| returns 400 with INVALID_JSON for malformed JSON | 4 | Parse error |
| rejects missing fields with 400 | 4 | Validation |
| rejects all-lowercase password | 4 | Password strength |
| rejects all-digit password | 4 | Password strength |
| rejects all-uppercase password | 4 | Password strength |
| accepts password with uppercase, lowercase and digit | 4 | Happy path |
| returns 500 on unexpected error | 4 | Error handling |
| duplicate-email path takes similar time (timing attack) | 3 | Fragile timing test; asserts >= 100ms |
| sends welcome email after registration | 4 | Side effect |
| sends welcome email with null name | 4 | Null name handling |
| registration succeeds even if welcome email throws | 4 | Graceful degradation |

### src/app/api/auth/__tests__/login.test.ts
| Test | Score | Issue |
|------|-------|-------|
| logs in successfully with correct credentials | 4 | Route handler happy path |
| rejects wrong password with 401 | 4 | Auth failure |
| rejects non-existent email with 401 (same message) | 4 | Enumeration prevention |
| returns same error message for wrong password and non-existent email | 4 | Security: identical errors |
| rejects invalid input with 400 | 4 | Validation |
| returns 500 on unexpected error | 4 | Error handling |
| returns 400 with INVALID_JSON | 4 | Parse error |
| calls verifyPassword even when user not found (timing parity) | 4 | Security: timing attack prevention |
| calls setAuthCookie on successful login | 4 | Cookie side effect |
| returns 429 when email-based rate limit exceeded | 4 | Rate limiting |

### src/app/api/auth/__tests__/me.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns user: null when unauthenticated (not 401) | 4 | Soft auth check |
| returns user data when authenticated | 4 | Happy path |
| returns user: null and clears cookie when user not found in DB | 4 | Stale session cleanup |
| returns 401 when no valid auth cookie (DELETE) | 4 | Auth guard |
| clears cookie and returns success when authenticated | 4 | Logout flow |
| increments tokenVersion in DB on logout | 4 | Token revocation |

### src/app/api/auth/__tests__/verify-email.test.ts
| Test | Score | Issue |
|------|-------|-------|
| hashes the incoming token before DB lookup | 4 | Security: token hashing |
| redirects to workspace on valid token | 4 | Happy path |
| redirects to sign-in with error on invalid token | 4 | Invalid token |
| redirects to sign-in when no token provided | 4 | Missing param |
| does NOT issue a cookie when requireAuth fails | 4 | Revoked session guard |
| issues a refreshed cookie when requireAuth succeeds | 4 | Token refresh |
| does NOT issue cookie when auth userId differs | 4 | Cross-user guard |

### src/app/api/auth/__tests__/forgot-password.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns success and sends email for existing user | 4 | Happy path |
| stores a SHA-256 hash in DB, not the raw token | 4 | Security: token hashing |
| returns success for non-existing email (prevents enumeration) | 4 | Security: enumeration prevention |
| sets reset token expiry to approximately 1 hour | 4 | Expiry check |
| takes at least 500ms regardless of user existence | 3 | Fragile timing test |
| returns 400 with INVALID_JSON for malformed JSON | 4 | Parse error |
| rejects invalid email with 400 | 4 | Validation |
| rejects missing email with 400 | 4 | Validation |
| returns 500 on unexpected error | 4 | Error handling |

### src/app/api/auth/__tests__/reset-password.test.ts
| Test | Score | Issue |
|------|-------|-------|
| resets password with valid token using atomic update | 4 | Atomic UPDATE...RETURNING |
| uses a single atomic UPDATE...RETURNING | 4 | Race condition prevention |
| hashes the incoming token before DB lookup | 4 | Security: token hashing |
| returns 401 when token was already consumed | 4 | Consumed token guard |
| rejects expired token with 401 | 4 | Expiry guard |
| clears reset token atomically on success | 4 | Cleanup |
| rejects short new password with 400 | 4 | Validation |
| returns 400 with INVALID_JSON | 4 | Parse error |
| rejects missing token with 400 | 4 | Validation |
| rejects empty token with 400 | 4 | Validation |
| rejects missing password with 400 | 4 | Validation |
| rejects all-lowercase password | 4 | Password strength |
| rejects all-digit password | 4 | Password strength |
| accepts strong password | 4 | Happy path |
| returns 500 on unexpected error | 4 | Error handling |

### src/app/api/auth/__tests__/resend-verification.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns 401 when unauthenticated | 4 | Auth guard |
| returns 429 when rate limited | 4 | Rate limiting |
| returns success no-op when already verified | 4 | Idempotency |
| generates new token and sends email when not verified | 4 | Happy path |
| returns 401 when user not found in DB | 4 | Deleted account |
| returns 500 on unexpected error | 4 | Error handling |

### src/app/api/auth/__tests__/google-callback.test.ts
| Test | Score | Issue |
|------|-------|-------|
| redirects to sign-in with error when no code param | 4 | Missing param |
| redirects with error when error param is present | 4 | OAuth error |
| redirects with error when token exchange fails | 4 | API failure |
| redirects with error when userinfo request fails | 4 | API failure |
| redirects with error when no email | 4 | Missing email |
| creates a new user, sets JWT cookie, redirects | 4 | Happy path |
| records signup bonus for new users | 4 | Token economy |
| logs in existing Google user without creating duplicate | 4 | Idempotency |
| redirects email-registered user instead of auto-merging | 4 | Account collision |
| rejects when CSRF state param does not match cookie | 4 | CSRF protection |
| rejects when CSRF state cookie is missing | 4 | CSRF protection |
| rejects when Google email is not verified | 4 | Unverified email guard |
| marks existing unverified Google user as verified | 4 | Verification upgrade |
| redirects with error when rate limited | 4 | Rate limiting |

### src/app/api/workspace/projects/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| POST returns 401 when no auth cookie | 4 | Auth guard |
| POST returns 401 when cookie is invalid | 4 | Auth guard |
| POST returns 400 on invalid JSON | 4 | Parse error |
| POST returns 400 when name has wrong type | 4 | Validation |
| POST returns 400 when name exceeds length cap | 4 | Validation |
| POST returns 400 when name contains forbidden characters | 4 | XSS prevention |
| POST creates a project and returns its id | 4 | Uses InMemoryProjectStorage |
| POST uses a default name when none provided | 4 | Default value |
| POST seeds project with Next.js + Panda starter | 4 | Template seeding |
| GET returns 401 when no auth cookie | 4 | Auth guard |
| GET returns 401 when cookie is invalid | 4 | Auth guard |
| GET returns empty list when no projects | 4 | Empty state |
| GET returns project list in database order | 4 | Ordering |
| GET returns 500 when database throws | 4 | Error handling |
| GET scopes query to authenticated user | 4 | Authorization scope |

### src/app/api/workspace/projects/__tests__/serialize-error.test.ts
| Test | Score | Issue |
|------|-------|-------|
| omits stack in production | 4 | Environment-conditional |
| includes stack in development | 4 | Environment-conditional |
| handles non-Error values | 4 | Polymorphism |
| recursively serializes cause | 4 | Cause chain |
| truncates cause chain deeper than maxDepth | 4 | Depth limit |

### src/app/api/workspace/tokens/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns 401 when no auth cookie | 4 | Auth guard |
| returns 401 when auth cookie is invalid | 4 | Auth guard |
| calls getTokenBalance with correct userId | 4 | Argument forwarding |
| calls getTransactionHistory with correct userId and limit | 4 | Argument forwarding |
| returns balance and transactions when authenticated | 4 | Happy path |
| returns 500 when getTokenBalance throws | 4 | Error handling |
| returns 429 when rate limited | 4 | Rate limiting |

### src/app/api/workspace/tokens/claim-daily/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns 401 when no auth cookie | 4 | Auth guard |
| returns alreadyClaimed when Redis NX set returns null | 4 | Idempotency via Redis NX |
| credits daily bonus on first claim | 4 | Happy path |
| calls Redis SET with nx and 86400s expiry | 4 | Redis shape |
| returns 503 when rate limiter reports serviceError | 4 | Circuit breaker |
| deletes Redis key when creditTokens fails | 4 | Rollback on failure |

### src/app/api/onboarding/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| rejects unauthenticated requests with 401 | 4 | Auth guard |
| rejects invalid vertical id with 400 | 4 | Validation |
| creates project with valid hair-beauty vertical | 4 | Happy path |
| creates project with consulting vertical | 4 | Alternate vertical |
| accepts optional business name | 4 | Optional field |
| rejects missing body with 400 | 4 | Parse error |

### src/app/api/cron/__tests__/purge-auth.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns 401 for missing Authorization header | 4 | Auth guard |
| returns 401 for wrong secret | 4 | Auth guard |
| returns 401 for wrong scheme (Basic vs Bearer) | 4 | Scheme check |
| returns 200 for correct Bearer secret | 4 | Happy path |
| does not expose CRON_SECRET in response body | 4 | Security: no secret leak |
| purge route uses verifyCronAuth | 3 | Module existence check |
| agent-tick route uses verifyCronAuth | 3 | Module existence check |
| verifyCronAuth uses timingSafeEqual | 3 | Source code string search |

### src/app/api/cron/purge/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns 401 when Authorization header is absent | 4 | Auth guard |
| returns 401 when wrong secret | 4 | Auth guard |
| returns 401 when wrong scheme | 4 | Auth guard |
| proceeds when Authorization is correct | 4 | Happy path |
| executes DELETE SQL for discovery_sessions | 3 | Verifies call count only |
| executes DELETE SQL for xray_results | 3 | Verifies call count only |
| returns purged with rowCount values | 4 | Response shape |
| returns 0 when rowCount is null | 4 | Null handling |

### src/app/api/cron/email-touchpoints/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (8 tests) | 4 | Route handler tests with mocked DB and email; auth guards, happy path, error resilience, no-secret-leak |

### src/app/api/cron/agent-tick/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (10 tests) | 4 | Route handler with mocked DB, Resend, spend ceiling; tests auth, claiming, execution, error types |

### src/app/api/billing/checkout/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| returns 429 with RATE_LIMITED code | 4 | Rate limiting |
| returns 400 for invalid product | 4 | Validation |
| returns 400 for invalid email | 4 | Validation |
| accepts no email (optional) | 4 | Optional field |
| accepts no xrayId (optional) | 4 | Optional field |
| creates payment-mode session for timeAudit | 4 | Stripe mode routing |
| creates payment-mode session for appBuild | 4 | Legacy slug |
| creates payment-mode session for vipBuild | 4 | V3 slug |
| creates subscription-mode session for builder | 4 | Subscription mode |
| rejects retired starter slug | 4 | Retired product guard |
| does NOT include subscription_data for timeAudit | 4 | Mode-specific config |
| does NOT include subscription_data for appBuild | 4 | Mode-specific config |
| DOES include trial_period_days: 7 for builder | 4 | Trial config |
| passes customer_email when provided | 4 | Email forwarding |
| passes customer_email as undefined when absent | 4 | Optional handling |
| passes xrayId in metadata when provided | 4 | Metadata |
| passes empty string for xrayId when absent | 4 | Default metadata |
| passes allow_promotion_codes: true | 4 | Feature flag |
| returns url on success | 4 | Response shape |
| returns HTTP 200 on success | 4 | Status code |
| returns 500 when Stripe throws | 4 | Error handling |

### src/app/api/billing/webhook/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (20 tests) | 4 | Webhook handler with Stripe signature verification, checkout.session.completed for multiple products, subscription lifecycle, error handling |

### src/app/api/discovery/__tests__/upload-security.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (16 tests) | 4 | Security tests for prompt injection, zip bomb handling, MIME validation, session ID validation, rate limiting IP extraction |

### src/app/api/discovery/upload/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (16 tests) | 4 | Rate limiting, field validation, file validation for image/ZIP/JSON platforms, size limits |

### src/app/api/discovery/adaptive/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (8 tests) | 4 | Route handler with auth-free session lookup, happy path, validation, error handling |

### src/app/api/discovery/analyze/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (10 tests) | 4 | Route handler with session lookup, idempotent analysis caching, error handling |

### src/app/api/discovery/session/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (8 tests) | 4 | Session creation with validation, rate limiting, DB error handling |

### src/app/api/workspace/[projectId]/settings/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (~10 tests) | 4 | Auth, ownership, validation, update, error handling |

### src/app/api/workspace/[projectId]/ask-question/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (~8 tests) | 4 | Auth, ownership, AI call shape, error handling |

### src/app/api/workspace/[projectId]/bookings/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (~12 tests) | 4 | Auth, CRUD, Zod validation, error handling |

### src/app/api/workspace/[projectId]/generate-plan/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (~10 tests) | 4 | Auth, ownership, AI call shape, plan insertion, error handling |

### src/app/api/workspace/[projectId]/cards/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (~15 tests) | 4 | Auth, CRUD for kanban cards, reorder endpoint, validation |

### src/app/api/workspace/[projectId]/improve-prompt/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (~8 tests) | 4 | Auth, ownership, AI call shape, acceptance criteria in prompt, error handling |

### src/app/api/workspace/[projectId]/generate-proposal/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (~8 tests) | 4 | Auth, ownership, AI call shape, output constraints, error handling |

### src/app/api/workspace/[projectId]/apply-template/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (~8 tests) | 4 | Auth, ownership, template application, card insertion, works with each template id |

### src/app/api/workspace/[projectId]/wishes/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (~10 tests) | 4 | Auth, ownership, wishes CRUD with PATCH merge, validation |

### src/app/api/workspace/[projectId]/build/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| sseStreamFromGenerator tests (4 tests) | 5 | Real SSE stream generation with ReadableStream consumption |
| All route handler tests (~12 tests) | 4 | Auth, ownership, SSE headers, double-submit prevention, concurrent build guard |

### src/app/api/workspace/[projectId]/agent/tasks/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (~10 tests) | 4 | Auth, ownership, approve/reject actions, error types, state transitions |

### src/app/api/workspace/[projectId]/agent/events/__tests__/route.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (~8 tests) | 4 | Auth, ownership, JSON vs SSE response modes, empty events, error handling |

### src/__tests__/integration/schema.test.ts
| Test | Score | Issue |
|------|-------|-------|
| All tests in this file (14 table smoke tests) | 5 | Real database insert + select + delete for every table; skipped without DATABASE_URL |

### src/__tests__/integration/critical-flows.test.ts
| Test | Score | Issue |
|------|-------|-------|
| user -> project -> load | 5 | Real DB multi-table flow |
| user -> project -> agent task -> query pending | 5 | Real DB multi-table flow |
| user -> project -> domain -> query active | 5 | Real DB multi-table flow |

### apps/web/src/__tests__/integration/auth-flows.test.ts
| Test | Score | Issue |
|------|-------|-------|
| creates user with hashed password and verifies it matches | 5 | Real DB insert + select with SHA-256 hash roundtrip |
| creates user with reset token and queries by hashed token | 5 | Real DB update + query by hashed token; verifies token lookup |
| increments tokenVersion and verifies old version does not match | 5 | Real DB token version increment + stale version assertion |
| verifies project ownership returns the project for correct user | 5 | Real DB compound WHERE (project + userId) |
| verifies different userId returns empty (ownership denied) | 5 | Real DB authorization boundary; two users, cross-access denied |

### apps/web/src/__tests__/integration/agent-flows.test.ts
| Test | Score | Issue |
|------|-------|-------|
| transitions proposed -> approved -> executing -> verifying -> done | 5 | Real DB full state machine walkthrough with timestamp assertions |
| inserts 3 proposed tasks and queries pending count | 5 | Real DB batch insert + filtered query |
| inserts agent event and verifies shape | 5 | Real DB insert + shape verification including Date instance check |
| inserts task and event for same project and verifies both reference it | 5 | Real DB cross-table referential integrity via projectId |

### apps/web/src/__tests__/integration/booking-flows.test.ts
| Test | Score | Issue |
|------|-------|-------|
| inserts active subdomain and queries it back | 5 | Real DB insert + compound WHERE (projectId + state) |
| inserts booking_confirmation task and queries by project and type | 5 | Real DB with JSONB payload roundtrip verification |
| throws on duplicate domain string | 5 | Real DB uniqueness constraint enforcement |

### apps/web/src/__tests__/integration/auth-routes.test.ts
| Test | Score | Issue |
|------|-------|-------|
| inserts user with bcrypt-hashed password and retrieves by email | 5 | Real DB insert + select; verifies bcrypt hash format and roundtrip with verifyPassword |
| selects exactly 1 row by email with eq() | 5 | Real DB lookup via createTestUser helper; verifies single-row semantics |
| stores hashed reset token with expiry and retrieves by token + validity | 5 | Real DB update + compound WHERE (hashed token + non-expired); exercises hashToken |
| consumes reset token atomically -- second UPDATE returns 0 rows | 5 | Real DB atomic UPDATE...RETURNING; proves TOCTOU safety on token consumption |
| verifies email via token lookup and marks emailVerified=true | 5 | Real DB multi-step: insert with verifyToken, lookup, update, re-read; verifies token nulled |
| increments tokenVersion from 0 -> 1 -> 2 | 5 | Real DB SQL expression increment; verifies atomic counter semantics |
| inserts user with authProvider=google and emailVerified=true | 5 | Real DB insert with OAuth fields; verifies all persisted columns |
| throws unique constraint error on duplicate email insert | 5 | Real DB uniqueness constraint enforcement; proves schema guard |
| incrementing tokenVersion invalidates sessions holding the old version | 5 | Real DB token version increment + stale version comparison; full invalidation proof |

### apps/web/src/__tests__/integration/workspace-routes.test.ts
| Test | Score | Issue |
|------|-------|-------|
| create user -> create project -> list by userId -> verify count=1 | 5 | Real DB multi-table flow; user + project creation + filtered query |
| stores templateId correctly | 5 | Real DB insert with templateId + re-read verification |
| inserts parent + children and verifies parentId relationships | 5 | Real DB hierarchical insert; verifies parent/child FK and count |
| streaming -> completed sets completedAt | 5 | Real DB status transition with sql`now()`; verifies Date instance |
| inserts build file and verifies shape | 5 | Real DB insert across builds + buildFiles; verifies content-addressed fields |
| updates same (projectId, path) with new contentHash and increments version | 5 | Real DB upsert-style update with SQL expression version++; verifies atomicity |
| debit + credit ordered by createdAt | 5 | Real DB insert two transactions + ordered select; verifies amount signs and reasons |
| JSONB round-trips correctly | 5 | Real DB JSONB write + read; verifies deep equality of nested structure |
| soft-deleted project excluded from WHERE deletedAt IS NULL | 5 | Real DB soft delete; verifies IS NULL filter excludes marked rows |
| user B cannot see user A projects | 5 | Real DB multi-user isolation; two users, cross-access returns empty |

### apps/web/src/__tests__/integration/agent-operations.test.ts
| Test | Score | Issue |
|------|-------|-------|
| transitions proposed -> approved -> executing -> verifying -> done with all timestamps | 5 | Real DB full 5-state machine walkthrough; verifies every timestamp is Date instance |
| transitions proposed -> approved -> executing -> failed -> escalated | 5 | Real DB failure + escalation path; verifies JSONB result payload at each step |
| transitions proposed -> rejected | 5 | Real DB single-step rejection; verifies terminal state persisted |
| tasks in project A do not appear in project B queries | 5 | Real DB cross-project isolation; two projects, scoped query returns 1 |
| inserts 5 events and verifies order and types | 5 | Real DB sequential insert of 5 event types; verifies createdAt ordering and type strings |
| inserts agent event with userId=null for system-initiated events | 5 | Real DB nullable FK; verifies system events persist without user reference |
| stores and retrieves autoApprove JSONB structure in wishes | 5 | Real DB JSONB update on projects; verifies nested boolean access pattern |

### apps/web/src/__tests__/integration/billing-flows.test.ts
| Test | Score | Issue |
|------|-------|-------|
| debits and credits token balance correctly | 5 | Real DB SQL expression arithmetic on tokenBalance; verifies 200 -> 150 -> 175 |
| inserts token transaction and verifies shape | 5 | Real DB insert + re-read; verifies all columns including referenceId and createdAt |
| inserts ai call log entry and verifies kind, model, tokens | 5 | Real DB insert across users + projects + aiCallLog; verifies 10+ columns |
| throws CHECK constraint when balance would go negative | 5 | Real DB CHECK constraint enforcement; proves schema-level negative balance guard |
