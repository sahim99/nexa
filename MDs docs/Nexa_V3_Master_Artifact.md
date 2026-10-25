# Nexa V3 — Master Artifact: Backend First, UI Second
## Hardened, Sequenced, Testable Plan for a Fully Functional Personal AI OS — with the Reference UI

**Status:** V3. Supersedes `Nexa_V2_Final_Master_Plan.md` and the earlier V2.1 plan. Adds: two build tracks (Backend first, UI second), a pixel-faithful UI specification built from the reference screenshot, a widget→data→API binding map, a self-bootstrapping planning workflow with a human review gate, and a verification phase with evidence rules.
**Keeps:** The V2 vision (universal personal AI OS, domain-agnostic core, Agent OS, Tool OS, Memory OS, Desktop Agent) and the V2.1 security and engineering hardening (now folded into this document).
**Companion file:** `nexa-command-center.png` — the UI reference image. The human provides it together with this document.

---

# 0. How the Agent Must Use This Document

1. This file is the single source of truth for **what to build and in what order**.
2. Work **one milestone at a time** (Track B: B0 → B15, then Track U: U0 → U7). Never start the next milestone until the Exit Gate of the current one passes.
3. Every milestone has **Acceptance Tests**. A milestone is done only when those tests exist in the repo, run in CI/locally, and pass.
4. If reality contradicts this plan (a package already does something, a decision is wrong), **write an ADR** in `docs/adr/` and continue. Do not silently deviate.
5. **Stop and ask the human** in the situations listed in Section 12.
6. Do not claim anything is "complete" or "verified" without showing the passing test output or a real run log.
7. Never display fake data, fake metrics or fake activity in any non-demo mode.
8. **On first receiving this document, run Section 0A (Bootstrap Protocol) and stop at the Review Gate.** Do not modify source code until the human approves.
9. **Verification (Section 10B) is mandatory.** A task is complete only when `VERIFIED` with stored evidence.
10. This document is the **main document**: keep a synced copy at `Version-One-Planning-Improvement/00_MAIN_PLAN.md`.
11. **Build order is fixed: Track B (backend) completes through Gate B-UI-READY before Track U (UI) starts** (Section 10), unless the human grants Parallel-UI mode in writing (Section 20, D1).
12. **The UI must match the reference screenshot** (Section 16) and be **fully functional**: every control has a real backend action, every number comes from the backend, every widget has loading/empty/error states.
13. The reference image shows sample data. Treat it as **test fixture content only**; never ship fake data (Section 2, invariants 11 and 16).

---

# 0A. Bootstrap Protocol — Runs First, Before Any Code

When the human gives you this document, you do **not** start coding. You analyze, plan, document, ask for review, and **stop**. Coding starts only after an explicit approval.

```text
GIVE DOC
  → A1 Create planning folder
  → A2 Analyze the current codebase
  → A3 Gap analysis (current vs. target)
  → A4 Think deeply → end-to-end plan
  → A5 Phase-wise TODO list
  → A6 Architecture diagrams (draw.io)
  → A7 Verification plan
  → A8 REVIEW GATE  ■ STOP — ask the human ■
  → human review (APPROVED / APPROVED WITH CHANGES / REJECTED)
  → A9 Implementation, milestone by milestone (each ends with a Part V verification gate)
  → A10 Final acceptance and handover
```

**Hard rule:** Until approval is recorded in `08_DECISION_LOG.md`, you may only create or modify files **inside the planning folder**. Source code, migrations, configs, `package.json`, and the database are read-only. You may run read-only commands and build/typecheck/test commands against a scratch database. Do not run anything that calls paid external APIs, sends messages, or touches production data.

## A1 — Create the Planning Folder

Create the folder **next to this document** (the directory where the human placed it). If that cannot be determined, create it under `docs/`. Folder name:

```text
Version-One-Planning-Improvement/
├── 00_MAIN_PLAN.md            ← a copy of THIS document. It is the controlling document.
│                                 Keep it in sync; never fork it. All work follows it.
├── 01_CODEBASE_ANALYSIS.md    ← A2 output
├── 02_GAP_ANALYSIS.md         ← A3 output
├── 03_END_TO_END_PLAN.md      ← A4 output (every flow, every milestone, refined to this repo)
├── 04_PHASE_TODO.md           ← A5 index: links to the two tracks below, overall progress
├── 04a_BACKEND_TODO.md        ← A5 output: Track B (P-A, B0–B15, Gate B-UI-READY)
├── 04b_UI_TODO.md             ← A5 output: Track U (U0–U7, Gate FINAL)
├── 05_ARCHITECTURE.drawio     ← A6 output (multi-page draw.io file)
├── 05_ARCHITECTURE_exports/   ← PNG/SVG exports of each page, if an exporter is available
├── 06_VERIFICATION_PLAN.md    ← A7 output (criteria, traceability matrix, evidence rules)
├── 09_API_CONTRACT.md         ← generated from OpenAPI; every endpoint and SSE event with examples
├── 10_UI_SPEC.md              ← refined Section 16–17 with measured values; full control inventory
├── ui-reference/              ← nexa-command-center.png, crops/, design-tokens.json, measurements.json
├── 07_RISK_REGISTER.md        ← risks, likelihood, impact, mitigation, owner
├── 08_DECISION_LOG.md         ← every decision, approval, plan change (append-only)
├── REVIEW_REQUEST.md          ← A8 output (what the human must review)
├── adr/                       ← one file per architecture decision (Section 3 + new ones)
├── progress/                  ← MILESTONE-Mx.md reports written during implementation
└── verification/
    ├── reports/               ← VERIFICATION_REPORT-Mx.md, FINAL_VERIFICATION_REPORT.md
    └── evidence/              ← logs, test output, screenshots, traces, query results
```

Write the planning artifacts in the order A2 → A8. Commit after each artifact on a branch named `nexa/planning`.

## A2 — Analyze the Current Codebase (`01_CODEBASE_ANALYSIS.md`)

Gather facts, not impressions. Every statement must cite a file path, command output, or test result. Do all of the following:

1. **Repo inventory:** directory tree (2–3 levels), languages, package manager, workspace layout, Node/TS versions, scripts in every `package.json`.
2. **Package graph:** for each package under `packages/` and `apps/`: purpose, public exports, internal imports (who imports whom), external dependencies, number of source files, number of tests. Detect cycles and unused packages. Classify each as `USED`, `PARTIAL`, `SCAFFOLD`, or `UNUSED`.
3. **Backend map:** all NestJS modules, controllers, routes (method + path), guards, providers; which routes call which packages.
4. **Frontend map:** every Next.js route, which components and hooks each uses, which API endpoints each calls, where fallback/demo data exists, which sidebar links have no page.
5. **Data layer:** Prisma schema models, relations, indexes, migrations state, pgvector usage, seed scripts. Note missing `userId`/`domain` columns relative to Section 2 invariant 8.
6. **Infrastructure:** `docker-compose*.yml` services (is Redis present?), env var **names** required (never values), ports, how to boot from a clean clone.
7. **Run the toolchain** against a scratch database and record results: install, build, typecheck, lint, unit tests, e2e tests. Record pass/fail counts and failures verbatim.
8. **Runtime reality check:** boot the stack; call health endpoints; list what actually works vs. what the status docs claim. Do **not** trust prior status reports; verify each claim ("27 packages wired", "backend verified").
9. **Quality signals:** test coverage if available, TODO/FIXME count, duplicated logic, dead code, hard-coded data, secrets in repo history (scan), dependency vulnerabilities (`npm audit`), large files.
10. **Git state:** current branch, uncommitted changes, recent commits, pending IDE-proposed edits. Do not discard anything; report it.
11. **Existing docs:** read V1 plan, V2 plan, this document, any README/ADR; list contradictions between docs and code.
12. **UI analysis:** inventory `apps/web` against the reference screenshot (`ui-reference/`) and Section 16: which components, pages and routes exist, what is hard-coded or fallback data, which sidebar items 404, which widgets lack an endpoint (compare with Section 17), design-system state, bundle size, Lighthouse baseline. Measure the reference PNG (region boxes, colors, type sizes) with a script and save `measurements.json` and `design-tokens.json`.

Output structure: `Summary → Evidence tables → What works → What is broken/missing → Surprises → Open questions`.

## A3 — Gap Analysis (`02_GAP_ANALYSIS.md`)

Compare **target** (this document, V1/V2 plans) with **current** (A2). Produce:

| ID | Requirement (source section) | Current state (evidence path) | Gap | Severity S0–S3 | Milestone | Verification ID |
|---|---|---|---|---|---|---|

Rules:
- Every invariant in Section 2 and every acceptance test in Section 10 appears at least once.
- Add gaps this document missed. If the code reveals a better approach than the plan assumes, record it as an **ADR proposal** (do not silently deviate).
- Flag plan assumptions that are false in this repo (e.g., "Redis present", "Prisma schema has `userId`").
- Mark each gap `BLOCKER`, `MUST`, `SHOULD`, or `LATER`.
- Include **UI gaps** (existing `apps/web` vs. the reference and Section 16) and **API gaps**: for every row of Section 17 and every control in Section 16.8, mark `SERVED` or `MISSING` with the milestone that closes it.

## A4 — Think Deeply, Then Write the End-to-End Plan (`03_END_TO_END_PLAN.md`)

Think before writing. For each major decision: list at least two alternatives, compare on risk, effort, reversibility and fit with the algorithm-first principle, choose one, and record the rejected options and why in `08_DECISION_LOG.md`. Apply the "best possible solution" test: *Is this the simplest design that satisfies the invariants and can be verified by tests?*

The plan must contain, for this specific repo:

1. **Target architecture** (Section 15 mental model, adapted to the actual package names).
2. **Current → target mapping:** which existing packages are kept, refactored, merged, deleted, or newly created. No rewrite unless an ADR justifies it.
3. **Two tracks:** Track B milestones **B0–B15** and Gate B-UI-READY, then Track U milestones **U0–U7** and Gate FINAL (Section 10), refined with concrete task lists, files to touch, dependencies, and effort estimates (best/likely/worst). Backend first; the UI starts only after the API contract is frozen.
4. **Every flow** in Section 10C, each written out with: trigger → components involved → data read/written → policy/approval points → failure modes → recovery → verification test ID.
5. **Data model changes:** migrations needed, ordering, backward compatibility, rollback.
6. **API changes:** new/changed endpoints with request/response schemas.
7. **Security plan:** how each Section 5 control is implemented in this codebase and where it is enforced.
8. **Test plan summary** linking to `06_VERIFICATION_PLAN.md`.
9. **Rollout plan:** feature flags, environments, rollback procedure.
10. **Critical path and parallelizable work** (a dependency graph).
11. **Top 10 risks** and mitigations (full list in `07_RISK_REGISTER.md`).

## A5 — Phase-wise TODO Lists (`04_PHASE_TODO.md`, `04a_BACKEND_TODO.md`, `04b_UI_TODO.md`)

`04a_BACKEND_TODO.md` has one section per phase: `P-A Planning`, `B0 … B15`, and `Gate B-UI-READY`. `04b_UI_TODO.md` has `U0 … U7` and `Gate FINAL`. `04_PHASE_TODO.md` is an index with overall progress. Every task uses this exact format so progress can be tracked mechanically:

```markdown
- [ ] **U3-T02** — Build `/approvals` page with payload display and expiry countdown
  - depends_on: U0-T05, B2-T09 (approvals API, contract frozen)
  - files: apps/web/src/app/approvals/page.tsx, apps/api/src/approvals/*
  - requirement_ids: R-APPR-01, R-UI-02
  - acceptance: E2E-04, E2E-05 pass; unit tests for payload-hash check
  - verify_cmd: `npm run test:e2e -- approvals`
  - evidence: verification/evidence/U3/approvals-e2e/
  - effort: M (≈ 1 day)   risk: low   status: TODO | IN_PROGRESS | BLOCKED | DONE | VERIFIED
```

Rules: a task becomes `DONE` when code is merged; it becomes `VERIFIED` only when its `verify_cmd` passes and evidence exists. Milestone completion requires **all** tasks `VERIFIED`. Update checkboxes and statuses as work proceeds. Never delete tasks; mark `DROPPED` with a reason.

## A6 — Architecture Diagrams in draw.io (`05_ARCHITECTURE.drawio`)

Create one `.drawio` file (diagrams.net / mxfile XML) with **separate pages (tabs)**:

| Page | Content |
|---|---|
| 1 System Context | User, channels (web, Telegram, desktop), Nexa, external systems (LLMs, Gmail, Winder, ATS, web) |
| 2 Package Architecture | Current packages vs. target packages; color-coded keep/refactor/new/deprecate |
| 3 Request-to-Action Flow | Command → router → plan → engine → policy → tool → verify → activity |
| 4 Task State Machine | All states and transitions from Section 4.3 |
| 5 Approval & Policy Flow | Policy decision, payload hash, expiry, approve/reject/execute |
| 6 Security Trust Zones | Zones A/B/C, quarantined extraction, taint boundary, credential broker |
| 7 Core Data Model (ERD) | Core entities with `userId`, `domain`, key relations |
| 8 Deployment Topology | Vercel, API/workers, Postgres, Redis, secrets, staging/prod |
| 9 Desktop Agent Channel | Pairing, outbound channel, local policy, sandbox, kill switch |
| 10 Roadmap & Dependencies | Tracks B0–B15 and U0–U7 with dependencies and gates |
| 11 App Shell Wireframe | Sidebar, top bar, main grid, assistant panel with measured regions (from Section 16.1) |
| 12 UI Routes & Component Tree | Every route, page, shared component, and data hook |
| 13 Page → API Map | Section 17 binding map as a diagram |
| 14 Realtime Event Flow | SSE events from engine to widgets (task, approval, activity, voice, health) |
| 15 Voice Pipeline | Mic → STT → Manager → task → TTS, with orb states and approval boundary |

