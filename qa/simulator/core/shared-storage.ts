import type { TokenStorage } from '../../../src/services/SessionManager.js';

/**
 * In-memory token storage shared between multiple SessionManager instances.
 * Simulates localStorage being shared across browser tabs.
 */
export class SharedStorage implements TokenStorage {
  private data: Record<string, unknown> | null = null;

  get(): any {
    return this.data ? { ...this.data } : null;
  }

  set(data: any): void {
    this.data = data ? { ...data } : null;
  }

  clear(): void {
    this.data = null;
  }

  /** Read raw data for assertions */
  peek(): Record<string, unknown> | null {
    return this.data;
  }
}
