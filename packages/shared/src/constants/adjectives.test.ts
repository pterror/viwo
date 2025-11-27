import { describe, test, expect } from "bun:test";
import { ADJECTIVE_REGISTRY, ALL_ADJECTIVES } from "./adjectives";

describe("Adjectives", () => {
  test("Registry Structure", () => {
    expect(ADJECTIVE_REGISTRY.colors).toBeArray();
    expect(ADJECTIVE_REGISTRY.modifiers).toBeArray();
    expect(ADJECTIVE_REGISTRY.effects).toBeArray();
    expect(ADJECTIVE_REGISTRY.materials).toBeArray();
  });

  test("ALL_ADJECTIVES generation", () => {
    expect(ALL_ADJECTIVES).toContain("color:red");
    expect(ALL_ADJECTIVES).toContain("material:stone");
    expect(ALL_ADJECTIVES).toContain("effect:glowing");

    // Check for duplicates?
    const unique = new Set(ALL_ADJECTIVES);
    expect(unique.size).toBe(ALL_ADJECTIVES.length);
  });
});
