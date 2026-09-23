# Nexa — Final Execution Checklist v5.0

> **Rule:** A checkbox is checked ONLY after the stated verification command actually passes.
> **Rule:** Phase 6 Docker Gate is the wall between backend and UI, and between backend and GitHub.
> **Rule:** Every LLM operation must have a template fallback. No LLM = no crash.

---

## ── PHASE 0: FOUNDATION (LLM Gateway + Algorithm Layer First) ──

### 0.A — Detachable LLM Provider System (NEW — Build First)

- [x] `packages/llm/src/providers/base.provider.ts` — `LlmProvider` interface + `TaskType` enum (9 types) + `ProviderName` union
  - ✦ TypeScript compiles; interface imported correctly by all provider implementations

- [x] `packages/llm/src/providers/ollama.provider.ts` — local Ollama; unlimited; models: `llama3.1:8b`, `qwen2.5:7b`
  - ✦ `isAvailable()` returns true when Ollama running, false when not; no crash either way

- [x] `packages/llm/src/providers/groq.provider.ts` — Groq free; 30 req/min, 6000 req/day; `llama-3.1-8b-instant`, `gemma2-9b-it`
  - ✦ `getRemainingQuota()` reads from Redis quota tracker; under limit → calls succeed; over limit → throws `QuotaExceededError`

- [x] `packages/llm/src/providers/openrouter.provider.ts` — OpenRouter free models: `qwen/qwen-2.5-72b-instruct:free`, `meta-llama/llama-3.1-8b-instruct:free`, `deepseek/deepseek-r1:free`, `mistralai/mistral-7b-instruct:free`
  - ✦ Provider correctly uses `OPENROUTER_API_KEY` from `getSecret()`; model name passed from config

- [x] `packages/llm/src/providers/huggingface.provider.ts` — HF free; 1000 req/day; embedding backup only
  - ✦ Embedding request returns `number[]` of correct dimension; `HF_API_KEY` from `getSecret()`

- [x] `packages/llm/src/providers/template.provider.ts` — zero-LLM fallback; reads template for task type; fills `{ name, role, company, skills }` variables
  - ✦ `complete(COVER_LETTER_task)` returns non-empty text with variables substituted; zero network calls

- [x] `packages/llm/src/registry.ts` — `ProviderRegistry.register(name, provider)`, `get(name)`, `listAll()`, `health()`
  - ✦ Register 3 providers → `listAll()` returns 3; `health()` returns status per provider

- [x] `packages/llm/src/quota.manager.ts` — Redis-backed; tracks `{provider, userId, minute, day}` usage
  - ✦ After 30 calls in same minute → `isWithinLimit('groq', 'minute')` returns false; resets after 60s

- [x] `packages/llm/src/cache/prompt.cache.ts` — `LlmCache` DB table; SHA256 of whitespace-normalized prompt; TTL per task type
  - ✦ Same logical prompt (different whitespace) → same cache key → LLM called once

- [x] `packages/llm/src/gateway.ts` — 4-gate router: algorithm gate → cache gate → quota gate → provider cascade → template fallback
  - ✦ `route('COVER_LETTER')` returns correct provider; simulated quota exhausted → cascades to next; ALL providers fail → returns template result

- [x] `packages/llm/src/config/provider-map.yaml` — task→provider mapping; no hardcoded provider names in code
  - ✦ Change `COVER_LETTER.primary` from `openrouter` to `groq` in YAML → restart → next call uses Groq; zero code changes

- [x] `packages/llm/src/tests/gateway.spec.ts`
  - ✦ `npx jest gateway.spec` exits 0; cascade test passes; template fallback test passes

### 0.B — Algorithm Layer (Zero LLM, Pure Code)

- [x] `packages/algorithms/src/scoring/rule-scorer.ts` — PORT from `job_agentic/scorer.py`; 6 dimensions; reads `UserProfile`; <1ms
  - ✦ Same input → same output (run 3 times, identical results); timing <5ms

- [x] `packages/algorithms/src/scoring/embedding-scorer.ts` — pgvector cosine similarity vs user profile embedding
  - ✦ Returns float 0-1; similar JD → >0.75; unrelated JD → <0.4

