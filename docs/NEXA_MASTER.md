# NEXA — Autonomous Personal Intelligence Platform v5.0 (FINAL)

> **North Star:** Nexa is your personal Chief of Staff — fully autonomous, algorithm-first, LLM-last, and completely provider-agnostic. Swap any LLM provider in a config change. Use LLMs only where no algorithm can match the quality. Run entirely on free tiers.

---

## Section 0 — What Changed and Why (v4.0 → v5.0)

### The Core Problem with ALL Previous Plans: LLM Overuse

Every previous plan treated LLMs as the default tool. This is **wrong**. LLMs are:
- Rate-limited on free tiers (kills autonomous daily operation)
- Non-deterministic (same job scored differently each run)
- Slow (2-5s per call vs <1ms for algorithms)
- Expensive at scale
- Unnecessary for 70% of what this system does

### The Senior Engineering Fix: Algorithm-First Audit

| Task | Previous approach | Correct approach | LLM needed? |
|---|---|---|---|
| Job deduplication | — | SHA256(company+role+url) — 100% deterministic | ❌ NEVER |
| Skill extraction from JD | LLM | TF-IDF against a 500-skill taxonomy dictionary (ESCO/O*NET) | ❌ NEVER |
| Rule-based scoring | Rules + LLM for everything | Pure weighted rules, <1ms, deterministic | ❌ NEVER |
| Job title normalization | LLM | Pre-built title taxonomy + Levenshtein distance ≤3 | ❌ NEVER |
| Recruiter email finding | LLM | 4 pattern strategies + DNS MX verify | ❌ NEVER |
| Interview date extraction from email | LLM | Regex battery (15 date patterns) + `date-fns` parse | ❌ RARELY |
| Recruiter email classification | LLM | Keyword rules: "recruiter", "opportunity", "role", "interview" | ❌ RARELY |
| CV synonym rotation (optimizer) | LLM | Pre-built tech thesaurus dict: "Node.js"→"NodeJS"→"Node" | ❌ NEVER |
| Prompt deduplication (cache key) | SHA256 of raw string | SHA256 of whitespace-normalized string | ❌ NEVER |
| Entity deduplication (resolver) | LLM | Levenshtein ≤3 + embedding centroid similarity | ❌ RARELY |
| Ambiguous JD analysis (25-75 range) | LLM always | Embedding similarity first; LLM only if still ambiguous | ⚠️ SOMETIMES (~20% of jobs) |
| Cover letter generation | LLM (correct) | LLM — genuinely needs generation, no algorithm substitute | ✅ YES |
| Personalized outreach email | LLM (correct) | LLM — genuinely needs context-aware generation | ✅ YES |
| Business plan generation | LLM (correct) | LLM — genuinely needs reasoning and generation | ✅ YES |
| Daily briefing summary | LLM (sometimes) | Template-based for simple days; LLM for complex summaries | ⚠️ OPTIONAL |

**Result: LLMs are called for <30% of operations. The other 70% run on pure algorithms — free, fast, deterministic.**

---

## Section 1 — The LLM Provider System (Fully Detachable)

### 1.1 Provider Interface (The Contract Every Provider Must Implement)

```typescript
// packages/llm/src/providers/base.provider.ts
// This is THE ONLY interface any consumer calls.
// Swapping providers = swapping one line in config. No code changes.

export interface LlmProvider {
  readonly name: ProviderName;           // 'groq' | 'openrouter' | 'huggingface' | 'ollama' | 'template'
  readonly models: Record<TaskType, string>;  // which model handles which task type
  readonly rateLimit: {
    requestsPerMinute: number;          // 0 = unlimited (local)
    requestsPerDay: number;             // 0 = unlimited (local)
  };
  readonly costPerMillionTokens: {
    input: number;                      // 0 for free tiers
    output: number;                     // 0 for free tiers
  };
  
  complete(req: LlmRequest): Promise<LlmResponse>;
  embed(text: string): Promise<number[]>;          // not all providers support this
  isAvailable(): Promise<boolean>;
  getRemainingQuota(): Promise<Quota>;
  getHealthStatus(): Promise<ProviderHealth>;
}

export type TaskType =
  | 'FAST_CLASSIFICATION'    // email type? recruiter? spam? → smallest model, <50 tokens
  | 'JD_ANALYSIS'            // ambiguous job description analysis → medium model, <300 tokens  
  | 'COVER_LETTER'           // generate tailored cover letter → best free model, <1200 tokens
  | 'OUTREACH_EMAIL'         // personalized recruiter email → medium model, <400 tokens
  | 'BRIEFING_SUMMARY'       // daily activity summary → small model, <200 tokens
  | 'BUSINESS_REASONING'     // market research, business plan → best free model, <2000 tokens
  | 'FUNCTION_CALLING'       // agent tool-use decisions → hermes-optimized model
  | 'EMBEDDING';             // vector embedding → local ONNX primary, HF backup

export type ProviderName = 'ollama' | 'groq' | 'openrouter' | 'huggingface' | 'template';
```

### 1.2 Free Tier Provider Inventory

