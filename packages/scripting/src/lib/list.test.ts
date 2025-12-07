import * as BooleanLib from "../lib/boolean";
import * as ListLib from "../lib/list";
import * as MathLib from "../lib/math";
import * as StdLib from "../lib/std";
import {
  type ScriptContext,
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
} from "../interpreter";
import { beforeEach, expect } from "bun:test";
import { createLibraryTester } from "./test-utils";

createLibraryTester(ListLib, "List Library", (test) => {
  const TEST_OPS = createOpcodeRegistry(StdLib, ListLib, MathLib, BooleanLib);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      caller: { id: 1 } as any,
      ops: TEST_OPS,
      this: { id: 2 } as any,
    });
  });

  test("list.new", async () => {
    expect(await evaluate(ListLib.listNew(1, 2, 3), ctx)).toEqual([1, 2, 3]);
  });

  test("list.len", async () => {
    expect(await evaluate(ListLib.listLen(ListLib.listNew(1, 2, 3)), ctx)).toBe(3);
    expect(await evaluate(ListLib.listLen(ListLib.listNew()), ctx)).toBe(0);
  });

  test("list.empty", async () => {
    expect(await evaluate(ListLib.listEmpty(ListLib.listNew()), ctx)).toBe(true);
    expect(await evaluate(ListLib.listEmpty(ListLib.listNew(1)), ctx)).toBe(false);
  });

  test("list.get", async () => {
    expect(await evaluate(ListLib.listGet(ListLib.listNew(10, 20), 1), ctx)).toBe(20);
    expect(await evaluate(ListLib.listGet(ListLib.listNew(10, 20), 5), ctx)).toBe(undefined);
  });

  test("list.set", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(StdLib.let("l", ListLib.listNew(1, 2, 3)), localCtx);
    await evaluate(ListLib.listSet(StdLib.var("l"), 1, 99), localCtx);
    expect(await evaluate(StdLib.var("l"), localCtx)).toEqual([1, 99, 3]);
  });

  test("list.push", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(StdLib.let("l", ListLib.listNew(1, 2)), localCtx);

    expect(await evaluate(ListLib.listPush(StdLib.var("l"), 3), localCtx)).toBe(3); // Returns new length
    expect(await evaluate(StdLib.var("l"), localCtx)).toEqual([1, 2, 3]);
  });

  test("list.pop", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(StdLib.let("l", ListLib.listNew(1, 2, 3)), localCtx);

    expect(await evaluate(ListLib.listPop<number>(StdLib.var("l")), localCtx)).toBe(3); // Returns popped value
    expect(await evaluate(StdLib.var("l"), localCtx)).toEqual([1, 2]);
  });

  test("list.unshift", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(StdLib.let("l", ListLib.listNew(2, 3)), localCtx);

    expect(await evaluate(ListLib.listUnshift(StdLib.var("l"), 1), localCtx)).toBe(3);
    expect(await evaluate(StdLib.var("l"), localCtx)).toEqual([1, 2, 3]);
  });

  test("list.shift", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(StdLib.let("l", ListLib.listNew(1, 2, 3)), localCtx);

    expect(await evaluate(ListLib.listShift<number>(StdLib.var("l")), localCtx)).toBe(1);
    expect(await evaluate(StdLib.var("l"), localCtx)).toEqual([2, 3]);
  });

  test("list.slice", async () => {
    const list = [1, 2, 3, 4, 5];
    // list.slice returns a new list
    expect(await evaluate(ListLib.listSlice(ListLib.listNew(...list), 1, 3), ctx)).toEqual([2, 3]);
  });

  test("list.splice", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(StdLib.let("l", ListLib.listNew(1, 2, 3, 4)), localCtx);

    // Remove 2 elements starting at index 1, insert 99
    const removed = await evaluate(ListLib.listSplice(StdLib.var("l"), 1, 2, 99), localCtx);
    expect(removed).toEqual([2, 3]);
    expect(await evaluate(StdLib.var("l"), localCtx)).toEqual([1, 99, 4]);
  });

  test("list.concat", async () => {
    expect(await evaluate(ListLib.listConcat(ListLib.listNew(1), ListLib.listNew(2)), ctx)).toEqual(
      [1, 2],
    );
  });

  test("list.includes", async () => {
    expect(await evaluate(ListLib.listIncludes(ListLib.listNew(1, 2), 2), ctx)).toBe(true);
    expect(await evaluate(ListLib.listIncludes(ListLib.listNew(1, 2), 3), ctx)).toBe(false);
  });

  test("list.reverse", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(StdLib.let("l", ListLib.listNew(1, 2, 3)), localCtx);
    expect(await evaluate(ListLib.listReverse(StdLib.var("l")), localCtx)).toEqual([3, 2, 1]);
  });

  test("list.sort", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(StdLib.let("l", ListLib.listNew("b", "a", "c")), localCtx);
    expect(await evaluate(ListLib.listSort(StdLib.var("l")), localCtx)).toEqual(["a", "b", "c"]);
  });

  test("list.find", async () => {
    const gt1 = StdLib.lambda(["x"], BooleanLib.gt(StdLib.var("x"), 1));
    expect(await evaluate(ListLib.listFind(ListLib.listNew(1, 2, 3), gt1), ctx)).toBe(2);
  });

  // HOF tests
  test("list.map", async () => {
    const inc = StdLib.lambda(["x"], MathLib.add(StdLib.var("x"), 1));
    expect(await evaluate(ListLib.listMap(ListLib.listNew(1, 2, 3), inc), ctx)).toEqual([2, 3, 4]);
  });

  test("list.filter", async () => {
    // (lambda (x) (> x 1))
    const gt1 = StdLib.lambda(["x"], BooleanLib.gt(StdLib.var("x"), 1));
    expect(await evaluate(ListLib.listFilter(ListLib.listNew(1, 2, 3), gt1), ctx)).toEqual([2, 3]);
  });

  test("list.reduce", async () => {
    // (lambda (acc x) (+ acc x))
    const sum = StdLib.lambda(["acc", "x"], MathLib.add(StdLib.var("acc"), StdLib.var("x")));
    expect(await evaluate(ListLib.listReduce(ListLib.listNew(1, 2, 3), sum, 0), ctx)).toBe(6);
  });

  test("list.flatMap", async () => {
    // (lambda (x) (list x (+ x 1)))
    const dup = StdLib.lambda(
      ["x"],
      ListLib.listNew(StdLib.var("x"), MathLib.add(StdLib.var("x"), 1)),
    );
    expect(await evaluate(ListLib.listFlatMap(ListLib.listNew(1, 3), dup), ctx)).toEqual([
      1, 2, 3, 4,
    ]);
  });
});