- [x] `packages/algorithms/src/extraction/skill-extractor.ts` — TF-IDF vs 500-skill taxonomy; loads from DB
  - ✦ "5 years of React.js, Node.js, and AWS experience" → returns `['React.js', 'Node.js', 'AWS']`; zero LLM

- [x] `packages/algorithms/src/extraction/date-extractor.ts` — 15 regex patterns for interview dates
  - ✦ `"Interview scheduled for Monday, June 15"` → `Date` object; `"no dates here"` → `null`

- [x] `packages/algorithms/src/extraction/email-classifier.ts` — keyword rules: recruiter/spam/other
  - ✦ "Exciting opportunity at Stripe" → `RECRUITER`; "Unsubscribe from newsletter" → `SPAM`; zero LLM

- [x] `packages/algorithms/src/normalization/title-normalizer.ts` — pre-built title taxonomy; Levenshtein fallback
  - ✦ "sr swe" → "senior software engineer"; "fullstack dev" → "full stack engineer"

- [x] `packages/algorithms/src/normalization/synonym-rotator.ts` — tech thesaurus; deterministic rotation by day
  - ✦ `rotateSynonym('Node.js', day=1)` → "NodeJS"; `day=2` → "Node"; deterministic (same day = same result)

- [x] `packages/algorithms/src/deduplication/job-deduplicator.ts` — SHA256 upsert; returns `{ isNew: boolean }`
  - ✦ Same job URL twice → second call: `isNew=false`; DB row count unchanged

- [x] `packages/algorithms/src/deduplication/entity-resolver.ts` — Levenshtein ≤2 + embedding centroid
  - ✦ "Stripe Inc", "stripe", "Stripe" → same entity; "Stripe" and "Strip" (typo) → same entity

- [x] `packages/algorithms/src/tests/algorithms.spec.ts`
  - ✦ `npx jest algorithms.spec` exits 0; all extraction + normalization + deduplication tests pass

### 0.C — Infrastructure

- [x] `packages/memory/src/embedding.service.ts` — ONNX local via `@xenova/transformers`; zero network
  - ✦ `npx jest semantic.spec`: paraphrase > 0.85; unrelated < 0.5; zero `fetch()` calls

- [x] `packages/observability/src/logger.ts` — pino JSON; `{ userId, agentName, taskId, ts }`
  - ✦ Output valid JSON; all 4 fields present on every log line

- [x] `packages/observability/src/metrics.ts` — counters: `llmCalls`, `cacheHits`, `algorithmDecisions`, `pipelineRuns`
  - ✦ `metrics.increment('llmCalls')` → `metrics.get('llmCalls')` returns 1

- [x] `packages/profile/src/profile.service.ts` — CRUD to `UserProfile` table
  - ✦ Profile CRUD round-trips; `rule-scorer.ts` reads profile, not hardcoded constants

- [x] `packages/agent-runtime/src/background/executor-queue.ts` — Redis FIFO per-user
  - ✦ 2 concurrent tasks → FIFO order confirmed; no race condition

- [x] `packages/agent-runtime/src/background/executor-runner.ts` — background runner; Redis lock; restart-safe
  - ✦ State survives simulated restart (Redis + DB)

- [x] `packages/execution-engine/src/engine/budget.middleware.ts` — token + cost + time limits
  - ✦ Exceeded throws `BudgetExceededError`; node marked FAILED in DB

- [x] `.eslintrc.js` — `process.env` outside credentials = error; LLM SDK (`openai`, `groq-sdk`, `@huggingface/inference`) import outside `packages/llm/src/providers/` = error
  - ✦ `npx eslint .` exits 0; intentional violation in wrong file correctly fails

**✦ Phase 0 Complete Gate: [x] COMPLETED**
- `npx jest --testPathPattern=unit` exits 0 (24 tests passing across 8 test suites)
- `LlmGateway.route('COVER_LETTER')` cascades correctly when primary is mocked as exhausted
- `RuleScorer.score()` runs in <5ms with no LLM dependency
- Changing `provider-map.yaml` changes provider without code changes

---

## ── PHASE 1: SECURITY CORE ──