| Provider | Models (Free) | Rate Limit | Best for | Key |
|---|---|---|---|---|
| **Ollama** (local) | `llama3.1:8b`, `qwen2.5:7b`, `nomic-embed-text` | Unlimited | Everything when running locally | None needed |
| **Groq** | `llama-3.1-8b-instant`, `gemma2-9b-it` | 30 req/min · 6000 req/day | Fast classification, briefings, outreach | Free account |
| **OpenRouter** | `meta-llama/llama-3.1-8b-instruct:free` · `google/gemma-3-27b-it:free` · `qwen/qwen-2.5-72b-instruct:free` · `deepseek/deepseek-r1:free` · `mistralai/mistral-7b-instruct:free` | 20-200 req/min (varies per model) | Cover letters, business reasoning, JD analysis | Free account ($1 credit) |
| **HuggingFace** | `sentence-transformers/all-MiniLM-L6-v2` (embeddings) · `google/flan-t5-xxl` | 1000 req/day | Embedding backup only | Free account |
| **ONNX local** | `all-MiniLM-L6-v2` via `@xenova/transformers` | Unlimited | **Primary embeddings** — no network needed | None |
| **Template Engine** | N/A | Unlimited | Hard fallback when ALL providers rate-limited | N/A |

### 1.3 LLM Gateway: Task → Provider Selection Logic

```
                    ┌─────────────────────────┐
                    │   LlmGateway.route(task) │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     EMBEDDING tasks     CLASSIFICATION tasks    GENERATION tasks
              │                  │                  │
              ▼                  ▼                  ▼
    ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
    │ 1. ONNX local   │  │ 1. Rule-based│  │ 1. Check Ollama  │
    │    (unlimited)  │  │    (always   │  │    (if running)  │
    │ 2. HuggingFace  │  │    try first)│  │ 2. Check Groq    │
    │    (1000/day)   │  │ 2. Groq      │  │    quota         │
    │    if ONNX fail │  │    if LLM    │  │ 3. OpenRouter    │
    └─────────────────┘  │    needed    │  │    free model    │
                         │ 3. OpenRouter│  │ 4. Template      │
                         │    if Groq   │  │    fallback      │
                         │    exhausted │  └──────────────────┘
                         └──────────────┘
                                 
Every provider call:
  → Check quota (Redis cache of rate limit state)
  → If quota exhausted: try next provider in cascade
  → If ALL exhausted: use template fallback (or skip if task is optional)
  → Log: { provider, model, tokens, taskType, cacheHit, cost: 0 }
```

### 1.4 Task → Provider Default Mapping (config-driven, not hardcoded)

```yaml
# packages/llm/src/config/provider-map.yaml
# Change this file to swap providers. Zero code changes required.

FAST_CLASSIFICATION:
  primary: groq
  model: llama-3.1-8b-instant
  maxTokens: 100
  fallback: template           # keyword rules if Groq exhausted
  
JD_ANALYSIS:
  primary: openrouter
  model: qwen/qwen-2.5-72b-instruct:free
  maxTokens: 500
  fallback: groq               # smaller model if OpenRouter rate-limited
  fallbackModel: gemma2-9b-it
  
COVER_LETTER:
  primary: openrouter
  model: meta-llama/llama-3.1-70b-instruct:free  # best free model
  maxTokens: 1500
  fallback: openrouter
  fallbackModel: qwen/qwen-2.5-72b-instruct:free
  lastResort: template         # pre-written template with variable substitution
  
OUTREACH_EMAIL:
  primary: groq
  model: gemma2-9b-it
  maxTokens: 500
  fallback: openrouter
  fallbackModel: mistralai/mistral-7b-instruct:free
  lastResort: template
  
BRIEFING_SUMMARY:
  primary: groq
  model: llama-3.1-8b-instant
  maxTokens: 300
  fallback: template           # skip briefing if all exhausted
  
BUSINESS_REASONING:
  primary: openrouter
  model: deepseek/deepseek-r1:free
  maxTokens: 3000
  fallback: openrouter
  fallbackModel: qwen/qwen-2.5-72b-instruct:free
  
FUNCTION_CALLING:
  primary: ollama              # local if available (best for structured output)
  model: qwen2.5:7b
  fallback: groq
  fallbackModel: llama-3.1-8b-instant
  
EMBEDDING:
  primary: onnx_local          # @xenova/transformers — unlimited, no network
  model: all-MiniLM-L6-v2
  fallback: huggingface
  fallbackModel: sentence-transformers/all-MiniLM-L6-v2
```

### 1.5 Adding a New Provider (How Easy It Is)

```typescript
// To add a new provider (e.g., Mistral API, Cohere, DeepSeek):
// 1. Create one file:  packages/llm/src/providers/mistral.provider.ts
// 2. Implement LlmProvider interface (10-20 lines)
// 3. Register in providerRegistry.ts (2 lines)
// 4. Update provider-map.yaml to use it for any task type

// That's it. No other files change.

// packages/llm/src/providers/mistral.provider.ts
export class MistralProvider implements LlmProvider {
  readonly name = 'mistral' as ProviderName;
  readonly models = { COVER_LETTER: 'mistral-large-latest', ... };
  readonly rateLimit = { requestsPerMinute: 5, requestsPerDay: 100 };
  readonly costPerMillionTokens = { input: 2, output: 6 };
  
  async complete(req: LlmRequest): Promise<LlmResponse> { ... }
  async isAvailable(): Promise<boolean> { ... }
  async getRemainingQuota(): Promise<Quota> { ... }
}
```

---

## Section 2 — Algorithm Map: What NEVER Calls an LLM

This is the most important section. These are pure algorithms that run free, fast, and deterministically:

### 2.1 Job Intelligence Algorithms (Zero LLM)

