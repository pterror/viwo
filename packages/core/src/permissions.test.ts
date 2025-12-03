import { describe, test, expect, beforeEach } from "bun:test";
import {
  evaluate,
  createScriptContext,
  registerLibrary,
  StdLib as Std,
  ObjectLib as Object,
  ListLib as List,
  BooleanLib as Boolean,
} from "@viwo/scripting";
import { Entity } from "@viwo/shared/jsonrpc";
import { createEntity, getEntity, createCapability } from "./repo";
import { CoreLib, db } from ".";
import { seed } from "./seed";
import * as Kernel from "./runtime/lib/kernel";

describe("Capability Permissions", () => {
  registerLibrary(Std);
  registerLibrary(Object);
  registerLibrary(List);
  registerLibrary(Kernel);
  registerLibrary(CoreLib);

  let owner: Entity;
  let other: Entity;
  let admin: Entity;
  let item: Entity;

  beforeEach(() => {
    // Reset DB state
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM verbs").run();
    db.query("DELETE FROM capabilities").run();
    db.query("DELETE FROM sqlite_sequence").run();

    // Seed (creates base entities)
    seed();

    // Create Test Entities
    const ownerId = createEntity({ name: "Owner" });
    owner = getEntity(ownerId)!;
    // Owner gets control of themselves (normally handled by create opcode, but we're using repo directly)
    createCapability(ownerId, "entity.control", { target_id: ownerId });

    const otherId = createEntity({ name: "Other" });
    other = getEntity(otherId)!;

    const adminId = createEntity({ name: "Admin" });
    admin = getEntity(adminId)!;
    // Admin gets wildcard control
    createCapability(adminId, "entity.control", { "*": true });

    const itemId = createEntity({
      name: "Item",
      owner: ownerId,
    });
    item = getEntity(itemId)!;
    // Give owner control of item
    createCapability(ownerId, "entity.control", { target_id: itemId });
  });

  const tryRename = (actor: Entity, target: Entity, newName: string) => {
    // Script to rename entity:
    // set_entity(get_capability("entity.control", { target_id: target.id }), target, { name: newName })
    const script = Std["seq"](
      Std["let"](
        "cap",
        Kernel["get_capability"](
          "entity.control",
          Object["obj.new"](["target_id", target.id]),
        ),
      ),
      // If no specific cap, try wildcard (for admin)
      Std["if"](
        Boolean["not"](Std["var"]("cap")),
        Std["set"](
          "cap",
          Kernel["get_capability"](
            "entity.control",
            Object["obj.new"](["*", true]),
          ),
        ),
      ),
      CoreLib["set_entity"](
        Std["var"]("cap"),
        Object["obj.set"](CoreLib["entity"](target.id), "name", newName),
      ),
    );

    const ctx = createScriptContext({
      caller: actor,
      this: actor,
      args: [],
    });
    return evaluate(script, ctx);
  };

  test("Admin Access (Wildcard)", async () => {
    await tryRename(admin, item, "Admin Renamed");
    const updated = getEntity(item.id)!;
    expect(updated["name"]).toBe("Admin Renamed");
  });

  test("Owner Access", async () => {
    await tryRename(owner, item, "Owner Renamed");
    const updated = getEntity(item.id)!;
    expect(updated["name"]).toBe("Owner Renamed");
  });

  test("Other Access (Denied)", async () => {
    expect(tryRename(other, item, "Hacked")).rejects.toThrow();
  });

  test("Delegation (Sharing Access)", async () => {
    // 1. Owner delegates control to Other
    // Script:
    // let cap = get_capability("entity.control", { target_id: item.id })
    // let newCap = delegate(cap, {})
    // give_capability(newCap, other)
    const delegateScript = Std["seq"](
      Std["let"](
        "cap",
        Kernel["get_capability"](
          "entity.control",
          Object["obj.new"](["target_id", item.id]),
        ),
      ),
      Std["let"](
        "newCap",
        Kernel["delegate"](Std["var"]("cap"), Object["obj.new"]()),
      ),
      Kernel["give_capability"](
        Std["var"]("newCap"),
        CoreLib["entity"](other.id),
      ),
    );

    const ctx = createScriptContext({
      caller: owner,
      this: owner,
      args: [],
    });
    await evaluate(delegateScript, ctx);

    // 2. Other tries to rename
    await tryRename(other, item, "Shared Renamed");
    const updated = getEntity(item.id)!;
    expect(updated["name"]).toBe("Shared Renamed");
  });
});
