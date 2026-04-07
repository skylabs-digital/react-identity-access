import { appendFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import type { SimAuditEntry } from '../types.js';

let nextId = 0;
function makeId(): string {
  return `a${(++nextId).toString(36).padStart(6, '0')}`;
}

export class SimAudit {
  private entries: SimAuditEntry[] = [];
  private outputPath: string | null;
  private actionCounts = { ok: 0, fail: 0, skip: 0 };

  constructor(outputPath?: string) {
    this.outputPath = outputPath ?? null;
    if (this.outputPath) {
      mkdirSync(dirname(this.outputPath), { recursive: true });
      writeFileSync(this.outputPath, '');
    }
  }

  logAction(entry: {
    tick: number;
    simTime: string;
    action: string;
    actor?: { type: string; id: string };
    inputs?: Record<string, unknown>;
    result: 'ok' | 'fail' | 'skip';
    outputs?: Record<string, unknown>;
    error?: { code: string; message: string };
  }): string {
    const full: SimAuditEntry = {
      id: makeId(),
      realTime: new Date().toISOString(),
      category: 'action',
      ...entry,
    };
    this.actionCounts[entry.result]++;
    this.write(full);
    return full.id;
  }

  logAssert(entry: {
    tick: number;
    simTime: string;
    name: string;
    passed: boolean;
    message: string;
    severity: 'critical' | 'warning';
  }): string {
    const full: SimAuditEntry = {
      id: makeId(),
      realTime: new Date().toISOString(),
      category: 'assert',
      tick: entry.tick,
      simTime: entry.simTime,
      action: `assert:${entry.name}`,
      result: entry.passed ? 'ok' : 'fail',
      outputs: { message: entry.message, severity: entry.severity },
    };
    this.write(full);
    return full.id;
  }

  logLifecycle(entry: {
    tick: number;
    simTime: string;
    action: string;
    details?: Record<string, unknown>;
  }): string {
    const full: SimAuditEntry = {
      id: makeId(),
      realTime: new Date().toISOString(),
      category: 'lifecycle',
      tick: entry.tick,
      simTime: entry.simTime,
      action: entry.action,
      result: 'ok',
      outputs: entry.details,
    };
    this.write(full);
    return full.id;
  }

  getEntries(): readonly SimAuditEntry[] {
    return this.entries;
  }

  getFailures(): SimAuditEntry[] {
    return this.entries.filter(e => e.result === 'fail');
  }

  summary(): { total: number; ok: number; fail: number; skip: number } {
    return {
      total: this.actionCounts.ok + this.actionCounts.fail + this.actionCounts.skip,
      ...this.actionCounts,
    };
  }

  private write(entry: SimAuditEntry): void {
    this.entries.push(entry);
    if (this.outputPath) {
      appendFileSync(this.outputPath, JSON.stringify(entry) + '\n');
    }
  }
}