```typescript
// Skill Extraction — TF-IDF against 500-skill taxonomy
// Source: ESCO + O*NET + curated tech skills list (stored in DB, not hardcoded)
const SKILL_TAXONOMY = loadFromDB('skill_taxonomy'); // ~500 skills
function extractSkills(jd: string): string[] {
  return SKILL_TAXONOMY.filter(skill => 
    jd.toLowerCase().includes(skill.toLowerCase())
  );
}

// Job Deduplication — SHA256, deterministic, instant
function makeJobId(company: string, role: string, url: string): string {
  return sha256(`${company.toLowerCase().trim()}|${role.toLowerCase().trim()}|${url}`);
}

// Title Normalization — pre-built mapping, no LLM
const TITLE_MAP = {
  'sr engineer': 'senior engineer',
  'swe': 'software engineer', 
  'fullstack': 'full stack engineer',
  // ~200 entries
};
function normalizeTitle(raw: string): string {
  return TITLE_MAP[raw.toLowerCase()] ?? raw;
}

// Rule Scoring — 6 dimensions, weighted, <1ms
function ruleScore(job: NormalizedJob, profile: UserProfile): ScoredResult {
  let score = 0;
  const reasons: string[] = [];
  score += scoreRole(job.title, profile.targetRoles);    // max 30
  score += scoreSkills(job.skills, profile.skills);      // max 20
  score += scoreStage(job.companyStage, profile.preferredStages); // max 15
  score += scoreLocation(job.location, profile.locations); // max 10
  score += scoreRecency(job.postedAt);                   // max 15
  score += scoreSalary(job.salary, profile.minSalary);   // max 10
  return { score, reasons };
}

// CV Synonym Rotation — pre-built thesaurus, no LLM
const TECH_THESAURUS: Record<string, string[]> = {
  'Node.js': ['NodeJS', 'Node', 'node.js'],
  'React.js': ['ReactJS', 'React', 'react.js'],
  'TypeScript': ['TS', 'typescript'],
  // ~150 technical terms
};
function rotateSynonym(skill: string): string {
  const synonyms = TECH_THESAURUS[skill] ?? [skill];
  return synonyms[dayOfYear() % synonyms.length]; // deterministic rotation by day
}
```

### 2.2 Email & Communication Algorithms (Zero LLM)

```typescript
// Date extraction from email body — regex battery, no LLM
const DATE_PATTERNS = [
  /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/,          // 15/06/2025
  /\b(Monday|Tuesday|...|Sunday),?\s+(\w+ \d{1,2})\b/i,  // Monday, June 15
  /\b(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i, // June 15th, 2025
  // 12 more patterns covering all common formats
];
function extractInterviewDate(emailBody: string): Date | null {
  for (const pattern of DATE_PATTERNS) {
    const match = emailBody.match(pattern);
    if (match) return parseDateFromMatch(match);
  }
  return null; // LLM fallback only if ALL 15 patterns fail
}

// Email classification — keyword rules, no LLM  
const RECRUITER_SIGNALS = ['recruiter', 'opportunity', 'role', 'position', 'opening', 'interview', 'hiring'];
const SPAM_SIGNALS = ['unsubscribe', 'newsletter', 'deal', 'sale', 'promo'];
function classifyEmail(subject: string, snippet: string): EmailClass {
  const text = (subject + ' ' + snippet).toLowerCase();
  const recruiterScore = RECRUITER_SIGNALS.filter(s => text.includes(s)).length;
  const spamScore = SPAM_SIGNALS.filter(s => text.includes(s)).length;
  if (recruiterScore >= 2) return 'RECRUITER';
  if (spamScore >= 2) return 'SPAM';
  return 'OTHER'; // LLM only if genuinely ambiguous (recruiterScore === 1)
}

// Recruiter email finding — 4 strategies, no LLM
function findRecruiterEmail(company: string, domain: string): EmailCandidate[] {
  return [
    `jobs@${domain}`,           // strategy 1: common patterns
    `hiring@${domain}`,
    `hr@${domain}`,
    `careers@${domain}`,
    // strategy 2: scrape company careers page for "contact" links
    // strategy 3: parse the job posting page for email addresses
    // strategy 4: verify which patterns have valid MX records
  ];
}
```

### 2.3 Memory & Entity Algorithms (Zero LLM)

```typescript
// Entity deduplication — Levenshtein, no LLM
function isSameEntity(a: string, b: string): boolean {
  const normalized = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return levenshtein(normalized(a), normalized(b)) <= 2;
}

// Hybrid search — pgvector + metadata filter, no LLM
// Single PostgreSQL query: no LLM interpretation of query
const query = `
  SELECT *, (embedding <=> $1) AS distance
  FROM memory_records
  WHERE user_id = $2 AND metadata @> $3::jsonb
  ORDER BY distance
  LIMIT 10
`;

// Prompt cache key — normalized SHA256, no LLM
function makeCacheKey(model: string, system: string, user: string): string {
  const normalized = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  return sha256(`${model}|${normalized(system)}|${normalized(user)}`);
}
```

---

## Section 3 — When LLMs ARE Used (The 30%)

These are the ONLY operations that call an LLM. Everything else is pure algorithm.

| Operation | Why algorithm can't do it | Provider cascade | Max tokens | Cache TTL |
|---|---|---|---|---|
| Cover letter generation | Genuinely requires creative language generation with context | OpenRouter (Llama-70B free) → OpenRouter (Qwen-72B free) → Template | 1500 | 24h (same job) |
| Personalized outreach email | Requires context-aware generation per recruiter | Groq (Gemma2-9B) → OpenRouter (Mistral-7B free) → Template | 500 | 24h (same contact) |
| Ambiguous JD analysis (25-75 score range only) | Job description has unclear tech stack or role | OpenRouter (Qwen-72B free) → Groq (Llama-8B) → Skip (keep rule score) | 400 | 7 days (same job) |
| Business plan reasoning | Requires multi-step business reasoning and synthesis | OpenRouter (DeepSeek-R1 free) → OpenRouter (Qwen-72B free) → User prompted | 3000 | 30 days |
| Daily briefing (optional) | Synthesis of complex multi-event day | Groq (Llama-8B instant) → Template | 300 | 24h |
| Screener question answers | Context-specific answers, no template substitute | OpenRouter (Qwen-72B free) → Groq → Template | 800 | 7 days (same question) |

