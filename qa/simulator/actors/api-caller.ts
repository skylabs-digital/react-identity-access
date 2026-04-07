import type { BrowserTab } from './browser-tab.js';
import type { SimAudit } from '../core/audit.js';

export interface BurstResult {
  totalCalls: number;
  successes: number;
  failures: number;
  uniqueTokens: Set<string>;
  errors: Error[];
}

/**
 * Fires bursts of concurrent API calls across one or more tabs.
 * Used to test race conditions under high concurrency.
 */
export class ApiCaller {
  private audit: SimAudit;

  constructor(audit: SimAudit) {
    this.audit = audit;
  }

  /** Fire a burst of N concurrent calls on a single tab */
  async burstSingleTab(tab: BrowserTab, count: number, tick: number): Promise<BurstResult> {
    const results = await tab.makeConcurrentApiCalls(count);

    const uniqueTokens = new Set<string>();
    const errors: Error[] = [];
    let successes = 0;
    let failures = 0;

    for (const r of results) {
      if (r.success && r.token) {
        successes++;
        uniqueTokens.add(r.token);
      } else {
        failures++;
        if (r.error) errors.push(r.error);
      }
    }

    this.audit.logAction({
      tick,
      simTime: new Date().toISOString(),
      action: 'api-burst',
      actor: { type: 'api-caller', id: tab.id },
      inputs: { count, tabId: tab.id },
      result: failures > 0 ? 'fail' : 'ok',
      outputs: { successes, failures, uniqueTokenCount: uniqueTokens.size },
    });

    return { totalCalls: count, successes, failures, uniqueTokens, errors };
  }

  /** Fire concurrent calls across multiple tabs simultaneously */
  async burstMultiTab(
    tabs: BrowserTab[],
    callsPerTab: number,
    tick: number,
  ): Promise<Map<string, BurstResult>> {
    const results = new Map<string, BurstResult>();

    const promises = tabs.map(async tab => {
      const result = await this.burstSingleTab(tab, callsPerTab, tick);
      results.set(tab.id, result);
    });

    await Promise.all(promises);
    return results;
  }
}