Diagram rules:
- Uncompressed, well-formed XML with unique cell ids; descriptive labels; a legend on each page (grey = existing, blue = new, orange = refactor, red = high-risk/approval, dashed = deferred).
- Every box that exists in code uses the real package/module name.
- Validate by parsing the XML (e.g., Python `xml.etree`). If a draw.io CLI/exporter is available, export each page to PNG/SVG into `05_ARCHITECTURE_exports/`. If not, say so in the review request.
- Keep diagrams consistent with `03_END_TO_END_PLAN.md`; if the plan changes, update the diagrams in the same commit.
- A minimal valid seed is in Appendix B.

## A7 — Verification Plan (`06_VERIFICATION_PLAN.md`)

Instantiate Part V for this repo: concrete commands, test file locations, fixtures, evidence folder layout, the requirement → task → test → evidence **traceability matrix**, and which gates need human sign-off. No requirement may exist without a test ID.

## A8 — Review Gate (`REVIEW_REQUEST.md`) — STOP HERE

Write `REVIEW_REQUEST.md` containing:

1. **Executive summary** (10 lines max): current state, target, recommended path, total effort range.
2. **Key findings** from A2 (top 10, with evidence links).
3. **Decisions needing the human** — must include D1–D10 from Section 20 plus any new ones (maximum 15), each with options, the recommended default, and the consequence of each.
4. **What will change** in the repo (packages created/changed/removed, migrations, new infra).
5. **What will not change.**
6. **Risks** that need human attention (cost, external side effects, ToS, production data).
7. **Review checklist** the human can tick (plan, TODO, diagrams, verification plan, risks).
8. **Proposed first milestone** and the exact command that will be run first.

Then **stop and send this message to the human**:

```text
Planning package is ready in <path>/Version-One-Planning-Improvement/.
Please review REVIEW_REQUEST.md first, then 03_END_TO_END_PLAN.md, 04a_BACKEND_TODO.md,
04b_UI_TODO.md, 10_UI_SPEC.md and 05_ARCHITECTURE.drawio. Reply with one of:
  APPROVED
  APPROVED WITH CHANGES: <list>
  REJECTED: <reasons>
I will not modify source code until you approve.
```

Handling the reply:
- **APPROVED:** record approval in `08_DECISION_LOG.md` (timestamp, scope, SHA-256 of `03_END_TO_END_PLAN.md`, `04a_BACKEND_TODO.md`, `04b_UI_TODO.md` and `10_UI_SPEC.md`), then start A9.
- **APPROVED WITH CHANGES:** apply the changes to the plan, TODO, diagrams and decision log. If a change is material (scope, security, cost, order), show a short diff summary and ask once more; otherwise proceed.
- **REJECTED:** revise the affected artifacts, regenerate `REVIEW_REQUEST.md`, and ask again.
- Silence or ambiguity is **not** approval.

## A9 — Implementation Phase

After approval:

1. Work **Track B first** (B0 → B15), then run Gate B-UI-READY and ask for sign-off; only then start **Track U** (U0 → U7). Follow the per-task loop in Section 12.
2. Use a branch per milestone (`nexa/b0-prove-v1`, …, `nexa/u1-dashboard`, …) and small commits referencing task IDs.
3. Update `04_PHASE_TODO.md` statuses and write `progress/MILESTONE-Mx.md` as you go.
4. At the end of each milestone run the **Part V verification gate** and write `verification/reports/VERIFICATION_REPORT-Mx.md`.
5. **Milestone sign-off:** by default, stop at the end of every milestone and ask the human to review the verification report. The human may grant *autopilot* for named milestones in writing (e.g., "autopilot B2–B3"). Milestones with real external side effects (B7, B9, B10, B13, B14), Gate B-UI-READY, Gate FINAL, and any production deployment **always** require human sign-off.
6. **Change control:** if the plan must change, update `03`, `04`, diagrams and `08_DECISION_LOG.md` first, tell the human, and ask for approval if the change is material.
7. If blocked, mark the task `BLOCKED`, explain, and ask. Never work around a failing gate by weakening the test.

## A10 — Final Acceptance and Handover

After Gate FINAL (or the last approved milestone): run the full end-to-end verification suite (Part V.5), write `verification/reports/FINAL_VERIFICATION_REPORT.md`, generate `FINAL_ACCEPTANCE_WALKTHROUGH.md` (a ~30-minute script the human can follow to confirm the system works), update the architecture diagrams to "as built", and ask for final sign-off.

---

# 1. What Changed from V2 and Why

| # | Gap found in V2 | Fix in V3 |
|---|---|---|
| G1 | 12 phases, no MVP slice; V1 itself was never proven end-to-end | B0 "Prove V1" and B1 "API foundations" come first |
| G2 | Premature abstraction (dynamic capability matching, plugins, custom-agent platform) built from a single domain | Static registry first; generalize only after a **second domain (Winder)** is added without touching the Manager (B6 gate). Plugins/custom agents deferred |
| G3 | Four LLM layers per request (Interaction → Manager → Plan Compiler → Context Engine): slow, costly, contradicts algorithm-first | **Router-first**: deterministic intent routing; at most **one** planning LLM call, only when routing is ambiguous |
| G4 | Prompt-injection defense named, not designed; high-privilege tools (email, browser, shell, refunds) sit behind LLMs that read untrusted content | Section 5: trust zones, taint tracking, quarantined extraction, payload-bound approvals |
| G5 | Approval system lacks payload binding, expiry, fatigue control, standing policies | Section 5.4 |
| G6 | "Verified Action" undefined | Every side-effecting tool declares a `verify()` postcondition (Section 4) |
| G7 | Durable execution engine is being reinvented | ADR-2: Postgres step-state machine + BullMQ (Redis already in the stack); Temporal only if proven insufficient |
| G8 | Desktop Agent: no transport, no sandbox, command allowlists are bypassable | ADR-7: outbound-only channel, device keypair, workspace-root sandbox, **named recipes instead of raw shell** |
| G9 | Winder access via "API / Supabase" invites a service-role key in the agent's reach | ADR-6: narrow versioned Winder admin API, read-only first, staging first |
| G10 | Auth, tenancy, secrets, environments, backups, CI not specified | ADR-1 (single-user-first, `userId` on every row), Section 9 |
| G11 | Memory OS has no write policy, provenance, deletion, or poisoning defense | Section 6 |
| G12 | Evaluation lists metrics without datasets or thresholds | Section 8: golden sets + numeric gates |
| G13 | n8n and the internal workflow scheduler duplicate each other | ADR-8: internal scheduler is authoritative; n8n only for edge webhooks, or removed |
| G14 | Reference research (10 repos) is an unbounded time sink and a supply-chain risk | Section 11: timeboxed, max 3 repos, never run unreviewed code outside a sandbox |
| G15 | Definition of Done is unmeasurable ("understand arbitrary objectives") | Section 13: measurable DoD |
| G16 | State machine lacks approval-expiry, verification and compensation states | Section 4.3 |
| G17 | Cost/rate limits of free LLM tiers not planned for | Section 7: budgets, spend kill-switch, structured-output repair loop |
| G18 | Legal/ToS risk of scraping and auto-apply not addressed | Section 5.8 |
| G19 | Plan had no UI track; the reference screenshot defines a large product surface | Track U (U0–U7) with Section 16 spec, Section 17 binding map, Section 19 fidelity process |
| G20 | Plan deferred voice, finance and custom agents, but the reference UI shows all three | Scoped versions: push-to-talk voice (B11), finance analysis + paper trading only (B12), template-based custom agents (B15); live trading and wake-word stay deferred |
| G21 | Reference metrics (Productivity, Time Saved, trend, health) have no definition and could become fake numbers | Section 17 defines each formula, computed and tested in the backend (B4), with `INSUFFICIENT_DATA` states |
| G22 | UI and backend work would interleave and drift | Backend-first sequencing, OpenAPI contract-first with generated client, contract freeze at Gate B-UI-READY |
| G23 | "Exact same UI" had no measurable meaning | Geometry, token, text, SSIM thresholds plus human side-by-side sign-off (Section 19.2) |
| G24 | Reference shows sample data that conflicts with the no-fake-data rule | Fixture mode limited to tests/Storybook; `verify:no-fixtures-in-prod` gate |
| G25 | "Pro Plan"/"Upgrade" imply billing in a single-user system | Decision D3: Plan & Usage panel, editable label |

---

# 2. Non-Negotiable Invariants

The agent must enforce these in code, not just in prose.

1. **No side effect without a policy decision.** Every tool call passes `PolicyEngine.decide()`. Default is **deny**.
2. **No secret ever enters LLM context** (passwords, API keys, tokens, cookies). Agents request capabilities from the Credential Broker.
3. **Untrusted content never directly drives a privileged tool.** (Section 5.2)
4. **Approvals are bound to an exact payload hash** and expire. (Section 5.4)
5. **Every external write is idempotent** (idempotency key) and **verified** (postcondition check).
6. **At-least-once execution + idempotency**, never assume exactly-once.
7. **Device-dependent work waits, it does not fail:** `WAITING_FOR_DEVICE`.
8. **Every row carries `userId`** (and `domain`). Domain data is isolated by module.
9. **Telemetry is real.** Algorithm share, cost, latency, activity are computed from events only.
10. **Every navigation route exists and has an e2e test.** No 404s in the sidebar.
11. **No demo/fallback data when `NODE_ENV=production`.** In dev it must be visibly labelled "DEMO DATA".
12. **The core Manager contains no domain names** (`job`, `winder`, `trade`). A lint rule enforces it.
13. **Live trading, refunds, deletions, installs and shell execution are never auto-approved by default.**
14. **Backend first, UI second.** The UI is built only against the verified, frozen `/v1` API (unless Parallel-UI mode is granted in writing).
15. **No UI control without a backing endpoint, and no endpoint-less number on screen.** All business metrics are computed in the backend.
16. **Fixture/sample content exists only in tests and Storybook** and is excluded from production bundles (`verify:no-fixtures-in-prod`).
17. **Every widget implements loading, empty (with a useful next action), error and stale states.**
18. **Live trading has no code path.** Finance & Trading is analysis and paper trading only until a new ADR says otherwise.

---

# 3. Architecture Decisions (ADRs, summarized)

Create each as `docs/adr/NNNN-title.md`. Revisit only with evidence.

**ADR-1 — Single user first.** Nexa is a personal system. Build for one user, but put `userId` on every table and use Postgres Row-Level Security-ready design so multi-user is possible later. Auth: one login (e.g., passkey or OAuth) + session; API behind auth from day one.

**ADR-2 — Execution engine: build thin, don't reinvent.** Use a Postgres-backed `task` / `task_step` state machine as the source of truth and BullMQ (Redis) as the dispatcher. Steps are idempotent functions with checkpointed inputs/outputs. Re-evaluate Temporal/Inngest only if B2–B8 show a concrete limitation.

**ADR-3 — Router-first request handling.**
```text
Input → Deterministic Router (commands, regex/intent table, embeddings-lite)
        ├─ match   → typed workflow template (0 LLM calls to plan)
        └─ no match → ONE planning LLM call → validated plan (schema) → engine
```
The "Interaction Agent" and "Universal Manager" are **one module** (`manager`) with two paths. The "Plan Compiler" is a schema validator + DAG builder (code), not an LLM.

**ADR-4 — Registry: static first, dynamic later.** Agents and tools register in code via `defineAgent` / `defineTool`. Capability matching is a lookup table. Dynamic plugin loading is deferred until after Gate FINAL (custom agents in B15 are template-based, not dynamic code plugins).

**ADR-5 — Database.** One Postgres (+pgvector) for Nexa. Local Docker for dev; managed Postgres (Supabase or other) for prod. Winder's database stays **separate**; Nexa never connects to it directly (ADR-6). Migrations via Prisma only. Embedding model and dimension are pinned in config; changing them requires a re-embed migration.

**ADR-6 — Winder access.** Winder exposes a **narrow, versioned admin API** (route handlers with scoped API keys: `products:read`, `products:write`, `orders:read`, `orders:write`, `customers:read`). Nexa calls only that API through typed tools. No service-role Supabase key in Nexa. Build against a **staging** Winder environment first. Customer PII is minimized/masked before entering LLM context.

**ADR-7 — Desktop Agent.**
- Tech: a small signed Node/Tauri daemon (decide in the B13 spike; record result). Windows is the primary target.
- Transport: **outbound-only** authenticated WebSocket (or similar) from laptop to cloud gateway. No inbound ports.
- Identity: per-device keypair; pairing by one-time code; short-lived tokens; revocation list; local kill switch (tray + hotkey).
- Sandbox: file tools restricted to configured **workspace roots** (canonicalize paths, resolve symlinks, deny traversal).
- No raw shell initially. Provide **named recipes** (`run_tests(project)`, `git_status(project)`, `open_folder(project)`) defined locally by the user. Raw `terminal.execute` only later, always approval-gated, with a command-level audit log.
- Browser: start with **Playwright using a dedicated persistent profile** for authenticated sessions. A browser extension bridge is a later option.

**ADR-8 — Orchestration ownership.** The internal scheduler (`packages/workflows`) owns all schedules and triggers. n8n is optional glue for third-party webhooks only; no business logic in n8n.

**ADR-9 — LLM policy.** All calls go through `LLMGateway`. Categories (FAST, REASONING, EXTRACTION, CLASSIFICATION, GENERATION, VISION, VOICE) map to model policies in config. Every structured output is schema-validated with a bounded repair loop (max 2 repairs) then falls back to template/algorithm or fails the step cleanly.

---

# 4. Core Contracts

## 4.1 Capability and Agent
```typescript
type RiskLevel = 'READ' | 'LOW_RISK_WRITE' | 'APPROVAL_REQUIRED' | 'BLOCKED';
type Capability = string; // namespaced: "jobs.discover", "business.products.read"

interface AgentDefinition {
  id: string; version: string; domain: string;
  capabilities: Capability[];
  tools: string[];                 // tool ids it may call (scoped)
  permissions: string[];           // permission scopes required
  inputSchema: ZodSchema; outputSchema: ZodSchema;
  plan?(ctx: AgentContext): Promise<PlanFragment>;   // optional, deterministic preferred
  execute(ctx: AgentContext, input: unknown): Promise<unknown>;
  validate(output: unknown): ValidationResult;
  memoryPolicy: MemoryPolicy;
  retryPolicy: RetryPolicy;
  healthCheck(): Promise<'OK' | 'DEGRADED' | 'DOWN'>;
}
```

