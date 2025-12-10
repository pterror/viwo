// oxlint-disable id-length
import * as BooleanLib from "../lib/boolean";
import * as ListLib from "../lib/list";
import * as MathLib from "../lib/math";
import * as ObjectLib from "../lib/object";
import * as StdLib from "../lib/std";
import * as StringLib from "../lib/string";
import {
  type ScriptContext,
  ScriptError,
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
} from "../interpreter";
import { beforeEach, expect } from "bun:test";
import { createLibraryTester } from "./test-utils";

createLibraryTester(ObjectLib, "Object Library", (test) => {
  const TEST_OPS = createOpcodeRegistry(StdLib, ObjectLib, ListLib, StringLib, MathLib, BooleanLib);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      caller: { id: 1 } as any,
      ops: TEST_OPS,
      this: { id: 2 } as any,
    });
  });

  test("obj.new", async () => {
    expect(await evaluate(ObjectLib.objNew(["a", 1], ["b", 2]), ctx)).toEqual({
      a: 1,
      b: 2,
    });
  });

  test("obj.keys", async () => {
    expect(await evaluate(ObjectLib.objKeys({ a: 1, b: 2 }), ctx)).toEqual(["a", "b"]);
    expect(await evaluate(ObjectLib.objKeys({}), ctx)).toEqual([]);
  });

  test("obj.values", async () => {
    expect(await evaluate(ObjectLib.objValues({ a: 1, b: 2 }), ctx)).toEqual([1, 2]);
  });

  test("obj.entries", async () => {
    expect(await evaluate(ObjectLib.objEntries({ a: 1 }), ctx)).toEqual([["a", 1]]);
  });

  test("obj.get", async () => {
    expect(await evaluate(ObjectLib.objGet({ a: 1 }, "a"), ctx)).toBe(1);

    // We can't easily test throw with async evaluate using try/catch block inside expect
    // unless we use reject.
    // But evaluate might throw synchronously if it's not async?
    // No, evaluate returns Promise if async.
    // If it throws synchronously, it throws.
    // If it returns rejected Promise, we need to await it.

    try {
      await evaluate(ObjectLib.objGet({ a: 1 }, "b"), ctx);
    } catch (error) {
      expect(error).toBeInstanceOf(ScriptError);
    }
  });

  test("obj.get with default", async () => {
    expect(await evaluate(ObjectLib.objGet({ a: 1 }, "b", "default"), ctx)).toBe("default");
    expect(await evaluate(ObjectLib.objGet({ a: 1 }, "b", ListLib.listNew()), ctx)).toEqual([]);
  });

  test("obj.set", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(StdLib.let("o", { a: 1 }), localCtx);
    await evaluate(ObjectLib.objSet(StdLib.var("o"), "b", 2), localCtx);
    expect(await evaluate(StdLib.var("o"), localCtx)).toEqual({ a: 1, b: 2 });
  });

  test("obj.has", async () => {
    expect(await evaluate(ObjectLib.objHas({ a: 1 }, "a"), ctx)).toBe(true);
    expect(await evaluate(ObjectLib.objHas({ a: 1 }, "b"), ctx)).toBe(false);
  });

  test("obj.del", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(StdLib.let("o", { a: 1, b: 2 }), localCtx);
    expect(await evaluate(ObjectLib.objDel(StdLib.var("o"), "a"), localCtx)).toBe(true);
    expect(await evaluate(StdLib.var("o"), localCtx)).toEqual({ b: 2 });
    expect(await evaluate(ObjectLib.objDel(StdLib.var("o"), "c"), localCtx)).toBe(false);
  });

  test("obj.merge", async () => {
    expect(await evaluate(ObjectLib.objMerge({ a: 1 }, { a: 3, b: 2 }), ctx)).toEqual({
      a: 3,
      b: 2,
    });
  });

  // HOF tests
  test("obj.map", async () => {
    // (lambda (val key) (+ val 1))
    const inc = StdLib.lambda(["val", "key"], MathLib.add(StdLib.var("val"), 1));
    expect(await evaluate(ObjectLib.objMap({ a: 1, b: 2 }, inc), ctx)).toEqual({
      a: 2,
      b: 3,
    });
  });

  test("obj.filter", async () => {
    // (lambda (val key) (> val 1))
    const gt1 = StdLib.lambda(["val", "key"], BooleanLib.gt(StdLib.var("val"), 1));
    expect(await evaluate(ObjectLib.objFilter({ a: 1, b: 2 }, gt1), ctx)).toEqual({
      b: 2,
    });
  });

  test("obj.reduce", async () => {
    // (lambda (acc val key) (+ acc val))
    const sum = StdLib.lambda(
      ["acc", "val", "key"],
      MathLib.add(StdLib.var("acc"), StdLib.var("val")),
    );
    expect(await evaluate(ObjectLib.objReduce({ a: 1, b: 2 }, sum, 0), ctx)).toBe(3);
  });

  test("obj.flatMap", async () => {
    // (lambda (val key) { [key]: val, [key + "_dup"]: val })
    const expand = StdLib.lambda(
      ["val", "key"],
      StdLib.seq(
        StdLib.let("o", {}),
        ObjectLib.objSet(StdLib.var("o"), StdLib.var("key"), StdLib.var("val")),
        ObjectLib.objSet(
          StdLib.var("o"),
          StringLib.strConcat(StdLib.var("key"), "_dup"),
          StdLib.var("val"),
        ),
        StdLib.var("o"),
      ),
    );

    expect(await evaluate(ObjectLib.objFlatMap({ a: 1 }, expand), ctx)).toEqual({
      a: 1,
      a_dup: 1,
    });
  });
});
