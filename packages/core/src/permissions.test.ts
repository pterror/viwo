import * as KernelLib from "./runtime/lib/kernel";
import { BooleanLib, ListLib, ObjectLib, StdLib, createScriptContext, evaluate } from "@viwo/scripting";
import { CoreLib, db } from ".";
import { beforeEach, describe, expect, test } from "bun:test";
import { createCapability, createEntity, getEntity } from "./repo";
import type { Entity } from "@viwo/shared/jsonrpc";
import { GameOpcodes } from "./runtime/opcodes";
import { seed } from "./seed";

describe("Capability Permissions", () => {
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
    const itemId = createEntity({ name: "Item", owner: ownerId });
    item = getEntity(itemId)!;
    // Give owner control of item
    createCapability(ownerId, "entity.control", { target_id: itemId });
  });

  const tryRename = (actor: Entity, target: Entity, newName: string) => {
    // Script to rename entity:
    // std.callMethod(get_capability("entity.control", { target_id: target.id }), "update", [target, { name: newName }])
    const script = StdLib.seq(
      StdLib.let(
        "cap",
        KernelLib.getCapability("entity.control", ObjectLib.objNew(["target_id", target.id])),
      ),
      // If no specific cap, try wildcard (for admin)
      StdLib.if(
        BooleanLib.not(StdLib.var("cap")),
        StdLib.set("cap", KernelLib.getCapability("entity.control", ObjectLib.objNew(["*", true]))),
      ),
      StdLib.callMethod(StdLib.var("cap"), "update", target, ObjectLib.objNew(["name", newName])),
    );

    const ctx = createScriptContext({ args: [], caller: actor, ops: GameOpcodes, this: actor });
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

  test("Other Access (Denied)", () => {
    expect(() => tryRename(other, item, "Hacked")).toThrow();
  });

  test("Delegation (Sharing Access)", async () => {
    // 1. Owner delegates control to Other
    // Script:
    // let cap = get_capability("entity.control", { target_id: item.id })
    // let newCap = delegate(cap, {})
    // give_capability(newCap, other)
    const delegateScript = StdLib.seq(
      StdLib.let(
        "cap",
        KernelLib.getCapability("entity.control", ObjectLib.objNew(["target_id", item.id])),
      ),
      StdLib.let("newCap", KernelLib.delegate(StdLib.var("cap"), ObjectLib.objNew())),
      KernelLib.giveCapability(StdLib.var("newCap"), CoreLib.entity(other.id)),
    );

    const ctx = createScriptContext({ args: [], caller: owner, ops: GameOpcodes, this: owner });
    await evaluate(delegateScript, ctx);

    // 2. Other tries to rename
    await tryRename(other, item, "Shared Renamed");
    const updated = getEntity(item.id)!;
    expect(updated["name"]).toBe("Shared Renamed");
  });

  describe("Adversarial Tests", () => {
    test("Capability Forgery", () => {
      // Attacker tries to use a fake capability object
      const fakeCap = {
        __brand: "Capability" as const,
        id: crypto.randomUUID(),
        ownerId: owner.id,
        type: "fake.type",
      };
      const script = KernelLib.giveCapability(fakeCap, CoreLib.entity(other.id));
      const ctx = createScriptContext({ args: [], caller: owner, ops: GameOpcodes, this: owner });
      // Should fail because ID doesn't exist in DB
      expect(Promise.resolve().then(() => evaluate(script, ctx))).rejects.toThrow(
        "give_capability: invalid capability",
      );
    });

    test("Capability Theft", () => {
      // Owner has a valid capability
      const ownerCapId = createCapability(owner.id, "test.cap", {});
      // Attacker tries to use Owner's capability ID
      // We have to manually construct the capability object because get_capability
      // only returns caps owned by the caller.
      const stolenCap = {
        __brand: "Capability" as const,
        id: ownerCapId,
        ownerId: other.id, // Try to claim we own it
        type: "test.cap",
      };
      const script = KernelLib.giveCapability(stolenCap, CoreLib.entity(other.id));
      // Attacker is the caller
      const ctx = createScriptContext({ args: [], caller: other, ops: GameOpcodes, this: other });
      // Should fail because owner_id check fails
      expect(Promise.resolve().then(() => evaluate(script, ctx))).rejects.toThrow(
        "give_capability: invalid capability",
      );
    });

    test("Minting Namespace Violation", () => {
      // User has mint authority for "user.1"
      const mintAuthId = createCapability(owner.id, "sys.mint", {
        namespace: "user.1",
      });
      const mintAuth = {
        __brand: "Capability" as const,
        id: mintAuthId,
        ownerId: owner.id,
        type: "sys.mint",
      };
      // Try to mint outside namespace
      const script = KernelLib.mint(mintAuth, "sys.sudo", ObjectLib.objNew());
      const ctx = createScriptContext({ args: [], caller: owner, ops: GameOpcodes, this: owner });
      expect(Promise.resolve().then(() => evaluate(script, ctx))).rejects.toThrow(
        "mint: authority namespace 'user.1' does not cover 'sys.sudo'",
      );
    });

    test("Invalid Authority for Minting", () => {
      // Try to use a non-sys.mint capability as authority
      const badAuthId = createCapability(owner.id, "entity.control", {});
      const badAuth = {
        __brand: "Capability" as const,
        id: badAuthId,
        ownerId: owner.id,
        type: "entity.control",
      };
      const script = KernelLib.mint(badAuth, "some.cap", ObjectLib.objNew());
      const ctx = createScriptContext({ args: [], caller: owner, ops: GameOpcodes, this: owner });
      expect(Promise.resolve().then(() => evaluate(script, ctx))).rejects.toThrow(
        "mint: authority must be sys.mint",
      );
    });

    test("Delegate cannot add wildcard", () => {
      // Owner has a specific capability (target_id: item.id)
      // Attacker tries to delegate and add wildcard to gain broader access
      const script = StdLib.seq(
        StdLib.let(
          "cap",
          KernelLib.getCapability("entity.control", ObjectLib.objNew(["target_id", item.id])),
        ),
        // Try to add wildcard - should fail
        KernelLib.delegate(StdLib.var("cap"), ObjectLib.objNew(["*", true])),
      );
      const ctx = createScriptContext({ args: [], caller: owner, ops: GameOpcodes, this: owner });
      expect(Promise.resolve().then(() => evaluate(script, ctx))).rejects.toThrow(
        "delegate: cannot add wildcard '*' - would expand permissions",
      );
    });

    test("Delegate cannot change target_id", () => {
      // Owner has control of item
      // Attacker tries to delegate with different target_id
      const script = StdLib.seq(
        StdLib.let(
          "cap",
          KernelLib.getCapability("entity.control", ObjectLib.objNew(["target_id", item.id])),
        ),
        // Try to change target to admin - should fail
        KernelLib.delegate(StdLib.var("cap"), ObjectLib.objNew(["target_id", admin.id])),
      );
      const ctx = createScriptContext({ args: [], caller: owner, ops: GameOpcodes, this: owner });
      expect(Promise.resolve().then(() => evaluate(script, ctx))).rejects.toThrow(
        "delegate: restriction 'target_id' would expand permissions",
      );
    });

    test("Delegate can narrow wildcard to specific target", () => {
      // Admin has wildcard control
      // Should be able to delegate with specific target (more restrictive)
      const script = StdLib.seq(
        StdLib.let(
          "cap",
          KernelLib.getCapability("entity.control", ObjectLib.objNew(["*", true])),
        ),
        // Narrow from wildcard to specific target - should succeed
        StdLib.let(
          "newCap",
          KernelLib.delegate(StdLib.var("cap"), ObjectLib.objNew(["target_id", item.id])),
        ),
        KernelLib.giveCapability(StdLib.var("newCap"), CoreLib.entity(other.id)),
      );
      const ctx = createScriptContext({ args: [], caller: admin, ops: GameOpcodes, this: admin });
      // Should not throw
      expect(Promise.resolve().then(() => evaluate(script, ctx))).resolves.toBeDefined();
    });

    test("Delegate cannot expand array restrictions", () => {
      // Create a capability with method restriction
      const capId = createCapability(owner.id, "net.http", { domain: "example.com", method: ["GET"] });
      const cap = {
        __brand: "Capability" as const,
        id: capId,
        ownerId: owner.id,
        type: "net.http",
      };
      // Try to expand to include POST - should fail
      const script = KernelLib.delegate(cap, ObjectLib.objNew(["method", ListLib.listNew("GET", "POST")]));
      const ctx = createScriptContext({ args: [], caller: owner, ops: GameOpcodes, this: owner });
      expect(Promise.resolve().then(() => evaluate(script, ctx))).rejects.toThrow(
        "delegate: restriction 'method' would expand permissions",
      );
    });

    test("Delegate can narrow array restrictions", () => {
      // Create a capability with multiple methods
      const capId = createCapability(owner.id, "net.http", { domain: "example.com", method: ["GET", "POST", "PUT"] });
      const cap = {
        __brand: "Capability" as const,
        id: capId,
        ownerId: owner.id,
        type: "net.http",
      };
      // Narrow to just GET - should succeed
      const script = KernelLib.delegate(cap, ObjectLib.objNew(["method", ListLib.listNew("GET")]));
      const ctx = createScriptContext({ args: [], caller: owner, ops: GameOpcodes, this: owner });
      expect(Promise.resolve().then(() => evaluate(script, ctx))).resolves.toBeDefined();
    });

    test("Delegate cannot expand path restriction", () => {
      // Create capability with path restriction
      const capId = createCapability(owner.id, "fs.read", { path: "/home/user/docs" });
      const cap = {
        __brand: "Capability" as const,
        id: capId,
        ownerId: owner.id,
        type: "fs.read",
      };
      // Try to expand to parent path - should fail
      const script = KernelLib.delegate(cap, ObjectLib.objNew(["path", "/home/user"]));
      const ctx = createScriptContext({ args: [], caller: owner, ops: GameOpcodes, this: owner });
      expect(Promise.resolve().then(() => evaluate(script, ctx))).rejects.toThrow(
        "delegate: restriction 'path' would expand permissions",
      );
    });

    test("Delegate can narrow path restriction", () => {
      // Create capability with path restriction
      const capId = createCapability(owner.id, "fs.read", { path: "/home/user" });
      const cap = {
        __brand: "Capability" as const,
        id: capId,
        ownerId: owner.id,
        type: "fs.read",
      };
      // Narrow to subdirectory - should succeed
      const script = KernelLib.delegate(cap, ObjectLib.objNew(["path", "/home/user/docs"]));
      const ctx = createScriptContext({ args: [], caller: owner, ops: GameOpcodes, this: owner });
      expect(Promise.resolve().then(() => evaluate(script, ctx))).resolves.toBeDefined();
    });

    test("Delegate wildcard can add path restriction", () => {
      // Create wildcard capability
      const capId = createCapability(owner.id, "fs.read", { "*": true });
      const cap = {
        __brand: "Capability" as const,
        id: capId,
        ownerId: owner.id,
        type: "fs.read",
      };
      // Add path restriction to wildcard - should succeed (more restrictive)
      const script = KernelLib.delegate(cap, ObjectLib.objNew(["path", "/home/user"]));
      const ctx = createScriptContext({ args: [], caller: owner, ops: GameOpcodes, this: owner });
      expect(Promise.resolve().then(() => evaluate(script, ctx))).resolves.toBeDefined();
    });

    test("Delegate wildcard can add target_id restriction", () => {
      // Admin has wildcard entity.control
      // Delegate with specific target_id (narrowing from all to one)
      const script = StdLib.seq(
        StdLib.let(
          "cap",
          KernelLib.getCapability("entity.control", ObjectLib.objNew(["*", true])),
        ),
        KernelLib.delegate(StdLib.var("cap"), ObjectLib.objNew(["target_id", item.id])),
      );
      const ctx = createScriptContext({ args: [], caller: admin, ops: GameOpcodes, this: admin });
      expect(Promise.resolve().then(() => evaluate(script, ctx))).resolves.toBeDefined();
    });
  });
});
