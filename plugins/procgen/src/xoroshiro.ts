export class Xoroshiro128Plus {
  state: [bigint, bigint];

  constructor(seed: number | bigint) {
    this.state = [0n, 0n];
    this.seed(seed);
  }

  seed(seed: number | bigint) {
    // Split 64-bit seed into two 64-bit state parts using SplitMix64
    let seedBigint = BigInt(seed);
    this.state[0] = this.splitMix64(seedBigint);
    this.state[1] = this.splitMix64(seedBigint + 0x9e_37_79_b9_7f_4a_7c_15n);
  }

  private splitMix64(num: bigint): bigint {
    let res = (num + 0x9e_37_79_b9_7f_4a_7c_15n) & 0xff_ff_ff_ff_ff_ff_ff_ffn;
    res = ((res ^ (res >> 30n)) * 0xbf_58_47_6d_1c_e4_e5_b9n) & 0xff_ff_ff_ff_ff_ff_ff_ffn;
    res = ((res ^ (res >> 27n)) * 0x94_d0_49_bb_13_31_11_ebn) & 0xff_ff_ff_ff_ff_ff_ff_ffn;
    return (res ^ (res >> 31n)) & 0xff_ff_ff_ff_ff_ff_ff_ffn;
  }

  next(): bigint {
    const [s0] = this.state;
    let [, s1] = this.state;
    const result = (s0 + s1) & 0xff_ff_ff_ff_ff_ff_ff_ffn;

    s1 ^= s0;
    this.state[0] = (this.rotl(s0, 24n) ^ s1 ^ (s1 << 16n)) & 0xff_ff_ff_ff_ff_ff_ff_ffn; // a, b
    this.state[1] = this.rotl(s1, 37n) & 0xff_ff_ff_ff_ff_ff_ff_ffn; // c

    return result;
  }

  private rotl(num: bigint, shift: bigint): bigint {
    return ((num << shift) | (num >> (64n - shift))) & 0xff_ff_ff_ff_ff_ff_ff_ffn;
  }

  /**
   * Returns a random float between 0 (inclusive) and 1 (exclusive).
   * 53 bits of precision.
   */
  float(): number {
    const next = this.next();
    // Use upper 53 bits for double precision float
    return Number(next >> 11n) * 1.110_223_024_625_156_5e-16; // 2^-53
  }

  /** Returns a random number between min (inclusive) and max (inclusive). */
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
