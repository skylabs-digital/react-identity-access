import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Global test setup
beforeEach(() => {
  // Clear any mocks between tests
  vi.clearAllMocks();
});

// Tear down the rendered DOM between tests. With vitest `isolate: false`
// this is required — without it, rendered components from previous tests
// accumulate in document.body and break role/text queries.
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Functional localStorage mock
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value.toString();
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

const localStorageMock = new LocalStorageMock();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Functional sessionStorage mock
const sessionStorageMock = new LocalStorageMock();
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});
