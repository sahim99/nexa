# 08. Decision Log

## Initial Setup
- **Date:** 2026-10-03
- **Decision:** Bootstrap planning phase initiated as per Nexa_V3_Master_Artifact.md.

## Approval With Changes
- **Date:** 2026-10-03
- **Status:** APPROVED WITH CHANGES. 
- **Changes Applied:**
  1. **Primary Product Surface:** The Universal Nexa Dashboard is the primary product surface, not a secondary project.
  2. **Visual Fidelity & WebGL:** Dashboard must match the reference image but with improvements. The right-side Chat panel is a first-class citizen, and its AI orb must be built using Three.js/WebGL (reacting to audio state), not a static image.
  3. **Dashboard Content:** Center dashboard shifted from generic KPI cards to an AI command center (Workflows, Activity, Approvals, Health, Workspace overviews).
  4. **Expanded Integrations (D5):** Added LinkedIn, Wellfound, Instagram, and a Social workspace. A dedicated Integrations page is mandated.
  5. **Data Strictness:** No fake/demo values in production.
  6. **Security & Boundaries:** Winder integration remains scoped (no service-role). Desktop agent remains outbound-only with a local sandbox. Unrestricted shell/browser/CAPTCHA bypass explicitly rejected.
  7. **API Stability (D1):** Dashboard implementation will wait until the UI/API contract is fully verified and stable (Backend-first preserved).

## Next Steps
- Given the material expansion of the Integrations scope (LinkedIn, Wellfound, Instagram) and the Social workspace, the plan has been updated and sent for a secondary review.
