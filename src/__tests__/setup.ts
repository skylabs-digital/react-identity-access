import '@testing-library/jest-dom';

// Mock localStorage with proper storage behavior
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get _store() {
      return store;
    },
    set _store(newStore) {
      store = newStore;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage similarly
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'acme.example.com',
    href: 'https://acme.example.com',
    search: '?tenant=acme-corp',
    reload: vi.fn(),
  },
  writable: true,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock._store = {};
  localStorageMock.getItem.mockImplementation(
    (key: string) => localStorageMock._store[key] || null
  );
  localStorageMock.setItem.mockImplementation((key: string, value: string) => {
    localStorageMock._store[key] = value;
  });
});