**Every LLM call rule:**
1. **Cache check first** — if normalized cache key exists in `LlmCache` DB table and not expired → return cached result immediately, zero API call
2. **Algorithm check** — can this be done with a rule or template? If yes, skip LLM entirely
3. **Quota check** — check Redis for remaining provider quota before calling
4. **Cascade** — try providers in order until one succeeds
5. **Template fallback** — if ALL providers fail/exhausted → use pre-written template with variable substitution
6. **Log everything** — `{ taskType, provider, model, tokens, cacheHit, cost, ms }`

---

## Section 4 — Complete System Architecture v5.0

### 4.1 Runtime Model

```
╔══════════════════════════════════════════════════════════════════════╗
║  PERSONAL CONTEXT LAYER  (algorithm-driven, always-on)               ║
║  UserProfile · SkillTaxonomy · TitleMap · ThesaurusDict              ║
║  MemoryStore · EntityGraph · OutcomeHistory · LlmCache               ║
║  Nightly Sync: 5-phase pipeline (algorithms + rare LLM synthesis)    ║
╚════════════════════════════════════╦═════════════════════════════════╝
                                     ║ Context injected per agent turn
╔════════════════════════════════════▼═════════════════════════════════╗
║  INBOUND SURFACES                                                     ║
║  Next.js Dashboard · Telegram Bot · REST API · Cron Scheduler        ║
╚════════════════════════════════════╦═════════════════════════════════╝
                                     ║ AgentRequest { userId, intent }
                                     ▼
╔══════════════════════════════════════════════════════════════════════╗
║  COMMS AGENT  — READONLY, narrative only                              ║
║  LLM: Groq llama-3.1-8b-instant (fast, free) via LlmGateway         ║
╚════════════════════════════════════╦═════════════════════════════════╝
                                     ║ call_executor(taskSpec)
                                     ▼
╔══════════════════════════════════════════════════════════════════════╗
║  MANAGER AGENT — orchestrator, DAG planner                           ║
║  Tool-calling: Groq gemma2-9b-it (free) via LlmGateway              ║
║  Redis FIFO queue · PostgreSQL checkpoint · Budget enforcer           ║
╚══════╦═════╦══════╦══════╦══════╦═══════╦══════════╦════════════════╝
       │     │      │      │      │       │          │
       ▼     ▼      ▼      ▼      ▼       ▼          ▼
  ┌────────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌──────────┐
  │Job     ││App  ││Out  ││Know-││Sched││Biz  ││Self-     │
  │Hunter  ││lier ││reach││ledge││uler ││Agent││Repair    │
  │80% alg.││     ││     ││     ││     ││     ││          │
  └────────┘└─────┘└─────┘└─────┘└─────┘└─────┘└──────────┘
  
LLM GATEWAY (packages/llm/src/gateway.ts)
  ┌──────────────────────────────────────────────────────┐
  │ 1. Algorithm gate: can rules/templates handle this?  │
  │ 2. Cache gate: normalized SHA256 hit in LlmCache?   │
  │ 3. Quota gate: check Redis per-provider quota        │
  │ 4. Provider cascade: Ollama→Groq→OpenRouter→HF→Tmpl │
  │ 5. Log: provider, model, tokens, cacheHit, cost, ms │
  └──────────────────────────────────────────────────────┘
  
PROVIDERS (packages/llm/src/providers/)
  OllamaProvider    — local, unlimited, best quality when available
  GroqProvider      — 30 req/min, 6000 req/day free
  OpenRouterProvider — rate-limited free models
  HuggingFaceProvider — 1000 req/day, embedding backup
  TemplateProvider  — unlimited, no LLM, pre-written templates
```

### 4.2 Job Intelligence Pipeline (70% Algorithm, 30% LLM)

```
Raw Job ─→ Normalizer (algorithm: SHA256 ID, title map, skill extractor)
         ─→ Deduplicator (algorithm: SHA256 upsert)
         ─→ Enricher (algorithm: 4-strategy email finder, DNS verify)
         ─→ RuleScorer (algorithm: 6-dimension weighted rules, <1ms)
              │
              ├── score > 75 → APPLY  ← NO LLM, 0ms
              ├── score < 25 → SKIP   ← NO LLM, 0ms
              └── score 25-75 → AMBIGUOUS
                    ─→ EmbeddingScorer (ONNX local, <100ms)
                         ├── cosine > 0.85 → APPLY  ← NO LLM
                         ├── cosine < 0.40 → SKIP   ← NO LLM
                         └── still ambiguous (score 40-60, cosine 0.40-0.85)
                               ─→ LlmGateway.route(JD_ANALYSIS)
                                    → OpenRouter Qwen-72B free → Groq → Skip
                                    → Decision + reason string
```

### 4.3 Permission Model

| Tier | Name | Allowed operations |
|---|---|---|
| 0 | READONLY | Read DB, read files, public GET APIs, memory search |
| 1 | COMMUNICATE | Draft messages (cannot send without human approval) |
| 2 | WRITE_DATA | Write to Nexa's own DB, memory store |
| 3 | WRITE_SYSTEM | Send emails, submit applications, external write APIs |
| 4 | ADMIN | System config, credentials, self-repair only |

