import { describe, expect, it } from "bun:test";

class BaseCapability {
  constructor(public id: number) {}
}

class UnsafeCapability extends BaseCapability {
  // Developer adds stateful property
  private lastCaller = "";

  call(caller: string) {
    this.lastCaller = caller;
    return `Hello ${this.lastCaller} via ${this.id}`;
  }
}

describe("Frozen Capability Safety", () => {
  it("should prevent state mutation when frozen", () => {
    const cap = new UnsafeCapability(1);

    // Safety Measure
    Object.freeze(cap);

    expect(cap.id).toBe(1);

    // Attempt mutation
    expect(() => {
      cap.call("UserA");
    }).toThrow(); // Should throw TypeError: Cannot assign to read only property...
  });
});
