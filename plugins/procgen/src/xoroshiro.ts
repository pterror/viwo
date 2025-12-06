export class Xoroshiro128Plus {
  state: [bigint, bigint];

  constructor(seed: number | bigint) {
    this.state = [0n, 0n];
    this.seed(seed);
  }

  seed(seed: number | bigint) {
    // Split 64-bit seed into two 64-bit state parts using SplitMix64
    let s = BigInt(seed);
    this.state[0] = this.splitMix64(s);
    this.state[1] = this.splitMix64(s + 0x9e3779b97f4a7c15n);
  }

  private splitMix64(x: bigint): bigint {
    let z = (x + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    return (z ^ (z >> 31n)) & 0xffffffffffffffffn;
  }

  next(): bigint {
    const s0 = this.state[0];
    let s1 = this.state[1];
    const result = (s0 + s1) & 0xffffffffffffffffn;

    s1 ^= s0;
    this.state[0] = (this.rotl(s0, 24n) ^ s1 ^ (s1 << 16n)) & 0xffffffffffffffffn; // a, b
    this.state[1] = this.rotl(s1, 37n) & 0xffffffffffffffffn; // c

    return result;
  }

  private rotl(x: bigint, k: bigint): bigint {
    return ((x << k) | (x >> (64n - k))) & 0xffffffffffffffffn;
  }

  /**
   * Returns a random float between 0 (inclusive) and 1 (exclusive).
   * 53 bits of precision.
   */
  float(): number {
    const next = this.next();
    // Use upper 53 bits for double precision float
    return Number(next >> 11n) * 1.1102230246251565e-16; // 2^-53
  }

  /**
   * Returns a random number between min (inclusive) and max (inclusive).
   */
  range(min: number, max: number): number {
    if (min > max) {
      throw new Error("min must be less than or equal to max");
    }
    const val = this.float();
    const result = val * (max - min) + min;

    // If inputs are integers, round the result (simulating integer range if close)
    if (Number.isInteger(min) && Number.isInteger(max)) {
      return Math.floor(result); // Using floor logic similar to previous random() behavior
    }
    return result;
  }
}