### 4.4 Non-Negotiable Rules

1. **Algorithm gate before every LLM call.** The LLM gateway checks if the task can be handled by rules/templates first. If yes, LLM is never called.
2. **Cache gate before every LLM API call.** Normalized SHA256 → check `LlmCache` table. Hit = return cached; Miss = call API and cache result.
3. **Provider contract is the wall.** No agent or tool calls a provider SDK directly. Everything goes through `LlmGateway.route(task)`.
4. **Credential broker is the wall.** No API key read outside `packages/credentials/src/secrets.ts`.
5. **Untrusted content rule.** All external text → `wrapUntrusted()` → LLM prompt. `assertNoRawExternal()` at gateway boundary.
6. **Template fallback for every LLM operation.** Every task that calls an LLM must have a template-based fallback. Nexa never breaks because a provider is down.
7. **4-state job decisions.** Always `APPLY|APPLY_LATER|WATCH|SKIP` + `reason`. Never binary.
8. **Zero bypass.** No CAPTCHA solving, fingerprint spoofing, headless login, or proxy rotation.

---

## Section 5 — Package Architecture

```
packages/
├── llm/                          ← THE LLM LAYER (fully detachable)
│   ├── src/
│   │   ├── providers/
│   │   │   ├── base.provider.ts          ← Interface (contract)
│   │   │   ├── ollama.provider.ts        ← Local (unlimited, free)
│   │   │   ├── groq.provider.ts          ← 6000 req/day free
│   │   │   ├── openrouter.provider.ts    ← Multiple free models
│   │   │   ├── huggingface.provider.ts   ← 1000 req/day, embeddings
│   │   │   └── template.provider.ts      ← Zero-LLM fallback
│   │   ├── gateway.ts                    ← Task router + cascade logic
│   │   ├── quota.manager.ts              ← Redis-backed rate limit tracker
│   │   ├── cache/
│   │   │   └── prompt.cache.ts           ← LlmCache DB table + TTL
│   │   ├── config/
│   │   │   └── provider-map.yaml         ← Task→Provider mapping (config only)
│   │   └── registry.ts                   ← ProviderRegistry: register/unregister
│
├── algorithms/                   ← PURE ALGORITHM LAYER (zero LLM)
│   ├── src/
│   │   ├── scoring/
│   │   │   ├── rule-scorer.ts            ← 6-dim weighted rules, <1ms
│   │   │   └── embedding-scorer.ts       ← pgvector cosine similarity
│   │   ├── extraction/
│   │   │   ├── skill-extractor.ts        ← TF-IDF vs skill taxonomy
│   │   │   ├── date-extractor.ts         ← 15 regex patterns for dates
│   │   │   └── email-classifier.ts       ← Keyword rules for email types
│   │   ├── normalization/
│   │   │   ├── title-normalizer.ts       ← Pre-built title taxonomy
│   │   │   └── synonym-rotator.ts        ← Pre-built tech thesaurus
│   │   └── deduplication/
│   │       ├── job-deduplicator.ts       ← SHA256 upsert
│   │       └── entity-resolver.ts        ← Levenshtein + centroid
│
├── job-collectors/               ← Collectors + circuit breakers
├── job-pipeline/                 ← normalizer + deduplicator + decision engine
├── enrichment/                   ← Email finding (algorithm, no LLM)
├── memory/                       ← Hybrid retrieval + entity resolution
├── permissions/                  ← 5-tier permission guard
├── security/                     ← Untrusted content wrapper
├── credentials/                  ← Secret broker (ONLY reader of .env)
├── events/                       ← Audit logger + event bus
├── agent-runtime/                ← Base agent + registry + Redis queue
├── execution-engine/             ← Durable runner + DAG + budget
├── agents/                       ← All specialist agents
├── ats-adapters/                 ← Tier 1/2/3 application adapters
├── channels/                     ← Gmail + Telegram + Voice adapters
├── learning/                     ← Outcome tracker + weight adjuster
├── observability/                ← Logger + metrics + pipeline runs
├── profile/                      ← UserProfile CRUD
├── resume/                       ← Resume storage + tailored summary
├── notifications/                ← Audio brief + Telegram push
├── workflows/                    ← Scheduler + workflow definitions
└── shared/                       ← Shared types, constants, utilities
```

---

## Section 6 — Phase Execution Plan (FINAL v5.0)

### ── PHASE 0: FOUNDATION ──────────────────────────────────────────────────

**New in v5.0:** `packages/llm` and `packages/algorithms` are built FIRST. Every subsequent phase imports from these two packages.

