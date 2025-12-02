import { expect, beforeEach, mock } from "bun:test";
import {
  evaluate,
  ScriptContext,
  registerLibrary,
  createScriptContext,
  ListLib as List,
  createLibraryTester,
  ScriptError,
  StdLib as Std,
} from "@viwo/scripting";
import * as Core from "./core";

// Mock repo functions
mock.module("../../repo", () => ({
  createEntity: () => 100,
  deleteEntity: () => {},
  getEntity: (id: number) => ({ id, props: {} }),
  getPrototypeId: () => null,
  getVerbs: (id: number) => {
    if (id === 101) {
      return [{ name: "get_dynamic", code: "resolved_value" }];
    }
    return [];
  },
  setPrototypeId: () => {},
  updateEntity: () => {},
  getVerb: (id: number, name: string) => {
    if (id === 101 && name === "get_dynamic") {
      return {
        id: 1,
        entity_id: 101,
        name: "get_dynamic",
        code: "resolved_value",
        permissions: {},
      };
    }
    if (id === 102 && name === "fail") {
      return {
        id: 2,
        entity_id: 102,
        name: "fail",
        code: Std["throw"]("verb failed"),
        permissions: {},
      };
    }
    if (id === 103 && name === "say_hello") {
      return {
        id: 3,
        entity_id: 103,
        name: "say_hello",
        code: ["test.send", "message", "Hello!"],
        permissions: {},
      };
    }
    return null;
  },
}));

// Mock scheduler
mock.module("../../scheduler", () => ({
  scheduler: {
    schedule: () => {},
  },
}));

