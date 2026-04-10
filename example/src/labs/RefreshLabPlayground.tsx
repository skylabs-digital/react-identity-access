import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@skylabs-digital/react-identity-access';

interface LogEntry {
  time: number;
  label: string;
  type: 'info' | 'ok' | 'err' | 'warn';
}

export function RefreshLabPlayground() {
  const { isAuthenticated, sessionManager } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [concurrentCount, setConcurrentCount] = useState(5);
  const [proactiveDelay, setProactiveDelay] = useState(5);
  const startTimeRef = useRef(0);
  const fetchInterceptRef = useRef<typeof globalThis.fetch | null>(null);
  const refreshCountRef = useRef(0);

  const log = useCallback((label: string, type: LogEntry['type'] = 'info') => {
    const time = Date.now() - startTimeRef.current;
    setLogs(prev => [...prev, { time, label, type }]);
  }, []);

  const clearLogs = () => setLogs([]);

  // Intercept fetch to count refresh calls
  const startFetchIntercept = useCallback(() => {
    refreshCountRef.current = 0;
    if (fetchInterceptRef.current) return; // already intercepted
    const originalFetch = globalThis.fetch;
    fetchInterceptRef.current = originalFetch;
    globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      if (url.includes('/auth/refresh')) {
        refreshCountRef.current++;
        const count = refreshCountRef.current;
        const t = Date.now() - startTimeRef.current;
        setLogs(prev => [
          ...prev,
          { time: t, label: `[FETCH INTERCEPT] refresh API call #${count} → ${url}`, type: 'warn' },
        ]);
      }
      return originalFetch(...args);
    };
  }, []);

  const stopFetchIntercept = useCallback(() => {
    if (fetchInterceptRef.current) {
      globalThis.fetch = fetchInterceptRef.current;
      fetchInterceptRef.current = null;
    }
  }, []);

  // ──────────────────────────────────────────────
  // SCENARIO 1: Proactive Refresh
  // Override expiry so the proactive timer fires in N seconds
  // ──────────────────────────────────────────────
  const runProactiveRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setRunning(true);
    clearLogs();
    startTimeRef.current = Date.now();
    startFetchIntercept();

    const tokens = sessionManager.getTokens();
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      log('No tokens found — login first', 'err');
      setRunning(false);
      stopFetchIntercept();
      return;
    }

    const originalToken = tokens.accessToken;

    // proactiveRefreshMargin defaults to 60s (60000ms)
    // So setting expiresIn = 60 + proactiveDelay means the timer fires in ~proactiveDelay seconds
    const fakeExpiresIn = 60 + proactiveDelay;

    log(`Current token: ...${originalToken.slice(-12)}`);
    log(`Setting expiresIn=${fakeExpiresIn}s (proactive margin=60s → timer fires in ~${proactiveDelay}s)`);

    sessionManager.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: fakeExpiresIn,
    });

    log(`Tokens overridden. Waiting for proactive refresh...`, 'warn');

    // Poll for token change
    const pollStart = Date.now();
    const maxWait = (proactiveDelay + 15) * 1000;
    let refreshed = false;

    while (Date.now() - pollStart < maxWait) {
      await new Promise(r => setTimeout(r, 500));
      const current = sessionManager.getTokens();
      if (current?.accessToken && current.accessToken !== originalToken) {
        const t = Date.now() - startTimeRef.current;
        setLogs(prev => [
          ...prev,
          { time: t, label: `TOKEN CHANGED! New: ...${current.accessToken!.slice(-12)}`, type: 'ok' },
          { time: t, label: `Refresh API calls: ${refreshCountRef.current}`, type: 'ok' },
          {
            time: t,
            label: `New expiresAt: ${current.expiresAt ? new Date(current.expiresAt).toLocaleTimeString() : 'N/A'}`,
            type: 'ok',
          },
        ]);
        refreshed = true;
        break;
      }
    }

    if (!refreshed) {
      log('Timed out waiting for proactive refresh', 'err');
    }

    stopFetchIntercept();
    setRunning(false);
  }, [isAuthenticated, sessionManager, proactiveDelay, log, startFetchIntercept, stopFetchIntercept]);

  // ──────────────────────────────────────────────
  // SCENARIO 2: Concurrent Requests with Expired Token
  // Force token as expired, fire N calls simultaneously
  // ──────────────────────────────────────────────
  const runConcurrentExpired = useCallback(async () => {
    if (!isAuthenticated) return;
    setRunning(true);
    clearLogs();
    startTimeRef.current = Date.now();
    startFetchIntercept();

    const tokens = sessionManager.getTokens();
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      log('No tokens found — login first', 'err');
      setRunning(false);
      stopFetchIntercept();
      return;
    }

    const originalToken = tokens.accessToken;
    log(`Original token: ...${originalToken.slice(-12)}`);
    log(`Forcing token as expired (expiresAt = now - 1s)`);

    // Force expired by setting expiresAt in the past
    // NOTE: expiresIn:0 is falsy so setTokens would skip expiresAt calculation
    // We must set expiresAt directly to a past timestamp
    sessionManager.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() - 5000,
    });

    log(`isTokenExpired: ${sessionManager.isTokenExpired()}`);
    log(`Firing ${concurrentCount} concurrent getValidAccessToken() calls...`, 'warn');

    const promises = Array.from({ length: concurrentCount }, (_, i) => {
      const callId = i + 1;
      const callStart = Date.now();
      return sessionManager
        .getValidAccessToken()
        .then(token => {
          const elapsed = Date.now() - callStart;
          const t = Date.now() - startTimeRef.current;
          const isNew = token !== originalToken;
          setLogs(prev => [
            ...prev,
            {
              time: t,
              label: `Call #${callId} resolved in ${elapsed}ms → ...${token.slice(-12)} ${isNew ? '(NEW)' : '(SAME)'}`,
              type: 'ok',
            },
          ]);
          return { callId, token, elapsed, error: null };
        })
        .catch(err => {
          const elapsed = Date.now() - callStart;
          const t = Date.now() - startTimeRef.current;
          setLogs(prev => [
            ...prev,
            {
              time: t,
              label: `Call #${callId} FAILED in ${elapsed}ms → [${err.constructor.name}] ${err.message}`,
              type: 'err',
            },
          ]);
          return { callId, token: null, elapsed, error: err.message };
        });
    });

    const results = await Promise.all(promises);

    // Summary
    const t = Date.now() - startTimeRef.current;
    const succeeded = results.filter(r => r.token !== null);
    const failed = results.filter(r => r.token === null);
    const uniqueTokens = new Set(succeeded.map(r => r.token));

    setLogs(prev => [
      ...prev,
      { time: t, label: '─── SUMMARY ───', type: 'info' },
      { time: t, label: `Total calls: ${concurrentCount}`, type: 'info' },
      { time: t, label: `Succeeded: ${succeeded.length}  |  Failed: ${failed.length}`, type: succeeded.length === concurrentCount ? 'ok' : 'warn' },
      { time: t, label: `Unique tokens received: ${uniqueTokens.size}`, type: uniqueTokens.size === 1 ? 'ok' : 'warn' },
      { time: t, label: `Refresh API calls made: ${refreshCountRef.current}`, type: refreshCountRef.current === 1 ? 'ok' : 'warn' },
      {
        time: t,
        label: refreshCountRef.current === 1
          ? 'PASS: Only 1 refresh call — queue worked correctly!'
          : refreshCountRef.current === 0
            ? 'NOTE: 0 refresh calls — token may not have been truly expired'
            : `WARN: ${refreshCountRef.current} refresh calls — possible race condition`,
        type: refreshCountRef.current === 1 ? 'ok' : 'warn',
      },
    ]);

    stopFetchIntercept();
    setRunning(false);
  }, [isAuthenticated, sessionManager, concurrentCount, log, startFetchIntercept, stopFetchIntercept]);

  // ──────────────────────────────────────────────
  // SCENARIO 3: Mixed — proactive near-expiry + concurrent burst
  // ──────────────────────────────────────────────
  const runMixedScenario = useCallback(async () => {
    if (!isAuthenticated) return;
    setRunning(true);
    clearLogs();
    startTimeRef.current = Date.now();
    startFetchIntercept();

    const tokens = sessionManager.getTokens();
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      log('No tokens found — login first', 'err');
      setRunning(false);
      stopFetchIntercept();
      return;
    }

    const originalToken = tokens.accessToken;
    log(`Original token: ...${originalToken.slice(-12)}`);

    // Set token to expire in 62s → proactive timer fires in ~2s
    log('Setting expiresIn=62s (proactive fires in ~2s)');
    sessionManager.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 62,
    });

    log('Waiting 3s for proactive refresh to start...', 'warn');
    await new Promise(r => setTimeout(r, 3000));

    // Now fire concurrent calls — they should queue behind the ongoing refresh
    log(`Proactive refresh should be in-flight. Firing ${concurrentCount} concurrent calls...`, 'warn');

    const promises = Array.from({ length: concurrentCount }, (_, i) => {
      const callId = i + 1;
      const callStart = Date.now();
      return sessionManager
        .getValidAccessToken()
        .then(token => {
          const elapsed = Date.now() - callStart;
          const t = Date.now() - startTimeRef.current;
          const isNew = token !== originalToken;
          setLogs(prev => [
            ...prev,
            {
              time: t,
              label: `Call #${callId} resolved in ${elapsed}ms → ...${token.slice(-12)} ${isNew ? '(NEW)' : '(SAME)'}`,
              type: 'ok',
            },
          ]);
          return { callId, token, elapsed };
        })
        .catch(err => {
          const t = Date.now() - startTimeRef.current;
          setLogs(prev => [
            ...prev,
            { time: t, label: `Call #${callId} FAILED → ${err.message}`, type: 'err' },
          ]);
          return { callId, token: null, elapsed: 0 };
        });
    });

    const results = await Promise.all(promises);

    const t = Date.now() - startTimeRef.current;
    const uniqueTokens = new Set(results.filter(r => r.token).map(r => r.token));
    setLogs(prev => [
      ...prev,
      { time: t, label: '─── SUMMARY ───', type: 'info' },
      { time: t, label: `Refresh API calls: ${refreshCountRef.current}`, type: refreshCountRef.current <= 1 ? 'ok' : 'warn' },
      { time: t, label: `Unique tokens: ${uniqueTokens.size}`, type: uniqueTokens.size === 1 ? 'ok' : 'warn' },
      {
        time: t,
        label: refreshCountRef.current <= 1
          ? 'PASS: Concurrent calls queued behind proactive refresh!'
          : `WARN: ${refreshCountRef.current} refresh calls`,
        type: refreshCountRef.current <= 1 ? 'ok' : 'warn',
      },
    ]);

    stopFetchIntercept();
    setRunning(false);
  }, [isAuthenticated, sessionManager, concurrentCount, log, startFetchIntercept, stopFetchIntercept]);

  return (
    <div>
      <h2>Refresh Lab</h2>

      {!isAuthenticated && (
        <div className="section">
          <span className="err">Login first to use the refresh lab</span>
        </div>
      )}

      <div className="section">
        <h3>Scenario 1 — Proactive Refresh Timer</h3>
        <p style={{ color: '#888', marginBottom: 8 }}>
          Overrides token expiry so the proactive refresh timer fires in N seconds.
          Polls for token change to confirm the refresh happened.
        </p>
        <div className="row">
          <span>Timer fires in:</span>
          <input
            type="number"
            value={proactiveDelay}
            onChange={e => setProactiveDelay(Number(e.target.value))}
            style={{ width: 60 }}
            min={1}
            max={30}
          />
          <span>seconds</span>
          <button onClick={runProactiveRefresh} disabled={!isAuthenticated || running}>
            Run Proactive Refresh
          </button>
        </div>
      </div>

      <div className="section">
        <h3>Scenario 2 — Concurrent Requests (Expired Token)</h3>
        <p style={{ color: '#888', marginBottom: 8 }}>
          Forces token as expired, then fires N simultaneous getValidAccessToken() calls.
          All should queue behind a single refresh. Verifies only 1 API call is made.
        </p>
        <div className="row">
          <span>Concurrent calls:</span>
          <input
            type="number"
            value={concurrentCount}
            onChange={e => setConcurrentCount(Number(e.target.value))}
            style={{ width: 60 }}
            min={2}
            max={50}
          />
          <button onClick={runConcurrentExpired} disabled={!isAuthenticated || running}>
            Run Concurrent Expired
          </button>
        </div>
      </div>

      <div className="section">
        <h3>Scenario 3 — Mixed (Proactive + Concurrent Burst)</h3>
        <p style={{ color: '#888', marginBottom: 8 }}>
          Sets token near-expiry (proactive fires in ~2s), waits 3s, then fires N concurrent
          calls that should queue behind the ongoing refresh.
        </p>
        <div className="row">
          <button onClick={runMixedScenario} disabled={!isAuthenticated || running}>
            Run Mixed Scenario
          </button>
        </div>
      </div>

      <div className="section">
        <div className="row">
          <h3>Event Log</h3>
          <button onClick={clearLogs} disabled={running}>Clear</button>
          {running && <span className="warn">(running...)</span>}
        </div>
        <pre style={{ maxHeight: 500 }}>
          {logs.length === 0
            ? '(no events yet)'
            : logs
                .map(
                  e =>
                    `[${String(e.time).padStart(5)}ms] ${e.type === 'ok' ? '✓' : e.type === 'err' ? '✗' : e.type === 'warn' ? '⚠' : '·'} ${e.label}`
                )
                .join('\n')}
        </pre>
      </div>
    </div>
  );
}
