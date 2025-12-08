import { describe, expect, it } from "bun:test";

function deepFreeze<Type extends object>(object: Type, visited = new WeakSet()): Type {
  if (visited.has(object)) {
    return object;
  }
  visited.add(object);
  Object.freeze(object);
  for (const key of Object.getOwnPropertyNames(object)) {
    const value = (object as any)[key];
    if (value && typeof value === "object") {
      deepFreeze(value, visited);
    }
  }
  return object;
}

class ComplexCapability {
  public config: { nested: { count: number }; circular?: any };

  constructor() {
    this.config = { nested: { count: 0 } };
    this.config.circular = this.config; // Circular reference
    deepFreeze(this);
  }
}

describe("Deep Freeze Safety", () => {
  it("should freeze nested properties", () => {
    const cap = new ComplexCapability();
    expect(Object.isFrozen(cap)).toBe(true);
    expect(Object.isFrozen(cap.config)).toBe(true);
    expect(Object.isFrozen(cap.config.nested)).toBe(true);

    expect(() => {
      cap.config.nested.count = 1;
    }).toThrow();
  });

  it("should handle circular references gracefully", () => {
    const cap = new ComplexCapability();
    expect(Object.isFrozen(cap.config.circular)).toBe(true);
  });
});
