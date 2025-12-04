import { describe, it, test, expect, beforeEach, beforeAll } from "bun:test";
import { db } from "../db";
import * as CoreLib from "../runtime/lib/core";
import * as KernelLib from "../runtime/lib/kernel";
import { seed } from "../seed";
import { seedHotel } from "../seeds/hotel";
import { createEntity, getEntity, updateEntity, getVerb, createCapability } from "../repo";
import {
  evaluate,
  registerLibrary,
  createScriptContext,
  StdLib,
  ListLib,
  StringLib,
  ObjectLib,
  TimeLib,
  BooleanLib,
} from "@viwo/scripting";
import { Entity } from "@viwo/shared/jsonrpc";

registerLibrary(CoreLib);
registerLibrary(KernelLib);
registerLibrary(StdLib);
registerLibrary(ListLib);
registerLibrary(StringLib);
registerLibrary(ObjectLib);
registerLibrary(BooleanLib);
registerLibrary(TimeLib);

describe("Hotel Scripting", () => {
  let hotelLobby: Entity;
  let caller: Entity;
  let messages: unknown[] = [];
  let send: (type: string, payload: unknown) => void;

  beforeEach(() => {
    // Reset DB state
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM verbs").run();
    db.query("DELETE FROM capabilities").run();
    db.query("DELETE FROM sqlite_sequence").run();

    messages = [];

    // Setup Sys Context
    // Setup Send
    send = (type: string, payload: unknown) => {
      if (type === "message") {
        messages.push(payload);
      }
    };

    // Setup Environment
    // Seed Base
    seed();

    // Find Main Lobby & Void
    const lobby = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Lobby'",
      )
      .get()!;
    const lobbyId = lobby.id;
    const voidEntity = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'The Void'",
      )
      .get()!;
    const voidId = voidEntity.id;

    // Seed Hotel
    seedHotel(lobbyId, voidId);

    // Find Hotel Lobby
    const hotelLobbyData = db
      .query<{ id: number }, []>(
        "SELECT id, props FROM entities WHERE json_extract(props, '$.name') = 'Grand Hotel Lobby'",
      )
      .get()!;
    hotelLobby = getEntity(hotelLobbyData.id)!;

    // Setup Caller
    const playerBase = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Player Base'",
      )
      .get()!;
    const callerId = createEntity({ name: "Guest", location: hotelLobby.id }, playerBase.id);
    caller = getEntity(callerId)!;
    createCapability(callerId, "entity.control", { target_id: callerId });
  });

  it("should leave a room (move and destroy)", async () => {
    // 1. Manually create a room (since visit is gone)
    const roomProto = db
      .query("SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Hotel Room Prototype'")
      .get() as any;
    const roomId = createEntity({ name: "Room 101", lobby_id: hotelLobby.id }, roomProto.id);
    createCapability(roomId, "entity.control", { target_id: roomId });

    // Move caller to room
    updateEntity({ ...caller, location: roomId });
    caller = getEntity(caller.id)!;

    // Clear messages
    messages = [];

    // 2. Leave
    const leaveVerb = getVerb(roomId, "leave");
    expect(leaveVerb).toBeDefined();

    await evaluate(
      leaveVerb!.code,
      createScriptContext({ caller, this: getEntity(roomId)!, send }),
    );

    expect(messages[0]).toBe("You leave the room and it fades away behind you.");

    expect(caller["location"]).toBe(hotelLobby.id); // Back in lobby
    expect(getEntity(roomId)).toBeNull(); // Destroyed
  });

  it("should move via direction string", async () => {
    // Caller is in Hotel Lobby
    // There is an exit "out" to Main Lobby
    const outExit = db
      .query<{ id: number }, [id: number]>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'out' AND json_extract(props, '$.location') = ?",
      )
      .get(hotelLobby.id)!;
    expect(outExit).toBeDefined();

    // Should be in Main Lobby (which has id 1 usually, but let's check against what we seeded)
    const lobby = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Lobby'",
      )
      .get()!;

    // Call move "out"
    await evaluate(
      CoreLib.call(caller, "move", "out"),
      createScriptContext({ caller, this: caller, send }),
    );

    caller = getEntity(caller.id)!;
    // Should be in Main Lobby (which has id 1 usually, but let's check against what we seeded)
    expect(caller["location"]).toBe(lobby.id);
  });

  it("should navigate elevator -> floor lobby -> wing -> room and back", async () => {
    // Find Elevator (it's persistent)
    const elevatorData = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Hotel Elevator'",
      )
      .get()!;
    let elevator = getEntity(elevatorData.id)!;
    expect(elevator).toBeDefined();

    // 0. Enter Hotel Lobby (from Main Lobby). 1. Enter Elevator.
    updateEntity({ ...caller, location: elevator.id });
    caller = getEntity(caller.id)!; // Refresh

    const ctx = {
      caller,
      this: elevator,
      args: [],
      warnings: [],
      send,
    } as any;

    // 2. Push 5
    const pushVerb = getVerb(elevator.id, "push");
    expect(pushVerb).toBeDefined();
    if (pushVerb) {
      await evaluate(pushVerb.code, { ...ctx, this: elevator, args: [5] });
    }

    // Verify state
    elevator = getEntity(elevator.id)!;
    expect(elevator["current_floor"]).toBe(5);

    // 3. Out (to Floor 5 Lobby)
    await evaluate(CoreLib.call(elevator, "move", "out"), {
      ...ctx,
      this: elevator,
      args: [],
    });

    caller = getEntity(caller.id)!;
    const floorLobbyId = caller["location"];
    expect(floorLobbyId).not.toBe(elevator.id);
    const floorLobby = getEntity(floorLobbyId as never)!;
    expect(floorLobby["name"]).toBe("Floor 5 Lobby");

    // 4. Move "west" (to West Wing)
    // Note: The 'out' verb created the exits.
    await evaluate(
      CoreLib.call(caller, "move", "west"),
      createScriptContext({ caller, this: caller, send }),
    );

    caller = getEntity(caller.id)!;
    const wingId = caller["location"];
    const wing = getEntity(wingId as never)!;
    expect(wing["name"]).toBe("Floor 5 West Wing");

    // 5. Enter 5 (to Room)
    const enterVerb = getVerb(wing.id, "enter");
    expect(enterVerb).toBeDefined();
    if (enterVerb) {
      await evaluate(enterVerb.code, { ...ctx, this: wing, args: [5] });
    }

    caller = getEntity(caller.id)!;
    const roomId = caller["location"];
    const room = getEntity(roomId as never)!;
    expect(room["name"]).toBe("Room 5");

    // Verify furnishings
    const contentIds = room["contents"] as number[];
    const contents = contentIds.map((id) => getEntity(id)!);
    expect(contents.some((e) => e["name"] === "Bed")).toBe(true);
    expect(contents.some((e) => e["name"] === "Lamp")).toBe(true);
    expect(contents.some((e) => e["name"] === "Chair")).toBe(true);

    // 6. Leave (back to Wing)
    const leaveVerb = getVerb(room.id, "leave");
    expect(leaveVerb).toBeDefined();
    if (leaveVerb) {
      await evaluate(leaveVerb.code, { ...ctx, this: room, args: [] });
    }

    caller = getEntity(caller.id)!;
    expect(caller["location"]).toBe(wingId);
    expect(getEntity(roomId as never)).toBeNull(); // Room destroyed

    // 7. Move "back" (back to Floor Lobby)
    await evaluate(
      CoreLib.call(caller, "move", "back"),
      createScriptContext({ caller, this: caller, send }),
    );

    caller = getEntity(caller.id)!;
    expect(caller["location"]).toBe(floorLobbyId);
    // Wing is NOT destroyed automatically in this new design, it persists for the floor session
    // unless we explicitly destroy it, but for now let's assume it stays.

    // 8. Move "elevator" (back to Elevator)
    await evaluate(
      CoreLib.call(caller, "move", "elevator"),
      createScriptContext({ caller, this: caller, send }),
    );

    caller = getEntity(caller.id)!;
    expect(caller["location"]).toBe(elevator.id);
  });
});

