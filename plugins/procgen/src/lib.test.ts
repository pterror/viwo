import { describe, expect, test } from "bun:test";
import * as ProcGenLib from "./lib";
import { createScriptContext, evaluate, ListLib, StdLib, unsafeAsAwaited } from "@viwo/scripting";

describe("procgen", () => {
  const ctx = createScriptContext({ this: { id: 1 }, caller: { id: 1 } });

  test("determinism", () => {
    // We need to run this in a way that state is preserved if it was global,
    // but here the state is module-level in lib.ts.
    // NOTE: In a real environment, module state is process-wide.
    // To test determinism, we need to reset/reseeding.

    // Run 1
    const [r1, n1] = unsafeAsAwaited(
      evaluate(
        StdLib.seq(
          ProcGenLib.seed(12345),
          ListLib.listNew(ProcGenLib.random(), ProcGenLib.noise(10, 20)),
        ),
        ctx,
      ),
    );

    // Run 2 (Same seed)
    const [r2, n2] = unsafeAsAwaited(
      evaluate(
        StdLib.seq(
          ProcGenLib.seed(12345),
          ListLib.listNew(ProcGenLib.random(), ProcGenLib.noise(10, 20)),
        ),
        ctx,
      ),
    );

    expect(r1).toBe(r2);
    expect(n1).toBe(n2);

    // Run 3 (Different seed)
    const [r3, n3] = unsafeAsAwaited(
      evaluate(
        StdLib.seq(
          ProcGenLib.seed(67890),
          ListLib.listNew(ProcGenLib.random(), ProcGenLib.noise(10, 20)),
        ),
        ctx,
      ),
    );

    expect(r1).not.toBe(r3);
    expect(n1).not.toBe(n3);
  });

  test("random range", () => {
    evaluate(ProcGenLib.seed(1), ctx);
    for (let i = 0; i < 100; i++) {
      const val = unsafeAsAwaited(evaluate(ProcGenLib.random(10, 20), ctx));
      expect(val).toBeGreaterThanOrEqual(10);
      expect(val).toBeLessThanOrEqual(20);
    }
  });

  test("noise range", () => {
    evaluate(ProcGenLib.seed(1), ctx);
    for (let x = 0; x < 10; x++) {
      const val = unsafeAsAwaited(evaluate(ProcGenLib.noise(x, x), ctx));
      expect(val).toBeGreaterThanOrEqual(-1);
      expect(val).toBeLessThanOrEqual(1);
    }
  });
});
