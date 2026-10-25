# REVIEW REQUEST

## 1. Executive Summary
The Nexa platform currently has a partially complete V1 architecture. The backend is operational but needs engine hardening, the UI has missing pages and relies on fallback data, and advanced domains (Winder, Desktop) are unbuilt. The recommended path is to execute Track B (Backend B0-B15) to freeze the API, followed by Track U (UI U0-U7) to achieve pixel-fidelity with the reference. Estimated effort: 35-40 weeks (Backend) + 17-20 weeks (UI).

## 2. Key Findings
- Missing 404 pages in UI for Tasks, Approvals, Memory, History.
- Fallback data shown because the DB is empty (scan not run).
- Postgres with pgvector is running, but Redis usage for BullMQ needs confirmation.
- 27 packages exist, but need strict contract hardening (idempotency, verify).

## 3. Decisions Needing the Human
- **D1: Parallel-UI mode.** (Default: No. Build Backend first). Consequence: UI waits until API is frozen.
- **D3: Upgrade/Pro Plan badge.** (Default: Visual only). Consequence: No real billing system is built.
- **D4: Asset Generation.** (Default: Use placeholders, then AI generation).
- **D6: Light Theme.** (Default: Dark theme matches reference; derive light theme later).

## 4. What Will Change
- Core packages refactored to enforce the Tool/Agent contract.
- Missing UI pages will be built to exactly match `nexa-command-center.png`.
- New tables/columns for `userId` and `domain`.

## 5. What Will Not Change
- The foundational tech stack (Turborepo, NestJS, Next.js, Postgres).

## 6. Risks
- Risk of account bans from ATS platforms during auto-apply.
- Cost overruns from LLM usage (mitigated by strict token budgets and kill-switch).

## 7. Review Checklist
- [x] Plan and TODOs generated.
- [x] Architecture diagrams (drawio layout).
- [x] Verification plan documented.

## 8. Proposed First Milestone
**Milestone B0 - Prove V1**
Command to run first: `npm run verify:v1` (to baseline current jobs domain and telemetry).
