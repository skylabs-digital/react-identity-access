/**
 * qa/harness — entry point for agentic QA flows.
 *
 * Re-exports the DSL and simulator building blocks that flow authors (or
 * LLM agents) need, so a .test.ts flow file only needs one import:
 *
 *   import { startScenario, loginTab, advanceMs, teardown } from '../../harness';
 *
 * Flows live under qa/flows/<category>/<flow-id>.md (the reproducible prompt)
 * and, when a flow is "crystallized" into a deterministic regression test,
 * its .test.ts implementation lives under qa/simulator/scenarios/ so that
 * `yarn sim` picks it up automatically.
 */
export * from './dsl';
export type { BrowserTab } from '../simulator/actors/browser-tab.js';
export type { MockServer } from '../simulator/core/mock-fetch.js';
export type { ScenarioContext } from '../simulator/scenarios/base-scenario.js';
