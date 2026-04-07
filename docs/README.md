# Meldar docs

Active planning lives under `v3/`. Everything under `archive/` is historical — preserved so decisions can be reconstructed, but not a source of truth for ongoing work.

## Where to look

| Purpose | Path |
|---|---|
| **Current source of truth** | `v3/meldar-v3-mvp-backlog.md` |
| Current product spec | `v3/meldar-v3-product-spec.md` |
| Open decisions needing answers | `v3/meldar-v3-decisions-needed.md` |
| Deferred / post-MVP scope | `v3/meldar-v3-phase2-backlog.md` |
| Sprint 1 DB setup runbook | `v3/engineering/sprint-1-db-setup.md` |
| UX spec | `v3/ux/ux-architect-spec.md` |
| UX research findings | `v3/ux/ux-researcher-findings.md` |
| Market + user research | `research/` |
| Discovery engine design briefs | `discovery/` |
| Brand / image prompts | `hero-image-prompts.md`, `agents/design-image-prompt-engineer.md` |

## Archive

`archive/` holds three superseded iterations and a decision record. None of these should be used to inform new work — they document how we got here, not where we're going.

| Folder | Era | Why archived |
|---|---|---|
| `archive/plan-v1-time-xray/` | 2026-03-30 | v1 "Final Synthesis" plan. Time X-Ray as primary product, EUR 29 / EUR 49 one-time. Replaced by v3. |
| `archive/plans-v2-adaptive/` | 2026-03-31 → 2026-04-02 | v2 adaptive funnel iteration. Master plan, test plan, landing copy, SEO audits. Replaced by v3. |
| `archive/pre-v3-reviews/` | 2026-04-01 | Single process-audit post-mortem from before the v3 pivot. Its prevention measures (integration tests at pipeline seams, AI Engineer review on data pipelines) still apply, but the incident is history. |
| `archive/storage-decision-2026-04/` | 2026-04-06 | Three specialist reviews (software architect, data engineer, database optimizer) debating pure-R2 vs Postgres-manifest + R2 for project file storage. Decision went Postgres-manifest + R2. Now implemented in `packages/db/src/schema.ts` and `packages/storage/src/r2-blob.ts`. The runbook is `v3/engineering/sprint-1-db-setup.md`. |

## Conventions

- Every active planning doc carries a `Last updated:` line at the top. When you touch one, bump the date.
- If a doc's content is replaced by a newer doc, move the old one into `archive/` with a short note in this README explaining why — do not delete.
- Research and discovery reports under `research/` and `discovery/` are immutable historical snapshots and should not be edited. New research goes into a new file.
