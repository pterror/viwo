import { describe, it, expect, beforeEach, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "./schema";

// Setup in-memory DB
const db = new Database(":memory:");
initSchema(db);

// Mock the db module
mock.module("./db", () => ({ db }));

import {
  evaluate,
  registerLibrary,
  createScriptContext,
} from "./scripting/interpreter";
import * as Core from "./scripting/lib/core";
import * as List from "./scripting/lib/list";
import * as String from "./scripting/lib/string";
import * as Object from "./scripting/lib/object";
import { seed } from "./seed";
import { createEntity, getEntity, getVerb } from "./repo";
import { Entity } from "@viwo/shared/jsonrpc";

describe("Recursive Move Check", () => {
  registerLibrary(Core);
  registerLibrary(List);
  registerLibrary(String);
  registerLibrary(Object);

  let caller: Entity;
  let messages: unknown[] = [];
  let send: (type: string, payload: unknown) => void;

  beforeEach(() => {
    // Reset DB state
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM verbs").run();
    db.query("DELETE FROM sqlite_sequence").run();

    messages = [];

    // Setup Send
    send = (type: string, payload: unknown) => {
      if (type === "message") {
        messages.push(payload);
      }
    };

    // Seed Base
    seed();

    // Setup Caller (Player)
    const playerBase = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Player Base'",
      )
      .get()!;

    // Create a room
    const voidEntity = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'The Void'",
      )
      .get()!;

    const callerId = createEntity(
      { name: "Player", kind: "ACTOR", location: voidEntity.id },
      playerBase.id,
    );
    caller = getEntity(callerId)!;
  });

  it("should prevent moving an entity into itself", async () => {
    // 1. Create a Box
    const entityBase = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Entity Base'",
      )
      .get()!;

    const boxId = createEntity(
      { name: "Box", location: caller.location },
      entityBase.id,
    );
    // Add dummy look verb to Box since move calls it
    const { addVerb } = require("./repo");
    addVerb(boxId, "look", Core["let"]("dummy", 1));
    const box = getEntity(boxId)!;

    // 2. Create an Item inside the Box
    const itemId = createEntity(
      { name: "Item", location: boxId },
      entityBase.id,
    );

    // 3. Attempt to move Box into Item
    // We need to execute the 'move' verb on the Box (since it inherits from Entity Base which has 'move')
    // But wait, 'move' is usually called by the *mover* (the actor).
    // The 'move' verb on Entity Base (which Player inherits) allows the player to move *themselves*.
    // Let's check seed.ts again.
    // "move" on Entity Base:
    // Core["let"]("arg", Core["arg"](0)), ...
    // Core["let"]("mover", Core["caller"]()), ...
    // Core["set_entity"](Object["obj.set"](Core["var"]("mover"), "location", Core["var"]("destId")), ...)

    // So 'move' moves the CALLER.

    // To test moving a box into an item, we need to make the Box the caller?
    // Or maybe we need a 'put' verb?
    // The TODO says: "Core/Repo: When implementing `move` in scripting, ensure it disallows a box to be put inside itself"
    // If 'move' only moves the caller, then we can simulate the Box trying to move itself into the Item.

    // Let's simulate the Box acting as the caller.
    const ctx = createScriptContext({
      caller: box,
      this: box, // The verb is on Entity Base, which Box inherits
      args: [itemId], // Move to Item
      send,
    });

    const moveVerb = getVerb(box.id, "move");
    expect(moveVerb).toBeDefined();

    await evaluate(moveVerb!.code, ctx);

    // 4. Assert failure
    const updatedBox = getEntity(box.id)!;

    // If it failed, Box should still be in the Void (caller.location)
    // If it succeeded (bug), Box would be in Item (itemId)
    expect(updatedBox.location).not.toBe(itemId);
    expect(updatedBox.location).toBe(caller.location);

    // Expect an error message
    expect(messages).toContain("You can't put something inside itself.");
  });
});
