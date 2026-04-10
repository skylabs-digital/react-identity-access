# Helper: Commands playbook (agentic QA)

## The rule

**One command per Bash call. Never chain with `&&`, `||`, or `;`.**

Pipes (`|`) are allowed within a single command because the permission system evaluates the first binary, not the whole pipeline: `curl ... | jq ...` is OK.

## Why

- Our `.claude/settings.json` allow-list binds permissions to the first token of each command. Compound commands break that binding and bounce back to the user as prompts.
- Short, atomic commands make reports readable (one line → one result).
- If something fails, a single command's error is easier to diagnose than a chain's.

## Allowed binaries

| Category | Commands |
|---|---|
| Package scripts | `yarn` (when running scripts defined in package.json), `node` |
| JSON | `jq` |
| Files | `cat`, `head`, `tail`, `ls`, `wc`, `grep` |
| Directories | `mkdir`, `basename`, `dirname` |
| Timestamps | `date` |
| Comparison | `diff` |
| Scripting | `python3` (for post-processing only, never as the test driver) |

Explicitly forbidden: `rm`, `mv` (use dedicated tools), `docker`, `curl` to external hosts, `npm install`, `yarn add`, `git push`.

## Running a flow directly

```bash
yarn vitest run --config qa/vitest.config.ts qa/simulator/scenarios/<flow-id>.test.ts
```

or to run every flow:

```bash
yarn sim
```

## Writing intermediate results

Use `qa/reports/.tmp/` for per-flow JSON:

```bash
mkdir -p qa/reports/.tmp
```

One file per flow. The orchestrator reads them all at compile time.

## Environment

This library has no backend dependency during tests — the mock server lives in `qa/simulator/core/mock-fetch.ts` and is bootstrapped by the harness (`startScenario`). There are no external URLs, no credentials, no secrets. Anything that reaches for the network is a bug.

## Anti-patterns

| Don't | Why |
|---|---|
| `T=$(date) && yarn sim` | Compound command |
| `rm -rf qa/reports/.tmp && yarn sim` | Destructive + compound. Use a test script instead. |
| `yarn sim > output.log 2>&1` and then `cat` it | Just let the Bash tool capture output directly. |
| Long-running `while true` loops | Use a dedicated flow with a finite step count. |
| Reading source files under `src/` | Break the blackbox contract. Read `qa/helpers/public-api.md` instead. |