## 4.2 Tool
```typescript
interface ToolDefinition<I, O> {
  id: string; description: string;
  inputSchema: ZodSchema<I>; outputSchema: ZodSchema<O>;
  riskLevel: RiskLevel;
  permissions: string[];
  timeoutMs: number; retryPolicy: RetryPolicy;
  idempotencyKey?(input: I): string;          // REQUIRED if riskLevel != READ
  execute(ctx: ToolContext, input: I): Promise<O>;
  verify?(ctx: ToolContext, input: I, output: O): Promise<VerifyResult>; // REQUIRED for external writes
  auditPolicy: { logInput: 'full' | 'redacted' | 'hash'; logOutput: 'full' | 'redacted' | 'hash' };
  taintOutput: boolean;                       // true if output contains untrusted content
}
```
A lint/test fails the build if a non-READ tool lacks `idempotencyKey` or an external-write tool lacks `verify`.

## 4.3 Task and Step State Machine
```text
CREATED → PLANNING → READY → RUNNING → VERIFYING → COMPLETED
                         ↘ WAITING (timer/event)
                         ↘ NEEDS_APPROVAL → (APPROVED → RUNNING | REJECTED → CANCELLED | EXPIRED → BLOCKED)
                         ↘ WAITING_FOR_DEVICE → RUNNING (on reconnect)
                         ↘ BLOCKED (needs human input)
RUNNING/VERIFYING → FAILED (after retries) → COMPENSATING (optional) → FAILED_FINAL
any → CANCELLED
```
Rules: transitions are validated in code (table-driven), every transition emits an `ActivityEvent`, and a crash during `RUNNING` resumes from the last checkpoint.

## 4.4 Approval
```typescript
interface ApprovalRequest {
  id: string; taskId: string; stepId: string;
  toolId: string; riskLevel: RiskLevel;
  payload: unknown;           // exact data to be executed
  payloadHash: string;        // sha256 of canonical payload
  humanSummary: string;       // generated by code from payload, not by an LLM
  createdAt: Date; expiresAt: Date;   // default 24h, per-policy override
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
}
```
Execution re-computes the hash and refuses to run if it differs from the approved hash.

## 4.5 Policy
```typescript
interface PolicyRule {
  id: string; effect: 'ALLOW' | 'REQUIRE_APPROVAL' | 'DENY';
  match: { agent?: string; tool?: string; domain?: string; action?: string;
           target?: string; deviceId?: string };
  limits?: { maxAmount?: number; maxPerHour?: number; maxPerDay?: number };
  expiresAt?: Date;          // standing approvals must expire
}
```
Evaluation order: DENY wins → REQUIRE_APPROVAL → ALLOW → default DENY.

## 4.6 Device
```typescript
interface Device {
  deviceId: string; name: string; platform: 'windows'|'macos'|'linux'|'android'|'ios'|'vps';
  version: string; status: 'ONLINE'|'OFFLINE'|'BUSY'|'LOCKED'|'REVOKED';
  lastSeen: Date; capabilities: string[]; permissions: string[];
  pairedAt: Date; publicKey: string;
}
```

---

# 5. Security Model

## 5.1 Trust Zones
```text
ZONE A  Trusted:   system rules, user's direct commands, policy, code
ZONE B  Private:   user data (email, files, customers, credentials)
ZONE C  Untrusted: web pages, emails from others, job descriptions, scraped text, tool outputs flagged taintOutput
```

## 5.2 The "Three-Way Rule" (injection containment)
No single LLM context may simultaneously hold **(1) untrusted content, (2) private data, and (3) the ability to trigger an external side effect**. Enforce by construction:

- **Quarantined extraction:** Untrusted text goes to an LLM call with **no tools** and a strict output schema. It returns typed data only (e.g., `{company, title, salary, requirements[]}`).
- **Privileged planning** consumes only typed data from quarantine, never raw untrusted text.
- Free-text fields from untrusted sources are passed as **data**, wrapped by `packages/security`, and are never concatenated into instructions.
- **Taint tracking:** values derived from Zone C carry a `tainted` flag. A tainted value used as a tool argument for a non-READ tool forces `REQUIRE_APPROVAL` regardless of policy.
- Links/URLs from untrusted content cannot be fetched by a privileged agent without an allowlist or approval.

## 5.3 Credential Broker
- Agents request capability tokens (`gmail.send`, `winder.products.write`). The broker returns a handle that only tool code can resolve.
- Secrets live in a secrets store (env for dev; managed secret store for prod), encrypted at rest, never logged, never in prompts. Add a log-redaction test that scans logs and prompts for secret patterns.

## 5.4 Approvals
- Payload-bound, expiring (Section 4.4). The UI shows the **exact** outbound email/diff/amount.
- **Batching:** group similar low-risk approvals (e.g., 10 job applications) with per-item review and bulk approve.
- **Standing policies** (e.g., "auto-approve outreach to previously contacted recruiters, max 5/day") are explicit, capped, and expiring.
- Approvals reachable from the web UI and Telegram; Telegram approvals must display the payload hash prefix and expiry.
- **Approval accuracy metric:** if the human rejects >30% of a category, the system tightens the policy automatically and flags it.

## 5.5 Audit Log
Append-only `ActivityEvent` table with a hash chain (`prevHash`, `hash`). A nightly job verifies the chain and emits `audit.integrity.failed` on tamper. Redact PII per `auditPolicy`.

## 5.6 Desktop Security
As in ADR-7, plus: every request is signed; the device enforces its own local policy independent of the cloud; a local audit log is kept; `BLOCKED` actions (disable security software, CAPTCHA/2FA bypass, credential harvesting) are **not implemented as tools at all**, so they cannot be enabled by a config mistake.

## 5.7 Winder Safety
Staging first; read-only first; every write tool has an idempotency key and verifier (re-read the entity). Refunds, price changes above a threshold, bulk operations, customer-facing messages and deletions require approval. Customer data is masked in LLM context (name → `Customer#123`) unless the draft needs it.

## 5.8 Legal and Platform Risk
- Respect `robots.txt` and site ToS per collector; keep a per-source `allowedUse` config; rate-limit and back off.
- Never bypass CAPTCHA/2FA/login walls. Hand off to the human instead (`BLOCKED` → human).
- Auto-apply only through official ATS APIs or the user's own authenticated browser session with approval. Account-ban risk is accepted only for the user's own accounts and documented.
- Gmail/Calendar OAuth: use minimum scopes. Apps left in "testing" status may issue short-lived refresh tokens; verify the current Google policy and plan token refresh/reauth flow before B9.

---

# 6. Memory OS Rules

1. **Structured facts stay structured** (tables). Only semantic text is embedded.
2. Every memory has `source`, `createdAt`, `confidence`, `provenance` (event/task id), `domain`, `userId`, optional `expiresAt`.
3. **Write policy:** only validated, user-confirmed or system-observed facts are written as durable memory. Content from Zone C is stored as *evidence*, never as *instruction* or *preference*.
4. **Conflict handling:** newer user-stated facts supersede older ones; keep history with `supersededBy`.
5. **Forget:** a `forget(memoryId | query)` API deletes the record and its embeddings; UI exposes it.
6. **Retrieval:** keyword + metadata filters + vector similarity, with a hard token budget per request and a per-agent `memoryPolicy` (what it may read/write).
7. **Context assembly order:** system rules → agent identity → task → profile → relevant memory → permissions → tools → evidence (tainted, wrapped) → conversation. Enforce a max token budget; log what was included.

---

# 7. LLM, Cost and Budget Rules

- Per-task budget (max LLM calls, max tokens, max cost) and per-day budget. Exceeding budget → step `BLOCKED` with a clear message, never silent overspend.
- Spend/rate **kill switch**: if daily cost or provider error rate crosses thresholds, fall back to algorithm/template paths and notify the user.
- Provider failover order is config-driven. Free-tier rate limits are tracked by the quota manager; queue and back off rather than fail.
- Prompt cache for repeated classification/extraction. Log cache hit rate.
- Algorithm share = `algorithmicOps / (algorithmicOps + llmOps)` computed from events. The UI shows the real value or "insufficient data".

---

# 8. Evaluation and Quality Gates

Create `packages/evaluation/` with: golden datasets (JSON), recorded tool fixtures (replay), a runner, and a report.

| Metric | Gate (initial) |
|---|---|
| Router intent accuracy (golden set ≥ 50 utterances) | ≥ 95% |
| Plan schema validity (LLM planning path) | ≥ 98% after repair loop |
| Unapproved side effects | **0** (hard fail) |
| Duplicate external actions (after forced retries/crashes) | **0** (hard fail) |
| Secret leakage in prompts/logs | **0** (hard fail) |
| Injection suite (≥ 30 attack payloads in jobs/emails/web pages) | 0 successful privileged actions |
| Crash-recovery suite (kill worker mid-step) | 100% resume without duplicate |
| Approval payload tamper test | 100% rejected |
| Verification coverage (external-write tools with `verify`) | 100% |
| p95 latency, router path | < 300 ms before tool time |
| Cost per typical task | tracked; regression > 25% fails the gate |

Run the suite before every milestone exit and before changing models/prompts. LLM-as-judge may supplement but never replaces deterministic assertions.

---

# 9. Engineering Foundations (previously missing)

- **Environments:** `dev` (local Docker), `staging` (Winder staging + Nexa staging DB), `prod`.
- **CI:** lint, typecheck, unit, integration (Postgres+Redis via Docker), e2e (Playwright), evaluation suite on PRs touching `manager`, `execution-engine`, `security`, `permissions`.
- **Branching/commits:** small PRs per task; conventional commits; each PR links the milestone task ID.
- **Config:** all thresholds, budgets, model policies, quotas in versioned config, not hard-coded.
- **Backups:** daily Postgres backup + restore drill documented and tested once before B7.
- **Migrations:** forward-only Prisma migrations; seed scripts never run in prod.
- **Feature flags** for each domain and the desktop agent.
- **Secrets:** `.env` is never committed; provide `.env.example`; scan with a secret scanner in CI.
- **Docs:** `docs/` holds ADRs, runbooks (restart, rollback, kill switch), and a current architecture map generated from the actual package graph.

---

# 10. Milestones — Two Tracks: Backend First, UI Second

```text
TRACK B (Backend)  B0 → B1 → B2 → … → B15 ──► GATE B-UI-READY (human sign-off, API contract frozen)
                                                      │
TRACK U (UI)                                          └──► U0 → U1 → … → U7 ──► GATE FINAL
```

**Sequencing rule:** The UI agent work (Track U) starts **only after** Gate B-UI-READY passes and the human signs off. The UI is built against the **real, verified, frozen** `/v1` API. The only exception is *Parallel-UI mode* (decision D1 in Section 20), which the human must grant in writing; it uses the OpenAPI contract and a mock server, and never ships mock data.

**Estimates** are rough solo-developer figures (assume a coding agent accelerates routine work but not review/verification). Re-baseline after B0. Indicative totals: Track B ≈ 35–40 weeks, Track U ≈ 17–20 weeks. Order inside Track B is chosen so that the core is proven before any domain is added.

Each milestone lists: **Goal → Tasks → Acceptance → Gate** (Gate details in Section 10B).

---

## TRACK B — BACKEND

### B0 — Prove V1 (≈ 1 week)
**Goal:** Know the true state of the codebase and the current job domain.
**Tasks:** package audit → `docs/audit/package-map.md`; infra check (Postgres+pgvector **and Redis**; add Redis if missing); run `daily-job-scan` against real sources with limits and manually inspect 20 scored jobs; baseline telemetry (algorithm vs LLM calls, latency, errors); resolve pending IDE-proposed edits; commit and tag `v1-baseline`.
**Acceptance:** `npm run verify:v1` boots infra, runs a bounded scan, asserts jobs persisted + deduplicated + scored, exits 0; package map lists every package with status.
**Gate:** G-B0.

### B1 — API Foundations and Contract-First Interface (≈ 2 weeks)
**Goal:** A stable, typed, authenticated, realtime-capable API surface the UI can trust.
**Tasks:**
1. Single-user auth (ADR-1): passkey (WebAuthn) or password + TOTP; httpOnly secure cookies; CSRF protection; session rotation; all routes authenticated except health.
2. API versioning (`/v1`), RFC 7807 error model, pagination/filter/sort conventions, idempotency-key header for POST actions, rate limiting, CORS, request-id tracing.
3. **OpenAPI 3.1 generated from code** (Zod → OpenAPI or Nest swagger); generate the typed client `packages/api-client`; add breaking-change detection (`oasdiff`) in CI.
4. **Realtime:** `GET /v1/events/stream` (SSE) with typed events, `Last-Event-ID` replay from a persisted event log, heartbeat, per-user scoping. WebSocket only for voice streaming and the desktop channel.
5. Migration adding `userId`/`domain` to all tables (invariant 8), feature-flag service, `NEXA_FIXTURE_MODE` guard (fixtures only in tests/Storybook, hard-excluded from production builds).
6. Health endpoints (`/healthz`, `/readyz`, component health used later by the System Health KPI).
**Acceptance:** auth tests (unauthenticated → 401 everywhere); SSE reconnect replays missed events exactly once; OpenAPI valid and client compiles; fixture-guard test fails a prod build containing fixtures.
**Gate:** G-B1.

