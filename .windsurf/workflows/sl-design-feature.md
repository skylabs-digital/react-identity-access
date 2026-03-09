---
description: Design a feature with RFC, scenarios, test plan, and quality gates before implementation
---

# Design Feature

This workflow wraps the Skylabs MCP `sl-design-feature` workflow, adapted for this **library project**.

## Steps

1. **Get the workflow from MCP**:
   Run `mcp4_get_workflow` with name `sl-design-feature` to get the latest version of the workflow.

2. **Follow the workflow steps**, adapting for library context:
   - Skip backend-specific steps (Prisma schema, API routes, domain layer)
   - Focus on: hooks, providers, components, services, types, utils
   - Testing layers: Unit (Vitest) + Component (RTL) — no E2E/Bruno/Playwright
   - RFC goes in `docs/rfcs/NNNN-feature-name.md`

3. **Risk classification for library changes**:
   | Level | Criteria |
   |-------|----------|
   | **Low** | Docs, types, cosmetic |
   | **Medium** | New hook, new utility, new component |
   | **High** | Provider changes, breaking API, auth flow changes |
   | **Critical** | Session management, token handling, security |

4. **Quality gates for library**:
   - **Low**: unit green + type-check
   - **Medium**: unit + type-check + lint + build
   - **High**: unit + component tests + type-check + lint + build + RFC
   - **Critical**: all above + security review + RFC mandatory

5. **Output**: RFC document + test plan + quality gates
