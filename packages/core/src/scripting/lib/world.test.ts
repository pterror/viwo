import { describe, test, expect, mock, beforeEach } from "bun:test";
import { evaluate, ScriptContext, registerOpcode } from "../interpreter";
import { WorldLibrary } from "./world";
import * as repo from "../../repo";
import * as permissions from "../../permissions";

// Mock repo and permissions
mock.module("../../repo", () => ({
  getEntity: mock(),
  getContents: mock(),
}));

mock.module("../../permissions", () => ({
  checkPermission: mock(),
}));

describe("World Library", () => {
  let ctx: ScriptContext;

  beforeEach(() => {
    // Reset mocks
    (repo.getEntity as any).mockReset();
    (repo.getContents as any).mockReset();
    (permissions.checkPermission as any).mockReset();

    ctx = {
      caller: { id: 1, kind: "ACTOR", props: {}, location_id: 0 } as any,
      this: { id: 2, kind: "ITEM", props: {}, location_id: 0 } as any,
      args: [],
      gas: 1000,
      warnings: [],
      sys: {
        getAllEntities: mock(() => [1, 2, 3]),
      } as any,
    };

    // Register library manually
    for (const [opcode, fn] of Object.entries(WorldLibrary)) {
      registerOpcode(opcode, fn as any);
    }
  });

  test("world.entities", async () => {
    const entities = await evaluate(["world.entities"], ctx);
    expect(entities).toEqual([1, 2, 3]);
    expect(ctx.sys?.getAllEntities).toHaveBeenCalled();
  });

  test("entity.contents", async () => {
    const target = { id: 10 };
    (repo.getEntity as any).mockReturnValue(target);
    (repo.getContents as any).mockReturnValue([{ id: 11 }, { id: 12 }]);
    (permissions.checkPermission as any).mockReturnValue(true);

    const contents = await evaluate(["entity.contents", 10], ctx);
    expect(contents).toEqual([11, 12]);
    expect(permissions.checkPermission).toHaveBeenCalledWith(
      ctx.caller,
      target,
      "view",
    );
  });

  test("entity.contents permission denied", async () => {
    const target = { id: 10 };
    (repo.getEntity as any).mockReturnValue(target);
    (permissions.checkPermission as any).mockReturnValue(false);

    const contents = await evaluate(["entity.contents", 10], ctx);
    expect(contents).toEqual([]);
  });

  test("entity.descendants", async () => {
    // Structure: 10 -> [11, 12], 11 -> [13]
    const entities: Record<number, any> = {
      10: { id: 10 },
      11: { id: 11 },
      12: { id: 12 },
      13: { id: 13 },
    };
    const contents: Record<number, any[]> = {
      10: [{ id: 11 }, { id: 12 }],
      11: [{ id: 13 }],
      12: [],
      13: [],
    };

    (repo.getEntity as any).mockImplementation((id: number) => entities[id]);
    (repo.getContents as any).mockImplementation(
      (id: number) => contents[id] || [],
    );
    (permissions.checkPermission as any).mockReturnValue(true);

    const descendants = await evaluate(["entity.descendants", 10], ctx);
    // Order depends on BFS: 11, 12, 13
    expect(descendants).toEqual([11, 12, 13]);
  });

  test("entity.descendants permission check", async () => {
    // 10 -> 11 -> 12
    // Can view 10, but cannot view 11. Should stop at 11.
    const entities: Record<number, any> = {
      10: { id: 10 },
      11: { id: 11 },
      12: { id: 12 },
    };
    const contents: Record<number, any[]> = {
      10: [{ id: 11 }],
      11: [{ id: 12 }],
      12: [],
    };

    (repo.getEntity as any).mockImplementation((id: number) => entities[id]);
    (repo.getContents as any).mockImplementation(
      (id: number) => contents[id] || [],
    );

    (permissions.checkPermission as any).mockImplementation(
      (_: any, target: any) => {
        if (target.id === 11) return false;
        return true;
      },
    );

    const descendants = await evaluate(["entity.descendants", 10], ctx);
    expect(descendants).toEqual([11]);
  });

  test("entity.ancestors", async () => {
    // 13 -> 11 -> 10 -> null
    const entities: Record<number, any> = {
      13: { id: 13, location_id: 11 },
      11: { id: 11, location_id: 10 },
      10: { id: 10, location_id: null },
    };
    (repo.getEntity as any).mockImplementation((id: number) => entities[id]);

    const ancestors = await evaluate(["entity.ancestors", 13], ctx);
    expect(ancestors).toEqual([11, 10]);
  });
});