| File | What it does |
|---|---|
| `packages/llm/src/providers/base.provider.ts` | `LlmProvider` interface + `TaskType` enum |
| `packages/llm/src/providers/ollama.provider.ts` | Local Ollama (unlimited) |
| `packages/llm/src/providers/groq.provider.ts` | Groq free tier (30 req/min, 6000/day) |
| `packages/llm/src/providers/openrouter.provider.ts` | OpenRouter free models |
| `packages/llm/src/providers/huggingface.provider.ts` | HF Inference API (embedding backup) |
| `packages/llm/src/providers/template.provider.ts` | Template fallback (zero LLM) |
| `packages/llm/src/gateway.ts` | Task router: algorithm gate → cache gate → quota gate → cascade |
| `packages/llm/src/quota.manager.ts` | Redis quota tracking per provider per userId |
| `packages/llm/src/cache/prompt.cache.ts` | `LlmCache` DB table; normalized SHA256 key; per-task TTL |
| `packages/llm/src/registry.ts` | `ProviderRegistry.register/get/list/health` |
| `packages/llm/src/config/provider-map.yaml` | Task→Provider config (edit to swap providers) |
| `packages/algorithms/src/scoring/rule-scorer.ts` | 6-dimension rules; reads UserProfile; <1ms |
| `packages/algorithms/src/scoring/embedding-scorer.ts` | pgvector cosine; returns similarity float |
| `packages/algorithms/src/extraction/skill-extractor.ts` | TF-IDF vs 500-skill taxonomy |
| `packages/algorithms/src/extraction/date-extractor.ts` | 15 regex patterns for interview dates |
| `packages/algorithms/src/extraction/email-classifier.ts` | Keyword rules: recruiter/spam/other |
| `packages/algorithms/src/normalization/title-normalizer.ts` | Pre-built title taxonomy map |
| `packages/algorithms/src/normalization/synonym-rotator.ts` | Tech thesaurus; deterministic by day |
| `packages/algorithms/src/deduplication/job-deduplicator.ts` | SHA256 upsert |
| `packages/algorithms/src/deduplication/entity-resolver.ts` | Levenshtein ≤2 + centroid |
| `packages/memory/src/embedding.service.ts` | ONNX local embeddings; zero network |
| `packages/observability/src/logger.ts` | Pino JSON; `{ userId, agentName, taskId, ts }` |
| `packages/observability/src/metrics.ts` | Counters: pipeline runs, llm calls, cache hits, costs |
| `packages/profile/src/profile.service.ts` | UserProfile CRUD |
| `packages/agent-runtime/src/background/executor-queue.ts` | Redis FIFO per-user |
| `packages/execution-engine/src/engine/budget.middleware.ts` | Token + cost + time limits |

**✦ Phase 0 Gate:**
- `npx jest --testPathPattern=unit` exits 0
- `LlmGateway.route('COVER_LETTER')` returns a provider (not null)
- Removing a provider from registry → gateway falls back to next in cascade
- `RuleScorer.score(mockJob, mockProfile)` returns deterministic result in <5ms
- `SkillExtractor.extract(sampleJD)` returns known skills without any LLM call
- `PromptCache`: same logical prompt with different whitespace → single LLM call

---

### ── PHASE 1: SECURITY CORE ──────────────────────────────────────────────

| File | What it does |
|---|---|
| `packages/permissions/src/permission.guard.ts` | `assertPermission(tool, callerTier)` + audit log on block |
| `packages/security/src/untrusted.wrapper.ts` | `wrapUntrusted()` + `assertNoRawExternal()` at gateway |
| `packages/events/src/audit.logger.ts` | Append-only `AuditLog` DB table |
| `apps/api/src/audit/audit.controller.ts` | `GET /api/audit?userId=&limit=50` |
| `.eslintrc.js` | `process.env` outside credentials = lint error; LLM SDK import outside providers = lint error |

**✦ Phase 1 Gate:** READONLY caller blocked from WRITE_SYSTEM → audit record; `npx eslint .` exits 0; LLM SDK (`openai`, `groq-sdk`) import outside `packages/llm/src/providers/` = lint error

---

### ── PHASE 2: JOB INTELLIGENCE ──────────────────────────────────────────

**70% of this phase calls zero LLMs.**

| File | Algorithm or LLM? | What it does |
|---|---|---|
| `packages/job-collectors/src/circuit-breaker.ts` | Algorithm | CLOSED→OPEN→HALF_OPEN state machine |
| `packages/job-collectors/src/collectors/*.ts` | Algorithm | Greenhouse, Lever, YC, GitHub, Naukri collectors |
| `packages/job-pipeline/src/normalizer.ts` | Algorithm | Raw → NormalizedJob; uses TitleNormalizer + SkillExtractor |
| `packages/job-pipeline/src/deduplicator.ts` | Algorithm | SHA256 upsert |
| `packages/enrichment/src/email-finder.ts` | Algorithm | 4-strategy recruiter email discovery; DNS MX verify |
| `packages/job-pipeline/src/decision.engine.ts` | Mixed | RuleScorer (algorithm) → EmbeddingScorer (algorithm) → LlmGateway(JD_ANALYSIS) only for ambiguous 25-75 |
| `packages/learning/src/outcome.tracker.ts` | Algorithm | Records outcomes; adjusts weights over time |
| `apps/api/src/jobs/jobs.controller.ts` | Algorithm | REST endpoints; no LLM in controllers |

**✦ Phase 2 Gate:** Real job in DB with decision + reason; score > 75 path: zero LLM calls confirmed by metrics; duplicate rejected; circuit breaker state machine tested

---

### ── PHASE 3: APPLICATION SYSTEM ─────────────────────────────────────────

| File | Algorithm or LLM? | What it does |
|---|---|---|
| `packages/resume/src/resume.service.ts` | LLM (COVER_LETTER) | Cover letter via LlmGateway → OpenRouter Llama-70B free |
| `packages/agents/src/profile/cv-optimizer.agent.ts` | Algorithm | Synonym rotation via `synonym-rotator.ts`; no LLM |
| `packages/agents/src/application/application.agent.ts` | LLM (COVER_LETTER) | Via LlmGateway; template fallback if all providers exhausted |
| `packages/ats-adapters/src/tier1/greenhouse.adapter.ts` | Algorithm | Dry-run or real POST to Greenhouse API |
| `packages/ats-adapters/src/tier2/extension.bridge.ts` | Algorithm | DB emit; zero direct platform calls |
| `packages/ats-adapters/src/tier3/human.router.ts` | Algorithm | PendingApproval; suspends DAG |

