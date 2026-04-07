/**
 * Deterministic PRNG using a simple mulberry32 algorithm.
 * No external dependencies — good enough for simulation reproducibility.
 */
export class SimRng {
  readonly seed: string;
  private state: number;

  constructor(seed?: string) {
    this.seed = seed ?? Math.random().toString(36).slice(2, 14);
    this.state = this.hashSeed(this.seed);
  }

  private hashSeed(seed: string): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }

  /** Returns a float in [0, 1) */
  random(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] (inclusive) */
  int(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /** Pick a random element from an array */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('SimRng.pick: empty array');
    return arr[Math.floor(this.random() * arr.length)];
  }

  /** Returns true with the given probability (0-1) */
  chance(probability: number): boolean {
    return this.random() < probability;
  }

  /** Create a deterministic child RNG for a sub-stream */
  fork(label: string): SimRng {
    return new SimRng(`${this.seed}:${label}`);
  }
}
