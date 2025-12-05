import { expect, beforeAll } from "bun:test";
import {
  evaluate,
  registerLibrary,
  createScriptContext,
  ListLib,
  ScriptError,
  StdLib,
} from "@viwo/scripting";
import { createLibraryTester } from "@viwo/scripting/test-utils";
import * as KernelLib from "./kernel";
import * as CoreLib from "./core";
import { addVerb, createCapability, createEntity, getEntity } from "../../repo";

registerLibrary(KernelLib);
registerLibrary(CoreLib);
registerLibrary(ListLib);
registerLibrary(StdLib);

createLibraryTester(CoreLib, "Core Library", (test) => {
  const ctx = createScriptContext({ caller: { id: 3 }, this: { id: 3 } });
  let id!: number;

  beforeAll(() => {
    id = createEntity({});
    ctx.caller.id = id;
    ctx.this.id = id;
    createCapability(id, "sys.create", {});
    createCapability(id, "entity.control", { "*": true });
    createCapability(id, "sys.sudo", {});
    createCapability(4, "sys.sudo", {});

    addVerb(101, "get_dynamic", "resolved_value");
  });

  // Entity Interaction
  test("create", () => {
    expect(evaluate(CoreLib.create(KernelLib.getCapability("sys.create"), {}), ctx)).toBeNumber();
  });

  test("destroy", () => {
    const id = createEntity({});
    evaluate(CoreLib.destroy(KernelLib.getCapability("entity.control"), { id }), ctx);
    expect(getEntity(id)).toBeNull();
  });

  test("call", () => {
    // TODO: Mock getVerb to return something executable
    expect(() => evaluate(CoreLib.call({ id }, "missing"), ctx)).toThrow();
  });

  test("call stack trace", () => {
    try {
      evaluate(CoreLib.call({ id: 102 }, "fail"), ctx);
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error).toBeInstanceOf(ScriptError);
      expect(error.message).toContain("call: verb 'fail' not found");
      expect(error.stackTrace).toHaveLength(0);
    }
  });

  test("schedule", () => {
    evaluate(CoreLib.schedule("verb", ListLib.listNew(), 100), ctx);
  });

  // Entity Introspection
  test("verbs", () => {
    expect(evaluate(CoreLib.verbs({ id }), ctx)).toEqual([]);
  });

  test("get_verb", () => {
    const result = evaluate(CoreLib.get_verb({ id: 101 }, "get_dynamic"), ctx) as Verb;
    // Mock returns a verb for id 101
    expect(result).toEqual({
      id: result.id,
      entity_id: 101,
      name: "get_dynamic",
      code: "resolved_value",
    });
    // Mock returns null for id 1
    expect(evaluate(CoreLib.get_verb({ id }, "missing"), ctx)).toBe(null);
  });

  test("entity", () => {
    expect(evaluate(CoreLib.entity(id), ctx)).toEqual({ id });
  });

  test("set_entity", () => {
    evaluate(CoreLib.setEntity(KernelLib.getCapability("entity.control"), { id }), ctx);
    // TODO: Add real tests
  });

  test("get_prototype", () => {
    expect(evaluate(CoreLib.getPrototype({ id }), ctx)).toBe(null);
  });

  test("set_prototype", () => {
    evaluate(CoreLib.setPrototype(KernelLib.getCapability("entity.control"), { id }, 2), ctx);
    // TODO: Add real tests
  });

  test("resolve_props", () => {
    expect(evaluate(CoreLib.resolve_props({ id: 101 }), ctx)).toEqual({
      id: 101,
      dynamic: "resolved_value",
    });
  });

  test("sudo", () => {
    // 1. Deny if not system/bot (and missing capability)
    const userCtx = createScriptContext({ caller: { id: 100 }, this: { id: 100 } });

    expect(() =>
      evaluate(
        CoreLib.sudo(
          { __brand: "Capability", id: "" },
          { id: 101 },
          "get_dynamic",
          ListLib.listNew(),
        ),
        userCtx,
      ),
    ).toThrow("Invalid capability");

    // 2. Allow if System (ID 3) with valid cap
    const systemCtx = createScriptContext({ caller: { id }, this: { id } });
    expect(
      evaluate(
        CoreLib.sudo(
          KernelLib.getCapability("sys.sudo"),
          { id: 101 },
          "get_dynamic",
          ListLib.listNew(),
        ),
        systemCtx,
      ),
    ).toBe("resolved_value");

    // 3. Allow if Bot (ID 4) with valid cap
    const botCtx = createScriptContext({ caller: { id: 4 }, this: { id: 4 } });
    expect(
      evaluate(
        CoreLib.sudo(
          KernelLib.getCapability("sys.sudo"),
          { id: 101 },
          "get_dynamic",
          ListLib.listNew(),
        ),
        botCtx,
      ),
    ).toBe("resolved_value");

    // 4. Verify message forwarding for Bot
    let sentMessage: any = null;
    const botForwardCtx = createScriptContext({
      caller: { id: 4 },
      this: { id: 4 },
      send: (type, payload) => {
        sentMessage = { type, payload };
      },
    });

    addVerb(103, "say_hello", StdLib.send("message", "Hello!"));

    evaluate(
      CoreLib.sudo(
        KernelLib.getCapability("sys.sudo"),
        { id: 103 },
        "say_hello",
        ListLib.listNew(),
      ),
      botForwardCtx,
    );

    expect(sentMessage).toEqual({
      type: "forward",
      payload: { target: 103, type: "message", payload: "Hello!" },
    });
  });
});