**✦ Phase 3 Gate:** Cover letter generated (or template used if all providers rate-limited — both are valid); Tier 2 grep returns 0 platform URLs; approval gate suspends DAG

---

### ── PHASE 4: COMMUNICATION + FOLLOW-UPS ─────────────────────────────────

| File | Algorithm or LLM? | What it does |
|---|---|---|
| `packages/channels/src/gmail/email-classifier.ts` | Algorithm | Keyword rules — recruiter/spam/other classification |
| `packages/channels/src/gmail/date-extractor.ts` | Algorithm | 15 regex patterns for interview date extraction |
| `packages/channels/src/gmail/inbox.reader.ts` | Algorithm | Read Gmail; classify (algorithm); extract dates (algorithm) |
| `packages/channels/src/gmail/email-composer.ts` | LLM (OUTREACH_EMAIL) | Via LlmGateway → Groq Gemma2-9B → template fallback |
| `packages/channels/src/gmail/gmail.adapter.ts` | Algorithm | SMTP; rate limits; dry-run |
| `packages/channels/src/gmail/follow-up.scheduler.ts` | Algorithm | Day 7 + Day 14; approval queue only |
| `packages/agents/src/communication/telegram.agent.ts` | Algorithm | `<untrusted>` wrap; keyword intent parsing before any LLM |

**✦ Phase 4 Gate:** Email classified correctly by keyword rules (zero LLM for classification); outreach email generated or template used; follow-up scheduled; Gmail rate limit enforced

---

### ── PHASE 5: ADVANCED MEMORY + LEARNING ─────────────────────────────────

| File | Algorithm or LLM? | What it does |
|---|---|---|
| `packages/memory/src/hybrid-retriever.ts` | Algorithm | Single PG query: metadata filter + vector ORDER BY |
| `packages/memory/src/entity.resolver.ts` | Algorithm | Levenshtein ≤2 + embedding centroid |
| `packages/learning/src/scorer.adapter.ts` | Algorithm | Weight adjustment based on outcome history |
| `packages/llm/src/cache/prompt.cache.ts` | Algorithm | Normalized SHA256 → LlmCache table; TTL per task type |
| `packages/notifications/src/audio-brief.ts` | LLM (BRIEFING_SUMMARY) | Groq Llama-8B → template if exhausted; then `edge-tts` |

**✦ Phase 5 Gate:** Hybrid search filters correctly; entity resolved by algorithm; cache hit confirmed by zero extra LLM calls; audio brief MP3 generated

---

### ── PHASE 6: DOCKER-BASED BACKEND TESTING (HARD GATE) ────────────────────

**All tests run inside Docker Compose. No mocks for PostgreSQL, Redis, or network.**

| File | What it does |
|---|---|
| `docker-compose.test.yml` | Isolated: PostgreSQL + pgvector + Redis + test NestJS |
| `scripts/docker-test.sh` | `docker compose -f docker-compose.test.yml up --build --abort-on-container-exit` |
| `e2e/job-pipeline.e2e.spec.ts` | Real Greenhouse → normalize → deduplicate → score → decision |
| `e2e/llm-gateway.e2e.spec.ts` | Provider cascade: mock Groq rate-limited → OpenRouter handles; cache hit test |
| `e2e/algorithm-only.e2e.spec.ts` | Jobs with score > 75: confirm zero LLM calls in metrics |
| `e2e/application.e2e.spec.ts` | Cover letter: LlmGateway called once; cached result on second call |
| `e2e/communication.e2e.spec.ts` | Email classified by keyword rules; outreach via LlmGateway |
| `e2e/security.e2e.spec.ts` | Permission blocked; untrusted wrapper; ESLint no direct SDK imports |
| `e2e/memory.e2e.spec.ts` | Store → hybrid search → entity resolution |
| `e2e/provider-swap.e2e.spec.ts` | Change `provider-map.yaml` → correct provider used; no other code changes |

**Docker Gate — ALL must pass:**
1. `bash scripts/docker-test.sh` exits 0 — all 9 E2E specs green
2. Metrics confirm: jobs with score >75 show `llmCalls: 0`
3. Provider cascade test: Groq simulated as rate-limited → OpenRouter handles request
4. Cache test: same cover letter request twice → LLM called exactly once
5. `npx eslint .` exits 0 — no direct SDK imports outside providers
6. `tsc --noEmit` exits 0 in all packages

---

### ── PHASE 7: DASHBOARD UI ──────────────────────────────────────────────

| File | What it does |
|---|---|
| `apps/web/src/lib/api-client.ts` | Typed fetch wrapper; no inline fetch in components |
| `apps/web/src/lib/hooks/` | SWR hooks: useJobs, useApprovals, useAuditLog, useAgentBoard, useMetrics, useLlmStats |
| `apps/web/src/components/jobs/JobCard.tsx` | Decision badges: APPLY=emerald, APPLY_LATER=amber, WATCH=sky, SKIP=slate |
| `apps/web/src/components/llm/LlmUsagePanel.tsx` | Live stats: cache hit rate, provider usage, total cost ($0.00), calls saved by algorithms |
| `apps/web/src/components/agents/AgentKanban.tsx` | LifeOS-style 6-lane Kanban |
| `apps/web/src/app/page.tsx` | Home: KPIs + activity feed + pipeline runs |
| `apps/web/src/app/jobs/page.tsx` | Filterable jobs board |
| `apps/web/src/app/approvals/page.tsx` | Approval queue with Approve/Reject |
| `apps/web/src/app/agents/page.tsx` | Agent Kanban board |
| `apps/web/src/app/settings/page.tsx` | UserProfile + LLM provider config (which provider for which task) |
| `apps/web/src/app/insights/page.tsx` | Outcome learning: reply rates, interview rates |
| `apps/web/src/app/globals.css` | GAIA dark-first: surface `#030711`, primary `#00bbff`, Inter font |

