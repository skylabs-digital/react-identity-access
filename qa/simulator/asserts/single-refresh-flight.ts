import type { MockServer } from '../core/mock-fetch.js';
import type { AssertResult } from '../types.js';

/**
 * ASSERT: Within a single tab's SessionManager, only one refresh request
 * should be in-flight at a time. The queue mechanism should prevent duplicates.
 *
 * This checks the server's fetch log for overlapping refresh requests
 * with the same refresh token, which would indicate the queue failed.
 */
export function assertSingleRefreshFlight(
  server: MockServer,
  toleranceMs: number = 50,
): AssertResult {
  const log = server.getFetchCallLog();

  // Find cases where two refresh requests with the same RT overlap in time
  // (started within toleranceMs of each other)
  const duplicates: Array<{ time1: number; time2: number; rt: string }> = [];

  for (let i = 0; i < log.length; i++) {
    for (let j = i + 1; j < log.length; j++) {
      if (
        log[i].refreshToken === log[j].refreshToken &&
        Math.abs(log[i].time - log[j].time) < toleranceMs
      ) {
        duplicates.push({
          time1: log[i].time,
          time2: log[j].time,
          rt: log[i].refreshToken,
        });
      }
    }
  }

  if (duplicates.length === 0) {
    return {
      name: 'single-refresh-flight',
      passed: true,
      message: `No duplicate refresh requests detected across ${log.length} total requests.`,
      severity: 'warning',
    };
  }

  return {
    name: 'single-refresh-flight',
    passed: false,
    message: `DUPLICATE REFRESH: ${duplicates.length} pair(s) of refresh requests used the same token within ${toleranceMs}ms.`,
    severity: 'warning',
    details: duplicates,
  };
}
