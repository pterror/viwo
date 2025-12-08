import { describe, expect, it } from "bun:test";
import { EntityControl } from "../packages/core/src/runtime/capabilities";

// Helper to bypass TS readonly check for testing runtime behavior
function mutate(obj: any, key: string, value: any) {
  obj[key] = value;
}

describe("Frozen Capability Security", () => {
  it("should prevent mutation of EntityControl instances", () => {
    // Create an instance (mocking ID and ownerId)
    const cap = new EntityControl("cap_123", 100);

    // Initial check
    expect(cap.id).toBe("cap_123");
    expect(Object.isFrozen(cap)).toBe(true);

    // Attempt to mutate existing property
    expect(() => {
      // @ts-ignore
      cap.id = "hacked";
    }).toThrow();

    // Attempt to add new property
    expect(() => {
      // @ts-ignore
      cap.newProp = "malicious";
    }).toThrow();

    // Verify state remained unchanged
    expect(cap.id).toBe("cap_123");
    expect((cap as any).newProp).toBeUndefined();
  });

  it("should prevent mutation via Object.assign", () => {
    const cap = new EntityControl("cap_456", 100);

    expect(() => {
      Object.assign(cap, { id: "hacked" });
    }).toThrow();
  });
});
