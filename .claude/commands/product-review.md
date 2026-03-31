---
description: "Run a 3-phase product review with 10 specialist agents + QA evidence collector. Phases: discovery questions, live site testing, cross-review grilling. Usage: /product-review [optional focus area]"
---

# Product Review — 3-Phase Agent Team Audit

You are an **Orchestrator** — autonomous pipeline manager who coordinates specialist agents through a structured 3-phase review.

Run this as a CreateTeam with team name `product-review`.

## Phase 1: Discovery Questions (All agents in parallel)

Spawn 10 agents. Each reads the codebase and writes questions/observations to `docs/product-review/phase1/`.

### Agents to spawn:

**1. Sprint Prioritizer** (`sprint-pri`)
- Expert in backlog prioritization and resource allocation
- Task: Read codebase, identify what's over-built vs under-built for current stage. What should be cut? What's blocking revenue?
- Output: `docs/product-review/phase1/sprint-prioritizer.md`

**2. Trend Researcher** (`trend-res`)
- Market intelligence analyst
- Task: Read the product, compare to current market. What's the competitive landscape? What trends are we missing or riding?
- Output: `docs/product-review/phase1/trend-researcher.md`

**3. Feedback Synthesizer** (`feedback-syn`)
- Transforms perspectives into decisions
- Task: Read all existing review docs in `docs/reviews/`, `docs/product-rethink/`, `docs/discovery-brainstorm/`. What patterns emerge? What keeps getting flagged but not fixed?
- Output: `docs/product-review/phase1/feedback-synthesizer.md`

**4. Behavioral Nudge Engine** (`nudge-eng`)
- Behavioral psychology expert
- Task: Read all UI components in `src/features/` and `src/entities/`. Where are commitment escalation gaps? Where does the emotional arc break? What's the #1 conversion killer?
- Output: `docs/product-review/phase1/nudge-engine.md`

**5. Product Manager** (`pm`)
- Full lifecycle product leader
- Task: Read CLAUDE.md + all pages. Does the product validate the core hypothesis? What's the #1 risk? What metric should we track?
- Output: `docs/product-review/phase1/product-manager.md`

**6. Social Media Strategist** (`social`)
- Cross-platform strategy expert
- Task: Review shareable cards, OG images, viral mechanics. Would Gen Z actually share this? What's missing for TikTok/Twitter/Instagram virality?
- Output: `docs/product-review/phase1/social-strategist.md`

**7. UX Researcher** (`ux-res`)
- User behavior and usability expert
- Task: Walk through every user flow in code. Where are friction points? Where do users drop off? What's confusing?
- Output: `docs/product-review/phase1/ux-researcher.md`

**8. UX Architect** (`ux-arch`)
- Technical architecture + UX foundation specialist
- Task: Review component hierarchy, CSS system, responsive patterns. Is the design system consistent? Any foundation gaps?
- Output: `docs/product-review/phase1/ux-architect.md`

**9. Visual Storyteller** (`visual`)
- Visual communication and brand specialist
- Task: Review all visual elements — cards, gradients, typography, OG images. Does it feel like "Meldar" or generic AI slop? What's memorable?
- Output: `docs/product-review/phase1/visual-storyteller.md`

**10. Rapid Prototyper** (`proto`)
- Ships fast, cuts scope
- Task: Read the codebase and backlog. What can be shipped in 4 hours that would 10x the product? What should be deleted?
- Output: `docs/product-review/phase1/rapid-prototyper.md`

**Each agent MUST:**
- Read `CLAUDE.md` for context
- Read relevant source files (not just describe what they'd review)
- List specific files/lines they examined
- End with 3-5 specific questions they need the QA agent to verify on the live site

## Phase 2: Evidence Collection (QA Agent Solo)

After Phase 1 completes, spawn the **Evidence Collector** (`evidence-qa`).

This agent:
1. Reads ALL Phase 1 files to collect every question/verification request
2. Uses browser automation (mcp__claude-in-chrome__ tools or Playwright) to:
   - Visit every page on meldar.ai (/, /xray, /quiz, /discover, /discover/overthink, /discover/sleep, /xray/[test-id], /thank-you, /coming-soon, /privacy-policy, /terms)
   - Take screenshots of each page (mobile + desktop viewport)
   - Test interactive flows (upload zone, quiz progression, purchase buttons, share actions)
   - Check OG image rendering
   - Verify all CTAs lead where they should
   - Test error states
   - Check mobile responsiveness
3. Writes evidence report to `docs/product-review/phase2/evidence-report.md` with:
   - Screenshots referenced by filename
   - Pass/fail for each Phase 1 question
   - New issues discovered during testing
   - Specification vs reality gaps

**QA Rules:**
- Screenshot everything. No claim without visual proof.
- Default to FINDING issues. "Zero issues" = insufficient rigor.
- Test on mobile viewport (375px) AND desktop (1280px).
- Check every CTA link destination.
- Verify the screenshot upload guide matches actual iOS Screen Time UI.

## Phase 3: Grilling Round (All agents in parallel)

After Phase 2 completes, send ALL 10 agents the evidence report. Each agent:

1. Reads `docs/product-review/phase2/evidence-report.md`
2. Reads all OTHER Phase 1 files (cross-review)
3. Writes their final grilling review to `docs/product-review/phase3/{agent-name}-grills.md`

**Each grilling review MUST:**
- Call out hallucinations from Phase 1 (things they assumed that the evidence disproves)
- Identify the top 3 REAL issues (backed by evidence)
- Rate severity: CRITICAL / HIGH / MEDIUM / LOW
- Provide specific, actionable fixes (file paths, line numbers)
- State what's ACTUALLY good (backed by evidence)

## Final Synthesis

After Phase 3 completes, the orchestrator synthesizes into `docs/product-review/SYNTHESIS.md`:

1. **Issues by severity** — deduplicated across all agents
2. **Top 5 actions** — ranked by impact, with estimated hours
3. **What's working** — consensus positives
4. **What to kill** — things that hurt the product
5. **Verdict** — is the product ready for testers? What's blocking revenue?

Then shutdown all agents and report to the user.

## Arguments

$ARGUMENTS — Pass any specific focus area or concern to all agents (e.g., "focus on the screenshot upload flow" or "evaluate the new discovery quizzes")
