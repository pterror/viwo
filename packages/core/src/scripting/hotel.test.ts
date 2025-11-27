import { describe, it, expect, beforeEach, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../schema";

// Setup in-memory DB
const db = new Database(":memory:");
initSchema(db);

// Mock the db module
mock.module("../db", () => ({ db }));

// Mock permissions to allow everything
mock.module("../permissions", () => ({
  checkPermission: () => true,
}));

import { evaluate, ScriptSystemContext } from "./interpreter";
import { registerListLibrary } from "./lib/list";
import { registerStringLibrary } from "./lib/string";
import { registerObjectLibrary } from "./lib/object";
import { seedHotel } from "../seeds/hotel";
import {
  createEntity,
  getEntity,
  updateEntity,
  deleteEntity,
  Entity,
  getVerb,
} from "../repo";

describe("Hotel Scripting", () => {
  let hotelLobby: Entity;
  let caller: Entity;
  let messages: string[] = [];
  let sys: ScriptSystemContext;

  beforeEach(() => {
    // Reset DB state
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM verbs").run();
    db.query("DELETE FROM entity_data").run();
    db.query("DELETE FROM sqlite_sequence").run();

    messages = [];

    // Register libraries
    registerListLibrary();
    registerStringLibrary();
    registerObjectLibrary();

    // Setup Sys Context
    sys = {
      move: (id, dest) => {
        updateEntity(id, { location_id: dest });
        if (caller && caller.id === id) {
          caller.location_id = dest;
        }
      },
      create: createEntity,
      destroy: deleteEntity,
      send: (msg: any) => {
        if (msg.type === "message") {
          messages.push(msg.text);
        }
      },
    };

    // Setup Environment
    const lobbyId = createEntity({ name: "Main Lobby", kind: "ROOM" });
    const voidId = 0;

    // Seed Hotel
    seedHotel(lobbyId, voidId);

    // Find Hotel Lobby
    const allEntities = db
      .query("SELECT id, name FROM entities")
      .all() as any[];
    const hotelLobbyData = allEntities.find(
      (e) => e.name === "Grand Hotel Lobby",
    );
    hotelLobby = getEntity(hotelLobbyData.id)!;

    // Setup Caller
    const callerId = createEntity({
      name: "Guest",
      kind: "ACTOR",
      location_id: hotelLobby.id,
    });
    caller = getEntity(callerId)!;
  });

  it("should visit a room (create and move)", async () => {
    const visitVerb = getVerb(hotelLobby.id, "visit");
    expect(visitVerb).toBeDefined();

    await evaluate(visitVerb!.code, {
      caller,
      this: hotelLobby,
      args: ["101"],
      warnings: [],
      sys,
    });

    expect(messages[0]).toBe("You enter Room 101.");
    expect(caller.location_id).not.toBe(hotelLobby.id); // Moved out of lobby

    const newRoomId = caller.location_id!;
    const newRoom = getEntity(newRoomId)!;
    expect(newRoom).toBeDefined();
    expect(newRoom.name).toBe("Room 101");
    expect(newRoom.props["lobby_id"]).toBe(hotelLobby.id);
  });

  it("should leave a room (move and destroy)", async () => {
    // 1. Visit first to create the room
    const visitVerb = getVerb(hotelLobby.id, "visit");
    await evaluate(visitVerb!.code, {
      caller,
      this: hotelLobby,
      args: ["101"],
      warnings: [],
      sys,
    });

    // Refresh caller to get new location
    caller = getEntity(caller.id)!;
    const roomId = caller.location_id!;
    const room = getEntity(roomId)!;

    // Clear messages from visit
    messages = [];

    // 2. Leave
    const leaveVerb = getVerb(room.prototype_id!, "leave");
    expect(leaveVerb).toBeDefined();

    await evaluate(leaveVerb!.code, {
      caller,
      this: room,
      args: [],
      warnings: [],
      sys,
    });

    expect(messages[0]).toBe(
      "You leave the room and it fades away behind you.",
    );

    caller = getEntity(caller.id)!;
    expect(caller.location_id).toBe(hotelLobby.id); // Back in lobby
    expect(getEntity(roomId)).toBeNull(); // Destroyed
  });

  it("should navigate elevator -> floor lobby -> wing -> room and back", async () => {
    // Find Elevator (it's persistent)
    const allEntities = db
      .query("SELECT id, name FROM entities")
      .all() as any[];
    const elevatorData = allEntities.find((e) => e.name === "Hotel Elevator");
    let elevator = getEntity(elevatorData.id)!;
    expect(elevator).toBeDefined();

    // 0. Enter Hotel Lobby (from Main Lobby)
    // Caller starts in Hotel Lobby from beforeEach

    // 1. Enter Elevator
    updateEntity(caller.id, { location_id: elevator.id });
    caller = getEntity(caller.id)!; // Refresh

    const ctx = {
      caller,
      this: elevator,
      args: [],
      warnings: [],
      sys,
    } as any; // Cast to any to avoid strict type checks on sys if needed, or ScriptContext

    // 2. Push 5
    const pushVerb = getVerb(elevator.id, "push");
    expect(pushVerb).toBeDefined();
    if (pushVerb) {
      await evaluate(pushVerb.code, { ...ctx, this: elevator, args: [5] });
    }

    // Verify state
    elevator = getEntity(elevator.id)!;
    expect(elevator.props["current_floor"]).toBe(5);

    // 3. Out (to Floor 5 Lobby)
    const outVerb = getVerb(elevator.id, "out");
    expect(outVerb).toBeDefined();
    if (outVerb) {
      await evaluate(outVerb.code, { ...ctx, this: elevator, args: [] });
    }

    caller = getEntity(caller.id)!;
    const floorLobbyId = caller.location_id!;
    expect(floorLobbyId).not.toBe(elevator.id);
    const floorLobby = getEntity(floorLobbyId)!;
    expect(floorLobby.name).toBe("Floor 5 Lobby");

    // 4. West (to West Wing)
    const westVerb = getVerb(floorLobby.prototype_id!, "west");
    expect(westVerb).toBeDefined();
    if (westVerb) {
      await evaluate(westVerb.code, { ...ctx, this: floorLobby, args: [] });
    }

    caller = getEntity(caller.id)!;
    const wingId = caller.location_id!;
    const wing = getEntity(wingId)!;
    expect(wing.name).toBe("Floor 5 West Wing");

    // 5. Enter 501 (to Room)
    const enterVerb = getVerb(wing.prototype_id!, "enter");
    expect(enterVerb).toBeDefined();
    if (enterVerb) {
      await evaluate(enterVerb.code, { ...ctx, this: wing, args: ["501"] });
    }

    caller = getEntity(caller.id)!;
    const roomId = caller.location_id!;
    const room = getEntity(roomId)!;
    expect(room.name).toBe("Room 501");

    // 6. Leave (back to Wing)
    const leaveVerb = getVerb(room.prototype_id!, "leave");
    expect(leaveVerb).toBeDefined();
    if (leaveVerb) {
      await evaluate(leaveVerb.code, { ...ctx, this: room, args: [] });
    }

    caller = getEntity(caller.id)!;
    expect(caller.location_id).toBe(wingId);
    expect(getEntity(roomId)).toBeNull(); // Room destroyed

    // 7. Back (back to Floor Lobby)
    const backVerb = getVerb(wing.prototype_id!, "back");
    expect(backVerb).toBeDefined();
    if (backVerb) {
      await evaluate(backVerb.code, { ...ctx, this: wing, args: [] });
    }

    caller = getEntity(caller.id)!;
    expect(caller.location_id).toBe(floorLobbyId);
    expect(getEntity(wingId)).toBeNull(); // Wing destroyed

    // 8. Elevator (back to Elevator)
    const elevatorVerb = getVerb(floorLobby.prototype_id!, "elevator");
    expect(elevatorVerb).toBeDefined();
    if (elevatorVerb) {
      await evaluate(elevatorVerb.code, { ...ctx, this: floorLobby, args: [] });
    }

    caller = getEntity(caller.id)!;
    expect(caller.location_id).toBe(elevator.id);
    expect(getEntity(floorLobbyId)).toBeNull(); // Lobby destroyed
  });
});
