# Agentic QA for `@skylabs-digital/react-identity-access`

This directory contains the **agentic QA system** for the library. It is a combination of deterministic regression tests (`qa/simulator/`) and exploratory, LLM-driven flows (`qa/flows/`), with a shared Node harness DSL (`qa/harness/`) that both modes consume.

It is **100% Node-synthetic** — no browser, no example app, no Playwright. The library is imported directly, a mock `/auth/refresh` server handles network, and a shared in-memory storage simulates `localStorage`. This lets us test paths that a UI harness can never reach: Web Locks timing, circuit breaker thresholds, token rotation races, cookie restore, session generation.

---

## Directory layout

```
qa/
├── agents/                  # Agent role definitions (Markdown specs the LLM reads)
│   ├── qa-orchestrator.md   #   Dispatches flows, compiles the final report
│   ├── qa-lib-tester.md     #   Executes direct + agentic flows (smoke, edge)
│   └── qa-fuzzer.md         #   Executes fuzz + security flows
├── flows/                   # The reproducible prompt-base. Markdown, grows over time.
│   ├── smoke/               #   Happy-path regression
│   ├── edge/                #   Breaking-change regression (multi-tab, cookie, circuit, ...)
│   ├── fuzz/                #   Adversarial inputs
│   └── security/            #   Token leakage / session fixation
├── helpers/                 # Shared context (agents read these before every run)
│   ├── commands.md          #   Command playbook (one-command-per-Bash-call)
│   ├── public-api.md        #   The library's public surface (written from README, not src/)
│   ├── harness.md           #   DSL reference
│   ├── assertions.md        #   Available assertions
│   └── test-data.md         #   Deterministic seeds and defaults
├── harness/                 # Thin DSL wrapper over the simulator
│   ├── dsl.ts               #   startScenario, loginTab, advanceMs, expect*, teardown
│   └── index.ts             #   Public entry — what flow .test.ts files import
├── simulator/               # Deterministic simulator (vitest scenarios, unchanged from v2.29)
│   ├── actors/              #   BrowserTab, ApiCaller
│   ├── asserts/             #   Low-level assertion functions
│   ├── core/                #   MockServer, SharedStorage, Rng, Audit
│   └── scenarios/           #   Crystallized flows (.test.ts files)
├── reports/                 # Output of agentic runs
│   ├── .gitignore           #   Ignores .tmp/ and per-run reports
│   └── .tmp/                #   Per-flow JSON results from the most recent run
└── README.md                # This file
```

---

## Two execution modes

### Direct mode — deterministic regression

Every crystallized flow has a `.test.ts` under `qa/simulator/scenarios/`. They run via:

```bash
yarn sim            # all scenarios, in parallel
yarn sim <path>     # a single scenario
```

This runs in CI on every PR (see `.github/workflows/release.yml`). If a direct-mode flow fails, the PR is blocked.

### Agentic mode — exploration & discovery

A flow whose frontmatter says `type: agentic` does NOT yet have a `.test.ts`. Running it requires an LLM agent (Claude, typically) to:

1. Read the flow markdown and its referenced helpers.
2. Generate a vitest test file that implements the steps using the harness DSL (`qa/harness/index.ts`).
3. Execute it via `yarn sim`.
4. Observe the result, write findings to `qa/reports/.tmp/<flow-id>.json`.
5. If the flow is a fuzz/monkey flow, iterate: try more vectors, tweak timing, look for misbehavior.

Run agentic mode from Claude Code:

```
Read qa/agents/qa-orchestrator.md and execute agentic QA with scope: all.
```

Or target a specific scope:

```
Read qa/agents/qa-orchestrator.md and execute scope: fuzz.
```

---

## The "explore → crystallize" cycle

This is the loop that makes the test base grow over time:

```
┌───────────────────────────────────────────────────────────────┐
│  1. Author writes a .md flow describing WHAT to test          │
│     (often prompted by a bug report or a new breaking change) │
└───────────┬───────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│  2. Agentic run: LLM agent reads the flow, writes a           │
│     .agentic.test.ts implementation, executes, reports.       │
└───────────┬───────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│  3a. Flow passes reliably across N runs                       │
│      → rename .agentic.test.ts → <flow-id>.test.ts             │
│      → set frontmatter: crystallized: true                     │
│      → the flow now runs on every CI via `yarn sim`            │
│                                                                │
│  3b. Flow finds a bug                                          │
│      → write a finding in the JSON report with evidence       │
│      → orchestrator flags it as "crystallization candidate"   │
│      → create a NEW minimal flow that reproduces the bug      │
│      → that new flow follows steps 1–3a                        │
└────────────────────────────────────────────────────────────────┘
```

The important property: **the prompt is the source of truth, not the test code**. Tests are generated from prompts; prompts survive refactors. If the library rewrites internals, the test files can be regenerated from the same prompts and should produce the same assertions.

---

## Adding a new flow

1. Pick the right category (`smoke`, `edge`, `fuzz`, `security`).
2. Create `qa/flows/<category>/<kebab-case-id>.md` with frontmatter (see any existing flow as a template).
3. Describe **what** to test under `## Context` — written for an LLM with zero knowledge of `src/`.
4. List **steps** in natural language. Don't overspecify — the agent decides implementation details.
5. List **assertions** as a checklist.
6. Include a **Result Schema** block so the agent knows what JSON to produce.
7. (Optional) If you're also writing the `.test.ts` implementation by hand, place it at `qa/simulator/scenarios/<flow-id>.test.ts` and mark the frontmatter `crystallized: true` with an `implementation:` key.

---

## What this replaces

Before this system, the library had `qa/simulator/` (7 determinístic scenarios) running via `yarn sim`, but no agentic layer, no growing prompt-base, and no documented way to explore edge cases when a new breaking change was introduced. Now:

- The 7 existing scenarios are crystallized flows, referenced by `.md` files in `qa/flows/edge/`.
- New breaking changes (v2.31 cookie session, v2.27 standalone provider, v2.22 session generation) each have an agentic flow ready to be crystallized.
- Fuzz and security categories document attack surfaces the regression suite can grow into.
- The harness DSL gives flow authors (and LLMs) a clean API over the simulator primitives.
