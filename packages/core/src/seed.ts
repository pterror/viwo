import { transpile } from "@viwo/scripting";
import { db } from "./db";
import { createEntity, addVerb, createCapability, updateEntity, getEntity } from "./repo";
import { seedItems } from "./seeds/items";
import { seedHotel } from "./seeds/hotel";

export function seed() {
  // Check for any row at all.
  const root = db.query("SELECT id FROM entities").get();
  if (root !== null) {
    console.log("Database already seeded.");
    return;
  }

  console.log("Seeding database...");

  // 1. Create The Void (Root Zone)
  const voidId = createEntity({
    name: "The Void",
    description: "An endless expanse of nothingness.",
  });

  // 2. Create Entity Base
  const entityBaseId = createEntity({
    name: "Entity Base",
    description: "The base of all things.",
    location: voidId,
  });

  // 3. Create System Entity
  const systemId = createEntity({
    name: "System",
    description: "The system root object.",
    location: voidId,
  });

  // Grant System capabilities
  createCapability(systemId, "sys.mint", { namespace: "*" });
  createCapability(systemId, "sys.create", {});
  createCapability(systemId, "sys.sudo", {});
  createCapability(systemId, "entity.control", { "*": true });

  // 4. Create Discord Bot Entity
  const botId = createEntity({
    name: "Discord Bot",
    description: "The bridge to Discord.",
    location: voidId,
  });

  createCapability(botId, "sys.sudo", {});

  addVerb(
    botId,
    "sudo",
    transpile(`
      const targetId = arg(0);
      const verb = arg(1);
      const args = arg(2);
      sudo(get_capability("sys.sudo"), entity(targetId), verb, args);
    `),
  );

  addVerb(
    systemId,
    "get_available_verbs",
    transpile(`
      const player = arg(0);
      const verbs = list.new();
      const seen = obj.new();

      const addVerbs = (entityId) => {
        const entityVerbs = verbs(entity(entityId));
        for (const v of entityVerbs) {
          const key = str.concat(v.name, ":", entityId);
          if (!obj.has(seen, key)) {
            obj.set(seen, key, true);
            obj.set(v, "source", entityId);
            list.push(verbs, v);
          }
        }
      };

      // 1. Player verbs
      addVerbs(player.id);

      // 2. Room verbs
      const locationId = player.location;
      if (locationId) {
        addVerbs(locationId);

        // 3. Items in Room
        const room = entity(locationId);
        const contents = obj.get(room, "contents", list.new());
        for (const itemId of contents) {
          addVerbs(itemId);
        }
      }

      // 4. Inventory verbs
      const inventory = obj.get(player, "contents", list.new());
      for (const itemId of inventory) {
        addVerbs(itemId);
      }

      verbs;
    `),
  );

  addVerb(
    entityBaseId,
    "find",
    transpile(`
      const query = arg(0);
      const locationId = caller().location;
      const location = entity(locationId);
      list.find(
        obj.get(location, "contents", list.new()),
        (id) => {
          const props = resolve_props(entity(id));
          return props.name == query;
        }
      );
    `),
  );

  addVerb(
    entityBaseId,
    "find_exit",
    transpile(`
      const query = arg(0);
      const locationId = caller().location;
      const location = entity(locationId);
      list.find(
        obj.get(location, "exits", list.new()),
        (id) => {
          const props = resolve_props(entity(id));
          return props.name == query || props.direction == query;
        }
      );
    `),
  );

  addVerb(
    entityBaseId,
    "on_enter",
    transpile(`
      const mover = arg(0);
      const cap = get_capability("entity.control", { target_id: this_().id });
      if (cap) {
        const contents = obj.get(this_(), "contents", list.new());
        list.push(contents, mover.id);
        set_entity(cap, obj.set(this_(), "contents", contents));
      } else {
        send("message", "The room refuses you.");
      }
    `),
  );

  addVerb(
    entityBaseId,
    "on_leave",
    transpile(`
      const mover = arg(0);
      const cap = get_capability("entity.control", { target_id: this_().id });
      if (cap) {
        const contents = obj.get(this_(), "contents", list.new());
        const newContents = list.filter(contents, (id) => id != mover.id);
        set_entity(cap, obj.set(this_(), "contents", newContents));
      } else {
        send("message", "The room refuses to let you go.");
      }
    `),
  );

  addVerb(
    entityBaseId,
    "teleport",
    transpile(`
      const destEntity = arg(0);
      if (!destEntity) {
        send("message", "Where do you want to teleport to?");
      } else {
        const destId = destEntity.id;
        if (destId) {
          const mover = caller();
          let checkId = destId;
          let isRecursive = false;
          while (checkId) {
            if (checkId == mover.id) {
              isRecursive = true;
              checkId = null;
            } else {
              const checkEnt = entity(checkId);
              checkId = obj.get(checkEnt, "location", null);
            }
          }

          if (isRecursive) {
            send("message", "You can't put something inside itself.");
          } else {
            const oldLocId = mover.location;
            const oldLoc = entity(oldLocId);
            const newLoc = entity(destId);

            call(oldLoc, "on_leave", mover);
            call(newLoc, "on_enter", mover);

            const selfCap = get_capability("entity.control", { target_id: mover.id });
            if (selfCap) {
              obj.set(mover, "location", destId);
              set_entity(selfCap, mover);
            } else {
              send("message", "You cannot move yourself.");
            }

            send("room_id", { roomId: destId });
            call(caller(), "look");
          }
        } else {
          send("message", "Invalid destination.");
        }
      }
    `),
  );

  addVerb(
    entityBaseId,
    "move",
    transpile(`
      const direction = arg(0);
      if (!direction) {
        send("message", "Where do you want to go?");
      } else {
        const exitId = call(this_(), "find_exit", direction);
        if (exitId) {
          const destId = resolve_props(entity(exitId)).destination;
          call(caller(), "teleport", entity(destId));
        } else {
          send("message", "That way leads nowhere.");
        }
      }
    `),
  );

  addVerb(entityBaseId, "say", transpile(`send("message", "Say is not yet implemented.");`));

  addVerb(
    entityBaseId,
    "tell",
    transpile(`
      const msg = arg(0);
      send("message", msg);
    `),
  );

  // 3. Create Humanoid Base
  const humanoidBaseId = createEntity(
    {
      name: "Humanoid Base",
      description: "A humanoid creature.",
      body_type: "humanoid",
      // Slots are just definitions of where things can go
      slots: [
        // Head & Neck
        "head",
        "face",
        "ears",
        "neck",
        // Torso & Back
        "torso",
        "back",
        "waist",
        // Arms
        "l_shoulder",
        "r_shoulder",
        "l_arm",
        "r_arm",
        "l_wrist",
        "r_wrist",
        "l_hand",
        "r_hand",
        // Fingers (Rings)
        "l_finger_thumb",
        "l_finger_index",
        "l_finger_middle",
        "l_finger_ring",
        "l_finger_pinky",
        "r_finger_thumb",
        "r_finger_index",
        "r_finger_middle",
        "r_finger_ring",
        "r_finger_pinky",
        // Legs
        "l_leg",
        "r_leg",
        "l_ankle",
        "r_ankle",
        // Feet
        "l_foot",
        "r_foot",
        "l_foot",
      ],
    },
    entityBaseId,
  );

  // 4. Create Player Prototype
  const playerBaseId = createEntity(
    {
      name: "Player Base",
      description: "A generic adventurer.",
    },
    humanoidBaseId,
  );

  // Add verbs to Player Base

  addVerb(
    playerBaseId,
    "look",
    transpile(`
      const argsList = args();
      if (list.empty(argsList)) {
        const room = resolve_props(entity(caller().location));
        const contents = obj.get(room, "contents", list.new());
        const exits = obj.get(room, "exits", list.new());
        const resolvedContents = list.map(contents, (id) => resolve_props(entity(id)));
        const resolvedExits = list.map(exits, (id) => resolve_props(entity(id)));
        
        send("update", {
          entities: list.concat(
            [room],
            list.concat(resolvedContents, resolvedExits)
          )
        });
      } else {
        const targetName = arg(0);
        const targetId = call(caller(), "find", targetName);
        if (targetId) {
          const target = resolve_props(entity(targetId));
          send("update", { entities: [target] });
        } else {
          send("message", "You don't see that here.");
        }
      }
    `),
  );

  addVerb(
    playerBaseId,
    "inventory",
    transpile(`
      const player = resolve_props(caller());
      const contents = obj.get(player, "contents", list.new());
      const resolvedItems = list.map(contents, (id) => resolve_props(entity(id)));
      const finalList = list.concat([player], resolvedItems);
      send("update", { entities: finalList });
    `),
  );

  addVerb(
    playerBaseId,
    "whoami",
    transpile(`
      send("player_id", { playerId: caller().id });
    `),
  );

  addVerb(
    playerBaseId,
    "dig",
    transpile(`
      const direction = arg(0);
      const roomName = str.join(list.slice(args(), 1), " ");
      if (!direction) {
        send("message", "Where do you want to dig?");
      } else {
        const createCap = get_capability("sys.create");
        let controlCap = get_capability("entity.control", { target_id: caller().location });
        if (!controlCap) {
          controlCap = get_capability("entity.control", { "*": true });
        }

        if (createCap && controlCap) {
          const newRoomData = obj.new();
          obj.set(newRoomData, "name", roomName);
          const newRoomId = create(createCap, newRoomData);

          const exitData = obj.new();
          obj.set(exitData, "name", direction);
          obj.set(exitData, "location", caller().location);
          obj.set(exitData, "direction", direction);
          obj.set(exitData, "destination", newRoomId);
          const exitId = create(createCap, exitData);
          
          set_prototype(controlCap, entity(newRoomId), ${entityBaseId});

          const currentRoom = entity(caller().location);
          const currentExits = obj.get(currentRoom, "exits", list.new());
          list.push(currentExits, exitId);
          set_entity(controlCap, obj.set(currentRoom, "exits", currentExits));

          call(caller(), "move", direction);
        } else {
          send("message", "You do not have permission to dig here.");
        }
      }
    `),
  );

  addVerb(
    playerBaseId,
    "create",
    transpile(`
      const name = arg(0);
      if (!name) {
        send("message", "What do you want to create?");
      } else {
        const createCap = get_capability("sys.create");
        let controlCap = get_capability("entity.control", { target_id: caller().location });
        if (!controlCap) {
          controlCap = get_capability("entity.control", { "*": true });
        }

        if (createCap && controlCap) {
          const itemData = obj.new();
          obj.set(itemData, "name", name);
          obj.set(itemData, "location", caller().location);
          const itemId = create(createCap, itemData);
          set_prototype(controlCap, entity(itemId), ${entityBaseId});

          const room = entity(caller().location);
          const contents = obj.get(room, "contents", list.new());
          list.push(contents, itemId);
          set_entity(controlCap, obj.set(room, "contents", contents));

          send("message", str.concat("You create ", name, "."));
          call(caller(), "look");
          itemId;
        } else {
          send("message", "You do not have permission to create here.");
        }
      }
    `),
  );

  addVerb(
    playerBaseId,
    "set",
    transpile(`
      const targetName = arg(0);
      const propName = arg(1);
      const value = arg(2);
      if (!targetName || !propName) {
        send("message", "Usage: set <target> <prop> <value>");
      } else {
        const targetId = call(this_(), "find", targetName);
        if (targetId) {
          let controlCap = get_capability("entity.control", { target_id: targetId });
          if (!controlCap) {
            controlCap = get_capability("entity.control", { "*": true });
          }
          if (controlCap) {
            set_entity(controlCap, obj.merge(entity(targetId), { [propName]: value }));
            send("message", "Property set.");
          } else {
            send("message", "You do not have permission to modify this object.");
          }
        } else {
          send("message", "I don't see that here.");
        }
      }
    `),
  );

  // 3. Create a Lobby Room
  const lobbyId = createEntity(
    {
      name: "Lobby",
      location: voidId,
      description: "A cozy lobby with a crackling fireplace.",
    },
    entityBaseId,
  );

  // 4. Create a Test Player
  const playerId = createEntity(
    {
      name: "Guest",
      location: lobbyId,
      description: "A confused looking guest.",
    },
    playerBaseId,
  );

  // 5. Create some furniture (Table)
  const tableId = createEntity({
    name: "Oak Table",
    location: lobbyId,
    description: "A sturdy oak table.",
    slots: ["surface", "under"], // Generalizable slots!
  });

  // 6. Create a Cup ON the table
  createEntity({
    name: "Ceramic Cup",
    location: tableId,
    description: "A chipped ceramic cup.",
    location_detail: "surface", // It's ON the table
  });

  // 7. Create a Backpack
  const backpackId = createEntity({
    name: "Leather Backpack",
    location: playerId,
    description: "A worn leather backpack.",
    slots: ["main", "front_pocket"],
    location_detail: "back", // Worn on back
  });

  // 8. Create a Badge ON the Backpack
  createEntity({
    name: "Scout Badge",
    location: backpackId,
    description: "A merit badge.",
    location_detail: "surface", // Attached to the outside? Or maybe we define a slot for it.
  });

  // Create another room
  const gardenId = createEntity({
    name: "Garden",
    description: "A lush garden with blooming flowers.",
  });

  // Link Lobby and Garden
  const northExitId = createEntity({
    name: "north",
    location: lobbyId,
    direction: "north",
    destination: gardenId,
  });
  const lobby = getEntity(lobbyId)!;
  updateEntity({
    ...lobby,
    exits: [northExitId],
  });

  const southExitId = createEntity({
    name: "south",
    location: gardenId,
    direction: "south",
    destination: lobbyId,
  });
  const garden = getEntity(gardenId)!;
  updateEntity({
    ...garden,
    exits: [southExitId],
  });

  // 9. Create a Gemstore
  const gemstoreId = createEntity({
    name: "Gemstore",
    description: "A glittering shop filled with rare stones and oddities.",
  });

  // Link Lobby and Gemstore
  // Link Lobby and Gemstore
  const eastExitId = createEntity({
    name: "east",
    location: lobbyId,
    direction: "east",
    destination: gemstoreId,
  });
  // Note: We need to append to existing exits if any
  // But here we know Lobby only has north so far (actually we just added it above)
  // Let's do a cleaner way: update Lobby with both exits
  const lobbyExits = [northExitId, eastExitId];
  const lobbyUpdated = getEntity(lobbyId)!;
  updateEntity({
    ...lobbyUpdated,
    exits: lobbyExits,
  });

  const westExitId = createEntity({
    name: "west",
    location: gemstoreId,
    direction: "west",
    destination: lobbyId,
  });
  const gemstore = getEntity(gemstoreId)!;
  updateEntity({
    ...gemstore,
    exits: [westExitId],
  });

  // Items in Gemstore
  createEntity({
    name: "Black Obsidian",
    location: gemstoreId,
    description: "A pitch black stone.",
    adjectives: ["color:black", "effect:shiny", "material:stone", "material:obsidian"],
  });

  createEntity({
    name: "Silver Dagger",
    location: gemstoreId,
    description: "A gleaming silver blade.",
    adjectives: ["color:silver", "material:metal", "material:silver"],
  });

  createEntity({
    name: "Gold Coin",
    location: gemstoreId,
    description: "A heavy gold coin.",
    adjectives: ["color:gold", "weight:heavy", "material:metal", "material:gold"],
  });

  createEntity({
    name: "Platinum Ring",
    location: gemstoreId,
    description: "A precious platinum ring.",
    adjectives: ["color:platinum", "value:precious", "material:metal", "material:platinum"],
  });

  createEntity({
    name: "Radioactive Isotope",
    location: gemstoreId,
    description: "It glows with a sickly light.",
    adjectives: ["effect:radioactive", "effect:glowing"],
  });

  createEntity({
    name: "Electric Blue Potion",
    location: gemstoreId,
    description: "A crackling blue liquid.",
    adjectives: ["color:electric blue", "effect:glowing"],
  });

  createEntity({
    name: "Ethereal Mist",
    location: gemstoreId,
    description: "A swirling white mist.",
    adjectives: ["color:white", "effect:ethereal"],
  });

  createEntity({
    name: "Transparent Cube",
    location: gemstoreId,
    description: "You can barely see it.",
    adjectives: ["effect:transparent", "material:glass"],
  });

  const wigStandId = createEntity({
    name: "Wig Stand",
    location: gemstoreId,
    description: "A stand holding various wigs.",
    slots: ["surface"],
  });

  if (wigStandId) {
    createEntity({
      name: "Auburn Wig",
      location: wigStandId,
      description: "A reddish-brown wig.",
      adjectives: ["color:auburn"],
      location_detail: "surface",
    });

    createEntity({
      name: "Blonde Wig",
      location: wigStandId,
      description: "A bright yellow wig.",
      adjectives: ["color:blonde"],
      location_detail: "surface",
    });

    createEntity({
      name: "Brunette Wig",
      location: wigStandId,
      description: "A dark brown wig.",
      adjectives: ["color:brunette"],
      location_detail: "surface",
    });
  }

  // 10. Create Scripting Test Items (Lobby)

  // Watch Item
  const watchId = createEntity({
    name: "Golden Watch",
    location: lobbyId,
    props: {
      description: "A beautiful golden pocket watch.",
      adjectives: ["color:gold", "material:gold"],
    },
  });

  addVerb(watchId, "tell", transpile(`send("message", time.format(time.now(), "time"));`));

  // Teleporter Item
  const teleporterId = createEntity({
    name: "Teleporter Stone",
    location: lobbyId,
    props: {
      description: "A humming stone that vibrates with energy.",
      destination: gardenId,
      adjectives: ["effect:glowing", "material:stone"],
    },
  });

  addVerb(
    teleporterId,
    "teleport",
    transpile(`
      const destId = obj.get(this_(), "destination");
      if (destId) {
        call(caller(), "teleport", entity(destId));
        send("message", "Whoosh! You have been teleported.");
      } else {
        send("message", "The stone is dormant.");
      }
    `),
  );

  // Status Item
  const statusId = createEntity({
    name: "Status Orb",
    location: lobbyId,
    props: {
      description: "A crystal orb that shows world statistics.",
      adjectives: ["effect:transparent", "material:crystal"],
    },
  });

  addVerb(
    statusId,
    "check",
    // world.entities missing
    transpile(`send("message", "Status check disabled.");`),
  );

  console.log("Seeding complete!");

  // Color Library
  const colorLibId = createEntity({
    name: "Color Library", // Or a system object
    location: voidId, // Hidden
    props: {
      colors: ["red", "green", "blue", "purple", "orange", "yellow", "cyan", "magenta"],
    },
  });

  addVerb(
    colorLibId,
    "random_color",
    transpile(`
      const colors = obj.get(this_(), "colors");
      list.get(colors, random(0, list.len(colors) - 1));
    `),
  );

  // Mood Ring
  const moodRingId = createEntity({
    name: "Mood Ring",
    location: lobbyId,
    props: {
      description: "A ring that changes color based on... something.",
      adjectives: ["color:grey", "material:silver"],
      color_lib: colorLibId,
    },
  });

  // Verb to update color
  // It calls random_color on the lib, sets its own color adjective, and schedules itself again.
  addVerb(
    moodRingId,
    "update_color",
    transpile(`
      const libId = obj.get(this_(), "color_lib");
      const newColor = call(entity(libId), "random_color");
      const cap = get_capability("entity.control", { target_id: this_().id });
      if (cap) {
        set_entity(
          cap,
          obj.set(
            this_(),
            "adjectives",
            list.new(str.concat("color:", newColor), "material:silver")
          )
        );
      }
      schedule("update_color", list.new(), 5000);
    `),
  );

  // Kickoff
  // We need a way to start it. Let's add a 'touch' verb to start it.
  addVerb(moodRingId, "touch", transpile(`schedule("update_color", list.new(), 0);`));

  // --- Advanced Items ---

  // 1. Dynamic Mood Ring (Getter)
  const dynamicRingId = createEntity({
    name: "Dynamic Mood Ring",
    location: lobbyId,
    props: {
      description: "A ring that shimmers with the current second.",
      // No static adjectives needed if we use getter
    },
  });

  // get_adjectives verb
  // Returns a list of adjectives.
  // We'll use the current second to determine color.
  addVerb(
    dynamicRingId,
    "get_adjectives",
    transpile(`
      list.new(
        str.concat(
          "color:hsl(",
          str.concat(
            mul(time.to_timestamp(time.now()), 0.1),
            ", 100%, 50%)"
          )
        ),
        "material:gold"
      )
    `),
  );

  // 2. Special Watch (Local Broadcast)
  const specialWatchId = createEntity({
    name: "Broadcasting Watch",
    location: lobbyId,
    props: { description: "A watch that announces the time to you." },
  });

  addVerb(
    specialWatchId,
    "tick",
    transpile(`
      send("message", str.concat("Tick Tock: ", time.format(time.now(), "time")));
      schedule("tick", list.new(), 10000);
    `),
  );
  addVerb(specialWatchId, "start", transpile(`schedule("tick", list.new(), 0);`));

  // 3. Clock (Room Broadcast)
  // Watch broadcasts to holder (Player), Clock broadcasts to Room.

  const clockId = createEntity({
    name: "Grandfather Clock",
    location: lobbyId,
    props: { description: "A loud clock." },
  });

  addVerb(
    clockId,
    "tick",
    transpile(`
      send("message", str.concat("BONG! It is ", time.format(time.now(), "time")));
      schedule("tick", list.new(), 15000);
    `),
  );
  addVerb(clockId, "start", transpile(`schedule("tick", list.new(), 0);`));

  // 4. Clock Tower (Global Broadcast)
  const towerId = createEntity({
    name: "Clock Tower", // Or ROOM/BUILDING
    location: voidId, // Hidden, or visible somewhere
    props: { description: "The source of time." },
  });

  addVerb(
    towerId,
    "toll",
    transpile(`
      send("message", str.concat("The Clock Tower tolls: ", time.format(time.now(), "time")));
      schedule("toll", list.new(), 60000);
    `),
  );
  addVerb(towerId, "start", transpile(`schedule("toll", list.new(), 0);`));

  // 5. Mailbox
  // A prototype for mailboxes.
  const mailboxProtoId = createEntity({
    name: "Mailbox Prototype",
    props: {
      description: "A secure mailbox.",
      permissions: {
        view: ["owner"], // Only owner can see contents
        enter: [], // No one can manually put things in (must use deposit)
      },
    },
  });

  addVerb(
    mailboxProtoId,
    "deposit",
    // give missing
    transpile(`send("message", "Deposit disabled.");`),
    { call: "public" },
  ); // Anyone can call deposit

  // Give the player a mailbox
  createEntity(
    {
      name: "My Mailbox",
      location: playerId, // Carried by player
      owner_id: playerId,
    },
    mailboxProtoId,
  );
  // 5. Create Items
  seedItems(voidId);

  // 6. Create Hotel
  seedHotel(voidId, voidId, entityBaseId);

  console.log("Database seeded successfully.");
}
