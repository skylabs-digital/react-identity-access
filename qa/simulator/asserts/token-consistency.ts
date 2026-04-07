import type { AssertResult } from '../types.js';
import type { BurstResult } from '../actors/api-caller.js';

/**
 * ASSERT: After a refresh, all concurrent callers must receive the same token.
 *
 * If a burst of N calls triggers a refresh, all N should get the same
 * new access token — not a mix of old and new tokens.
 */
export function assertTokenConsistency(burstResult: BurstResult): AssertResult {
  // Only check if there were successful calls
  if (burstResult.successes === 0) {
    return {
      name: 'token-consistency',
      passed: true,
      message: 'No successful calls to check (all failed).',
      severity: 'warning',
    };
  }

  if (burstResult.uniqueTokens.size <= 1) {
    return {
      name: 'token-consistency',
      passed: true,
      message: `All ${burstResult.successes} successful calls received the same token.`,
      severity: 'critical',
    };
  }

  return {
    name: 'token-consistency',
    passed: false,
    message: `TOKEN INCONSISTENCY: ${burstResult.successes} successful calls received ${burstResult.uniqueTokens.size} different tokens.`,
    severity: 'critical',
    details: {
      uniqueTokenCount: burstResult.uniqueTokens.size,
      totalSuccesses: burstResult.successes,
    },
  };
}
