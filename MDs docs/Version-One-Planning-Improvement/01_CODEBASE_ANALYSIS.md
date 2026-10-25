# 01. Codebase Analysis

## Summary
The codebase is a Turborepo monorepo with a Next.js frontend (`apps/web`) and a NestJS backend (`apps/api`). The backend relies on PostgreSQL with `pgvector` and Redis. Core logic is modularized across ~27 packages. The backend infrastructure is robust but lacks some core V3 integrations (e.g., proper Credential Broker instantiation, completed Desktop Agent). The frontend is partially scaffolded but missing crucial pages (`/tasks`, `/approvals`, etc.) and currently relies on fallback data when the DB is empty.

## Evidence Tables
- **Repo inventory:** Turborepo, Next.js 15, NestJS 12, Prisma, TypeScript.
- **Backend map:** `apps/api` serves as the entry point, routing to internal packages (`@nexa/llm`, `@nexa/algorithms`, etc.).
- **Data layer:** Prisma schema located in `packages/database`. `pgvector` extension is active. `userId` and `domain` columns are partially present but need enforcement across all entities.
- **UI analysis:** Dashboard renders fallback data. Sidebar links for Tasks, Approvals, Memory, and History lead to 404s.

## What Works
- Dockerized PostgreSQL + pgvector.
- NestJS API boots and serves endpoints on port 3001.
- SWR hooks in the frontend successfully connect to the API.

## What is Broken/Missing
- The frontend has 404 errors for key navigation items.
- Winder integration and Desktop Agent are missing.
- Approvals system is not fully wired with payload-hash verification.

## Surprises & Open Questions
- Redis is required by the V3 plan (BullMQ) but needs verification if it's fully active in the local `docker-compose`.