**✦ Phase 7 Gate:** `npm run build` exits 0; LLM usage panel shows real stats; provider config page allows changing YAML config; jobs board shows real data; approve action works

---

### ── PHASE 8: SCHEDULER + AUTONOMY ─────────────────────────────────────

| File | Algorithm or LLM? | What it does |
|---|---|---|
| `packages/workflows/src/scheduler.service.ts` | Algorithm | `node-cron`; Redis dedup lock |
| `packages/workflows/src/workflows/daily-job-scan.workflow.ts` | Mixed | Collect (alg) → score (alg) → LLM only for ambiguous |
| `packages/workflows/src/workflows/nightly-sync.workflow.ts` | Algorithm | 5-phase data sync |
| `packages/workflows/src/workflows/daily-briefing.workflow.ts` | LLM (BRIEFING_SUMMARY) | Groq → template; then `edge-tts` MP3 |
| `packages/workflows/src/workflows/follow-up-check.workflow.ts` | Algorithm | Checks FollowUpTask; queues to approval |
| `packages/workflows/src/workflows/cv-optimizer.workflow.ts` | Algorithm | `synonym-rotator.ts`; no LLM |

---

### ── PHASE 9: BUSINESS CREATION MODE ────────────────────────────────────

| File | Algorithm or LLM? | What it does |
|---|---|---|
| `packages/agents/src/business/market-research.agent.ts` | LLM (BUSINESS_REASONING) | DeepSeek-R1 free → Qwen-72B free; READONLY |
| `packages/agents/src/business/product-manager.agent.ts` | LLM (BUSINESS_REASONING) | PRD + user stories; WRITE_DATA |
| `packages/agents/src/business/business-plan.agent.ts` | LLM (BUSINESS_REASONING) | Revenue + GTM + financials |
| `packages/agents/src/business/launch.agent.ts` | LLM (OUTREACH_EMAIL) | Landing page copy; queued to approval; COMMUNICATE |
| `packages/agents/src/maintenance/self-repair.agent.ts` | Algorithm + LLM | Health check (alg); diagnosis (LLM); fix suggestion |

---

### ── PHASE 10: DOCKER VALIDATION + GITHUB PUSH ──────────────────────────

**The push to `github.com/sahim99/nexa` only happens after the Docker gate passes.**

**Pre-push checklist (all must be green):**
- `bash scripts/docker-test.sh` exits 0 (all 9 E2E specs)
- `npx eslint .` exits 0
- `tsc --noEmit` exits 0 in all packages
- `npm run build` exits 0 for `apps/web`
- Metrics confirm: ≥40% of job operations show `llmCalls: 0`

**Push commands:**
```
git remote add origin https://github.com/sahim99/nexa.git
git checkout -b main
git add .
git commit -m "feat: Nexa v1.0 — algorithm-first autonomous multi-agent platform"
git push -u origin main
```

**Final E2E proof scenario (Docker, real data):**
1. `POST /api/workflows/daily-job-scan/run` — all 5 collectors run
2. ≥1 job with score > 75 → APPLY decision, ZERO LLM calls
3. ≥1 job in 25-75 range → LLM called once, cached for identical future jobs
4. Recruiter email found by algorithm (no LLM)
5. Cover letter generated via LlmGateway (cached on 2nd request)
6. Outreach draft in approval queue
7. User approves → Gmail dry-run → AuditLog records event
8. Dashboard: job card (green APPLY badge); LLM stats panel shows cache hits
9. Provider swap: change `provider-map.yaml` COVER_LETTER from `openrouter` to `groq` → restart → next cover letter uses Groq. Zero code changes.

---

## Section 7 — Engineering Standards

| Standard | Enforcement |
|---|---|
| No direct LLM SDK import outside `packages/llm/src/providers/` | ESLint `no-restricted-imports` |
| No `process.env` outside `packages/credentials/` | ESLint `no-restricted-syntax` |
| No cross-package plugin imports | ESLint `no-restricted-imports` |
| All external content through `wrapUntrusted()` | `assertNoRawExternal()` at LlmGateway boundary |
| Every LLM call goes through `LlmGateway.route()` | Architecture enforced; direct SDK blocked by ESLint |
| Every LLM call has a template fallback | `TemplateProvider` always last in cascade |
| Algorithm gate checked before every LLM call | `LlmGateway.canHandleWithAlgorithm(task)` checked first |
| Cache gate checked before every LLM API call | `PromptCache.get(key)` before any network call |
| Docker E2E before any GitHub push | `scripts/docker-test.sh` gates the push |
| TypeScript strict mode | `tsc --noEmit` per package |
| File max 600 lines | `scripts/check_max_lines.py` |
| Budget enforced outside agent loop | `BudgetMiddleware` in DurableRunner |

---

## Section 8 — Current Status

| Component | Status |
|---|---|
| Monorepo + Docker + PostgreSQL + pgvector | ✅ DONE |
| MemoryService + ToolRegistry | ✅ DONE |
| ApprovalService | ✅ DONE |
| CredentialBroker | ✅ DONE |
| `@xenova/transformers` installed | ✅ DONE |
| `packages/llm` provider system | ❌ NOT BUILT — start here |
| `packages/algorithms` | ❌ NOT BUILT — start here |
| Everything else | ❌ NOT BUILT |

**Start with Phase 0. Build `packages/llm` and `packages/algorithms` first.**
