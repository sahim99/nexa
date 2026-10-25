# 03. End-To-End Plan

## Target Architecture
Nexa is an Algorithm-First, Universal Personal AI OS. It separates into:
- **Core Engine:** Router, Execution Engine, Policy Engine, Memory OS, Credential Broker.
- **Domains:** Workspaces for Career, Personal, Business (Winder), Web/Research, Development, Finance, and Social.
- **Integrations:** Gmail, Calendar, LinkedIn, Wellfound, Instagram, Telegram, Slack, GitHub, Notion, Winder.
- **UI:** A premium Next.js dashboard featuring a WebGL AI orb, universal command center, and dedicated integration management.

## Two-Track Sequencing
**Track B (Backend B0-B15)** will be completed first to establish the frozen `/v1` API contract, ensuring the UI has a stable, real-data foundation. 
**Track U (UI U0-U7)** follows, implementing the reference design with high-fidelity, WebGL motion, and real-time SSE updates.

## Flow Mapping
- **Request Routing:** Intent matching routes commands to deterministic workflows or a planning LLM.
- **Approvals:** Payload-bound, expiring, and hash-verified before external execution.
- **Voice / Panel:** Audio input streams to STT -> Task -> TTS. The Three.js WebGL orb state reacts in real-time (`IDLE`, `LISTENING`, `THINKING`, `SPEAKING`).
- **Dashboard Load:** SSE stream populates Active Workflows, Agent Activity, Focus, Schedule, Approvals, Health, and Workspace aggregates without fake data.

## Security & Integrations
- Winder integration remains via a scoped, versioned Admin API (no direct database access).
- Desktop agent uses outbound-only authenticated WebSockets.
- No CAPTCHA/2FA bypass; no unrestricted shell access.

## Verification
- **Rule:** A milestone is only verified if automated tests pass AND execution evidence is saved to `verification/evidence/`.
