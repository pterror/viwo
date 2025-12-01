import { describe, test, expect } from "bun:test";
import { evaluate, registerLibrary, ScriptContext } from "./interpreter";
import * as Core from "./lib/core";

const ctx: ScriptContext = {
  caller: { id: 1 },
  this: { id: 2 },
  args: [],
  gas: 1000,
  warnings: [],
  vars: {},
};

describe("Interpreter Errors and Warnings", () => {
  registerLibrary(Core);

  test("throw", async () => {
    try {
      await evaluate(Core["throw"]("Something went wrong"), ctx);
      expect(true).toBe(false); // Should not reach here
    } catch (e: any) {
      expect(e.message).toBe("Something went wrong");
    }
  });

  test("try/catch", async () => {
    // try { throw "error" } catch { return "caught" }
    const script = Core["try"](
      Core["throw"]("oops"),
      "this should be unused", // No error var
      "caught",
    );
    expect(await evaluate(script, ctx)).toBe("caught");
  });

  test("try/catch with error variable", async () => {
    // try { throw "error" } catch(e) { return e }
    const localCtx = { ...ctx, locals: {} };
    const script = Core["try"](
      Core["throw"]("oops"),
      "err",
      Core["var"]("err"),
    );
    expect(await evaluate(script, localCtx)).toBe("oops");
  });

  test("try/catch no error", async () => {
    // try { return "ok" } catch { return "bad" }
    const script = Core["try"]("ok", "this should be unused", "bad");
    expect(await evaluate(script, ctx)).toBe("ok");
  });

  test("warn", async () => {
    const warnings: string[] = [];
    const localCtx = { ...ctx, warnings };
    await evaluate(Core["warn"]("Be careful"), localCtx);
    expect(localCtx.warnings).toContain("Be careful");
  });

  test("nested try/catch", async () => {
    const script = Core["try"](
      Core["try"](
        Core["throw"]("inner"),
        "this should be unused", // No error var
        Core["throw"]("outer"),
      ),
      "e",
      Core["var"]("e"),
    );
    expect(await evaluate(script, { ...ctx, vars: {} })).toBe("outer");
  });
});
