import * as CoreLib from "../runtime/lib/core";
import { ListLib, ObjectLib, createScriptContext, evaluate, transpile } from "@viwo/scripting";
import { addVerb, createCapability, createEntity, getEntity, getVerb, updateEntity } from "../repo";
import { beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import type { Entity } from "@viwo/shared/jsonrpc";
import { GameOpcodes } from "./opcodes";
import { db } from "../db";
import { extractVerb } from "../verb_loader";
import { resolve } from "node:path";
import { seed } from "../seed";

const verbsPath = resolve(__dirname, "../seeds/verbs.ts");

describe("Hotel Scripting", () => {
  let hotelLobby: Entity;
  let caller: Entity;
  let entityBaseId: number;
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

    // Find Entity Base
    const entityBase = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Entity Base'",
      )
      .get()!;
    entityBaseId = entityBase.id;

    // Find Hotel Lobby
    // Find Hotel Lobby (It's just the main Lobby)
    hotelLobby = lobby;

    // Setup Caller
    const playerBase = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Player Base'",
      )
      .get()!;
    const callerId = createEntity({ location: hotelLobby.id, name: "Guest" }, playerBase.id);
    caller = getEntity(callerId)!;
    createCapability(callerId, "entity.control", { target_id: callerId });
  });

  it.skip("should leave a room (move and destroy)", async () => {
    // 1. Manually create a room (since visit is gone)
    // 1. Manually create a room (since visit is gone)
    // Just create a room without prototype if it doesn't exist
    const roomId = createEntity(
      {
        lobby_id: hotelLobby.id,
        name: "Room 101",
        room_number: 101,
      },
      entityBaseId,
    );
    createCapability(roomId, "entity.control", { target_id: roomId });
    // Create exit "out" to lobby
    const outExitId = createEntity(
      {
        destination: hotelLobby.id,
        direction: "out",
        location: roomId,
        name: "out",
      },
      entityBaseId,
    );
    updateEntity({ ...getEntity(roomId)!, exits: [outExitId] });

    console.log("verbsPath:", verbsPath);
    console.log("leaveCode length:", "null");

    addVerb(
      roomId,
      "on_leave",
      transpile(
        extractVerb(verbsPath, "hotel_room_on_leave").replace(
          "HOTEL_LOBBY_ID_PLACEHOLDER",
          String(hotelLobby.id),
        ),
      ),
    );

    // Move caller to room
    updateEntity({ ...caller, location: roomId });
    caller = getEntity(caller.id)!;

    // Clear messages
    messages = [];

    // 2. Move out
    await evaluate(
      CoreLib.call(caller, "go", "out"),
      createScriptContext({ caller, ops: GameOpcodes, send, this: caller }),
    );

    expect(messages[0]).toBe("Room 101 is now available.");

    expect(caller["location"]).toBe(hotelLobby.id); // Back in lobby

    // Room should be recycled (owner null), not destroyed
    const room = getEntity(roomId)!;
    expect(room).toBeDefined();
    expect(room["owner"]).toBeNull();
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
      CoreLib.call(caller, "go", "out"),
      createScriptContext({ caller, ops: GameOpcodes, send, this: caller }),
    );

    caller = getEntity(caller.id)!;
    // Should be in Main Lobby (which has id 1 usually, but let's check against what we seeded)
    expect(caller["location"]).toBe(lobby.id);
  });

  it.skip("should navigate elevator -> floor lobby -> wing -> room and back", async () => {
    // Find Elevator (it's persistent)
    const elevatorData = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Glass Elevator'",
      )
      .get()!;
    let elevator = getEntity(elevatorData.id)!;
    expect(elevator).toBeDefined();

    // 0. Enter Hotel Lobby (from Main Lobby). 1. Enter Elevator.
    updateEntity({ ...caller, location: elevator.id });
    caller = getEntity(caller.id)!; // Refresh

    const ctx = {
      args: [],
      caller,
      send,
      this: elevator,
      warnings: [],
    } as any;

    // 2. Push 5
    const pushVerb = getVerb(elevator.id, "push");
    expect(pushVerb).toBeDefined();
    if (pushVerb) {
      await evaluate(pushVerb.code, { ...ctx, args: [5], this: elevator });
    }

    // Verify state
    elevator = getEntity(elevator.id)!;
    expect(elevator["current_floor"]).toBe(5);

    // 3. Out (to Floor 5 Lobby)
    await evaluate(CoreLib.call(elevator, "go", "out"), { ...ctx, args: [], this: elevator });

    caller = getEntity(caller.id)!;
    const floorLobbyId = caller["location"];
    expect(floorLobbyId).not.toBe(elevator.id);
    const floorLobby = getEntity(floorLobbyId as never)!;
    expect(floorLobby["name"]).toBe("Floor 5 Lobby");

    // 4. Move "west" (to West Wing)
    // Note: The 'out' verb created the exits.
    await evaluate(
      CoreLib.call(caller, "go", "west"),
      createScriptContext({ caller, ops: GameOpcodes, send, this: caller }),
    );

    caller = getEntity(caller.id)!;
    const wingId = caller["location"];
    const wing = getEntity(wingId as never)!;
    expect(wing["name"]).toBe("Floor 5 West Wing");

    // 5. Enter 5 (to Room)
    const enterVerb = getVerb(wing.id, "enter");
    expect(enterVerb).toBeDefined();
    if (enterVerb) {
      await evaluate(enterVerb.code, { ...ctx, args: [5], this: wing });
    }

    caller = getEntity(caller.id)!;
    const roomId = caller["location"];
    const room = getEntity(roomId as never)!;
    expect(room["name"]).toBe("Room 5");

    // Furnishings are no longer pre-seeded in dynamic rooms
    // const contentIds = room["contents"] as number[];
    // const contents = contentIds.map((id) => getEntity(id)!);
    // expect(contents.some((e) => e["name"] === "Bed")).toBe(true);
    // expect(contents.some((e) => e["name"] === "Lamp")).toBe(true);
    // expect(contents.some((e) => e["name"] === "Chair")).toBe(true);

    // 6. Leave (back to Wing)
    // Use "go out"
    await evaluate(
      CoreLib.call(caller, "go", "out"),
      createScriptContext({ caller, ops: GameOpcodes, send, this: caller }),
    );

    caller = getEntity(caller.id)!;
    expect(caller["location"]).toBe(wingId);
    expect(getEntity(roomId as never)).not.toBeNull();
    expect(getEntity(roomId as never)!["owner"]).toBeNull();

    // 7. Move "back" (back to Floor Lobby)
    await evaluate(
      CoreLib.call(caller, "go", "back"),
      createScriptContext({ caller, ops: GameOpcodes, send, this: caller }),
    );

    caller = getEntity(caller.id)!;
    expect(caller["location"]).toBe(floorLobbyId);
    // Wing is NOT destroyed automatically in this new design, it persists for the floor session
    // unless we explicitly destroy it, but for now let's assume it stays.

    // 8. Move "elevator" (back to Elevator)
    await evaluate(
      CoreLib.call(caller, "go", "elevator"),
      createScriptContext({ caller, ops: GameOpcodes, send, this: caller }),
    );

    caller = getEntity(caller.id)!;
    expect(caller["location"]).toBe(elevator.id);
  });
});

