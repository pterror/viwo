import { describe, it, expect, beforeEach, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../schema";

// Setup in-memory DB
const db = new Database(":memory:");
initSchema(db);

// Mock the db module
mock.module("../db", () => ({ db }));

import { evaluate, registerLibrary, createScriptContext } from "./interpreter";
import * as Core from "./lib/core";
import * as List from "./lib/list";
import * as String from "./lib/string";
import * as Object from "./lib/object";
import { seed } from "../seed";
import { createEntity, getEntity, updateEntity, getVerb } from "../repo";
import { Entity } from "@viwo/shared/jsonrpc";

describe("Player Commands", () => {
  registerLibrary(Core);
  registerLibrary(List);
  registerLibrary(String);
  registerLibrary(Object);

  let player: Entity;
  let room: Entity;
  let send: (msg: unknown) => void;
  let sentMessages: any[] = [];

  beforeEach(() => {
    // Reset DB state
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM verbs").run();
    db.query("DELETE FROM sqlite_sequence").run();

    sentMessages = [];

    // Setup Sys Context
    // Setup Send
    send = (type: string, payload: unknown) => {
      // console.log(`send mock: type=${type}, payload=`, JSON.stringify(payload));
      if (type === "update") {
        // For update, we might want to store the payload or entities?
        // The tests expect sentMessages[0] to be an entity or have a name?
        // "should look at room": expect(sentMessages[0]?.name).toEqual(room["name"]);
        // If payload is { entities: [...] }, then sentMessages[0] should be... ?
        // The test seems to assume sentMessages[0] IS the room entity.
        // But 'look' sends { entities: [room, ...contents] }.
        // So we should probably extract the first entity from payload?
        const p = payload as any;
        if (p.entities && p.entities.length > 0) {
          console.log("send mock: pushing entities", p.entities);
          sentMessages.push(p.entities);
        } else {
          sentMessages.push(payload);
        }
      } else if (type === "message") {
        // For message, payload is string.
        // Tests might expect object with name?
        // "should inspect item": expect(sentMessages[0]?.name).toEqual("Box");
        // If inspect uses 'look', it sends 'update'.
        // If inspect uses 'message', it sends string.
        // 'look' verb sends 'update'.
        sentMessages.push({ type, payload });
      } else {
        sentMessages.push(payload);
      }
    };

    // Seed DB (creates sys:player_base, Lobby, Guest, etc.)
    seed();

    // Get Guest Player
    const guest = db
      .query<Entity, []>(
        "SELECT * FROM entities WHERE json_extract(props, '$.name') = 'Guest'",
      )
      .get()!;
    player = getEntity(guest.id)!;
    // Make player admin to allow create/dig/set
    player["admin"] = true;
    updateEntity(player);

    room = getEntity(player["location"] as number)!;
  });

  const runCommand = async (command: string, args: readonly unknown[]) => {
    const freshPlayer = getEntity(player.id)!;
    const verb = getVerb(freshPlayer.id, command);
    if (!verb) throw new Error(`Verb ${command} not found on player`);
    return await evaluate(
      verb.code,
      createScriptContext({
        caller: freshPlayer,
        this: freshPlayer,
        args,
        send,
      }),
    );
  };

  it("should look at room", async () => {
    await runCommand("look", []);
    expect(sentMessages[0]?.[0]?.name).toEqual(room["name"]);
  });

  it("should inspect item", async () => {
    // Create item in room
    console.log("Creating Box...");
    const boxId = createEntity({ name: "Box", location: room.id });
    console.log(`Created Box with ID ${boxId}`);

    // Update room contents
    const freshRoom = getEntity(room.id)!;
    const contents = (freshRoom["contents"] as number[]) || [];
    contents.push(boxId);
    freshRoom["contents"] = contents;
    console.log("Calling updateEntity(freshRoom)...");
    updateEntity(freshRoom);

    await runCommand("look", ["Box"]);
    console.log("sentMessages:", JSON.stringify(sentMessages, null, 2));
    expect(sentMessages.length).toBeGreaterThan(0);
    expect(Array.isArray(sentMessages[0])).toBe(true);
    expect(sentMessages[0].length).toBeGreaterThan(0);
    expect(sentMessages[0][0].name).toEqual("Box");
  });

  it("should check inventory", async () => {
    const backpackId = createEntity({
      name: "Leather Backpack",
      location: player.id,
    });
    const freshPlayer = getEntity(player.id)!;
    // Assuming inventory verb checks location?
    // Or contents?
    // Inventory usually checks items where location = player.id.
    // But 'inventory' verb implementation in seed.ts uses 'find' or 'contents'?

    // Let's check inventory verb in seed.ts:
    // It uses 'contents' property of player?
    // Or it searches for entities with location = player.id?

    // If it uses 'contents' property, we need to update it.
    // If it uses 'find' (db query), then createEntity is enough (if location is set).

    // But 'inventory' verb in seed.ts:
    // Core["let"]("items", Object["obj.get"](Core["caller"](), "contents", List["list.new"]()))
    // It uses 'contents' property!

    const contents = (freshPlayer["contents"] as number[]) || [];
    contents.push(backpackId);
    freshPlayer["contents"] = contents;
    console.log("Calling updateEntity(freshPlayer)...");
    updateEntity(freshPlayer);

    await runCommand("inventory", []);
    console.log("sentMessages:", JSON.stringify(sentMessages, null, 2));
    expect(sentMessages[0]?.[1]?.name).toEqual("Leather Backpack");
  });

  it("should move", async () => {
    // Create start room
    const startRoomId = createEntity({ name: "Start Room" });
    // Move player to start room
    updateEntity({ ...player, location: startRoomId });
    player["location"] = startRoomId;
    room = getEntity(startRoomId)!;

    // Create another room
    const otherRoomId = createEntity({ name: "Other Room" });
    // Create exit
    const exitId = createEntity({
      name: "north",
      location: startRoomId,
      direction: "north",
      destination: otherRoomId,
    });
    // Update start room with exit
    updateEntity({ ...room, exits: [exitId] });

    await runCommand("move", ["north"]);

    const updatedPlayer = getEntity(player.id)!;
    expect(updatedPlayer["location"]).toBe(otherRoomId);
    expect(sentMessages[0]?.[0]?.name).toBe("Other Room");
  });

  it("should dig", async () => {
    await runCommand("dig", ["south", "New Room"]);

    // Check if new room exists
    const newRoomId = db
      .query<{ id: number }, []>(
        "SELECT id FROM entities WHERE json_extract(props, '$.name') = 'New Room'",
      )
      .get()?.id;
    expect(newRoomId).toBeDefined();

    // Check if player moved
    const updatedPlayer = getEntity(player.id)!;
    expect(updatedPlayer["location"]).toBe(newRoomId);
  });

  it("should create item", async () => {
    const id = await runCommand("create", ["Rock"]);
    expect(id, "create should return item id").toBeDefined();
    const createdRock = getEntity(id as number);
    expect(createdRock, "created item should exist").toBeDefined();
    const roomUpdate = sentMessages.flat().find((m) => m.name === room["name"]);
    expect(roomUpdate, "created item should send room update").toBeDefined();
  });

  it("should set property", async () => {
    const itemId = createEntity({
      name: "Stone",
      location: room.id,
      weight: 10,
    });
    // Update room contents
    const contents = (room["contents"] as number[]) || [];
    contents.push(itemId);
    room["contents"] = contents;
    updateEntity(room);

    await runCommand("set", ["Stone", "weight", 20]);

    const updatedItem = getEntity(itemId)!;
    expect(updatedItem["weight"]).toBe(20);
  });
});