### B2 — Core Contracts and Engine Hardening (≈ 2–3 weeks)
**Goal:** Extract the universal core from the existing job domain without adding a new domain.
**Tasks:** contracts in Section 4 (`defineAgent`, `defineTool`, `PolicyEngine`, `ApprovalRequest` with payload hash, `verify`, idempotency); table-driven state machine on Postgres steps + BullMQ dispatcher (ADR-2) with checkpoints, retries, cancel, timeouts, approval pause/resume/expiry; refactor job agents/tools to the contracts with unchanged results; Credential Broker + log/prompt redaction test; hash-chained audit log + verifier job; quarantined extraction + tainted-argument rule; boundary lint (no domain names in core); `packages/evaluation` with crash-recovery, tamper, duplicate-action, injection suites; **Approvals API** (`list/get/approve/reject` with payload-hash check) and **Tasks API** (`list/get/cancel/pause/resume/retry`) emitting SSE events.
**Acceptance:** all Section 8 hard-fail gates are 0 for the job domain; V1 workflows give unchanged results vs. B0 baseline.
**Gate:** G-B2.

### B3 — Manager, Conversations, Activity and Notifications (≈ 2–3 weeks)
**Goal:** One entry point for every request, with live progress.
**Tasks:** router-first Manager (ADR-3) + single planning LLM fallback with schema validation; Context Engine with token budget and inclusion log; **Conversations API** (create/list/messages) where posting a message returns `taskId` and streams `conversation.message`, `step.updated` (human-readable step labels such as "Searching multiple job sources…") over SSE; **Command registry and Search API** (`/v1/search?q=` across commands, tasks, jobs, memory, files, contacts) for the command palette; **Quick Actions** CRUD (`/v1/quick-actions`, run); **Activity feed** API (agent, summary, time, severity, workspace); **Notifications service** (in-app, unread counts, mark read; Telegram delivery lands in B10).
**Acceptance:** router ≥ 95% on a ≥ 50-utterance golden set; plan validity ≥ 98%; unknown request yields validated plan or clarifying question, never an unvalidated action.
**Gate:** G-B3.

### B4 — Workspaces and Dashboard Aggregates (≈ 2 weeks)
**Goal:** Every number on the dashboard is computed by tested backend code, never by the UI.
**Tasks:** **Workspace registry** (Career, Personal, Business, Web & Research, Finance & Trading, Development, Custom) with `statsProvider` per workspace, ordering, archive, create-from-template; **Agent registry API** (list, status, enable/disable, health, runs, per-agent budget); **KPI endpoint** and **formulas** from Section 17 (Total Tasks, Active Agents, Unread Emails, Upcoming Meetings, System Health score); **Performance** endpoint (productivity score, estimated time saved, trend vs. trailing week, with insufficient-data handling); **Today's Focus** CRUD with progress; **Schedule aggregate** (calendar provider interface; internal calendar first); **Weather** provider (Open-Meteo or similar, cached, location set by user in settings, optional); deterministic **greeting/summary text** templates; **Usage/Budget** endpoint (tokens, cost, algorithm share).
**Acceptance:** E2E-20 — with controlled fixtures every KPI equals the hand-computed value; metrics show `null`/"insufficient data" rather than invented numbers; endpoints stay fast (p95 < 200 ms with caching).
**Gate:** G-B4.

### B5 — Career Workspace API (≈ 1–2 weeks)
**Tasks:** jobs list/filter/detail, match scores and reasons, applications pipeline with statuses, outreach drafts (approval-gated), resume variants, recruiter/contact records, job-source settings with ToS config; run-scan command; workspace stats (open matched jobs, running tasks).
**Acceptance:** all Career UI data needs in Section 17 are served; E2E-02 and E2E-04 pass through the API.
**Gate:** G-B5.

### B6 — Winder Read-Only: The Generality Test (≈ 2 weeks)
**Tasks:** in the Winder repo create a versioned admin API with scoped keys (ADR-6), read endpoints only, staging first; in Nexa add `BusinessIntegration` interface + Winder adapter, typed READ tools (products, orders, low stock, customers masked); Business agent via `defineAgent`; router templates added by config; Business workspace stats (tasks, running).
**Acceptance:** CI path-diff proves **zero changes** in `manager`, `execution-engine`, `workspace-core`; E2E-08 passes; PII redaction test passes.
**Gate:** G-B6. If the generality test fails, fix core abstractions via ADR before continuing.

### B7 — Winder Writes and Customer Support (≈ 2–3 weeks)
**Tasks:** write tools (stock, price, product content, order status, publish) with idempotency + `verify`; approval policies (publish, price > threshold, bulk, refunds, deletions); customer query classification, order lookup, **draft** reply, approval, send, verify, record; analytics reports; website-update flow ("Update my website": edit content → preview → approval → publish → verify live page).
**Acceptance:** duplicate-action = 0 under forced retries; every write verified; refund path approval-bound; E2E-09, E2E-10, E2E-14, E2E-15 pass; backup restore drill done.
**Gate:** G-B7.

### B8 — Web and Research Workforce (≈ 2 weeks)
**Tasks:** search, HTTP fetch, isolated Playwright crawler, quarantined extraction, research workflow with evidence storage and citations, website monitoring, claim cross-checking, per-source ToS config; research reports exposed as documents for the Files area.
**Acceptance:** injection suite on crawled pages → 0 privileged actions; claims link to stored evidence; rate limits respected; E2E-11.
**Gate:** G-B8.

### B9 — Personal Workforce: Gmail, Calendar, Tasks, Briefing (≈ 2–3 weeks)
**Tasks:** Gmail and Google Calendar adapters via Credential Broker (minimum scopes; token refresh/reauth flow); email triage (unread counts, summaries, categories), draft replies (approval to send); calendar read/sync, propose/create events (approval when inviting others), "Join" link extraction; tasks/reminders/notes; Morning Briefing built **only** from stored events/data.
**Acceptance:** email-body injection suite; briefing lines traceable to records; OAuth refresh test; E2E-12.
**Gate:** G-B9.

### B10 — Integrations and Channels (≈ 3 weeks)
**Tasks:** **Integration framework** (`/v1/integrations` list with status `CONNECTED | DEGRADED | DISCONNECTED | NEEDS_REAUTH`, connect/disconnect, health checks, last-sync) for Gmail, Google Calendar, Telegram, Slack, Notion, GitHub; Telegram bot (approvals with payload-hash prefix, commands, briefing); Slack (notifications + slash command, read channels opt-in); Notion (read/write pages behind approval); GitHub (read repos/issues/PRs first). Each integration exposes tools via the Tool OS with risk levels and verification.
**Acceptance:** E2E-21 connect → health → degraded simulation → reauth → disconnect; secrets never exposed to the client; every integration has contract tests with recorded fixtures.
**Gate:** G-B10.

### B11 — Voice Backend (≈ 2 weeks)
**Tasks:** push-to-talk pipeline: `POST /v1/voice/stt` (audio → text; local Whisper-class engine or provider via gateway), `POST /v1/voice/tts` (existing Edge-TTS or provider), `WS /v1/voice/session` for streaming partial transcripts; `voice.state` events (`IDLE | LISTENING | THINKING | SPEAKING | ERROR`) that drive the orb; voice commands routed through the same Manager (no separate brain); spoken-confirmation never substitutes for approvals of risky actions. Wake-word is **out of scope**.
**Acceptance:** E2E-22: spoken "find AI jobs in Bangalore" → transcript → task → spoken summary; approvals cannot be granted by voice alone.
**Gate:** G-B11.

### B12 — Finance and Trading Workspace: Analysis and Paper Only (≈ 2 weeks)
**Tasks:** market data adapters (equities/indices/crypto, free sources first), watchlists, trend/technical analysis algorithms (algorithm-first), news-sentiment extraction (quarantined), research briefs, **paper trading** with a simulated ledger and risk limits. **Live trading is not implemented**: no live-order tool exists in the registry; enabling it later requires a new ADR, separate credentials, loss limits and explicit human enablement.
**Acceptance:** E2E-23: analysis task completes; paper orders obey limits; a test proves no code path can place a live order.
**Gate:** G-B12.

### B13 — Desktop Agent v0, Read-Only (≈ 3 weeks)
**Tasks:** 1-week spike to choose daemon tech (record ADR); pairing, device keypair, outbound channel, token rotation, revocation, kill switch, local audit log; read-only tools (workspace file list/read, process list, opt-in screenshot, notifications); `WAITING_FOR_DEVICE`; **Devices API** (list, pair, revoke, status).
**Acceptance:** E2E-13; path-traversal/symlink escape suite blocked; revoked device rejected; kill switch halts in < 2 s.
**Gate:** G-B13.

### B14 — Desktop Writes and Development Workforce (≈ 3 weeks)
**Tasks:** named recipes (`run_tests`, `git_status`, `open_folder`, …); file writes inside workspace roots (delete/overwrite approval-gated); Git/GitHub agent (read first; writes approval-gated); testing/log analysis agents; Development workspace stats; raw terminal only behind approval with full audit, optional. Example flow: "Run tests for Nexa project" → recipe → streamed output → pass/fail summary.
**Acceptance:** E2E-24; delete/overwrite requires approval; command audit complete.
**Gate:** G-B14.

### B15 — Custom Agents, Template-Based (≈ 2 weeks)
**Tasks:** user-defined agents composed from **existing tools + prompt template + schedule + budget + permission scope** (configuration, no arbitrary code execution); agent templates (e.g., "daily digest", "price watcher"); per-agent policy ceiling (a custom agent can never exceed the permissions the user grants it); agents appear in the Agents API and the Custom Agents workspace. Dynamic code plugins remain deferred.
**Acceptance:** E2E-25: create → run → scope-limited; attempts to call tools outside scope are denied and audited.
**Gate:** G-B15.

### GATE B-UI-READY (≈ 1 week)
**Tasks:** run the **full backend E2E suite from a fresh clone**; freeze OpenAPI `/v1` (tag `api-v1-frozen`); regenerate and publish the typed client; generate `09_API_CONTRACT.md` from the spec with an example payload for every endpoint and SSE event; verify every UI data need in Section 17 has a real endpoint; produce backend `FINAL_VERIFICATION_REPORT-BACKEND.md`.
**Acceptance:** every Section 17 row marked `SERVED`; contract tests 100%; no S0/S1 defects; human sign-off recorded in `08_DECISION_LOG.md`.

---

## TRACK U — UI (starts only after Gate B-UI-READY)

### U0 — UI Foundations (≈ 2 weeks)
**Tasks:** extract **design tokens** from the reference PNG (colors, radii, spacing, type scale, shadows, glows) into `design-tokens.json` using measured pixel samples; Tailwind theme + CSS variables; dark theme (default) and derived light theme; **app shell** (sidebar, top bar, main grid, right assistant panel) with exact reference geometry at 1536×1024; typed API client + SSE provider with auto-reconnect and cache invalidation; auth screens; global error/empty/loading primitives; component library + Storybook; **fixture mode** (tests/Storybook only); Playwright visual-regression harness at the reference viewport; asset pipeline (Section 19).
**Acceptance:** shell renders with measured geometry within tolerance; Storybook covers every primitive; fixture-in-production guard passes; SSE provider survives network drop.
**Gate:** G-U0.

### U1 — Dashboard (≈ 2–3 weeks)
**Tasks:** greeting header (date, live clock, weather), 5 KPI cards with mini bars, **Your Workspaces** carousel (cards, arrows, Manage), **Live Activity** list with filter, **Task Execution** (Running/Pending/Completed tabs, progress, ETA, row menu), **Upcoming Schedule** (Join, View all, Add Event), **Today's Focus** (checklist, progress, add), **Performance** donut + legend + range selector; all realtime via SSE; loading/empty/error states for each widget.
**Acceptance:** E2E-26 — fixture render matches the reference (visual gate); live updates (task progress, approval badge) arrive without reload; all numbers equal backend values.
**Gate:** G-U1.

### U2 — Assistant Panel, Chat, Command Palette, Voice UI (≈ 2–3 weeks)
**Tasks:** right panel (status, orb with 4 states, listening waveform with real mic levels, mic/pause/stop/settings controls, quick-action tiles, chat thread with **agent-run card** showing live checklist, composer with attach, web-access toggle, mic, send); full-page **Chat with Nexa**; **top-bar command palette** (Ctrl+K, search results, commands, recent); text-to-speech playback; keyboard shortcuts.
**Acceptance:** E2E-27; voice round trip works in the browser; stop/pause actually cancel/pause the underlying task; palette results come from `/v1/search`.
**Gate:** G-U2.

### U3 — Tasks, Approvals, Agents (≈ 2 weeks)
**Tasks:** Tasks page (filters, details drawer with steps/logs/evidence, cancel/pause/retry); **Approvals** page (exact payload view, hash prefix, expiry countdown, approve/reject, batch approve, sidebar red badge); Agents page (status, enable/disable, config, budgets, run history, health).
**Acceptance:** E2E-04/05 through the UI; tampered/expired payloads show clear states; sidebar badges match backend counts in realtime.
**Gate:** G-U3.

### U4 — Memory and Knowledge, Files and Documents, Calendar (≈ 2 weeks)
**Tasks:** Memory browser (search, provenance, confidence, forget); Knowledge upload and status; Files & Documents (research reports, resumes, exports; preview/download); Calendar (day/week/month, create/edit with approval prompts, sync status).
**Acceptance:** forget removes memory + embeddings and the UI reflects it; calendar edits round-trip with the backend; E2E-12 visible in UI.
**Gate:** G-U4.

### U5 — Workspace Pages and Manage (≈ 3 weeks)
**Tasks:** one detail page per workspace using shared layout + domain panels: **Career** (jobs board, pipeline, outreach), **Personal** (inbox summary, calendar, tasks), **Business (Winder)** (products, orders, customers, drafts), **Web & Research** (research runs, evidence, monitors), **Finance & Trading** (watchlist, analysis, paper ledger; clear "Paper trading only" banner), **Development** (projects, runs, tests, repos), **Custom Agents** (template gallery, builder, runs); sidebar "+" create workspace; dashboard **Manage** drawer (reorder/hide/archive/rename).
**Acceptance:** E2E-28; each workspace page shows only real data or an explicit empty state with a useful next action.
**Gate:** G-U5.

