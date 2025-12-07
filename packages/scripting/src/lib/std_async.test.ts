import * as BooleanLib from "../lib/boolean";
import * as MathLib from "../lib/math";
import * as StdLib from "../lib/std";
import { createOpcodeRegistry, createScriptContext, evaluate } from "../interpreter";
import { expect, test } from "bun:test";
import { defineFullOpcode } from "../types";

const asyncOp = defineFullOpcode<[], Promise<number>>("asyncOp", {
  handler: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    return 1;
  },
  metadata: {
    category: "test",
    description: "Returns a promise",
    label: "Async Op",
    parameters: [],
    returnType: "number",
    slots: [],
  },
});

const AsyncLib = {
  asyncOp,
};

test("async while loop", async () => {
  const TEST_OPS = createOpcodeRegistry(StdLib, BooleanLib, MathLib, AsyncLib);

  const ctx = createScriptContext({
    args: [],
    caller: null!,
    ops: TEST_OPS,
    this: null!,
  });

  // let i = 0;
  // while (i < 5) {
  //    await asyncOp();
  //    i = i + 1;
  // }
  // i

  const script = StdLib.seq(
    StdLib.let("i", 0),
    StdLib.while(
      BooleanLib.lt(StdLib.var("i"), 5),
      StdLib.seq(AsyncLib.asyncOp(), StdLib.set("i", MathLib.add(StdLib.var("i"), 1))),
    ),
    StdLib.var("i"),
  );

  const result = await evaluate(script, ctx);
  expect(result).toBe(5);
});

test("async for loop", async () => {
  const TEST_OPS = createOpcodeRegistry(StdLib, BooleanLib, MathLib, AsyncLib);
  // We need List lib for listNew, but it's not imported.
  // Let's just use a literal array if possible?
  // Std.for takes a block that evaluates to an array.
  // Std.quote([1, 2, 3]) returns the array.

  const ctx = createScriptContext({
    args: [],
    caller: null!,
    ops: TEST_OPS,
    this: null!,
  });

  const script = StdLib.seq(
    StdLib.let("sum", 0),
    StdLib.for(
      "x",
      StdLib.quote([1, 2, 3]),
      StdLib.seq(
        AsyncLib.asyncOp(),
        StdLib.set("sum", MathLib.add(StdLib.var("sum"), StdLib.var("x"))),
      ),
    ),
    StdLib.var("sum"),
  );

  const result = await evaluate(script, ctx);
  expect(result).toBe(6);
});