describe("Hotel Seed", () => {
  let lobbyId: number;
  let voidId: number;
  let player: any;

  beforeAll(() => {
    // Reset DB for this block
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM verbs").run();
    db.query("DELETE FROM sqlite_sequence").run();

    // Create basic world
    seed();
    const void_ = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'The Void'",
      )
      .get()!;
    voidId = void_.id;
    const lobby = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Lobby'",
      )
      .get()!;
    lobbyId = lobby.id;

    // Seed Hotel
    seedHotel(lobbyId, voidId);

    // Create a player
    const playerBase = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Player Base'",
      )
      .get()!;
    const playerId = createEntity(
      {
        name: "Tester",
        location: lobbyId,
        is_wizard: true,
      },
      playerBase.id,
    );
    player = getEntity(playerId);
    createCapability(playerId, "entity.control", { target_id: playerId });
  });

  test("West Wing Room Validation", async () => {
    // 1. Find Elevator
    const elevatorData = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Hotel Elevator'",
      )
      .get()!;
    console.log("eled", elevatorData);
    const elevator = getEntity(elevatorData.id)!;

    // 2. Teleport to Elevator
    await evaluate(
      CoreLib.call(player, "teleport", elevator),
      createScriptContext({ caller: player, this: player }),
    );

    // 3. Push 1
    const pushVerb = getVerb(elevator.id, "push")!;
    await evaluate(
      pushVerb.code,
      createScriptContext({ caller: player, this: elevator, args: [1] }),
    );

    // 4. Out -> Creates Floor 1 Lobby + Wings
    let output = "";
    await evaluate(
      CoreLib.call(elevator, "move", "out"),
      createScriptContext({
        caller: player,
        this: elevator,
        send: (type, payload) => {
          output = JSON.stringify({ type, payload });
        },
      }),
    );

    // Player is in Floor 1 Lobby
    player = getEntity(player.id)!;

    // 5. Move "west"
    await evaluate(
      CoreLib.call(player, "move", "west"),
      createScriptContext({ caller: player, this: player }),
    );

    // Player should be in West Wing now
    const playerAfterWest = getEntity(player.id)!;
    const westWingId = playerAfterWest["location"] as number;
    const westWing = getEntity(westWingId)!;
    expect(westWing["name"]).toContain("West Wing");

    // 6. Try to enter invalid room (e.g. 51)
    const enterVerb = getVerb(westWingId, "enter")!;

    await evaluate(
      enterVerb.code,
      createScriptContext({
        caller: player,
        this: westWing,
        args: [51],
        send: (type, payload) => {
          output = JSON.stringify({ type, payload });
        },
      }),
    );

    // Should fail and tell user
    expect(output).toContain("Room numbers in the West Wing are 1-50");

    // Player should still be in West Wing
    expect(getEntity(player.id)!["location"]).toBe(westWingId);

    // 7. Try to enter valid room (e.g. 10)
    await evaluate(
      enterVerb.code,
      createScriptContext({ caller: player, this: westWing, args: [10] }),
    );

    // Player should be in Room 10
    const playerInRoom = getEntity(player.id)!;
    const room = getEntity(playerInRoom["location"] as number)!;
    expect(room["name"]).toBe("Room 10");
  });

  test("East Wing Room Validation", async () => {
    // 1. Find Elevator
    const elevatorData = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Hotel Elevator'",
      )
      .get()!;
    const elevator = getEntity(elevatorData.id)!;

    // 2. Teleport to Elevator
    await evaluate(
      CoreLib.call(player, "teleport", elevator),
      createScriptContext({ caller: player, this: player }),
    );

    // 3. Push 2
    const pushVerb = getVerb(elevator.id, "push")!;
    await evaluate(
      pushVerb.code,
      createScriptContext({ caller: player, this: elevator, args: [2] }),
    );

    // 4. Out -> Creates Floor 2 Lobby + Wings
    let output = "";
    await evaluate(
      CoreLib.call(elevator, "move", "out"),
      createScriptContext({
        caller: player,
        this: elevator,
        send: (type, payload) => {
          output = JSON.stringify({ type, payload });
        },
      }),
    );

    // Player is in Floor 2 Lobby
    player = getEntity(player.id)!;

    // 5. Move "east"
    await evaluate(
      CoreLib.call(player, "move", "east"),
      createScriptContext({ caller: player, this: player }),
    );

    const playerAfterEast = getEntity(player.id)!;
    const eastWingId = playerAfterEast["location"] as number;
    const eastWing = getEntity(eastWingId)!;
    expect(eastWing["name"]).toContain("East Wing");

    // 6. Try to enter invalid room (e.g. 10)
    const enterVerb = getVerb(eastWingId, "enter")!;

    await evaluate(
      enterVerb.code,
      createScriptContext({
        caller: player,
        this: eastWing,
        args: [10],
        send: (type, payload) => {
          output = JSON.stringify({ type, payload });
        },
      }),
    );

    expect(output).toContain("Room numbers in the East Wing are 51-99");

    // 7. Try to enter valid room (e.g. 60)
    await evaluate(
      enterVerb.code,
      createScriptContext({ caller: player, this: eastWing, args: [60] }),
    );

    const playerInRoom = getEntity(player.id)!;
    const room = getEntity(playerInRoom["location"] as number)!;
    expect(room["name"]).toBe("Room 60");
  });

  test("objGet with listNew default", async () => {
    const obj = {};
    const res = await evaluate(
      ObjectLib.objGet(obj, "missing", ListLib.listNew()),
      createScriptContext({ caller: player, this: player }),
    );
    expect(res).toEqual([]);
  });
});