describe("Hotel Seed", () => {
  let lobbyId: number;

  let player: any;

  beforeAll(() => {
    // Reset DB for this block
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM verbs").run();
    db.query("DELETE FROM sqlite_sequence").run();

    // Create basic world
    seed();

    const lobby = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Lobby'",
      )
      .get()!;
    lobbyId = lobby.id;

    // Find Entity Base

    // Create a player
    const playerBase = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Player Base'",
      )
      .get()!;
    const playerId = createEntity(
      {
        is_wizard: true,
        location: lobbyId,
        name: "Tester",
      },
      playerBase.id,
    );
    player = getEntity(playerId);
    createCapability(playerId, "entity.control", { target_id: playerId });
  });

  test.skip("West Wing Room Validation", async () => {
    // 1. Find Elevator
    const elevatorData = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Glass Elevator'",
      )
      .get()!;
    console.log("eled", elevatorData);
    const elevator = getEntity(elevatorData.id)!;

    // 2. Teleport to Elevator
    await evaluate(
      CoreLib.call(player, "teleport", elevator),
      createScriptContext({ caller: player, ops: GameOpcodes, this: player }),
    );

    // 3. Push 1
    const pushVerb = getVerb(elevator.id, "push")!;
    await evaluate(
      pushVerb.code,
      createScriptContext({ args: [1], caller: player, ops: GameOpcodes, this: elevator }),
    );

    // 4. Out -> Creates Floor 1 Lobby + Wings
    let output = "";
    await evaluate(
      CoreLib.call(elevator, "go", "out"),
      createScriptContext({
        caller: player,
        ops: GameOpcodes,
        send: (type, payload) => {
          output = JSON.stringify({ payload, type });
        },
        this: elevator,
      }),
    );

    // Player is in Floor 1 Lobby
    player = getEntity(player.id)!;

    // 5. Move "west"
    await evaluate(
      CoreLib.call(player, "go", "west"),
      createScriptContext({ caller: player, ops: GameOpcodes, this: player }),
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
        args: [51],
        caller: player,
        ops: GameOpcodes,
        send: (type, payload) => {
          const json = JSON.stringify({ payload, type });
          if (output) {
            output += `\n${json}`;
          } else {
            output = json;
          }
        },
        this: westWing,
      }),
    );

    // Should fail and tell user
    expect(output).toContain("Room numbers in the West Wing are 1-50");

    // Player should still be in West Wing
    expect(getEntity(player.id)!["location"]).toBe(westWingId);

    // 7. Try to enter valid room (e.g. 10)
    await evaluate(
      enterVerb.code,
      createScriptContext({ args: [10], caller: player, ops: GameOpcodes, this: westWing }),
    );

    // Player should be in Room 10
    const playerInRoom = getEntity(player.id)!;
    const room = getEntity(playerInRoom["location"] as number)!;
    expect(room["name"]).toBe("Room 10");
  });

  test.skip("East Wing Room Validation", async () => {
    // 1. Find Elevator
    const elevatorData = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'Glass Elevator'",
      )
      .get()!;
    const elevator = getEntity(elevatorData.id)!;

    // 2. Teleport to Elevator
    await evaluate(
      CoreLib.call(player, "teleport", elevator),
      createScriptContext({ caller: player, ops: GameOpcodes, this: player }),
    );

    // 3. Push 2
    const pushVerb = getVerb(elevator.id, "push")!;
    await evaluate(
      pushVerb.code,
      createScriptContext({ args: [2], caller: player, ops: GameOpcodes, this: elevator }),
    );

    // 4. Out -> Creates Floor 2 Lobby + Wings
    let output = "";
    await evaluate(
      CoreLib.call(elevator, "go", "out"),
      createScriptContext({
        caller: player,
        ops: GameOpcodes,
        send: (type, payload) => {
          output = JSON.stringify({ payload, type });
        },
        this: elevator,
      }),
    );

    // Player is in Floor 2 Lobby
    player = getEntity(player.id)!;

    // 5. Move "east"
    await evaluate(
      CoreLib.call(player, "go", "east"),
      createScriptContext({ caller: player, ops: GameOpcodes, this: player }),
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
        args: [10],
        caller: player,
        ops: GameOpcodes,
        send: (type, payload) => {
          const json = JSON.stringify({ payload, type });
          if (output) {
            output += `\n${json}`;
          } else {
            output = json;
          }
        },
        this: eastWing,
      }),
    );

    expect(output).toContain("Room numbers in the East Wing are 51-99");

    // 7. Try to enter valid room (e.g. 60)
    await evaluate(
      enterVerb.code,
      createScriptContext({ args: [60], caller: player, ops: GameOpcodes, this: eastWing }),
    );

    const playerInRoom = getEntity(player.id)!;
    const room = getEntity(playerInRoom["location"] as number)!;
    expect(room["name"]).toBe("Room 60");
  });

  test("objGet with listNew default", async () => {
    const obj = {};
    const res = await evaluate(
      ObjectLib.objGet(obj, "missing", ListLib.listNew()),
      createScriptContext({ caller: player, ops: GameOpcodes, this: player }),
    );
    expect(res).toEqual([]);
  });
});
