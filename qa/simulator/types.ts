// ---------------------------------------------------------------------------
// Simulation configuration
// ---------------------------------------------------------------------------

export interface SimulatorConfig {
  seed?: string;
  durationDays: number;
  tickIntervalMinutes: number;
  failFast: boolean;
  outputDir: string;
  verbose: boolean;
}

export const DEFAULT_CONFIG: SimulatorConfig = {
  durationDays: 7,
  tickIntervalMinutes: 1,
  failFast: true,
  outputDir: 'qa/output',
  verbose: false,
};

// ---------------------------------------------------------------------------
// Mock server configuration
// ---------------------------------------------------------------------------

export interface MockServerConfig {
  rotateRefreshTokens: boolean;
  reuseDetection: boolean;
  responseLatencyMs: [number, number];
  networkFailureRate: number;
  serverErrorRate: number;
  accessTokenLifetimeMs: number;
  refreshTokenLifetimeMs: number;
}

export const DEFAULT_SERVER_CONFIG: MockServerConfig = {
  rotateRefreshTokens: true,
  reuseDetection: true,
  responseLatencyMs: [50, 200],
  networkFailureRate: 0,
  serverErrorRate: 0,
  accessTokenLifetimeMs: 15 * 60 * 1000, // 15 minutes
  refreshTokenLifetimeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ---------------------------------------------------------------------------
// Tick context
// ---------------------------------------------------------------------------

export interface TickContext {
  simTime: Date;
  tick: number;
  dayOfSim: number;
  hour: number;
  minute: number;
}

// ---------------------------------------------------------------------------
// Asserts
// ---------------------------------------------------------------------------

export interface AssertResult {
  name: string;
  passed: boolean;
  message: string;
  severity: 'critical' | 'warning';
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Audit entry
// ---------------------------------------------------------------------------

export interface SimAuditEntry {
  id: string;
  tick: number;
  simTime: string;
  realTime: string;
  category: 'action' | 'assert' | 'lifecycle';
  action: string;
  actor?: { type: string; id: string };
  inputs?: Record<string, unknown>;
  result: 'ok' | 'fail' | 'skip';
  outputs?: Record<string, unknown>;
  error?: { code: string; message: string };
}

// ---------------------------------------------------------------------------
// Simulation report
// ---------------------------------------------------------------------------

export interface SimulationReport {
  scenario: string;
  seed: string;
  totalTicks: number;
  totalDays: number;
  actionsExecuted: number;
  assertionsRun: number;
  criticalFailures: number;
  warnings: number;
  passed: boolean;
  durationMs: number;
  auditLogPath: string;
}
