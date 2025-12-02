import { describe, test, expect, beforeAll } from "bun:test";
import {
  evaluate,
  ScriptContext,
  registerLibrary,
  ScriptError,
} from "./interpreter";
import * as Std from "./lib/std";
import * as ObjectLib from "./lib/object";
import * as List from "./lib/list";
import * as StringLib from "./lib/string";
import * as MathLib from "./lib/math";
import * as BooleanLib from "./lib/boolean";
import { Entity } from "@viwo/shared/jsonrpc";

describe("Interpreter", () => {
  beforeAll(() => {
    registerLibrary(Std);
    registerLibrary(ObjectLib);
    registerLibrary(List);
    registerLibrary(StringLib);
    registerLibrary(MathLib);
    registerLibrary(BooleanLib);
  });

  const caller: Entity = { id: 1 };
  const target: Entity = { id: 2 };
  target["owner"] = 1;

  const ctx = {
    caller,
    this: target,
    args: [],
    gas: 1000,
    warnings: [],
    vars: {},
    stack: [],
  } satisfies ScriptContext;

  test("literals", async () => {
    expect(await evaluate(1, ctx)).toBe(1);
    expect(await evaluate("hello", ctx)).toBe("hello");
    expect(await evaluate(true, ctx)).toBe(true);
  });

  test("math", async () => {
    expect(await evaluate(MathLib["+"](1, 2), ctx)).toBe(3);
    expect(await evaluate(MathLib["-"](5, 3), ctx)).toBe(2);
    expect(await evaluate(MathLib["*"](2, 3), ctx)).toBe(6);
    expect(await evaluate(MathLib["/"](6, 2), ctx)).toBe(3);
  });

  test("math extended", async () => {
    expect(await evaluate(MathLib["%"](10, 3), ctx)).toBe(1);
    expect(await evaluate(MathLib["^"](2, 3), ctx)).toBe(8);
  });

  test("logic", async () => {
    expect(await evaluate(BooleanLib["and"](true, true), ctx)).toBe(true);
    expect(await evaluate(BooleanLib["or"](true, false), ctx)).toBe(true);
    expect(await evaluate(BooleanLib["not"](true), ctx)).toBe(false);
    expect(await evaluate(BooleanLib["=="](1, 1), ctx)).toBe(true);
    expect(await evaluate(BooleanLib[">"](2, 1), ctx)).toBe(true);
  });

  test("variables", async () => {
    const localCtx = { ...ctx, vars: {} };
    await evaluate(Std["let"]("x", 10), localCtx);
    expect(await evaluate(Std["var"]("x"), localCtx)).toBe(10);
  });

  test("control flow", async () => {
    expect(await evaluate(Std["if"](true, 1, 2), ctx)).toBe(1);
    expect(await evaluate(Std["if"](false, 1, 2), ctx)).toBe(2);

    expect(await evaluate(Std["seq"](1, 2, 3), ctx)).toBe(3);
  });

  test("gas limit", async () => {
    const lowGasCtx = { ...ctx, gas: 2 };
    // seq (1) + let (1) + let (1) = 3 ops -> should fail
    const script = Std["seq"](Std["let"]("a", 1), Std["let"]("b", 2));

    // We expect it to throw
    let error;
    try {
      await evaluate(script, lowGasCtx);
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect((error as Error).message).toContain("Script ran out of gas!");
  });

  test("loops", async () => {
    // sum = 0; for x in [1, 2, 3]: sum += x
    const script = Std["seq"](
      Std["let"]("sum", 0),
      Std["for"](
        "x",
        List["list.new"](1, 2, 3),
        Std["let"]("sum", MathLib["+"](Std["var"]("sum"), Std["var"]("x"))),
      ),
      Std["var"]("sum"),
    );
    expect(await evaluate(script, ctx)).toBe(6);
  });

  test("errors", async () => {
    // Unknown opcode
    try {
      // @ts-expect-error
      await evaluate(["unknown_op"], ctx);
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toContain("Unknown opcode: unknown_op");
    }
  });

  test("comparisons", async () => {
    expect(await evaluate(BooleanLib["!="](1, 2), ctx)).toBe(true);
    expect(await evaluate(BooleanLib["<"](1, 2), ctx)).toBe(true);
    expect(await evaluate(BooleanLib[">="](2, 2), ctx)).toBe(true);
    expect(await evaluate(BooleanLib["<="](2, 2), ctx)).toBe(true);
  });

  test("if else", async () => {
    expect(await evaluate(Std["if"](false, "then", "else"), ctx)).toBe("else");
    expect(await evaluate(Std["if"](false, "then"), ctx)).toBe(null); // No else branch
  });

  test("var retrieval", async () => {
    const localCtx = { ...ctx, vars: { x: 10 } };
    expect(await evaluate(Std["var"]("x"), localCtx)).toBe(10);
    expect(await evaluate(Std["var"]("missing"), localCtx)).toBe(null); // Variable not found
  });
});

describe("Interpreter Errors and Warnings", () => {
  beforeAll(() => {
    registerLibrary(Std);
  });

  const ctx: ScriptContext = {
    caller: { id: 1 },
    this: { id: 2 },
    args: [],
    gas: 1000,
    warnings: [],
    vars: {},
    stack: [],
  };

  test("throw", async () => {
    try {
      await evaluate(Std["throw"]("Something went wrong"), ctx);
      expect(true).toBe(false); // Should not reach here
    } catch (e: any) {
      expect(e.message).toBe("Something went wrong");
    }
  });

  test("try/catch", async () => {
    // try { throw "error" } catch { return "caught" }
    const script = Std["try"](
      Std["throw"]("oops"),
      "this should be unused", // No error var
      "caught",
    );
    expect(await evaluate(script, ctx)).toBe("caught");
  });

  test("try/catch with error variable", async () => {
    // try { throw "error" } catch(e) { return e }
    const localCtx = { ...ctx, vars: {} };
    const script = Std["try"](Std["throw"]("oops"), "err", Std["var"]("err"));
    expect(await evaluate(script, localCtx)).toBe("oops");
  });

  test("try/catch no error", async () => {
    // try { return "ok" } catch { return "bad" }
    const script = Std["try"]("ok", "this should be unused", "bad");
    expect(await evaluate(script, ctx)).toBe("ok");
  });

  test("warn", async () => {
    const warnings: string[] = [];
    const localCtx = { ...ctx, warnings };
    await evaluate(Std["warn"]("Be careful"), localCtx);
    expect(localCtx.warnings).toContain("Be careful");
  });

  test("nested try/catch", async () => {
    const script = Std["try"](
      Std["try"](
        Std["throw"]("inner"),
        "this should be unused", // No error var
        Std["throw"]("outer"),
      ),
      "e",
      Std["var"]("e"),
    );
    expect(await evaluate(script, { ...ctx, vars: {} })).toBe("outer");
  });
});

describe("Interpreter Libraries", () => {
  const ctx: ScriptContext = {
    caller: { id: 1 },
    this: { id: 2 },
    args: [],
    gas: 1000,
    warnings: [],
    vars: {},
    stack: [],
  };

  beforeAll(() => {
    registerLibrary(Std);
    registerLibrary(StringLib);
    registerLibrary(List);
    registerLibrary(ObjectLib);
    registerLibrary(MathLib);
  });

  describe("Lambda & HOF", () => {
    test("lambda & apply", async () => {
      // (lambda (x) (+ x 1))
      const inc = Std["lambda"](["x"], MathLib["+"](Std["var"]("x"), 1));
      expect(await evaluate(Std["apply"](inc, 1), ctx)).toBe(2);
    });

    test("closure capture", async () => {
      // (let x 10); (let addX (lambda (y) (+ x y))); (apply addX 5) -> 15
      expect(
        await evaluate(
          Std["seq"](
            Std["let"]("x", 10),
            Std["let"](
              "addX",
              Std["lambda"](
                ["y"],
                MathLib["+"](Std["var"]("x"), Std["var"]("y")),
              ),
            ),
            Std["apply"](Std["var"]("addX"), 5),
          ),
          ctx,
        ),
      ).toBe(15);
    });
  });
});

describe("Interpreter Stack Traces", () => {
  beforeAll(() => {
    registerLibrary(Std);
    registerLibrary(MathLib);
  });

  const ctx: ScriptContext = {
    caller: { id: 1 },
    this: { id: 2 },
    args: [],
    gas: 1000,
    warnings: [],
    vars: {},
    stack: [],
  };

  test("stack trace in lambda", async () => {
    // (let fail (lambda () (throw "boom")))
    // (apply fail)
    const script = Std["seq"](
      Std["let"]("fail", Std["lambda"]([], Std["throw"]("boom"))),
      Std["apply"](Std["var"]("fail")),
    );

    try {
      await evaluate(script, ctx);
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeInstanceOf(ScriptError);
      expect(e.message).toBe("boom");
      expect(e.stackTrace).toHaveLength(1);
      expect(e.stackTrace[0].name).toBe("<lambda>");
    }
  });

  test("nested stack trace", async () => {
    // (let inner (lambda () (throw "boom")))
    // (let outer (lambda () (apply inner)))
    // (apply outer)
    const script = Std["seq"](
      Std["let"]("inner", Std["lambda"]([], Std["throw"]("boom"))),
      Std["let"]("outer", Std["lambda"]([], Std["apply"](Std["var"]("inner")))),
      Std["apply"](Std["var"]("outer")),
    );

    try {
      await evaluate(script, ctx);
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeInstanceOf(ScriptError);
      expect(e.message).toBe("boom");
      expect(e.stackTrace).toHaveLength(2);
      expect(e.stackTrace[0].name).toBe("<lambda>"); // outer
      expect(e.stackTrace[1].name).toBe("<lambda>"); // inner
    }
  });

  test("opcode error context", async () => {
    // (+ 1 "string") -> should fail
    const script = MathLib["+"](1, "string" as any);

    try {
      await evaluate(script, ctx);
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeInstanceOf(ScriptError);
      // The error comes from the opcode itself, but since it's a primitive call
      // without call/apply, it might not have a stack frame unless we wrapped it.
      // In my implementation, I only push stack frames in call/apply.
      // However, evaluate() catches errors and appends the current stack.
      // Since the stack is empty, it should be empty.
      expect(e.stackTrace).toHaveLength(0);
      expect(e.context).toBeDefined();
      expect(e.context.op).toBe("+");
      expect(e.context.args).toEqual([1, "string"]);
    }
  });
});
