import type { BrowserTab } from '../actors/browser-tab.js';
import type { AssertResult } from '../types.js';
import { SessionExpiredError } from '../../../src/errors/SessionErrors.js';

/**
 * CRITICAL ASSERT: Session must not expire due to race conditions.
 *
 * A "false logout" occurs when:
 * - The session expires but the refresh token was still valid
 * - Multiple refresh attempts race and one triggers "reuse detected"
 * - Circuit breaker trips during a temporary outage
 *
 * This assert checks whether any tab lost its session unexpectedly.
 */
export function assertNoFalseLogout(
  tabs: BrowserTab[],
  context: { expectSessionLoss: boolean; reason?: string },
): AssertResult {
  const expiredTabs = tabs.filter(t => t.isSessionExpired());

  if (context.expectSessionLoss) {
    // Session loss was expected (e.g., refresh token actually expired)
    return {
      name: 'no-false-logout',
      passed: true,
      message: `Session loss expected: ${context.reason}. ${expiredTabs.length} tab(s) expired.`,
      severity: 'critical',
    };
  }

  if (expiredTabs.length === 0) {
    return {
      name: 'no-false-logout',
      passed: true,
      message: `All ${tabs.length} tab(s) maintained their session.`,
      severity: 'critical',
    };
  }

  const details = expiredTabs.map(t => ({
    tabId: t.id,
    error: t.getSessionExpiredError(),
    reason: t.getSessionExpiredError()?.reason,
  }));

  return {
    name: 'no-false-logout',
    passed: false,
    message: `FALSE LOGOUT: ${expiredTabs.length}/${tabs.length} tab(s) lost session unexpectedly. Reasons: ${details.map(d => `${d.tabId}:${d.reason}`).join(', ')}`,
    severity: 'critical',
    details,
  };
}