### U6 — Integrations, Settings, Devices, History, Notifications, Help (≈ 2 weeks)
**Tasks:** Integrations page and sidebar status dots (connect/reauth/disconnect flows); Settings (profile, theme, voice, notifications, location for weather, budgets, policies, quick actions, plan label); **Devices** (pair, revoke, status) and **Kill Switch** control with global safe-mode banner; Audit/History viewer with integrity status; notification center (bell, unread dot); Help & Docs (in-app docs, shortcuts, diagnostics export).
**Acceptance:** E2E-29; kill switch freezes non-READ actions and UI shows safe mode within 2 s; secrets never visible in the client.
**Gate:** G-U6.

### U7 — Polish and Hardening (≈ 2 weeks)
**Tasks:** responsive layouts (Section 16.10); accessibility pass (WCAG 2.2 AA, keyboard, screen-reader labels, reduced motion); performance budgets (LCP < 2.5 s on dashboard, JS budget, orb frame-rate fallback); motion polish; pixel-fidelity pass against the reference; cross-browser (Chromium, Firefox, WebKit); error-boundary and offline behavior.
**Acceptance:** E2E-18 route crawl, E2E-30; axe: 0 serious/critical; visual diff within threshold; human side-by-side sign-off.
**Gate:** G-U7.

### GATE FINAL
Run all E2E-01…E2E-30 from a fresh clone, produce `FINAL_VERIFICATION_REPORT.md`, `FINAL_ACCEPTANCE_WALKTHROUGH.md`, as-built diagrams; human final sign-off.

## Deferred (need a written justification and a new ADR)
Live trading, wake-word/always-listening and phone calling, dynamic code plugins/marketplace, multi-user or SaaS billing, native mobile apps.

---

# 10B. Verification Phase (Part V)

Verification is a **phase of the project, not a final step**. It runs at three levels: every change, every milestone, and the whole system. A change counts as complete only when it is **VERIFIED**, meaning it has passing tests *and* stored evidence.

## V.1 Principles

1. **Evidence, not assertion.** "Works" means a command was run and its output is stored in `verification/evidence/`.
2. **Not run = NOT_VERIFIED.** Never write "should work" or "assumed OK". Allowed statuses: `VERIFIED`, `PARTIAL`, `FAILED`, `NOT_VERIFIED`.
3. **Verify the thing users touch.** Prefer end-to-end checks through the real API/UI over internal unit checks alone.
4. **Hard-fail metrics are binary.** Section 8 hard-fail items (unapproved side effects, duplicate actions, secret leakage, successful injection) at anything but zero fail the gate.
5. **Every bug fix ships with a regression test.**
6. **Independence:** the agent that wrote a change must verify it from a clean state (fresh DB, clean checkout or clean build), not from its development state.
7. **Reproducible:** every verification is a script (`npm run verify:*`) that a human can re-run.

## V.2 Verification Layers

| Layer | What it proves | Tooling (adapt to repo) |
|---|---|---|
| Static | Types, lint, formatting, dependency rules, no domain names in core | `tsc`, ESLint, import-boundary rule, `madge` |
| Unit | Pure logic: scoring, state machine, policy engine, hashing, redaction | Vitest/Jest |
| Contract | Every tool honors `ToolDefinition` (idempotency, verify, schemas, risk level) | generated contract test per tool |
| Integration | Package + Postgres + Redis behave together | Docker test stack |
| API e2e | HTTP behavior, auth, validation | supertest or equivalent |
| UI e2e | Real browser flows, route crawl, empty states | Playwright with traces |
| Visual regression | Fidelity to the reference screenshot | Playwright screenshots at 1536×1024, region-geometry check, pixelmatch/SSIM, token sampling |
| Accessibility & performance | WCAG 2.2 AA, load and animation budgets | axe-core, Lighthouse CI |
| API contract | Endpoints match OpenAPI; no breaking changes | schema tests, `oasdiff` |
| Evaluation | Router accuracy, plan validity, approval accuracy | `packages/evaluation` golden sets |
| Resilience | Crash, retry, duplicate, timeout, device offline | chaos scripts (kill worker, drop network) |
| Security | Injection, secrets, path traversal, tamper, authz bypass | adversarial suites, secret scanner, `npm audit` |
| Data | Migrations up/down on a copy, audit-chain integrity, backup/restore | migration test, restore drill |
| Performance/Cost | Latency, token use, cost per task vs. baseline | telemetry report |
| Manual exploratory | Things automation misses | checklist in V.9 |

## V.3 Change-Level Checklist (every PR)

- [ ] Typecheck, lint, unit tests pass locally and in CI.
- [ ] New/changed behavior has tests; bug fixes have regression tests.
- [ ] Contract tests pass for every new/changed tool.
- [ ] No secret patterns in diff, logs, or prompts (scanner run).
- [ ] Migration (if any) applied to a **copy** of data and rolled back successfully.
- [ ] No domain names added to core packages; boundary lint passes.
- [ ] Affected e2e scenarios re-run and pass.
- [ ] `04_PHASE_TODO.md` statuses and docs/ADRs updated.
- [ ] Evidence files saved and linked from the task.

## V.4 Milestone Verification Matrix

| Gate | Must pass before exit | Primary evidence |
|---|---|---|
| **G-B0** | `npm run verify:v1`; package map complete; Redis confirmed; baseline telemetry stored | run log, package-map.md, telemetry JSON |
| **G-B1** | Auth enforced everywhere; OpenAPI valid + client compiles; SSE replay exactly-once; fixture-in-prod guard; E2E-01 (backend) | API logs, contract test output |
| **G-B2** | E2E-05 (API), E2E-06, E2E-07 (job fixtures), E2E-17; contract tests 100%; hard-fail metrics = 0; V1 results unchanged vs. B0 baseline | evaluation report, chaos logs |
| **G-B3** | E2E-03, E2E-19; router ≥ 95% on golden set; plan validity ≥ 98%; context inclusion log present | evaluation report, SSE capture |
| **G-B4** | E2E-20 (every KPI equals hand-computed value); no invented metrics; p95 < 200 ms | fixture calculations, timing output |
| **G-B5** | E2E-02, E2E-04 via API; all Career data needs served | API test logs |
| **G-B6** | E2E-08; **path-diff proves no changes** in `manager`/`execution-engine`/`workspace-core`; PII redaction test | git diff check, prompt log scan |
| **G-B7** | E2E-09, E2E-10, E2E-14, E2E-15; duplicate actions = 0; every write verified; website-update flow verified live | staging run logs, DB re-read outputs |
| **G-B8** | E2E-07 (web fixtures), E2E-11; ToS/robots config honored; rate limits respected | crawl logs, evidence store |
| **G-B9** | E2E-07 (email fixtures), E2E-12; OAuth refresh/reauth tested | briefing trace, OAuth test log |
| **G-B10** | E2E-21; Telegram approval flow works with payload-hash prefix; secrets never reach client | integration logs, bundle scan |
| **G-B11** | E2E-22; approvals cannot be granted by voice alone | voice session log |
| **G-B12** | E2E-23; paper-trading limits enforced; test proves no live-order path | test output, registry dump |
| **G-B13** | E2E-13; path-escape suite blocked; kill switch < 2 s; revoked device rejected | device logs, timing output |
| **G-B14** | E2E-24; delete/overwrite approval enforced; command audit complete | audit log extract |
| **G-B15** | E2E-25; custom agent cannot exceed granted scope | denied-call audit entries |
| **G-B-UI-READY** | Full backend E2E suite from fresh clone; every Section 17 row `SERVED`; OpenAPI frozen and tagged; contract tests 100%; no S0/S1; **human sign-off** | backend FINAL report, `09_API_CONTRACT.md` |
| **G-U0** | Shell geometry within tolerance; tokens measured; Storybook primitives; fixture guard; SSE provider resilience | screenshots, measurements.json |
| **G-U1** | E2E-26 (visual gate + realtime updates); numbers equal backend values | visual diff report, Playwright traces |
| **G-U2** | E2E-27; voice round trip in browser; stop/pause affect real tasks; palette from `/v1/search` | traces, audio test log |
| **G-U3** | E2E-04, E2E-05 through the UI; badges match backend counts in realtime | Playwright traces |
| **G-U4** | Memory forget reflected in UI; calendar round-trip; E2E-12 visible | traces, DB checks |
| **G-U5** | E2E-28; every workspace page real data or useful empty state | traces, screenshots |
| **G-U6** | E2E-29; kill switch → safe mode < 2 s; no secrets in client | traces, bundle scan |
| **G-U7** | E2E-18, E2E-30; axe 0 serious/critical; visual thresholds met; **human side-by-side sign-off** | axe/Lighthouse reports, visual report |
| **G-FINAL** | All E2E-01…E2E-30 pass from a **fresh clone**; Section 13 satisfied; human sign-off | FINAL_VERIFICATION_REPORT |

## V.5 End-to-End Scenarios

Each scenario is automated where possible (`npm run verify:e2e -- E2E-xx`) and has: **Preconditions → Steps → Expected → Evidence**.

| ID | Scenario | Key expectations |
|---|---|---|
| E2E-01 | **Fresh-clone boot:** clone → install → env from `.env.example` → `docker compose up` → migrate → seed → start API+web | Health endpoints OK; web loads; no manual fixes needed; time recorded |
| E2E-02 | **Job scan to dashboard:** run daily scan with bounded sources | Jobs persisted, deduplicated, scored; dashboard shows real rows; empty DB shows empty state, not fake jobs |
| E2E-03 | **Command bar:** "Find AI jobs", "show pending approvals", "what did you do today" | Router path used (0 planning LLM calls) for known intents; answers derived from stored events |
| E2E-04 | **Approve path:** agent prepares an external action (e.g., outreach email in a sandbox inbox) → approval → execute → verify | Approval shows exact payload; hash matches; executes once; `VERIFIED` postcondition; activity events emitted |
| E2E-05 | **Reject / expire / tamper:** reject; let one expire; modify payload after approval | Reject → no side effect; expire → `BLOCKED`; tampered hash → refused |
| E2E-06 | **Crash recovery:** kill worker at random points (≥ 100 runs) | Resumes from checkpoint; zero duplicate external actions |
| E2E-07 | **Injection suite:** ≥ 30 malicious payloads in job descriptions, emails, web pages, tool outputs | Zero privileged actions; tainted args force approval; secrets never appear in prompts/logs |
| E2E-08 | **Winder read:** "Check low-stock products" against staging | Real staging data; customer PII masked in LLM context; no write tools reachable |
| E2E-09 | **Winder write with approval:** update price/stock | Policy requires approval where configured; idempotent; verify re-reads entity; audit event written |
| E2E-10 | **Customer query:** message → identify → order lookup → classify → draft → approval → send → verify → record | Draft only until approved; sent once; interaction recorded |
| E2E-11 | **Web research:** research a company | Output claims link to stored evidence; sources cross-checked; robots/ToS respected |
| E2E-12 | **Morning briefing:** scheduled run | Every line traceable to a stored record; empty sections omitted, not invented |
| E2E-13 | **Desktop agent:** pair → run read-only task → go offline mid-task → reconnect → revoke → kill switch | `WAITING_FOR_DEVICE` then resume; revoked device rejected; kill switch halts < 2 s; sandbox escape attempts blocked |
| E2E-14 | **Budget exhaustion:** exceed per-task/day LLM budget; simulate provider outage | Step `BLOCKED` with clear message; fallback to algorithm/template paths; user notified |
| E2E-15 | **Backup/restore:** restore latest backup to a clean DB | App boots; row counts and audit chain verify |
| E2E-16 | **Bad release rollback:** deploy a deliberately broken build in staging | Smoke test fails → rollback procedure restores service; data intact |
| E2E-17 | **Audit tamper:** alter one audit row | Nightly/on-demand verifier detects and raises `audit.integrity.failed` |
| E2E-18 | **UI route crawl:** visit every navigation link, in each enabled domain | No 404/500; each page renders real or explicit empty state |
| E2E-19 | **Chat streaming:** post a message → task created → step labels stream over SSE | Human-readable steps arrive in order; final message persisted; reconnect replays missed events |
| E2E-20 | **Dashboard aggregates:** controlled fixtures for tasks, agents, email, calendar, health | Every KPI, productivity score, time-saved and trend equals the hand-computed value; insufficient data shown as such |
| E2E-21 | **Integrations:** connect → health OK → simulate degraded → reauth → disconnect (Gmail, Calendar, Telegram, Slack, Notion, GitHub) | Status transitions correct; tokens never reach the client |
| E2E-22 | **Voice:** speak a command → transcript → task → spoken summary; try to approve a risky action by voice | Round trip works; risky approvals refused without UI/Telegram approval |
| E2E-23 | **Finance:** run analysis, add watchlist, place paper orders beyond limits | Limits enforced; no live-order tool exists in the registry |
| E2E-24 | **Development:** "Run tests for project" via recipe; attempt file delete/overwrite | Output streamed; destructive actions require approval; command audit complete |
| E2E-25 | **Custom agent:** create from template, run, attempt out-of-scope tool | Runs within scope; out-of-scope call denied and audited |
| E2E-26 | **Dashboard fidelity and realtime (UI):** render fixture at 1536×1024; then push SSE events | Geometry/token/SSIM thresholds met; counts, progress bars and badges update without reload |
| E2E-27 | **Assistant panel and palette (UI):** Ctrl+K, quick actions, mic states, chat with agent-run card, stop/pause | Orb states match events; stop cancels the real task; palette uses `/v1/search` |
| E2E-28 | **Workspaces (UI):** carousel, open each workspace, Manage (reorder/hide/archive/rename), create from "+" | Persists via API; empty states useful; no fake data |
| E2E-29 | **Settings, integrations, theme, kill switch (UI):** toggle theme, connect integration, engage kill switch | Theme persists; status dots correct; safe-mode banner < 2 s; release requires re-auth |
| E2E-30 | **Responsive, accessibility, performance (UI):** widths 1536/1280/1024/768/390; keyboard-only run; reduced motion | Layout rules in 16.10 hold; axe 0 serious/critical; LCP < 2.5 s; orb degrades gracefully |

## V.6 Evidence Rules

Each verification run writes to `verification/evidence/<milestone>/<scenario>/`:
- `command.txt` (exact command + git SHA + date), `output.log`, test report (JUnit/JSON),
- Playwright trace/screenshots/video for UI flows,
- SQL/query outputs proving state (row counts, status values, audit chain check),
- hashes of key artifacts, and timing/telemetry JSON.

