import { describe, test, expect, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../schema";

// Setup in-memory DB
const db = new Database(":memory:");
initSchema(db);

// Mock the db module
mock.module("../db", () => ({ db }));

import {
  evaluate,
  ScriptContext,
  registerLibrary,
  ScriptError,
} from "./interpreter";
import * as Core from "./lib/core";
import * as Object from "./lib/object";
import * as List from "./lib/list";
import { beforeAll } from "bun:test";
import { createEntity } from "../repo";
import { Entity } from "@viwo/shared/jsonrpc";

const checkPermissionMock = mock(() => true);
mock.module("../permissions", () => ({
  checkPermission: checkPermissionMock,
}));

describe("Interpreter", () => {
  beforeAll(() => {
    registerLibrary(Core);
    registerLibrary(List);
  });

  const caller: Entity = { id: 1 };
  const target: Entity = { id: 2 };
  target["owner"] = 1;
  const sys = {
    move: mock(() => {}),
    create: mock(() => 3),
    destroy: mock(() => {}),
    send: mock(() => {}),
  } as any;

  const ctx = {
    caller,
    this: target,
    args: [],
    gas: 1000,
    sys,
    warnings: [],
    vars: {},
  } satisfies ScriptContext;

  test("literals", async () => {
    expect(await evaluate(1, ctx)).toBe(1);
    expect(await evaluate("hello", ctx)).toBe("hello");
    expect(await evaluate(true, ctx)).toBe(true);
  });

  test("math", async () => {
    expect(await evaluate(Core["+"](1, 2), ctx)).toBe(3);
    expect(await evaluate(Core["-"](5, 3), ctx)).toBe(2);
    expect(await evaluate(Core["*"](2, 3), ctx)).toBe(6);
    expect(await evaluate(Core["/"](6, 2), ctx)).toBe(3);
  });

  test("math extended", async () => {
    expect(await evaluate(Core["%"](10, 3), ctx)).toBe(1);
    expect(await evaluate(Core["^"](2, 3), ctx)).toBe(8);
  });

  test("logic", async () => {
    expect(await evaluate(Core["and"](true, true), ctx)).toBe(true);
    expect(await evaluate(Core["or"](true, false), ctx)).toBe(true);
    expect(await evaluate(Core["not"](true), ctx)).toBe(false);
    expect(await evaluate(Core["=="](1, 1), ctx)).toBe(true);
    expect(await evaluate(Core[">"](2, 1), ctx)).toBe(true);
  });

  test("variables", async () => {
    const localCtx = { ...ctx, locals: {} };
    await evaluate(Core["let"]("x", 10), localCtx);
    expect(await evaluate(Core["var"]("x"), localCtx)).toBe(10);
  });

  test("control flow", async () => {
    expect(await evaluate(Core["if"](true, 1, 2), ctx)).toBe(1);
    expect(await evaluate(Core["if"](false, 1, 2), ctx)).toBe(2);

    expect(await evaluate(Core["seq"](1, 2, 3), ctx)).toBe(3);
  });

  test("actions", async () => {
    await evaluate(Core["call"](Core["caller"](), "tell", "hello"), ctx);
    expect(sys.send).toHaveBeenCalledWith({ type: "message", text: "hello" });

    await evaluate(Core["call"](Core["this"](), "move", Core["caller"]()), ctx);
    expect(sys.move).toHaveBeenCalledWith(target.id, caller.id);

    await evaluate(Core["destroy"](Core["this"]()), ctx);
    expect(sys.destroy).toHaveBeenCalledWith(target.id);
  });

  test("gas limit", async () => {
    const lowGasCtx = { ...ctx, gas: 2 };
    // seq (1) + let (1) + let (1) = 3 ops -> should fail
    const script = Core["seq"](Core["let"]("a", 1), Core["let"]("b", 2));

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

  test("capabilities", async () => {
    // Insert target into DB so updateEntity works
    const targetId = createEntity({
      name: "Mock",
      foo: "bar",
      permissions: { view: "public", edit: "public" },
    });

    // prop
    expect(await evaluate(Object["obj.get"](Core["this"](), "foo"), ctx)).toBe(
      "bar",
    );

    // set_prop
    await evaluate(
      Core["set_entity"](Object["obj.set"](Core["this"](), "foo", "baz")),
      ctx,
    );

    // Verify DB update
    const row = db
      .query<{ props: string }, [targetId: number]>(
        "SELECT props FROM entity WHERE id = ?",
      )
      .get(targetId)!;
    const props = JSON.parse(row.props);
    expect(props.foo).toBe("baz");
  });

  test("loops", async () => {
    // for loop
    // sum = 0
    // for x in [1, 2, 3]: sum = sum + x
    const script = Core["seq"](
      Core["let"]("sum", 0),
      Core["for"](
        "x",
        List["list.new"](1, 2, 3),
        Core["let"]("sum", Core["+"](Core["var"]("sum"), Core["var"]("x"))),
      ),
      Core["var"]("sum"),
    );
    expect(await evaluate(script, ctx)).toBe(6);
  });

  test("create opcode", async () => {
    const ctxWithCreate = {
      ...ctx,
      sys: { ...ctx.sys, create: mock(() => 999) },
    };
    expect(
      await evaluate(Core["create"]({ name: "foo" }), ctxWithCreate as never),
    ).toBe(999);
    expect(ctxWithCreate.sys?.create).toHaveBeenCalled();
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

    // Permission denied (prop)
    checkPermissionMock.mockReturnValue(false);
    try {
      await evaluate(Object["obj.get"](Core["this"](), "foo"), ctx);
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toContain("permission denied");
    }
    checkPermissionMock.mockReturnValue(true); // Reset
  });

  test("comparisons", async () => {
    expect(await evaluate(Core["!="](1, 2), ctx)).toBe(true);
    expect(await evaluate(Core["<"](1, 2), ctx)).toBe(true);
    expect(await evaluate(Core[">="](2, 2), ctx)).toBe(true);
    expect(await evaluate(Core["<="](2, 2), ctx)).toBe(true);
  });

  test("if else", async () => {
    expect(await evaluate(Core["if"](false, "then", "else"), ctx)).toBe("else");
    expect(await evaluate(Core["if"](false, "then"), ctx)).toBe(null); // No else branch
  });

  test("var retrieval", async () => {
    const localCtx = { ...ctx, vars: { x: 10 } };
    expect(await evaluate(Core["var"]("x"), localCtx)).toBe(10);
    expect(await evaluate(Core["var"]("missing"), localCtx)).toBe(null); // Variable not found
  });

  test("permission errors", async () => {
    checkPermissionMock.mockReturnValue(false);

    // set_prop
    try {
      await evaluate(
        Core["set_entity"](Object["obj.set"](Core["this"](), "foo", "bar")),
        ctx,
      );
      throw new Error();
    } catch (e: any) {
      expect(e.message).toContain("permission denied");
    }

    // move
    try {
      await evaluate(Core["call"](Core["this"](), "move", Core["this"]()), ctx);
      throw new Error();
    } catch (e: any) {
      expect(e.message).toContain("permission denied");
    }

    // destroy
    try {
      await evaluate(Core["destroy"](Core["this"]()), ctx);
      throw new Error();
    } catch (e: any) {
      expect(e.message).toContain("permission denied");
    }

    checkPermissionMock.mockReturnValue(true);
  });

  test("tell other", async () => {
    // Should return null if target is not visible to the player
    expect(
      // TODO: get entity for `other`
      // @ts-expect-error
      await evaluate(Core["call"]("other", "tell", "msg"), ctx).catch((e) => e),
    ).toBeInstanceOf(ScriptError);
  });

  test("destroy fallback", async () => {
    // Mock sys without destroy but with move
    const { destroy: _, ...sysWithoutDestroy } = ctx.sys;
    const ctxFallback = { ...ctx, sys: sysWithoutDestroy };

    // Should return true (and do nothing/log? implementation has empty block)
    // We need to ensure permission check passes
    checkPermissionMock.mockReturnValue(true);
    // Should not error
    await evaluate(Core["destroy"](Core["this"]()), ctxFallback);
  });

  test("create missing sys", async () => {
    const { create: _, ...sysWithoutCreate } = ctx.sys;
    const ctxMissing = { ...ctx, sys: sysWithoutCreate };

    expect(
      await evaluate(Core["create"]({}), ctxMissing as never).catch((e) => e),
    ).toBeInstanceOf(ScriptError);
  });
});