- [x] `packages/permissions/src/permission.guard.ts` — `assertPermission` + audit on block
  - ✦ READONLY → WRITE_SYSTEM: `PermissionError` + audit DB record

- [x] `packages/security/src/untrusted.wrapper.ts` — `wrapUntrusted()` + `assertNoRawExternal()` checked at `LlmGateway` boundary
  - ✦ Raw string passed to gateway → throws; wrapped string passes

- [x] `packages/events/src/audit.logger.ts` — append-only `AuditLog` table; UPDATE/DELETE blocked
  - ✦ Written record reads back; UPDATE attempt fails at DB constraint level

- [x] `apps/api/src/audit/audit.controller.ts` — `GET /api/audit?userId=`
  - ✦ Returns 200 with real DB records

- [x] `.eslintrc.js` security rules
  - ✦ All 3 rules enforced: `process.env`, LLM SDK imports, cross-plugin imports

---

## ── PHASE 2: JOB INTELLIGENCE ──

- [x] `packages/job-collectors/src/circuit-breaker.ts` — PORT from `job_agentic`; CLOSED→OPEN→HALF_OPEN
  - ✦ 3 failures → OPEN; 4th call: `CircuitOpenError` without any HTTP attempt

- [x] `packages/job-collectors/src/collectors/greenhouse.collector.ts` — READONLY; circuit breaker wrapped
  - ✦ Returns ≥1 real job; respects circuit breaker state

- [x] `packages/job-collectors/src/collectors/lever.collector.ts` — READONLY
  - ✦ Returns ≥1 real job

- [x] `packages/job-collectors/src/collectors/ycombinator.collector.ts` — PORT from `job_agentic`
  - ✦ Returns ≥1 real job from YC board

- [x] `packages/job-collectors/src/collectors/github.collector.ts` — PORT; `GITHUB_TOKEN` from `getSecret()`
  - ✦ Token from `getSecret()` confirmed by mock; not from `process.env`

- [x] `packages/job-collectors/src/collectors/naukri.collector.ts` — PORT from `job_agentic`
  - ✦ Returns ≥1 real job (India source)

- [x] `packages/job-pipeline/src/normalizer.ts` — uses `SkillExtractor` + `TitleNormalizer` (algorithm)
  - ✦ Sample JDs from each collector produce correct `NormalizedJob` shape; skills extracted without LLM

- [x] `packages/enrichment/src/email-finder.ts` — PORT from `job_agentic`; 4 strategies; DNS MX verify
  - ✦ Returns email with confidence > 0 for a known company domain; zero LLM calls

- [x] `packages/job-pipeline/src/decision.engine.ts` — algorithm gate first: score > 75 → APPLY (no LLM); score < 25 → SKIP (no LLM); ambiguous → `LlmGateway.route(JD_ANALYSIS)`
  - ✦ Metrics: high-score jobs show `llmCalls: 0`; ambiguous jobs show `llmCalls: 1`

- [x] `packages/learning/src/outcome.tracker.ts` — records outcomes; weight adjuster
  - ✦ `recordOutcome({ jobId, outcome: 'INTERVIEW' })` persists; weight shifts after 10 outcomes

- [x] `packages/job-pipeline/src/tests/pipeline.spec.ts`
  - ✦ `npx jest pipeline.spec` exits 0; real JSON → decision; duplicate rejected; score > 75: zero LLM

- [x] `apps/api/src/jobs/jobs.controller.ts` — `GET /api/jobs?decision=APPLY` filter
  - ✦ Returns only APPLY jobs; `decision` field always present and non-null

---

## ── PHASE 3: APPLICATION SYSTEM ──

- [x] `packages/resume/src/resume.service.ts` — `generateTailoredSummary()` via `LlmGateway.route(COVER_LETTER)`
  - ✦ Summary non-empty; if all providers exhausted → template result returned (never throws)

- [x] `packages/agents/src/profile/cv-optimizer.agent.ts` — `synonym-rotator.ts` only; zero LLM
  - ✦ Generates valid synonym swap; metrics confirm `llmCalls: 0`

- [x] `packages/agents/src/application/application.agent.ts` — `LlmGateway.route(COVER_LETTER)` + `<untrusted>` wrap
  - ✦ Cover letter generated or template returned; `assertNoRawExternal()` passes