`VERIFICATION_REPORT-Mx.md` template:

```markdown
# Verification Report — Mx
Date / Git SHA / Environment:
## Summary: VERIFIED | PARTIAL | FAILED
## Gate checklist (V.4 row): each item → status → evidence link
## Hard-fail metrics (Section 8): value → pass/fail
## Scenarios run: ID → status → evidence link → duration
## Defects found: ID, severity, status, regression test
## Not verified (explicit list and why)
## Regressions vs. previous milestone: none | list
## Sign-off requested from human: yes/no
```

## V.7 Traceability

`06_VERIFICATION_PLAN.md` keeps a matrix: **Requirement ID → TODO task → test(s) → evidence path → status**. Gate rule: every requirement (`R-*`) has at least one test, every test is linked to a requirement, and no `MUST`/`BLOCKER` requirement is `NOT_VERIFIED` at milestone exit.

## V.8 Defect Handling

| Severity | Meaning | Gate impact |
|---|---|---|
| S0 | Data loss, security breach, unapproved external side effect, duplicate real-world action | Stop all work; fix now; blocks every gate |
| S1 | Core flow broken, wrong data shown as real | Blocks milestone exit |
| S2 | Degraded behavior with workaround | Must be logged; fix before final |
| S3 | Cosmetic | Backlog |

Every defect gets an ID, reproduction steps, root cause, fix commit, and a **regression test**. Re-run the affected scenarios plus the hard-fail suites after the fix.

## V.9 Manual Exploratory Checklist (human + agent-prepared script)

- Navigate every page on desktop and a narrow viewport; confirm no broken layouts or console errors.
- Trigger each approval type; confirm the displayed payload equals what is executed.
- Disconnect the network/stop Redis/stop Postgres during a task; confirm graceful states and recovery.
- Try to make the agent do something forbidden via the command bar and via a malicious job/email/web page.
- Read the activity feed for a full day; confirm nothing is invented and nothing important is missing.

## V.10 Release Gate and Rollback

Before any production deploy: tag the release; generate a changelog; run migrations on a copy of production data; ensure new features are behind flags (default off); run post-deploy smoke tests; keep the previous artifact and a tested rollback command. A release without a verified rollback is not releasable.

## V.11 Continuous Verification (after go-live)

Nightly: evaluation suite, audit-chain verifier, smoke test of every route and every enabled tool, dependency/secret scan, backup freshness check, budget/cost report. Failures create an alert and an entry in the activity feed.

---

# 10C. Flow Catalog (Every Flow, Start to End)

Each flow must be implemented exactly in this order, refined in `03_END_TO_END_PLAN.md`, drawn in the draw.io file, and verified by the listed scenario.

**F1 — Project bootstrap (agent):** receive document → create planning folder → analyze code → gap analysis → plan → TODO → diagrams → verification plan → review request → STOP. *Verified by:* planning-package checklist (all files exist, diagrams parse, traceability complete).

**F2 — Human review:** human reads REVIEW_REQUEST → replies APPROVED / WITH CHANGES / REJECTED → agent logs decision with plan hashes → proceeds or revises. *Verified by:* decision log entry exists before first source change (git history check).

**F3 — Implementation loop (per task):** pick next TODO → read affected code → write failing test → implement → run static+unit+contract → run affected e2e → save evidence → mark `VERIFIED` → commit referencing task ID.

**F4 — Milestone gate:** all tasks `VERIFIED` → run V.4 gate scripts from a clean state → write report → ask human for sign-off (or proceed if autopilot granted and milestone is eligible) → tag `mx-verified`.

**F5 — Request to action (runtime):** user input (web/Telegram/desktop) → auth → router → (match → workflow template | no match → one planning LLM call → schema validation) → capability lookup → plan DAG → task + steps persisted → engine dispatch → per step: policy decision → (approval if required) → credential handle → tool execute → postcondition verify → checkpoint → activity events → result to UI/channel. *E2E-03/04.*

**F6 — Approval:** step reaches `NEEDS_APPROVAL` → approval request with payload + hash + expiry → notify (web + Telegram) → human approves/rejects → on approve: recompute hash, compare, execute, verify → on reject: cancel with no side effect → on expiry: `BLOCKED` and notify. *E2E-04/05.*

**F7 — Failure and recovery:** failure detected (tool error, timeout, crash) → classify (retryable / non-retryable / needs human) → retry with backoff and idempotency key → verify-before-retry for external writes → after max retries `FAILED` → optional compensation → alert and activity event. Worker restart → resume from last checkpoint. *E2E-06/14.*

**F8 — Job scan:** schedule or command → collectors fetch (rate-limited, ToS-config) → normalize → deduplicate → quarantined extraction for free text → algorithmic scoring → ambiguous items to LLM → persist → events → dashboard updates. *E2E-02.*

**F9 — Job application:** matched job → company/recruiter research → resume/cover letter preparation → approval (payload = exact application/email) → apply via ATS API or approved browser session → verify (confirmation id/page/email) → track status → follow-up scheduling. *E2E-04.*

**F10 — Winder read:** command/schedule → Business Agent → typed read tool → Winder admin API (staging/prod per config) → mask PII → analyze (algorithmic first) → report → activity. *E2E-08.*

**F11 — Winder write:** request → plan → policy (threshold/bulk/refund rules) → approval if required → write tool with idempotency key → verify by re-reading entity → audit event. *E2E-09.*

**F12 — Customer support:** inbound query → identify customer → fetch order/product context → classify → draft reply → policy/risk check → approval → send → verify delivery → record interaction → track unresolved. *E2E-10.*

**F13 — Web research:** objective → search → fetch/crawl (isolated Playwright, robots/ToS check) → quarantined extraction → store evidence → cross-check claims → synthesize with citations → report. *E2E-11.*

**F14 — Email, calendar and briefing:** OAuth via broker → sync metadata → triage (read) → drafts (approval to send) → calendar proposals → scheduled briefing assembled from stored events/data only → deliver via UI/Telegram. *E2E-12.*

**F15 — Desktop pairing:** user starts pairing in UI → one-time code → device generates keypair → exchange public key over outbound channel → short-lived token issued → device registered `ONLINE` with declared capabilities → local policy configured (workspace roots, allowed recipes). Revocation and re-pairing supported. *E2E-13.*

**F16 — Desktop task:** step requires device → device online? yes: signed request → local policy check → approval if required → local tool executes in sandbox → local audit entry → result + verification → resume. No: task `WAITING_FOR_DEVICE`; on reconnect, resume. Kill switch halts everything immediately. *E2E-13.*

**F17 — Scheduling:** schedule definition (one-time/recurring/event/condition) → scheduler enqueues idempotent trigger → task created like F5 → missed-run policy (catch-up or skip, configured) → events. *E2E-12.*

**F18 — Incident / kill switch:** anomaly (budget breach, integrity failure, repeated rejections, device alert) or human trigger → freeze non-READ tools → notify → safe-mode UI banner → investigation via audit log → controlled resume with decision log entry.

**F19 — Release and rollback:** merge → CI full suite → deploy to staging → smoke + relevant E2E → human sign-off (if required) → deploy prod behind flags → post-deploy smoke → enable flags gradually → rollback on failure using the tested procedure. *E2E-16.*

**F20 — Plan change control:** discovery that plan is wrong → update 03/04/diagrams/ADR/decision log → notify human → await approval if material → continue. *Verified by:* decision log shows entry before the divergent code change.

**F21 — Dashboard load and realtime:** authenticated page load → parallel fetch of summary, workspaces, activity, tasks, schedule, focus, performance, health → render skeletons then data → open SSE stream with `Last-Event-ID` → events invalidate/patch caches → on disconnect show "stale" state and reconnect with replay. *E2E-26.*

**F22 — Chat and voice interaction:** typed message or push-to-talk → (voice: mic stream → partial transcript → STT) → `POST /conversations/:id/messages` → Manager (F5) → `step.updated` events render the agent-run card → final message → optional TTS → orb transitions `LISTENING → THINKING → SPEAKING → IDLE`. Stop/pause call the task control endpoints. *E2E-19/22/27.*

**F23 — Command palette:** Ctrl/⌘+K → recent items and commands → typing calls `/v1/search` (debounced) → select command/result → navigate or create task; free text + Enter goes to the Manager. *E2E-27.*

**F24 — Workspace management:** "+" or Manage → choose template/name/icon/agents/budget → `POST/PATCH /workspaces` → sidebar and carousel update via SSE → archive hides without deleting data. *E2E-28.*

**F25 — Integration connect:** click integration → OAuth/bot setup → callback to backend (secrets stored by the Credential Broker) → health check → status dot updates via SSE → degraded/reauth prompts → disconnect revokes tokens. *E2E-21/29.*

**F26 — Today's Focus:** add/toggle item (optimistic) → `PATCH /focus/items` → progress recomputed server-side → `focus.updated` event reconciles; agent suggestions appear as proposals the user accepts or dismisses. *E2E-20/26.*

**F27 — Notifications:** event worth attention → notification created (in-app, Telegram if enabled) → bell dot and dropdown update → click navigates to the item → mark read. *E2E-21.*

**F28 — Safe mode / kill switch from UI:** user engages kill switch (re-auth) → backend freezes non-READ tools and device commands → `safe_mode.changed` → global banner and disabled action buttons → release requires re-auth and a decision-log entry. *E2E-29.*

---

# 11. Reference Research (Timeboxed)

- Maximum **3 repositories**, **1 day each**, answering a specific question tied to a milestone (e.g., durable execution patterns, permission models, browser handoff).
- For each: record commit SHA and license, read the architecture, note security issues, and decide TAKE / ADAPT / REIMPLEMENT / DEFER / REJECT in `docs/research/<repo>.md`.
- Never run unreviewed third-party code outside a sandbox/VM. Never copy code with incompatible licenses.
- Remaining repos from V2 §55 stay on a backlog.

---

# 12. Agent Working Protocol

## Per-task loop
```text
Read milestone task → read affected packages → write failing test
→ implement smallest change → run tests + lint + typecheck
→ update docs/ADR if a decision changed → commit (small, conventional)
→ record result in docs/progress/MILESTONE-N.md
```

## Definition of Done for any PR
- Tests added and passing; no skipped tests without a linked issue.
- No new non-READ tool without `idempotencyKey`, policy rule, audit policy, and (if external) `verify`.
- No secrets in code, logs or prompts.
- No domain names added to core packages.
- Docs/ADR updated.

## Stop and ask the human when
1. A change would send real emails, spend money, touch production Winder data, or use real credentials.
2. A policy default would be loosened.
3. An ADR needs to be reversed.
4. Tests can only pass by weakening an assertion.
5. A source's ToS appears to forbid the intended collection.
6. Estimated cost of an evaluation or scan run exceeds the configured budget.
7. A UI element in the reference has no sensible backend meaning, or the image conflicts with an invariant (e.g., it implies fake data, billing, or live trading).
8. Fidelity thresholds cannot be met without hiding real states (loading/empty/error) or faking data.
9. The OpenAPI contract needs a breaking change after Gate B-UI-READY.

## Reporting format (end of each milestone)
```text
Milestone: Mx
Acceptance tests: [list with pass/fail and command]
Gate metrics: [Section 8 table values]
Changed packages: [...]
ADRs added/changed: [...]
Known gaps / risks: [...]
Next milestone readiness: yes/no + reason
```

---

# 13. Measurable Definition of Done (V3)

Nexa V3 is complete when all of the following are demonstrated by tests or logged runs:

1. Gates G-B0 … G-B15, G-B-UI-READY, G-U0 … G-U7 and G-FINAL pass, and Section 8 hard-fail metrics are all **0**.
2. A new read-only domain agent + tools can be added with **no changes** to `manager`, `execution-engine` or `workspace-core` (CI-verified path diff).
3. Router golden-set accuracy ≥ 95%; planning path always yields a schema-valid plan or a clarifying question.
4. Every external write is idempotent, policy-checked, approved when required, and verified.
5. Kill a worker mid-task at random points 100 times → 0 duplicate external actions, 100% resumed.
6. 30+ injection payloads across web, email and job content → 0 privileged actions executed.
7. Desktop agent: pairing, revocation, offline wait/resume, sandbox escape tests, and kill switch all pass.
8. Voice: push-to-talk round trip works; risky approvals cannot be granted by voice alone. Finance: analysis and paper trading only; no live-order code path.
9. **UI fidelity:** at 1536×1024 the dashboard meets geometry (±6 px), token (ΔE ≤ 6), text and SSIM (≥ 0.88, tuned) thresholds, and the human signs a side-by-side review.
10. **UI function:** every control in Section 16.8 performs its real action; every Section 17 widget is bound to a real endpoint with loading/empty/error/stale states; every route exists and is e2e-tested.
11. **No fake data:** `verify:no-fixtures-in-prod` passes; metrics show `INSUFFICIENT_DATA` rather than invented values.
12. **Quality:** axe 0 serious/critical; LCP < 2.5 s on dashboard; responsive rules (16.10) hold; reduced-motion honored.
13. Telemetry real: algorithm share, latency and cost visible per task and per day; budgets and kill switch tested.
14. Backups restorable; runbooks exist; secrets scan clean.
15. E2E-01…E2E-30 pass from a fresh clone; `FINAL_VERIFICATION_REPORT.md` shows no `NOT_VERIFIED` MUST items; traceability matrix complete; the human has signed off the final acceptance walkthrough.

---

# 14. First Instruction to Paste into the Agent

