# Nexa — P0 Implementation Audit

> Audited: 2026-09-23 | Auditor: Lead Architect
> Method: Full filesystem inspection of every file, directory, config, and schema.

---

## 1. What P0 Actually Implements

### ✅ Created
| Item | Status | Notes |
|---|---|---|
| Root `package.json` with npm workspaces | ✅ Exists | Workspaces: `apps/*`, `packages/*` |
| `turbo.json` | ✅ Exists | Pipeline for build/test/lint/typecheck/dev |
| `tsconfig.base.json` | ✅ Exists | ES2022, strict mode |
| `.env.example` | ✅ Exists | DB, OpenRouter, Telegram, Gmail placeholders |
| `docker-compose.yml` | ✅ Exists | PostgreSQL + pgvector (ankane/pgvector) |
| `apps/web` (Next.js) | ✅ Scaffolded | Default Next.js app-tw template, 4 files |
| `apps/api` (NestJS) | ✅ Scaffolded | Default NestJS template, 5 source files |
| `packages/shared/src/index.ts` | ✅ Exists | Core types defined |
| Prisma schema | ✅ Exists | 4 models: User, Agent, Task, MemoryRecord |
| Package directories | ✅ Exist | 12 directories with package.json stubs |
| OSS research repos | ✅ Cloned | All 5 repos with SHAs recorded |
| Research analysis docs | ✅ Exist | ANALYSIS.md, FEATURE_MATRIX.md, etc. |

### ⛔ CRITICAL GAPS (P0 NOT COMPLETE)

| Missing Item | Severity | Impact |
|---|---|---|
| **npm install BROKEN** | 🔴 CRITICAL | `npm install` fails with `edgesOut` error. No `node_modules` exist. Nothing can run, build, or test. |
| **No `.gitignore`** | 🔴 HIGH | No gitignore means `node_modules/`, `.env`, `dist/` would be committed |
| **No CI workflow** | 🟡 MEDIUM | No `.github/workflows/` — P0 plan requires basic CI |
| **No health endpoint** | 🟡 MEDIUM | API has only `GET /` returning "Hello World" — no `/health` |
| **No Prisma dependencies** | 🔴 HIGH | `prisma` and `@prisma/client` not in `apps/api/package.json` |
| **No database migration** | 🟡 MEDIUM | Schema exists but no migration has been generated or run |
| **No seed scripts** | 🟡 LOW | No `scripts/seed.ts` |
| **No structured logging** | 🟡 MEDIUM | NestJS default logger only |
| **No error handling** | 🟡 MEDIUM | No exception filters, no global error handler |
| **No environment validation** | 🟡 MEDIUM | No validation that required env vars exist at startup |
| **No Git hooks** | 🟡 LOW | No husky/lint-staged |
| **No docs/ architecture files** | 🟡 LOW | `docs/architecture.md`, `docs/agent-system.md`, etc. not created |
| **Package stubs are empty** | 🟡 MEDIUM | All 12 package dirs have only `{"name":"@nexa/x","version":"1.0.0","main":"index.js"}` — no src/, no code |
| **Turbo not installed** | 🟡 MEDIUM | `turbo` not in root `devDependencies` |
| **Shared package has no build** | 🟡 MEDIUM | `typescript` in devDeps but not installed, no `dist/` output |

---

## 2. Architecture Deviations

| Concern | Status |
|---|---|
| Agent contract has `plan()`, `execute()`, `validate()` methods with `any` types | ⚠️ Methods on an interface are unusual; should be abstract class + typed generics |
| `Agent` interface mixes runtime behavior (methods) with config (identity, capabilities) | ⚠️ Should separate `AgentConfig` from `AgentRuntime` |
| No `identity` field on Agent (required by final plan) | ⛔ Missing |
| No `retryPolicy` on Agent (required by final plan) | ⛔ Missing |
| No `memoryAccess` on Agent (required by final plan) | ⛔ Missing |
| No `telemetry` on Agent (required by final plan) | ⛔ Missing |
| `ActivityEvent` lacks `requestId`, `conversationId`, `taskId`, `agentId` | ⚠️ Missing observability fields |
| `LLMRequest` lacks `category` field (FAST/REASONING/etc.) | ⚠️ Missing |
| `ExecutionPlan` has no budget field | ⚠️ Should reference `Task.budget` |
| No idempotency key on any contract | ⛔ Missing for consequential operations |

---

## 3. Technical Debt

1. **npm workspaces broken** — the fundamental development experience is non-functional
2. **No shared package build chain** — `packages/shared` cannot be consumed by `apps/api` because TypeScript isn't configured to resolve workspace packages
3. **NestJS API is scaffolding only** — zero Nexa-specific code, no modules, no services
4. **Next.js web is scaffolding only** — default template, zero Nexa UI
5. **No database connection** — Prisma schema exists but prisma client is not installed, no connection module
6. **12 empty packages** — all placeholder package.json with no source code

---

## 4. Security Concerns

1. `.env.example` contains default passwords (`nexa_pass`) — acceptable for dev, but needs clear warning
2. No `.gitignore` — secrets could be committed accidentally
3. No input validation anywhere
4. No CORS configuration on API
5. No authentication/authorization
6. No rate limiting

---

## 5. Test Gaps

- Only 1 test file exists: `app.controller.spec.ts` (NestJS default "Hello World" test)
- No tests for shared types
- No integration tests
- No E2E tests
- Test framework (vitest) is configured but dependencies may not be installed

---

## 6. Recommended P1 Implementation Order

Given the broken P0 state, the implementation order must be:

### Phase 0.5 — Fix P0 (MUST DO FIRST)
1. Create `.gitignore`
2. Fix npm workspace resolution (switch to proper workspace config or fix package naming)
3. Install all dependencies successfully
4. Add `turbo` to root devDeps
5. Add `prisma` + `@prisma/client` to API
6. Add health endpoint
7. Verify `npm run build` works across workspace
8. Verify `npm test` runs successfully
9. Create basic CI workflow

### Phase 1.0 — Core Contracts (strengthen shared types)
1. Fix `Agent` contract to match final plan (identity, retryPolicy, memoryAccess, telemetry)
2. Add `AgentConfig` separate from runtime
3. Add observability fields to `ActivityEvent`
4. Add `ModelCategory` enum
5. Add idempotency key support
6. Add context assembly types

### Phase 1.1 — Agent Runtime
1. BaseAgent abstract class
2. AgentRegistry with capability discovery
3. AgentRunner (budget enforcement, telemetry)

### Phase 1.2 — LLM Gateway
1. LLMProvider interface
2. OpenRouterProvider
3. ModelRouter with categories + fallbacks
4. Token/cost tracking

### Phase 1.3 — Interaction + Manager Agents
1. InteractionAgent (conversation handler)
2. ManagerAgent (planning, agent selection)
3. Context assembly layer
4. ExecutionPlan creation

### Phase 1.4 — Event + Observability
1. EventBus service
2. Activity event emission
3. Request tracing (request_id propagation)

### Phase 1.5 — Testing + Verification
1. Unit tests for all components
2. Integration test: request → plan → result
3. CI verification
