# Package Audit Map (B0-T02)
## Total Packages: 27

| Package | Purpose | Public API/Exports | Imported By | Tests | Status |
|---|---|---|---|---|---|
| `agent-runtime` | Core lifecycle for agents | `AgentRuntime`, `RuntimeConfig` | `execution-engine` | 0 | SCAFFOLD |
| `agents` | Specific domain agent definitions | `JobAgent`, `ResearchAgent` | `workflows` | 0 | PARTIAL |
| `algorithms` | Deterministic algorithms (scoring, dedupe) | `scoreMatch()`, `dedupe()` | `job-pipeline` | 0 | USED |
| `approvals` | Payload-hash human approval flow | `requestApproval()`, `verifyHash()` | `execution-engine` | 0 | PARTIAL |
| `ats-adapters` | Connectors for ATS systems (Greenhouse, Lever) | `GreenhouseAdapter` | `job-collectors` | 0 | PARTIAL |
| `channels` | Outbound communication (Telegram, Slack) | `TelegramBot`, `SlackClient` | `notifications` | 0 | UNUSED |
| `credentials` | Secure credential broker | `getHandle()`, `Broker` | `agent-runtime` | 0 | SCAFFOLD |
| `database` | Prisma schema and DB client | `PrismaClient`, `DatabaseModule` | `api`, all others | 0 | USED |
| `enrichment` | External data enrichment (Clearbit, Apollo) | `enrichCompany()` | `job-pipeline` | 0 | SCAFFOLD |
| `events` | Audit chain and SSE event definitions | `emit()`, `ActivityEvent` | `api`, `execution-engine` | 0 | PARTIAL |
| `execution-engine` | BullMQ + Postgres step-state machine | `Dispatcher`, `StepMachine` | `api` | 0 | PARTIAL |
| `job-collectors` | Scrapers and API clients for job boards | `GitHubCollector` | `job-pipeline` | 0 | USED |
| `job-pipeline` | E2E job processing (normalize -> score -> persist) | `DecisionEngine` | `api` | 0 | USED |
| `jobs` | Job entity types and shared logic | `Job`, `JobSchema` | `job-pipeline`, `database` | 0 | USED |
| `learning` | Feedback loop and preference tuning | `updateWeights()` | `algorithms` | 0 | UNUSED |
| `llm` | Gateway to Groq, OpenRouter, Ollama | `LLMClient`, `generate()` | `agents`, `agent-runtime` | 0 | USED |
| `memory` | Vector DB interactions (pgvector) | `storeVector()`, `search()` | `llm`, `agent-runtime` | 0 | PARTIAL |
| `notifications` | Internal notification routing | `notifyUser()` | `api` | 0 | SCAFFOLD |
| `observability` | Telemetry, logging, traces | `Logger`, `recordMetric()` | All | 0 | PARTIAL |
| `permissions` | Policy engine (Three-Way Rule) | `PolicyEngine`, `decide()` | `execution-engine` | 0 | SCAFFOLD |
| `profile` | User profile management and typing | `UserProfile` | `api`, `job-pipeline` | 0 | PARTIAL |
| `resume` | Resume generation and templating | `buildResume()` | `agents` | 0 | SCAFFOLD |
| `security` | Taint tracking, quarantine | `quarantine()`, `isTainted()` | `execution-engine` | 0 | UNUSED |
| `shared` | Types, errors, utils, `defineAgent`, `defineTool` | `NexaError`, `AgentDef` | All | 0 | USED |
| `tools` | Registry of specific executable tools | `ToolRegistry`, `fetchWeb()` | `execution-engine` | 0 | PARTIAL |
| `validation` | Zod schemas and data validation | `validateSchema()` | `api`, `job-pipeline` | 0 | USED |
| `workflows` | High-level DAG definitions | `WorkflowManager` | `api` | 0 | PARTIAL |
