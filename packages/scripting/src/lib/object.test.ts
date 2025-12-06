import { expect, beforeEach } from "bun:test";
import {
  evaluate,
  ScriptContext,
  createOpcodeRegistry,
  ScriptError,
  createScriptContext,
} from "../interpreter";
import * as Core from "./std";
import * as ObjectLib from "./object";
import * as ListLib from "./list";
import * as String from "./string";
import * as MathLib from "./math";
import * as BooleanLib from "./boolean";
import { createLibraryTester } from "./test-utils";

createLibraryTester(ObjectLib, "Object Library", (test) => {
  const TEST_OPS = createOpcodeRegistry(Core, ObjectLib, ListLib, String, MathLib, BooleanLib);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      caller: { id: 1 } as any,
      this: { id: 2 } as any,
      ops: TEST_OPS,
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
    } catch (e) {
      expect(e).toBeInstanceOf(ScriptError);
    }
  });

  test("obj.set", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core.let("o", { a: 1 }), localCtx);
    await evaluate(ObjectLib.objSet(Core.var("o"), "b", 2), localCtx);
    expect(await evaluate(Core.var("o"), localCtx)).toEqual({ a: 1, b: 2 });
  });

  test("obj.has", async () => {
    expect(await evaluate(ObjectLib.objHas({ a: 1 }, "a"), ctx)).toBe(true);
    expect(await evaluate(ObjectLib.objHas({ a: 1 }, "b"), ctx)).toBe(false);
  });

  test("obj.del", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core.let("o", { a: 1, b: 2 }), localCtx);
    expect(await evaluate(ObjectLib.objDel(Core.var("o"), "a"), localCtx)).toBe(true);
    expect(await evaluate(Core.var("o"), localCtx)).toEqual({ b: 2 });
    expect(await evaluate(ObjectLib.objDel(Core.var("o"), "c"), localCtx)).toBe(false);
  });

  test("obj.merge", async () => {
    expect(await evaluate(ObjectLib.objMerge({ a: 1 }, { b: 2, a: 3 }), ctx)).toEqual({
      a: 3,
      b: 2,
    });
  });

  // HOF tests
  test("obj.map", async () => {
    // (lambda (val key) (+ val 1))
    const inc = Core.lambda(["val", "key"], MathLib.add(Core.var("val"), 1));
    expect(await evaluate(ObjectLib.objMap({ a: 1, b: 2 }, inc), ctx)).toEqual({
      a: 2,
      b: 3,
    });
  });

  test("obj.filter", async () => {
    // (lambda (val key) (> val 1))
    const gt1 = Core.lambda(["val", "key"], BooleanLib.gt(Core.var("val"), 1));
    expect(await evaluate(ObjectLib.objFilter({ a: 1, b: 2 }, gt1), ctx)).toEqual({
      b: 2,
    });
  });

  test("obj.reduce", async () => {
    // (lambda (acc val key) (+ acc val))
    const sum = Core.lambda(["acc", "val", "key"], MathLib.add(Core.var("acc"), Core.var("val")));
    expect(await evaluate(ObjectLib.objReduce({ a: 1, b: 2 }, sum, 0), ctx)).toBe(3);
  });

  test("obj.flatMap", async () => {
    // (lambda (val key) { [key]: val, [key + "_dup"]: val })
    const expand = Core.lambda(
      ["val", "key"],
      Core.seq(
        Core.let("o", {}),
        ObjectLib.objSet(Core.var("o"), Core.var("key"), Core.var("val")),
        ObjectLib.objSet(Core.var("o"), String.strConcat(Core.var("key"), "_dup"), Core.var("val")),
        Core.var("o"),
      ),
    );

    expect(await evaluate(ObjectLib.objFlatMap({ a: 1 }, expand), ctx)).toEqual({
      a: 1,
      a_dup: 1,
    });
  });
});
