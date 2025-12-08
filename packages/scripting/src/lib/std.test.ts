// oxlint-disable id-length
import * as BooleanLib from "../lib/boolean";
import * as ListLib from "../lib/list";
import * as MathLib from "../lib/math";
import * as StdLib from "../lib/std";
import { createOpcodeRegistry, createScriptContext, evaluate } from "../interpreter";
import { expect, mock } from "bun:test";
import { createLibraryTester } from "./test-utils";

const TEST_OPS = createOpcodeRegistry(StdLib, ListLib, MathLib, BooleanLib);

createLibraryTester(StdLib, "Standard Library", (test) => {
  const ctx = createScriptContext({
    args: [10, "a"],
    caller: { id: 1 },
    ops: TEST_OPS,
    this: { id: 2 },
  });

  // Values
  test("std.this", () => {
    expect(evaluate(StdLib.this(), ctx)).toEqual({ id: 2 });
  });

  // Numbers
  test("std.int", () => {
    expect(evaluate(StdLib.int("123"), ctx)).toBe(123);
    expect(evaluate(StdLib.int("101", 2), ctx)).toBe(5);
    expect(evaluate(StdLib.int("invalid"), ctx)).toBeNaN();
  });

  test("std.float", () => {
    expect(evaluate(StdLib.float("1.5"), ctx)).toBe(1.5);
    expect(evaluate(StdLib.float("invalid"), ctx)).toBeNaN();
  });

  test("std.number", () => {
    expect(evaluate(StdLib.number("123"), ctx)).toBe(123);
    expect(evaluate(StdLib.number("1.5"), ctx)).toBe(1.5);
    expect(evaluate(StdLib.number(true), ctx)).toBe(1);
    expect(evaluate(StdLib.number(false), ctx)).toBe(0);
  });

  test("std.caller", () => {
    expect(evaluate(StdLib.caller(), ctx)).toEqual({ id: 1 });
  });

  // Control Flow
  test("std.seq", () => {
    expect(evaluate(StdLib.seq(1, 2, 3), ctx)).toBe(3);
  });

  test("std.if", () => {
    expect(evaluate(StdLib.if(true, 1, 2), ctx)).toBe(1);
    expect(evaluate(StdLib.if(false, 1, 2), ctx)).toBe(2);
    expect(evaluate(StdLib.if(false, 1), ctx)).toBe(null);
  });

  test("std.while", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(StdLib.let("i", 0), localCtx);
    evaluate(
      StdLib.while(
        BooleanLib.lt(StdLib.var("i"), 3),
        StdLib.set("i", MathLib.add(StdLib.var("i"), 1)),
      ),
      localCtx,
    );
    expect(evaluate(StdLib.var("i"), localCtx)).toBe(3);
  });

  test("std.for", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(StdLib.let("sum", 0), localCtx);
    evaluate(
      StdLib.for(
        "x",
        ListLib.listNew(1, 2, 3),
        StdLib.set("sum", MathLib.add(StdLib.var("sum"), StdLib.var("x"))),
      ),
      localCtx,
    );
    expect(evaluate(StdLib.var("sum"), localCtx)).toBe(6);
  });

  test("std.break", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(StdLib.let("i", 0), localCtx);
    evaluate(
      StdLib.while(
        BooleanLib.lt(StdLib.var("i"), 10),
        StdLib.seq(StdLib.set("i", MathLib.add(StdLib.var("i"), 1)), StdLib.break()),
      ),
      localCtx,
    );
    expect(evaluate(StdLib.var("i"), localCtx)).toBe(1);
  });

  test("std.continue", () => {
    const localCtx = { ...ctx, locals: {} };
    evaluate(StdLib.let("i", 0), localCtx);
    evaluate(StdLib.let("sum", 0), localCtx);
    evaluate(
      StdLib.while(
        BooleanLib.lt(StdLib.var("i"), 5),
        StdLib.seq(
          StdLib.set("i", MathLib.add(StdLib.var("i"), 1)),
          StdLib.if(BooleanLib.eq(MathLib.mod(StdLib.var("i"), 2), 0), StdLib.continue()),
          StdLib.set("sum", MathLib.add(StdLib.var("sum"), 1)),
        ),
      ),
      localCtx,
    );
    // i goes 1, 2, 3, 4, 5.
    // loops when i < 5.
    // Iteration 1: i=1. set i=1. if(1%2==0) false. sum+=1. sum=1.
    // Iteration 2: i=1. lt(1,5) true.
    // Wait, let's trace carefully.
    // init i=0, sum=0.
    // Loop check: 0 < 5. True.
    // Body:
    //   i = 0 + 1 = 1.
    //   if (1 % 2 == 0) -> false.
    //   sum = 0 + 1 = 1.
    // Loop check: 1 < 5. True.
    // Body:
    //   i = 1 + 1 = 2.
    //   if (2 % 2 == 0) -> true. CONTINUE.
    // Loop check: 2 < 5. True.
    // Body:
    //   i = 2 + 1 = 3.
    //   if (3 % 2 == 0) -> false.
    //   sum = 1 + 1 = 2.
    // Loop check: 3 < 5. True.
    // Body:
    //   i = 3 + 1 = 4.
    //   if (4 % 2 == 0) -> true. CONTINUE.
    // Loop check: 4 < 5. True.
    // Body:
    //   i = 4 + 1 = 5.
    //   if (5 % 2 == 0) -> false.
    //   sum = 2 + 1 = 3.
    // Loop check: 5 < 5. False.
    // Result sum = 3.
    // Correct.
    expect(evaluate(StdLib.var("sum"), localCtx)).toBe(3);
  });

  test("std.return", () => {
    const localCtx = { ...ctx, locals: {} };
    expect(evaluate(StdLib.return("val"), localCtx) as any).toBe("val");
  });

  // Data Structures
  test("json.stringify", () => {
    expect(evaluate(StdLib.jsonStringify({ a: 1 }), ctx)).toBe('{"a":1}');
  });

  test("json.parse", () => {
    expect(evaluate(StdLib.jsonParse('{"a":1}'), ctx)).toEqual({
      a: 1,
    });
    expect(() => evaluate(StdLib.jsonParse("invalid"), ctx)).toThrow();
  });

  // Variables
  test("std.let", () => {
    const localCtx = { ...ctx, locals: {} };
    expect(evaluate(StdLib.let("x", 10), localCtx)).toBe(10);
    expect(localCtx.vars?.["x"]).toBe(10);
  });

  test("std.var", () => {
    const localCtx = { ...ctx, locals: {}, vars: { x: 10 } };
    expect(evaluate(StdLib.var("x"), localCtx)).toBe(10);
    expect(evaluate(StdLib.var("y"), localCtx)).toBe(null);
  });

  test("std.set", () => {
    const localCtx = { ...ctx, locals: {}, vars: { x: 10 } };
    expect(evaluate(StdLib.set("x", 20), localCtx)).toBe(20);
    expect(localCtx.vars?.x).toBe(20);
  });

  // Arithmetic

  test("std.typeof", () => {
    expect(evaluate(StdLib.typeof(1), ctx)).toBe("number");
    expect(evaluate(StdLib.typeof("s"), ctx)).toBe("string");
    expect(evaluate(StdLib.typeof(true), ctx)).toBe("boolean");
    expect(evaluate(StdLib.typeof({}), ctx)).toBe("object");
    expect(evaluate(StdLib.typeof(ListLib.listNew()), ctx)).toBe("array");
    expect(evaluate(StdLib.typeof(null), ctx)).toBe("null");
  });

  test("std.string", () => {
    expect(evaluate(StdLib.string(123), ctx)).toBe("123");
    expect(evaluate(StdLib.string(true), ctx)).toBe("true");
    expect(evaluate(StdLib.string(null), ctx)).toBe("null");
  });

  test("std.boolean", () => {
    expect(evaluate(StdLib.boolean(1), ctx)).toBe(true);
    expect(evaluate(StdLib.boolean(0), ctx)).toBe(false);
    expect(evaluate(StdLib.boolean("true"), ctx)).toBe(true);
    expect(evaluate(StdLib.boolean(""), ctx)).toBe(false);
    expect(evaluate(StdLib.boolean(null), ctx)).toBe(false);
  });

  // System
  test("std.log", () => {
    const originalConsoleLog = console.log;
    const mockConsoleLog = mock(() => {});
    console.log = mockConsoleLog;
    // Mock console.log? Or just ensure it runs without error
    evaluate(StdLib.log("hello"), ctx);
    console.log = originalConsoleLog;
    expect(mockConsoleLog).toHaveBeenCalledWith("hello");
  });

  test("std.arg", () => {
    expect(evaluate(StdLib.arg(0), ctx)).toBe(10);
    expect(evaluate(StdLib.arg(1), ctx)).toBe("a");
    expect(evaluate(StdLib.arg(2), ctx)).toBe(null);
  });

  test("std.args", () => {
    expect(evaluate(StdLib.args(), ctx)).toEqual([10, "a"]);
  });

  test("std.warn", () => {
    evaluate(StdLib.warn("warning"), ctx);
    expect(ctx.warnings).toContain("warning");
  });

  test("std.throw", () => {
    expect(() => evaluate(StdLib.throw("error"), ctx)).toThrow("error");
  });

  test("std.try", () => {
    expect(evaluate(StdLib.try(StdLib.throw("oops"), "err", StdLib.var("err")), ctx)).toBe("oops");

    expect(evaluate(StdLib.try(123, "err", 456), ctx)).toBe(123);
  });

  test("std.call_method", () => {
    const result = evaluate(StdLib.callMethod({ foo: (num: number) => num * 2 }, "foo", 21), ctx);
    expect(result).toBe(42);
  });

  test("std.lambda", () => {
    const l = evaluate(StdLib.lambda(["x"], StdLib.var("x")), ctx);
    expect(l.type).toBe("lambda");
  });

  test("std.apply", () => {
    const l = evaluate(StdLib.lambda(["x"], StdLib.var("x")), ctx);
    expect(evaluate(StdLib.apply(l, 123), ctx)).toBe(123);
  });

  test("send", () => {
    // We mocked send in ctx, just check it doesn't crash
    evaluate(StdLib.send("message", "hello"), ctx);
  });

  test("std.quote", () => {
    expect(evaluate(StdLib.quote([1, 2, 3]), ctx)).toEqual([1, 2, 3]);
    expect(evaluate(StdLib.quote("hello"), ctx)).toBe("hello");
  });
});