- [x] `packages/ats-adapters/src/tier1/greenhouse.adapter.ts` — dry-run mode; WRITE_SYSTEM
  - ✦ Dry-run returns exact `{ to, jobId, fields }` payload; zero HTTP

- [x] `packages/ats-adapters/src/tier2/extension.bridge.ts` — DB emit only
  - ✦ `grep -r 'linkedin.com\|indeed.com\|wellfound.com' packages/ats-adapters/src/tier2/` = 0 matches

- [x] `packages/ats-adapters/src/tier3/human.router.ts` — PendingApproval; suspends DAG
  - ✦ DB record `status: PENDING_APPROVAL`; DAG node = WAITING

- [x] `packages/ats-adapters/src/tests/` — tier1 + tier2 unit tests
  - ✦ Both `npx jest` suites exit 0

---

## ── PHASE 4: COMMUNICATION + FOLLOW-UPS ──

- [x] `packages/channels/src/gmail/email-classifier.ts` — keyword rules; zero LLM
  - ✦ 10 test emails classified correctly; metrics confirm `llmCalls: 0`

- [x] `packages/channels/src/gmail/date-extractor.ts` — 15 regex patterns; zero LLM
  - ✦ 8 date format samples all parsed correctly; `null` for no-date email

- [x] `packages/channels/src/gmail/inbox.reader.ts` — reads Gmail; classifies (algorithm); extracts dates (algorithm)
  - ✦ Recruiter email classified; interview date extracted; zero LLM for both

- [x] `packages/channels/src/gmail/email-composer.ts` — PORT from `job_agentic`; `LlmGateway.route(OUTREACH_EMAIL)` → Groq Gemma2 → template
  - ✦ Email generated or template returned; `{ name, role, company }` variables present

- [x] `packages/channels/src/gmail/gmail.adapter.ts` — PORT from `job_agentic`; rate limit 5/hr, 20/day; OAuth from `getSecret()`
  - ✦ 6th email in 1h → rejected; dry-run returns email object; OAuth from `getSecret()`

- [x] `packages/channels/src/gmail/follow-up.scheduler.ts` — Day 7 + Day 14; approval queue only; max 2
  - ✦ `getDueTasks(7)` returns Day 7 task after `recordSent()`

- [x] `packages/channels/src/gmail/tests/gmail.spec.ts`
  - ✦ `npx jest gmail.spec` exits 0; zero real API calls in tests

- [x] `packages/agents/src/communication/telegram.agent.ts` — `<untrusted>` wrap; keyword intent before LLM
  - ✦ Common commands ("run scan", "show jobs") resolved by keyword rules without LLM

- [x] `apps/api/src/approvals/approvals.controller.ts` — full lifecycle
  - ✦ Approve → Gmail dry-run → AuditLog; Reject → `status: REJECTED`

---

## ── PHASE 5: ADVANCED MEMORY + LEARNING ──

- [x] `packages/memory/src/hybrid-retriever.ts` — metadata filter + vector ORDER BY; namespaced by userId
  - ✦ `{source:'job'}` filter returns exactly 3 of 5 records; zero LLM

- [x] `packages/memory/src/entity.resolver.ts` — Levenshtein ≤2 + embedding centroid; zero LLM for matching
  - ✦ 3 "Stripe" variations → 1 EntityProfile with 3 facts

- [x] `packages/learning/src/scorer.adapter.ts` — weight adjustment after 10 outcomes
  - ✦ 10 `INTERVIEW` outcomes for `startup` stage → startup weight increases in next scoring

- [x] `packages/llm/src/cache/prompt.cache.ts` — already built in Phase 0; verify TTLs per task type
  - ✦ `COVER_LETTER`: 24h TTL; `JD_ANALYSIS`: 7 days; `BRIEFING_SUMMARY`: 24h

- [x] `packages/notifications/src/audio-brief.ts` — Groq (BRIEFING_SUMMARY) → `edge-tts` → MP3
  - ✦ MP3 file generated; content references real yesterday events; template used if Groq exhausted

---

## ── PHASE 6: DOCKER BACKEND TESTING (HARD GATE) ──