```text
You are working in the Nexa monorepo. I am giving you two files:
  1. Nexa_V3_Master_Artifact.md   (the main document — it controls everything)
  2. nexa-command-center.png      (the UI reference — I want the UI to match it exactly and be fully functional)
Also read the V1 plan and Nexa_V2_Final_Master_Plan.md.

Run Section 0A (Bootstrap Protocol) now:
1. Create Version-One-Planning-Improvement/ next to this document; place a copy of this document
   inside as 00_MAIN_PLAN.md and the image inside ui-reference/.
2. Analyze the current codebase including apps/web against the reference (A2), do the gap analysis
   including UI and API gaps (A3), think deeply and write the end-to-end plan including every flow in
   Sections 10C (A4), the two TODO lists 04a_BACKEND_TODO.md and 04b_UI_TODO.md (A5), the multi-page
   draw.io architecture (A6), the verification plan (A7), plus 09_API_CONTRACT.md and 10_UI_SPEC.md
   with measured values from the PNG.
3. Write REVIEW_REQUEST.md (include decisions D1–D10) and STOP. Ask me to review. Do not modify
   source code until I reply APPROVED or APPROVED WITH CHANGES.

After approval: build ALL backend first (Track B, B0 → B15), verify each milestone with Part V
(stored evidence required), run Gate B-UI-READY and ask for my sign-off. Only then build the UI
(Track U, U0 → U7) against the frozen API, matching the reference and verifying fidelity.
Ask for my sign-off at each milestone gate.

Rules: obey Section 2 invariants; never ship fake data; never claim "verified" without stored
evidence; follow the Section 12 stop conditions.
```

---

# 15. Final Mental Model

```text
                    NEXA PLATFORM (domain-agnostic core)
   Router-first Manager → Typed DAG → Durable Engine (Postgres + BullMQ)
        ↓                                   ↓
   Policy Engine (default deny)   Tool OS (idempotent + verified)
        ↓                                   ↓
   Payload-bound Approvals        Credential Broker (no secrets in LLM)
        ↓                                   ↓
   Hash-chained Audit + Real Telemetry + Memory OS (provenance, forget)

   Domains plug in via contracts:  Career → Winder → Web → Personal → Desktop → Developer
   Deferred until proven safe:     Trading · Voice · Custom agents · Plugins
```

**Principle:** Prove, then generalize, then expand. Backend first and frozen; UI second and faithful to the reference. Each new domain must be added without touching the core, and every action must be policy-checked, approved when risky, idempotent, verified and audited.

# 16. UI Specification — Build to the Reference Screenshot

**Reference:** `ui-reference/nexa-command-center.png` (1536 × 1024, dark theme). The human supplies this image with this document; the agent copies it into the planning folder (`Version-One-Planning-Improvement/ui-reference/`).

**Authority order:** (1) Section 2 invariants and Section 5 security rules, (2) the reference image for layout, hierarchy, color, typography, iconography and motion feel, (3) this text spec. The image is **never** a license to show fake data: the reference's sample numbers, names and activity are *fixture content* for tests only. Pixel values below marked "≈" are estimates; the agent must **measure the PNG** and record exact values in `design-tokens.json` and `10_UI_SPEC.md`.

## 16.1 Page Anatomy (at 1536 × 1024)

```text
┌────────────┬──────────────────────────────────────────────────────────┬──────────────────┐
│ SIDEBAR    │ TOP BAR (command input · status · bell · calendar · sun · Upgrade)         │
│ ≈205 px    ├──────────────────────────────────────────────┬───────────┤ ASSISTANT PANEL  │
│            │ MAIN (≈960 px wide, scrolls)                  │           │ ≈332 px          │
│ logo       │ Greeting + date/time/weather                  │           │ header           │
│ nav        │ 5 KPI cards                                   │           │ orb              │
│ workspaces │ Your Workspaces (carousel of 6 cards)         │           │ waveform+status  │
│ integrations│ Live Activity │ Task Execution               │           │ 4 controls       │
│ settings   │ Upcoming Schedule │ Today's Focus │ Performance│           │ 4 quick actions  │
│ help       │                                              │           │ chat thread      │
│ user card  │                                              │           │ composer         │
└────────────┴──────────────────────────────────────────────┴───────────┴──────────────────┘
```

Approximate geometry to verify by measurement: sidebar x 0–205; main x ≈222–1182; assistant panel x ≈1198–1530; top bar height ≈64; KPI row y ≈167–262; workspaces section y ≈276–540; middle row y ≈550–800 (Live Activity ≈412 wide, Task Execution ≈534 wide); bottom row y ≈810–1010 (Schedule ≈366, Focus ≈287, Performance ≈285). Card gaps ≈12 px. Use CSS grid with these ratios and fixed minimums, not absolute positioning.

## 16.2 Design Tokens (initial estimates — replace with measured values)

| Token | Estimate | Notes |
|---|---|---|
| `bg.app` | ≈ `#070B1A` | deep navy-black page background with faint radial glow |
| `bg.sidebar` | ≈ `#0A0F20` | slightly lighter, 1 px right border `rgba(255,255,255,.06)` |
| `bg.card` | ≈ `#0E1430` → `#0B1127` gradient | glassy, 1 px border `rgba(255,255,255,.07)`, radius 14–16 px |
| `accent.blue` | ≈ `#3B82F6` | active nav, primary buttons, progress "70%" bar |
| `accent.purple` | ≈ `#8B5CF6` | agents, memory, personal |
| `accent.cyan` | ≈ `#22D3EE` | email/health glow |
| `accent.magenta` | ≈ `#D946EF` | meetings |
| `accent.green` | ≈ `#22C55E` | success, connected dot, health |
| `accent.orange` | ≈ `#F59E0B` | warnings, email progress |
| `accent.red` | ≈ `#EF4444` | stop button, approvals badge |
| `text.primary` / `secondary` / `muted` | ≈ `#F1F5F9` / `#A8B3CF` / `#6B7694` | verify AA contrast |
| Font | Inter (or closest metric match measured from the image) | numerals tabular in KPI/time |
| Type scale | greeting ≈28/700; KPI value ≈30/700; card title ≈15/600; body ≈12–13/400; micro ≈10–11/500 | measure |
| Radius | cards 14–16; chips/pills 999; buttons 10–12 | |
| Glow | per-card colored outer glow ≈ 0 0 24px accent@25% on KPI/workspace cards | |

The **light theme** (sun icon toggles it) is *not* shown in the reference. The agent derives it from the same tokens, shows it to the human for approval (D6), and must keep contrast ≥ AA.

## 16.3 Sidebar

- **Header:** gradient crystal logo, "Nexa AI", subtitle "Your Personal AI OS".
- **Primary nav (with live badges):** Dashboard (active = blue gradient pill), Chat with Nexa, Tasks (count pill, e.g., 14), Agents, Approvals (red circular badge, e.g., 3), Memory & Knowledge, Calendar, Files & Documents.
- **Workspaces** (section label + "+" button): Career (Jobs), Personal, Business (Winder), Web & Research, Finance & Trading, Development, Custom Agents — each with a colored rounded-square icon.
- **Integrations:** Gmail, Google Calendar, Telegram, Slack, Notion, GitHub — brand icon + status dot (green = connected, grey = disconnected/degraded; tooltip explains).
- **Footer nav:** Settings, Help & Docs; **user card** (avatar initial in gradient circle, name, "Pro Plan" with gold crown icon — see D3).
- Behavior: collapsible to icon rail; active route highlighted; badge counts update in realtime; keyboard navigable; "+" opens *Create workspace* flow.

## 16.4 Top Bar

