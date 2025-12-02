import { expect, beforeEach, mock } from "bun:test";
import {
  evaluate,
  ScriptContext,
  registerLibrary,
  createScriptContext,
  ListLib as List,
  createLibraryTester,
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
});