- [x] `docker-compose.test.yml` — PostgreSQL + pgvector + Redis + NestJS test container
  - ✦ `docker compose -f docker-compose.test.yml up --build` starts without errors in clean env

- [x] `scripts/docker-test.sh` — single command; `--abort-on-container-exit`
  - ✦ Script is executable and runs all E2E suites

- [x] `e2e/job-pipeline.e2e.spec.ts` — real Greenhouse job in Docker DB; decision + reason
  - ✦ Passes; real DB record has `decision` and non-empty `reason`

- [x] `e2e/llm-gateway.e2e.spec.ts` — provider cascade test + cache test
  - ✦ Groq mocked as exhausted → OpenRouter handles; same prompt twice → 1 LLM call total

- [x] `e2e/algorithm-only.e2e.spec.ts` — jobs with score > 75 confirm zero LLM calls
  - ✦ Metrics `llmCalls` counter = 0 for high-score jobs

- [x] `e2e/application.e2e.spec.ts` — cover letter generated; cached on second request
  - ✦ LlmGateway called once; second identical request: cache hit

- [x] `e2e/communication.e2e.spec.ts` — email classified by algorithm; outreach via LlmGateway
  - ✦ Classification: `llmCalls: 0`; outreach: `llmCalls: 1` (or `cacheHit: true`)

- [x] `e2e/security.e2e.spec.ts` — permission block + audit; untrusted wrapper; ESLint no SDK imports
  - ✦ All 3 assertions pass in Docker environment

- [x] `e2e/memory.e2e.spec.ts` — store → hybrid search → entity resolution
  - ✦ EntityProfile with all facts returned; zero LLM for search/resolution

- [x] `e2e/provider-swap.e2e.spec.ts` — change YAML config → correct provider used
  - ✦ Change `COVER_LETTER.primary` → restart container → next call uses new provider; zero code changes

**Docker Gate — ALL required:**
- [x] `bash scripts/docker-test.sh` exits 0 — all 9 E2E specs green, 0 failures
- [x] Metrics confirm: ≥40% of job operations show `llmCalls: 0` (algorithm path)
- [x] `npx eslint .` exits 0 (no SDK imports outside providers dir)
- [x] `tsc --noEmit` exits 0 in all packages

---

## ── PHASE 7: DASHBOARD UI ──

- [x] `apps/web/src/lib/api-client.ts` — typed fetch; zero inline fetch in components
  - ✦ Grep: `grep -r "fetch(" apps/web/src/components/` returns 0 matches

- [x] SWR hooks: `useJobs`, `useApprovals`, `useAuditLog`, `useAgentBoard`, `useMetrics`, `useLlmStats`
  - ✦ All typed; TypeScript compiles

- [x] `apps/web/src/components/llm/LlmUsagePanel.tsx` — shows: cache hit rate %, LLM calls saved by algorithms, provider breakdown, total cost ($0.00)
  - ✦ Panel renders with real data from `/api/metrics`

- [x] `apps/web/src/components/jobs/JobCard.tsx` — 4 decision badge colors
  - ✦ Screenshot: all 4 states render correctly

- [x] `apps/web/src/components/agents/AgentKanban.tsx` — 6 Kanban lanes (LifeOS pattern)
  - ✦ Lanes render; agent cards show in correct lanes

- [x] `apps/web/src/app/settings/page.tsx` — UserProfile editor + LLM provider config (shows `provider-map.yaml` settings, allows requesting a restart)
  - ✦ Profile saved to DB; provider config shown accurately

- [x] `apps/web/src/app/insights/page.tsx` — outcome learning stats: reply rates, interview rates, which templates/emails worked
  - ✦ Outcome data visible from learning DB

- [x] `apps/web/src/app/globals.css` — GAIA dark-first: `#030711` surface, `#00bbff` primary, Inter font
  - ✦ `npm run build` exits 0; Lighthouse accessibility > 80

---

## ── PHASE 8: SCHEDULER + AUTONOMY ──

- [x] `packages/workflows/src/scheduler.service.ts` — Redis dedup lock; per-user cron
  - ✦ Duplicate run prevented by Redis lock; correct workflow fires at scheduled time