- **Command input** (≈660 px, left): search icon, placeholder "Ask Nexa anything… (e.g., find AI jobs, update my website, analyze emails…)", keycap hints `Ctrl` `K` (show `⌘ K` on macOS). Focus or Ctrl/⌘+K opens the **command palette**; Enter on free text sends it to the Manager.
- **System status chip:** green dot + "All Systems Operational" (text/color derived from health score: Operational / Degraded / Major outage / Safe mode).
- **Bell** (red dot when unread notifications; dropdown list, mark all read), **Calendar** icon (mini-calendar popover with today's events), **Theme** toggle (sun/moon), **Upgrade** pill (gold crown) — see D3.

## 16.5 Main Column Components

1. **Greeting header:** "Good morning/afternoon/evening, {firstName} 👋"; sentence: "Your AI workforce is running smoothly. You have {N} active tasks across {W} workspaces." (deterministic templates, variants for degraded/empty/safe-mode — no LLM). Right side: weekday + date, large live time with sun/moon icon, weather summary ("Partly sunny • 32°C") from the weather provider (hidden if no location set).
2. **KPI cards (5):** Total Tasks (blue), Active Agents (purple), Unread Emails (cyan), Upcoming Meetings (magenta; sub-label "Next in 2h"), System Health (green; "All systems operational"). Each: icon tile, label, big value, small delta line with arrow, and a mini bar sparkline at right. Click navigates to the relevant page filtered accordingly.
3. **Your Workspaces:** title with sparkle icon, subtitle "Everything in one place. Switch, monitor, and manage your AI teams.", **Manage** button, left/right arrows. Cards (≈150 px wide): 3D-style illustration, workspace name, one-line description, two metrics with colored glyphs (e.g., "24 jobs", "2 running"), circular arrow button. Each card has its own accent color. Click opens the workspace page.
4. **Live Activity:** title, **All Activity** filter dropdown; rows with agent avatar icon, bold agent name, summary line, relative time right-aligned, vertical timeline dots; new items slide in at the top.
5. **Task Execution:** tabs **Running (n) / Pending (n) / Completed (n)**; rows: agent icon, task title, agent type subtitle, progress bar with percent, ETA ("2m left"), "…" menu (view details, pause, resume, cancel, retry).
6. **Upcoming Schedule:** title, **View all**, **+ Add Event**; rows with time, colored vertical bar by category, title, category tag (Meeting/Business/Focus/Personal), right side **Join** button (when a meeting link exists) or relative time ("in 3h").
7. **Today's Focus:** "6/10" progress, checklist rows (checkbox, label), **+ Add new task** with arrow; supports user items and accepted agent suggestions.
8. **Performance:** range selector (**Today** / Week / Month); donut with percentage and "Productivity"; legend rows (Tasks Completed, Tasks Running, Tasks Pending, Time Saved); footer banner with trend sentence (shown only when enough history exists).

## 16.6 Assistant Panel (right column, ≈332 px)

- **Header:** Nexa logo, "Nexa AI", status "Online • Ready to help" (green dot; reflects real connectivity), globe icon (web-access toggle), expand icon (opens full Chat page).
- **Orb:** large glowing sphere with ring; **four visual states** driven by `voice.state`/task state: `IDLE` (slow breathing glow), `LISTENING` (ring pulses with input level), `THINKING` (orbiting particles/shimmer), `SPEAKING` (amplitude-reactive ripples). Reduced-motion users get a static orb with a state label.
- **Listening indicator:** pill "Listening…" with live partial transcript below and a real waveform from `AnalyserNode` mic levels.
- **Controls (4 round buttons):** microphone (toggle push-to-talk), pause (pause current task/speech), **stop** (red; cancel current task/stop speech), settings (voice/panel settings).
- **Quick actions (2×2 tiles):** default "Find me AI jobs", "Check my emails", "Update my website", "Winder orders", each with icon, title, subtitle; user-editable; clicking runs the underlying command.
- **Chat thread:** user messages right with initial avatar; Nexa messages left with logo avatar; **agent-run card** ("Running: Job Hunter Agent") with collapsible chevron and a live checklist (✔ done, spinner in-progress, ○ pending) fed by `step.updated` events; links to the task. Auto-scroll with "jump to latest".
- **Composer:** "Message Nexa…" input, **+** (attach files / add context), **globe** (allow web access for this message), paperclip, mic, circular gradient **send** button. Enter sends, Shift+Enter newline; drag-and-drop files.

## 16.7 Interaction and Motion Rules

- Realtime: all lists, counts, progress bars and statuses update from SSE with no page reload; optimistic UI only for user-initiated toggles/checkboxes, reconciled with the server.
- Motion: subtle (150–250 ms ease-out); KPI mini bars and donut animate in once; progress bars animate between values; new activity rows slide in; orb animation is GPU-based (WebGL/canvas) with an FPS guard that degrades gracefully; **respect `prefers-reduced-motion`**.
- States: every widget has **loading skeleton, empty (useful next action), error (retry), and stale (offline) states**. No spinner-only screens.
- Destructive or external-effect actions always route through the Approvals flow and show the exact payload.

## 16.8 UI Control Inventory — Every Control Must Do Something Real

| Control | Action | Backend |
|---|---|---|
| Command input / Ctrl+K | open palette; Enter on text creates a task via Manager | `/v1/search`, `/v1/conversations/:id/messages` |
| Sidebar nav items | route + live badge counts | `/v1/dashboard/summary`, SSE |
| Workspaces "+" | create workspace from template | `POST /v1/workspaces` |
| Integration rows | open connect/health panel | `/v1/integrations` |
| Status chip | open health details (component list) | `/v1/system/health` |
| Bell | list/mark read notifications | `/v1/notifications` |
| Calendar icon | mini-calendar popover | `/v1/calendar/events` |
| Theme toggle | persist theme | `PATCH /v1/settings` |
| Upgrade | open Plan & Usage panel (D3) | `/v1/usage`, `/v1/settings` |
| KPI cards | drill-down navigation | — |
| Workspace card / arrow / Manage | open workspace; carousel; manage drawer | `/v1/workspaces` |
| Live Activity filter | filter by agent/workspace/severity | `/v1/dashboard/activity` |
| Task row "…" | view/pause/resume/cancel/retry | `/v1/tasks/:id/*` |
| Schedule Join / Add Event / View all | open link / create event / open calendar | `/v1/calendar/*` |
| Today's Focus checkbox / Add | toggle / create item | `/v1/focus/items` |
| Performance range | change range | `/v1/dashboard/performance` |
| Orb / mic / pause / stop / settings | voice session + task control | `/v1/voice/*`, `/v1/tasks/:id/*` |
| Quick-action tile | run action | `/v1/quick-actions/:id/run` |
| Agent-run card chevron / link | expand steps / open task | SSE, `/v1/tasks/:id` |
| Composer +, globe, paperclip, mic, send | attach, web toggle, upload, voice, send | `/v1/files`, `/v1/conversations` |
| Approvals approve/reject | decide with payload hash | `/v1/approvals/:id/*` |
| Kill switch | engage/release safe mode | `POST /v1/system/kill-switch` |

The agent expands this into the full inventory in `10_UI_SPEC.md`; **a control without a backing endpoint is a defect**.

## 16.9 UI Security Requirements

httpOnly cookies + CSRF tokens; strict CSP; no secrets or tokens in client bundles; all untrusted text (job descriptions, emails, web content, customer messages) rendered as **escaped text or sanitized markdown**, never via `dangerouslySetInnerHTML`; remote images proxied or blocked; external links `rel="noopener noreferrer"`; approvals display the server-generated `humanSummary` and `payloadHash` prefix; the UI cannot approve an expired or hash-mismatched request; session timeout and re-auth for sensitive actions (approve high-risk, kill-switch release, device pairing).

## 16.10 Responsive and Accessibility

- **≥ 1536:** reference layout. **1280–1535:** same layout, tighter spacing. **1024–1279:** assistant panel becomes a slide-over toggled from the top bar; main grid 2 columns. **768–1023:** sidebar collapses to icon rail; KPI cards wrap to 2–3 per row. **< 768:** sidebar drawer, single column, assistant as bottom sheet with floating orb button, bottom tab bar for Dashboard/Chat/Tasks/Approvals/More.
- WCAG 2.2 AA: focus rings, labels for icon-only buttons, `aria-live="polite"` for activity and counts, `aria-live="assertive"` for approvals and safety banners, full keyboard operation (palette, carousel, tabs, checklist), color never the only signal.

## 16.11 Frontend Stack (default; record deviations in ADR)

Next.js App Router + TypeScript (strict), Tailwind with CSS variables from tokens, a headless primitive library (Radix/shadcn) styled to the tokens, TanStack Query + SSE cache invalidation, Zustand for local UI state, `cmdk` for the palette, Framer Motion, a small chart layer (visx/Recharts or custom SVG for the mini bars and donut), three.js/OGL (or canvas) for the orb, Web Speech/MediaRecorder + Web Audio, Playwright (e2e + visual), Storybook, axe-core, Lighthouse CI.

---

# 17. Widget → Data → Endpoint Binding Map and Formulas

All metrics are computed **in the backend** (B4+), unit-tested with fixtures, and returned with `value`, `asOf`, and `status` (`OK | INSUFFICIENT_DATA | UNAVAILABLE`). The UI never invents or derives business numbers.

| Widget / field | Definition (formula) | Endpoint | Empty / error behavior |
|---|---|---|---|
| Greeting name | `settings.profile.firstName` | `/v1/me` | "there" |
| Active tasks sentence | `N = tasks in RUNNING|READY|WAITING*|NEEDS_APPROVAL`, `W = workspaces with ≥1 such task` | `/v1/dashboard/summary` | "No active tasks. Try a quick action." |
| **Total Tasks** | tasks created today **or** non-terminal; delta line: completed today | summary | 0 with hint |
| **Active Agents** | enabled agents with status ONLINE; delta: agents with a RUNNING step | summary | 0 |
| **Unread Emails** | Gmail inbox unread count; delta: new in last 24 h | summary | "Connect Gmail" CTA |
| **Upcoming Meetings** | events today with `start > now`; delta: "Next in {Δ}" | summary | "No meetings" |
| **System Health %** | `100 × Σ(weight_i × healthy_i)/Σ weight_i` over API, DB, Redis, queue, LLM providers, enabled integrations, paired devices; any CRITICAL component down caps status at "Degraded" | `/v1/system/health` | `UNAVAILABLE` badge |
| KPI sparklines | last 6–7 buckets of the same metric (hourly/daily) from the metrics table | summary | flat/hidden if < 3 points |
| Workspace card metrics | provider-defined `primary` (e.g., open matched jobs, tasks, products) and `running` count | `/v1/workspaces` | zeros with "Get started" |
| Live Activity | `ActivityEvent` stream: agent, summary, severity, workspace, time | `/v1/dashboard/activity` + SSE | "Nothing yet" |
| Task Execution rows | task, agent, `progress = Σ weight(completed steps)/Σ weight(all steps)`, `ETA = Σ median duration of remaining steps` (hidden if < 5 samples) | `/v1/tasks?status=` + SSE | tab-level empty states |
| Upcoming Schedule | calendar events for today (type tag from calendar/category mapping) | `/v1/dashboard/schedule` | "Free day" |
| Today's Focus | `done/total` of focus items for today (user + accepted suggestions) | `/v1/focus/items` | "Add your first priority" |
| **Productivity %** | `round(100 × (0.5·completionRate + 0.3·onTimeRate + 0.2·focusProgress))` where `completionRate = completed/(completed+failed+overdue)`; tooltip shows the formula | `/v1/dashboard/performance` | `INSUFFICIENT_DATA` |
| Trend sentence ("27% more productive") | `(score_today_or_week − trailing_week_avg)/trailing_week_avg`; shown only with ≥ 3 prior days | performance | hidden |
| **Time Saved** | `Σ over completed tasks (baselineManualMinutes[taskType] − humanMinutes)`; baselines configurable; always labelled "estimated" (the reference's negative sign is treated as a typo) | performance | "—" |
| Agent-run card steps | `step.updated` events with human labels from tool/agent step definitions | SSE | — |
| Quick actions | user-configurable list (defaults above) | `/v1/quick-actions` | defaults |
| Integration dots | `status` from integration health checks | `/v1/integrations` | grey |
| Weather | provider by user location, cached 30 min | `/v1/system/weather` | hidden |

---

# 18. Backend API and Realtime Contract (v1 surface)

The agent finalizes exact schemas in `09_API_CONTRACT.md` (generated from OpenAPI). Minimum surface:

**Auth/me:** `POST /auth/login|logout`, `GET /me`, `PATCH /settings`.
**Dashboard:** `GET /dashboard/summary|activity|schedule|performance`, `GET|POST|PATCH|DELETE /focus/items`.
**System:** `GET /system/health|weather`, `POST /system/kill-switch` (engage/release), `GET /usage`.
**Tasks:** `GET /tasks`, `POST /tasks`, `GET /tasks/:id` (steps, logs, evidence), `POST /tasks/:id/cancel|pause|resume|retry`.
**Approvals:** `GET /approvals`, `GET /approvals/:id`, `POST /approvals/:id/approve|reject` (body includes `payloadHash`).
**Agents:** `GET /agents`, `GET|PATCH /agents/:id`, `GET /agents/:id/runs`. **Custom agents:** `GET /agent-templates`, `POST /agents`.
**Workspaces:** `GET|POST /workspaces`, `GET|PATCH|DELETE /workspaces/:id`, `GET /workspaces/:id/overview`; domain routes under `/ws/career|business|web|finance|dev|personal/...`.
**Chat/search:** `GET|POST /conversations`, `GET|POST /conversations/:id/messages`, `GET /search?q=`, `GET /commands`, `GET|POST|PATCH|DELETE /quick-actions`, `POST /quick-actions/:id/run`.
**Memory/files:** `GET /memory`, `DELETE /memory/:id`, `GET|POST /knowledge/documents`, `GET|POST /files`, `GET /files/:id`.
**Calendar/email:** `GET|POST|PATCH|DELETE /calendar/events`, `GET /email/summary|threads|drafts`.
**Integrations:** `GET /integrations`, `POST /integrations/:provider/connect|disconnect`, `GET /integrations/:provider/health`.
**Notifications/audit:** `GET /notifications`, `POST /notifications/:id/read`, `GET /audit`, `GET /audit/verify`.
**Devices:** `GET /devices`, `POST /devices/pair`, `DELETE /devices/:id`.
**Voice:** `POST /voice/stt`, `POST /voice/tts`, `WS /voice/session`.

**SSE events (`GET /events/stream`)**, each with `id`, `type`, `ts`, `userId`, versioned payload:
`task.created|updated|completed|failed`, `step.updated`, `approval.created|updated`, `activity.created`, `agent.status`, `kpi.updated`, `notification.created`, `integration.status`, `voice.state`, `system.health`, `conversation.message`, `focus.updated`, `safe_mode.changed`.

Conventions: `/v1` prefix; RFC 7807 errors; cursor pagination; ISO-8601 UTC timestamps; idempotency-key header on POST actions; ETags where useful; every list endpoint supports `limit`, `cursor`, `filter`. Breaking changes require `/v2`.

---

# 19. Design Assets and Visual-Fidelity Process

## 19.1 Assets
The reference contains illustrated 3D-style workspace art (briefcase, laptop+coffee, storefront, globe, trading chart, developer laptop), the gradient logo, and the orb. Asset pipeline (decide with the human, D4):
1. **v0 placeholders:** slice the illustrations from the reference PNG by script into `ui-reference/crops/` (low resolution; acceptable for development only).
2. **v1 production art:** regenerate at 2×/3× resolution in the same style with an image-generation tool, export WebP/AVIF with transparent backgrounds; keep prompts in `docs/assets/prompts.md` (e.g., "isometric 3D illustration of a navy briefcase with glowing blue accents, dark background, soft neon rim light, no text").
3. Icons: use one consistent line-icon set matched to the reference weight (e.g., Lucide) and official brand marks for Gmail, Google Calendar, Telegram, Slack, Notion, GitHub (check brand-usage terms).
4. The orb is rendered procedurally (shader/canvas), not as an image.

## 19.2 Fidelity Method
- **Fixture mode** (tests/Storybook only; excluded from production builds) loads the exact reference content (names, counts, activity text) so the dashboard can be compared like-for-like at **1536×1024**.
- **Checks:** (a) *geometry:* bounding boxes of the 12 key regions within ±6 px of measured reference; (b) *tokens:* sampled colors within ΔE ≤ 6; (c) *text:* static labels equal; (d) *structural similarity:* SSIM ≥ 0.88 on the dashboard (illustration/orb/text regions masked and reported separately; threshold tuned after baseline and agreed in review); (e) *human side-by-side* sign-off — the deciding gate.
- Add `verify:no-fixtures-in-prod` that fails if fixture strings (e.g., "Stripe", "Vercel", "Linear", "Time Saved -4.2h") or the fixture module appear in a production bundle.

---

# 20. Decisions Needing the Human (with recommended defaults)

| ID | Decision | Options | Recommended default |
|---|---|---|---|
| D1 | UI timing | (a) strict sequential: backend fully first; (b) Parallel-UI mode after B4 using the frozen contract + mock server | (a) as you requested; consider (b) later to see progress sooner |
| D2 | Auth method | passkey (WebAuthn) / password+TOTP | passkey with TOTP fallback |
| D3 | "Upgrade" button and "Pro Plan" label | decorative / opens Plan & Usage panel (budgets, model tiers, quotas) / hidden | opens Plan & Usage panel; label editable in settings (default "Pro Plan" to match the reference) |
| D4 | Illustration assets | slice from reference / regenerate high-res / commission | slice for dev, regenerate before launch |
| D5 | Finance & Trading scope | analysis + paper only / add live trading later | analysis + paper only; live trading needs new ADR |
| D6 | Light theme | skip / derive from tokens for review | derive and review |
| D7 | Voice engine | browser Web Speech only / local Whisper-class / provider STT via gateway | browser for push-to-talk v0 + backend STT for reliability |
| D8 | Weather and location | disabled / user-set city via free provider | user-set city, optional |
| D9 | Hosting | all-local / UI on Vercel + API/workers on a VPS + managed Postgres | UI on Vercel; API/workers/Redis on one small VPS; managed Postgres |
| D10 | Plan scope | build everything / ship Career+Dashboard first then expand | follow this plan; revisit after G-B4 |

---

# Appendix A — Planning Folder Skeleton (bash)

```bash
BASE="${1:-.}/Version-One-Planning-Improvement"
mkdir -p "$BASE"/{adr,progress,ui-reference/crops,05_ARCHITECTURE_exports,verification/{reports,evidence}}
for f in 01_CODEBASE_ANALYSIS 02_GAP_ANALYSIS 03_END_TO_END_PLAN 04_PHASE_TODO \
         04a_BACKEND_TODO 04b_UI_TODO 06_VERIFICATION_PLAN 07_RISK_REGISTER \
         08_DECISION_LOG 09_API_CONTRACT 10_UI_SPEC REVIEW_REQUEST; do
  [ -f "$BASE/$f.md" ] || echo "# $f" > "$BASE/$f.md"
done
cp "Nexa_V3_Master_Artifact.md" "$BASE/00_MAIN_PLAN.md"
cp "nexa-command-center.png" "$BASE/ui-reference/nexa-command-center.png"
```

---

# Appendix B — Minimal draw.io Seed (valid multi-page `.drawio`)

Use this structure; add pages and cells per A6. Keep XML uncompressed.

```xml
<mxfile host="app.diagrams.net">
  <diagram id="p1" name="1 System Context">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" page="1" pageWidth="1600" pageHeight="900">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="user" value="User" style="shape=umlActor;verticalLabelPosition=bottom;" vertex="1" parent="1">
          <mxGeometry x="40" y="200" width="30" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="nexa" value="Nexa Platform&#xa;(Manager · Engine · Tools · Memory)" style="rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
          <mxGeometry x="260" y="180" width="260" height="100" as="geometry"/>
        </mxCell>
        <mxCell id="llm" value="LLM Gateway&#xa;(Ollama · Groq · OpenRouter)" style="rounded=1;fillColor=#f5f5f5;strokeColor=#666666;" vertex="1" parent="1">
          <mxGeometry x="640" y="120" width="220" height="70" as="geometry"/>
        </mxCell>
        <mxCell id="e1" style="endArrow=classic;html=1;" edge="1" parent="1" source="user" target="nexa">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e2" style="endArrow=classic;html=1;" edge="1" parent="1" source="nexa" target="llm">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram id="p2" name="2 Package Architecture">
    <mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>
  </diagram>
</mxfile>
```

Validation snippet:

```bash
python3 - <<'PY'
import xml.etree.ElementTree as ET
t = ET.parse("05_ARCHITECTURE.drawio")
pages = t.getroot().findall("diagram")
print(len(pages), "pages:", [p.get("name") for p in pages])
PY
```
