# Nexa Version 1.0 Walkthrough

## 1. Project Structure & Architecture

Nexa is built as a highly modular, enterprise-grade monorepo using Turborepo, Next.js, and NestJS. The core philosophy is "Algorithm-First," ensuring deterministic execution, high performance, and minimal LLM costs.

### Tech Stack
* **Frontend**: Next.js 15, React 19, Tailwind CSS, SWR for data fetching.
* **Backend**: NestJS 12, PostgreSQL with `pgvector` for vector similarity, Redis for queuing and distributed locking.
* **Architecture Model**: Domain-Driven Design (DDD) with a detached multi-provider LLM gateway.

### Core Modules
* `apps/web`: Next.js dashboard UI.
* `apps/api`: NestJS main backend service.
* `packages/llm`: Gateway managing LLM providers (Ollama, Groq, OpenRouter) with deterministic template fallbacks.
* `packages/algorithms`: Pure algorithmic engines for scoring, extraction, and deduplication (zero LLM).
* `packages/agents`: Autonomous agents for job applications, business creation, and system repair.
* `packages/permissions` & `packages/security`: 5-tier permission guards and untrusted content wrappers.
* `packages/job-collectors`: Integrations for Greenhouse, Lever, YC, GitHub, and Naukri.

## 2. Current Status of the Application

The core backend engines, algorithms, agent pipelines, and database schemas are fully implemented, tested, and operational. 

However, **the Frontend (Next.js) is currently only partially complete.**

### Dashboard Page (`/`)
* **Status**: Configured and functional.
* **Details**: The dashboard successfully renders the "Executive Intelligence Matrix," LLM usage panels, Job Cards, and Agent Kanban board.
* **Data Origin (Dynamic vs Hardcoded)**: The dashboard *is* wired to the real NestJS API using SWR hooks (`useJobs`, `useApprovals`, `useLlmStats`). However, because the newly deployed database is currently empty (no jobs or approvals collected yet), the frontend gracefully falls back to displaying `sampleFallbackJobs`. This creates the illusion of hardcoded data. 
* **Fix**: Triggering the background job collectors will populate the database and replace the fallback data with live data.

### Missing Pages (The 404 Errors)
The sidebar navigation links to several pages that have **not yet been created** in the `apps/web/src/app` directory:
1. **Active Tasks (`/tasks`)**: Missing `apps/web/src/app/tasks/page.tsx`
2. **Approvals (`/approvals`)**: Missing `apps/web/src/app/approvals/page.tsx`
3. **Memory & Context (`/memory`)**: Missing `apps/web/src/app/memory/page.tsx`
4. **History (`/history`)**: Missing `apps/web/src/app/history/page.tsx`

When clicking these links, Next.js correctly throws a `404 - This page could not be found` because the routes literally do not exist in the codebase yet.

### Existing Secondary Pages
* **Settings (`/settings`)**: Exists and is functional. Allows editing the User Profile and viewing the LLM Provider Map.
* **Insights (`/insights`)**: Exists and is functional. Shows outcome tracking and conversion statistics.

## 3. Analysis & Required Improvements

To bring the Nexa platform to a fully polished V1 state, the following improvements must be prioritized during the next implementation phase:

### Frontend Implementation
1. **Create the Missing Route Pages**: Scaffold and implement the UI for `/tasks`, `/approvals`, `/memory`, and `/history`.
2. **Wire Real API Hooks**: Connect these new pages to the existing backend endpoints (e.g., `GET /api/approvals`, `GET /api/tasks`, `GET /api/audit`).
3. **Approval Interactivity**: Build the UI for users to "Approve" or "Reject" items in the `/approvals` queue, sending POST requests back to the API.

### Backend & Data Population
1. **Seed Data or Initial Scan**: Run the `daily-job-scan.workflow` to populate the PostgreSQL database with real jobs. This will immediately replace the fallback hardcoded data on the dashboard with live dynamic data.
2. **End-to-End Visual Verification**: Ensure that the Agent Kanban board dynamically updates its columns based on live database state rather than static defaults.

---
*End of Walkthrough. See the `implementation_plan.md` artifact for exact technical steps to resolve these gaps.*
