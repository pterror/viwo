// 1. Singleton Pattern (Current)
class SingletonCap {
  constructor(public id: number) {}
  destroy(targetId: number, ctx: any) {
    return ctx.caller + this.id + targetId;
  }
}

// 2. Transient Pattern (Proposed)
class TransientCap {
  constructor(
    public id: number,
    private ctx: any,
  ) {}
  destroy(targetId: number) {
    return this.ctx.caller + this.id + targetId;
  }
}

const ITERATIONS = 1_000_000;
const CTX = { caller: "user" };

console.log(`Running ${ITERATIONS} iterations...`);

// Test 1: Singleton
const start1 = performance.now();
const singleton = new SingletonCap(123);
for (let idx = 0; idx < ITERATIONS; idx += 1) {
  singleton.destroy(idx, CTX);
}
const end1 = performance.now();
console.log(`Singleton: ${(end1 - start1).toFixed(2)}ms`);

// Test 2: Transient
const start2 = performance.now();
for (let idx = 0; idx < ITERATIONS; idx += 1) {
  const cap = new TransientCap(123, CTX);
  cap.destroy(idx);
}
const end2 = performance.now();
console.log(`Transient: ${(end2 - start2).toFixed(2)}ms`);

// Ratio
console.log(`Slowdown: ${(end2 - start2) / (end1 - start1)}x`);

// oxlint-disable-next-line require-module-specifiers
export {};
