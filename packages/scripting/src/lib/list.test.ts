import { expect, beforeEach } from "bun:test";
import { evaluate, ScriptContext, createOpcodeRegistry, createScriptContext } from "../interpreter";
import * as Core from "./std";
import * as List from "./list";
import * as MathLib from "./math";
import * as BooleanLib from "./boolean";
import { createLibraryTester } from "./test-utils";

createLibraryTester(List, "List Library", (test) => {
  const TEST_OPS = createOpcodeRegistry(Core, List, MathLib, BooleanLib);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      caller: { id: 1 } as any,
      this: { id: 2 } as any,
      ops: TEST_OPS,
    });
  });

  test("list.new", async () => {
    expect(await evaluate(List.listNew(1, 2, 3), ctx)).toEqual([1, 2, 3]);
  });

  test("list.len", async () => {
    expect(await evaluate(List.listLen(List.listNew(1, 2, 3)), ctx)).toBe(3);
    expect(await evaluate(List.listLen(List.listNew()), ctx)).toBe(0);
  });

  test("list.empty", async () => {
    expect(await evaluate(List.listEmpty(List.listNew()), ctx)).toBe(true);
    expect(await evaluate(List.listEmpty(List.listNew(1)), ctx)).toBe(false);
  });

  test("list.get", async () => {
    expect(await evaluate(List.listGet(List.listNew(10, 20), 1), ctx)).toBe(20);
    expect(await evaluate(List.listGet(List.listNew(10, 20), 5), ctx)).toBe(undefined);
  });

  test("list.set", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core.let("l", List.listNew(1, 2, 3)), localCtx);
    await evaluate(List.listSet(Core.var("l"), 1, 99), localCtx);
    expect(await evaluate(Core.var("l"), localCtx)).toEqual([1, 99, 3]);
  });

  test("list.push", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core.let("l", List.listNew(1, 2)), localCtx);

    expect(await evaluate(List.listPush(Core.var("l"), 3), localCtx)).toBe(3); // Returns new length
    expect(await evaluate(Core.var("l"), localCtx)).toEqual([1, 2, 3]);
  });

  test("list.pop", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core.let("l", List.listNew(1, 2, 3)), localCtx);

    expect(await evaluate(List.listPop(Core.var("l")), localCtx)).toBe(3); // Returns popped value
    expect(await evaluate(Core.var("l"), localCtx)).toEqual([1, 2]);
  });

  test("list.unshift", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core.let("l", List.listNew(2, 3)), localCtx);

    expect(await evaluate(List.listUnshift(Core.var("l"), 1), localCtx)).toBe(3);
    expect(await evaluate(Core.var("l"), localCtx)).toEqual([1, 2, 3]);
  });

  test("list.shift", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core.let("l", List.listNew(1, 2, 3)), localCtx);

    expect(await evaluate(List.listShift(Core.var("l")), localCtx)).toBe(1);
    expect(await evaluate(Core.var("l"), localCtx)).toEqual([2, 3]);
  });

  test("list.slice", async () => {
    const list = [1, 2, 3, 4, 5];
    // list.slice returns a new list
    expect(await evaluate(List.listSlice(List.listNew(...list), 1, 3), ctx)).toEqual([2, 3]);
  });

  test("list.splice", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core.let("l", List.listNew(1, 2, 3, 4)), localCtx);

    // Remove 2 elements starting at index 1, insert 99
    const removed = await evaluate(List.listSplice(Core.var("l"), 1, 2, 99), localCtx);
    expect(removed).toEqual([2, 3]);
    expect(await evaluate(Core.var("l"), localCtx)).toEqual([1, 99, 4]);
  });

  test("list.concat", async () => {
    expect(await evaluate(List.listConcat(List.listNew(1), List.listNew(2)), ctx)).toEqual([1, 2]);
  });

  test("list.includes", async () => {
    expect(await evaluate(List.listIncludes(List.listNew(1, 2), 2), ctx)).toBe(true);
    expect(await evaluate(List.listIncludes(List.listNew(1, 2), 3), ctx)).toBe(false);
  });

  test("list.reverse", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core.let("l", List.listNew(1, 2, 3)), localCtx);
    await evaluate(List.listReverse(Core.var("l")), localCtx);
    expect(await evaluate(Core.var("l"), localCtx)).toEqual([3, 2, 1]);
  });

  test("list.sort", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core.let("l", List.listNew("b", "a", "c")), localCtx);
    await evaluate(List.listSort(Core.var("l")), localCtx);
    expect(await evaluate(Core.var("l"), localCtx)).toEqual(["a", "b", "c"]);
  });

  test("list.find", async () => {
    const gt1 = Core.lambda(["x"], BooleanLib.gt(Core.var("x"), 1));
    expect(await evaluate(List.listFind(List.listNew(1, 2, 3), gt1), ctx)).toBe(2);
  });

  // HOF tests
  test("list.map", async () => {
    const inc = Core.lambda(["x"], MathLib.add(Core.var("x"), 1));
    expect(await evaluate(List.listMap(List.listNew(1, 2, 3), inc), ctx)).toEqual([2, 3, 4]);
  });

  test("list.filter", async () => {
    // (lambda (x) (> x 1))
    const gt1 = Core.lambda(["x"], BooleanLib.gt(Core.var("x"), 1));
    expect(await evaluate(List.listFilter(List.listNew(1, 2, 3), gt1), ctx)).toEqual([2, 3]);
  });

  test("list.reduce", async () => {
    // (lambda (acc x) (+ acc x))
    const sum = Core.lambda(["acc", "x"], MathLib.add(Core.var("acc"), Core.var("x")));
    expect(await evaluate(List.listReduce(List.listNew(1, 2, 3), sum, 0), ctx)).toBe(6);
  });

  test("list.flatMap", async () => {
    // (lambda (x) (list x (+ x 1)))
    const dup = Core.lambda(["x"], List.listNew(Core.var("x"), MathLib.add(Core.var("x"), 1)));
    expect(await evaluate(List.listFlatMap(List.listNew(1, 3), dup), ctx)).toEqual([1, 2, 3, 4]);
  });
});
