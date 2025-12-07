import * as RandomLib from "../lib/random";
import * as StdLib from "../lib/std";
import { createOpcodeRegistry, createScriptContext } from "../interpreter";
import { describe, expect, test } from "bun:test";
import { type ScriptOps } from "../types";
import { compile } from "../compiler";

const ops: ScriptOps = createOpcodeRegistry(StdLib, RandomLib);

const run = (script: any) => {
  const fn = compile(script, ops);
  return fn(createScriptContext({ caller: { id: 1 }, ops, this: { id: 1 } }));
};

describe("random", () => {
  test("random.number", () => {
    // Cannot easily test randomness deteministically without mocking Math.random
    // But we can test range conventions
    const val = run(RandomLib.number());
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });

  test("random.between", () => {
    const val = run(RandomLib.between(10, 20));
    expect(val).toBeGreaterThanOrEqual(10);
    expect(val).toBeLessThanOrEqual(20);
    expect(Number.isInteger(val)).toBe(true);

    // Test error case
    // Note: Compiler inlines logic, so errors might be thrown by JS execution or by compiler helper if used?
    // Compiler implementation:
    // "random.between": (min, max) => { if (min > max) throw... return ... }
    // Inline implementation:
    // ... Math.floor(...) ...
    // The compiler implementation I wrote uses `__helpers__["random.between"]` if it wasn't valid range?
    // No, I implemented inline JS `Math.floor...` inside `compiler.ts` logic?
    // Let's check compiler.ts logic again.
    // It inlines: `Math.floor(Math.random() * (max - min + 1)) + min`?
    // Wait, I changed compiler.ts to use `__helpers__["random.between"]` in step 111!
    // So it uses the helper.
    // The helper helper checks `min > max` and throws.

    expect(() => run(RandomLib.between(20, 10))).toThrow(
      "random: min must be less than or equal to max",
    );
  });

  test("random.choice", () => {
    const list = [1, 2, 3];
    const val = run(RandomLib.choice(StdLib.quote(list)));
    expect(list).toContain(val);

    expect(run(RandomLib.choice(StdLib.quote([])))).toBe(null);
    expect(run(RandomLib.choice(StdLib.quote("not-list")))).toBe(null);
  });
});