createLibraryTester(Core, "Core Library", (test) => {
  registerLibrary(Core);
  registerLibrary(List);
  registerLibrary(Std);

  // Register a test library to allow side effects (sending messages)
  const TestLib = {
    "test.send": {
      metadata: { label: "Test Send", category: "test" } as any,
      handler: async (args: any[], ctx: ScriptContext) => {
        if (ctx.send) {
          ctx.send(args[0], args[1]);
        }
        return null;
      },
    },
  };
  registerLibrary(TestLib);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      caller: { id: 1 } as any,
      this: { id: 2 } as any,
      args: [10, 20],
      send: () => {},
      warnings: [],
    });
  });

  // Entity Interaction
  test("create", async () => {
    expect(await evaluate(Core["create"]({}), ctx)).toBe(100);
  });

  test("destroy", async () => {
    await evaluate(Core["destroy"]({ id: 1 }), ctx);
  });

  test("call", async () => {
    // Mock getVerb to return something executable
    expect(evaluate(Core["call"]({ id: 1 }, "missing"), ctx)).rejects.toThrow();
  });

  test("call stack trace", async () => {
    try {
      await evaluate(Core["call"]({ id: 102 }, "fail"), ctx);
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeInstanceOf(ScriptError);
      expect(e.message).toBe("verb failed");
      expect(e.stackTrace).toHaveLength(1);
      expect(e.stackTrace[0].name).toBe("fail");
    }
  });

  test("schedule", async () => {
    await evaluate(Core["schedule"]("verb", List["list.new"](), 100), ctx);
  });

  // Entity Introspection
  test("verbs", async () => {
    expect(await evaluate(Core["verbs"]({ id: 1 }), ctx)).toEqual([]);
  });

  test("get_verb", async () => {
    // Mock returns a verb for id 101
    expect(
      await evaluate(Core["get_verb"]({ id: 101 }, "get_dynamic"), ctx),
    ).toEqual({
      id: 1,
      entity_id: 101,
      name: "get_dynamic",
      code: "resolved_value",
      permissions: {},
    });
    // Mock returns null for id 1
    expect(await evaluate(Core["get_verb"]({ id: 1 }, "missing"), ctx)).toBe(
      null,
    );
  });

  test("entity", async () => {
    expect(await evaluate(Core["entity"](1), ctx)).toEqual({
      id: 1,
      props: {},
    });
  });

  test("set_entity", async () => {
    await evaluate(Core["set_entity"]({ id: 1 }), ctx);
  });

  test("get_prototype", async () => {
    expect(await evaluate(Core["get_prototype"]({ id: 1 }), ctx)).toBe(null);
  });

  test("set_prototype", async () => {
    await evaluate(Core["set_prototype"]({ id: 1 }, 2), ctx);
  });

  test("resolve_props", async () => {
    expect(await evaluate(Core["resolve_props"]({ id: 101 }), ctx)).toEqual({
      id: 101,
      dynamic: "resolved_value",
    });
  });

  test("sudo", async () => {
    // 1. Deny if not system/bot
    const userCtx = createScriptContext({
      caller: { id: 100 } as any,
      this: { id: 100 } as any,
      args: [],
      send: () => {},
    });
    expect(
      evaluate(
        Core["sudo"]({ id: 101 }, "get_dynamic", List["list.new"]()),
        userCtx,
      ),
    ).rejects.toThrow("permission denied");

    // 2. Allow if System (ID 3)
    const systemCtx = createScriptContext({
      caller: { id: 3 } as any,
      this: { id: 3 } as any,
      args: [],
      send: () => {},
    });
    expect(
      await evaluate(
        Core["sudo"]({ id: 101 }, "get_dynamic", List["list.new"]()),
        systemCtx,
      ),
    ).toBe("resolved_value");

    // 3. Allow if Bot (ID 4)
    const botCtx = createScriptContext({
      caller: { id: 4 } as any,
      this: { id: 4 } as any,
      args: [],
      send: () => {},
    });
    expect(
      await evaluate(
        Core["sudo"]({ id: 101 }, "get_dynamic", List["list.new"]()),
        botCtx,
      ),
    ).toBe("resolved_value");

    // 4. Verify message forwarding for Bot
    let sentMessage: any = null;
    const botForwardCtx = createScriptContext({
      caller: { id: 4 } as any,
      this: { id: 4 } as any,
      args: [],
      send: (type, payload) => {
        sentMessage = { type, payload };
      },
    });

    // Call 'say_hello' on entity 103 via sudo
    // The 'say_hello' verb (mocked above) calls send("message", "Hello!")
    // We expect this to be forwarded as:
    // type: "forward"
    // payload: { target: 103, type: "message", payload: "Hello!" }

    // Note: The mock for 'say_hello' uses a raw AST structure which might not be directly executable by 'evaluate'
    // if 'evaluate' expects compiled opcodes or a specific structure.
    // However, looking at 'get_dynamic', it returns "resolved_value" which is a string.
    // The 'fail' verb returns Std["throw"]...
    // We need to make sure 'say_hello' returns something that calls 'send'.
    // Since we can't easily construct a full AST here without importing more,
    // let's rely on the fact that we can pass a custom function as code if the evaluator supports it,
    // OR we can use a simple opcode if available.
    // But wait, the mock returns 'code'. 'evaluate' takes this code.
    // If 'evaluate' handles AST objects, we are good.
    // Let's assume we can use a simple function if the evaluator allows it, or we need to construct a valid AST.
    // Given the imports, we don't have 'call' opcode readily available to construct AST.
    // Let's try to use a simpler approach: Mock 'getVerb' to return a function as code?
    // 'evaluate' in 'viwo/scripting' usually handles ASTs.
    // Let's check 'get_dynamic' again. It returns "resolved_value". This implies 'evaluate' can handle primitive values.
    // If we want side effects (send), we need an opcode.
    // Let's use a mocked opcode or just assume the AST I wrote above works if 'call' is a standard opcode.
    // But 'call' is defined in this file's module 'Core'.
    // So we can use Core["call"]... but that's for calling verbs.
    // We want to call the 'send' function from the context.
    // There is no standard opcode exposed here to call 'send' directly unless we use a specific library.
    // Actually, 'StdLib' might have 'print' or similar.
    // Let's check imports. 'StdLib as Std'.
    // Let's see if we can use a custom opcode for testing or if we can use 'Core.sudo' recursively? No.
    // Let's look at how 'fail' is defined: Std["throw"]("verb failed").
    // This suggests we can use library functions to generate AST/Opcodes.
    // Does Std have a 'print' or 'send'?
    // If not, we might need to define a temporary opcode or use a different approach.
    // Let's try to define a 'send_message' opcode in the mock? No, we can't easily extend the library in the mock.

    // Alternative: Use a spy on the context's send function and verify it was called with the right arguments.
    // But we need the code to actually trigger it.
    // Let's assume for this test that we can use a dummy AST that the evaluator will process,
    // OR we can use `Core.create` or something that is available.
    // Wait, `Core` is what we are testing.
    // Let's look at `Core.test.ts` imports again.
    // We have `Core`, `List`, `Std`.
    // Maybe we can use `Std.print`?
    // If `Std.print` calls `ctx.send`, we are good.
    // Let's assume `Std.print` exists and uses `ctx.send`.
    // If not, we might need to find another way.
    // Let's check `packages/core/src/runtime/lib/core.ts` again... it imports `StdLib`.
    // Let's assume `StdLib` has `print`.

    // Let's try to use a custom function as 'code' if evaluate supports it.
    // If not, we might fail.
    // Let's look at `evaluate` signature. `evaluate(script: ScriptValue<T>, ctx: ScriptContext): Promise<T>`.
    // If script is a function, it executes it?
    // If so, we can just pass `(ctx) => ctx.send(...)`.
    // Let's try that.
    await evaluate(
      Core["sudo"]({ id: 103 }, "say_hello", List["list.new"]()),
      botForwardCtx,
    );

    expect(sentMessage).toEqual({
      type: "forward",
      payload: {
        target: 103,
        type: "message",
        payload: "Hello!",
      },
    });
  });
});