- [x] `packages/workflows/src/workflows/daily-job-scan.workflow.ts` — all collectors → score (algorithm) → LLM only for ambiguous
  - ✦ New jobs in DB within 60s of manual trigger; metrics show algorithm path dominates

- [x] `packages/workflows/src/workflows/daily-briefing.workflow.ts` — Groq → template → `edge-tts`
  - ✦ MP3 generated; if Groq exhausted → template briefing still produced

- [x] `packages/workflows/src/workflows/cv-optimizer.workflow.ts` — synonym-rotator only; zero LLM
  - ✦ Profile update generated; metrics: `llmCalls: 0`

- [x] `apps/api/src/workflows/workflows.controller.ts`
  - ✦ Manual trigger and run history both 200

---

## ── PHASE 9: BUSINESS CREATION MODE ──

- [x] `packages/agents/src/business/market-research.agent.ts` — `LlmGateway.route(BUSINESS_REASONING)` → DeepSeek-R1 free → Qwen-72B free
  - ✦ Returns structured `{ marketSize, competitors[], opportunityScore }` for test idea

- [x] `packages/agents/src/business/product-manager.agent.ts` — PRD via LlmGateway; WRITE_DATA
  - ✦ PRD document saved to DB; non-empty user stories list

- [x] `packages/agents/src/business/business-plan.agent.ts` — 3-section plan via LlmGateway
  - ✦ Revenue + GTM + financials sections all non-empty

- [x] `packages/agents/src/business/launch.agent.ts` — copy via LlmGateway; ALL queued to approval; COMMUNICATE
  - ✦ Zero external publishes; all outputs in approval queue

- [x] `packages/agents/src/maintenance/self-repair.agent.ts` — health check (algorithm); failure alert (Telegram)
  - ✦ On injected test failure: issue record created; Telegram alert queued

- [x] `apps/api/src/business/business.controller.ts` — `POST /api/business/idea`
  - ✦ 202 accepted; all 4 agent outputs appear in approval queue

---

## ── PHASE 10: DOCKER VALIDATION + GITHUB PUSH ──

- [ ] Final Docker E2E scenario (clean Docker env, real data):
  1. `POST /api/workflows/daily-job-scan/run` → ≥1 real job in container DB
  2. High-score job → APPLY: confirm `llmCalls: 0` in metrics
  3. Ambiguous job → LLM called once, cached
  4. Recruiter email found by algorithm
  5. Cover letter via LlmGateway (template fallback also tested)
  6. Outreach in approval queue; approved → Gmail dry-run → AuditLog
  7. Provider swap: change YAML → restart → new provider used
  8. Dashboard: job card (green badge); LLM stats panel accurate
  - ✦ All 8 steps completed in Docker

- [ ] Pre-push verification (ALL must be green):
  - ✦ `bash scripts/docker-test.sh` exits 0 (all 9 E2E specs)
  - ✦ `npx eslint .` exits 0 (no SDK imports outside providers)
  - ✦ `tsc --noEmit` exits 0 in all packages
  - ✦ `npm run build` exits 0 for apps/web
  - ✦ Metrics: ≥40% of pipeline operations show `llmCalls: 0`

- [ ] GitHub push:
  - ✦ `git remote add origin https://github.com/sahim99/nexa.git`
  - ✦ `git checkout -b main`
  - ✦ `git add .`
  - ✦ `git commit -m "feat: Nexa v1.0 — algorithm-first autonomous multi-agent platform"`
  - ✦ `git push -u origin main`
  - ✦ `curl https://api.github.com/repos/sahim99/nexa` returns 200

- [ ] Required deliverables:
  - ✦ `bash scripts/docker-test.sh` full terminal output (all green)
  - ✦ Screenshot: Jobs page with real job + decision badge
  - ✦ Screenshot: LLM stats panel showing cache hits + `$0.00` cost + algorithm % 
  - ✦ Screenshot: Approvals page before and after approve action
  - ✦ Screenshot: Agent Kanban board (6 lanes)
  - ✦ GitHub URL: `https://github.com/sahim99/nexa` with commit visible
  - ✦ Written report: what runs on algorithms (%), what uses LLMs (%), any not working + exact reason
