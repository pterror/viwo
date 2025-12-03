import {
  MathLib,
  StringLib,
  ListLib,
  TimeLib,
  ObjectLib,
  StdLib,
  BooleanLib,
} from "@viwo/scripting";
import * as CoreLib from "./runtime/lib/core";
import * as KernelLib from "./runtime/lib/kernel";
import { db } from "./db";
import {
  createEntity,
  addVerb,
  updateEntity,
  getEntity,
  createCapability,
} from "./repo";
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
    CoreLib.sudo(
      KernelLib.getCapability("sys.sudo"),
      CoreLib.entity(StdLib.arg(0)),
      StdLib.arg(1),
      StdLib.arg(2),
    ),
  );

  addVerb(
    systemId,
    "get_available_verbs",
    StdLib.seq(
      StdLib.let("player", StdLib.arg(0)),
      StdLib.let("verbs", ListLib.listNew()),
      StdLib.let("seen", ObjectLib.objNew()),

      StdLib.let(
        "addVerbs",
        StdLib.lambda(
          ["entityId"],
          StdLib.seq(
            StdLib.let(
              "entityVerbs",
              CoreLib.verbs(CoreLib.entity(StdLib.var("entityId"))),
            ),
            StdLib.for(
              "v",
              StdLib.var("entityVerbs"),
              StdLib.seq(
                StdLib.let(
                  "key",
                  StringLib.strConcat(
                    ObjectLib.objGet(StdLib.var("v"), "name"),
                    ":",
                    StdLib.var("entityId"),
                  ),
                ),
                StdLib.if(
                  BooleanLib.not(
                    ObjectLib.objHas(StdLib.var("seen"), StdLib.var("key")),
                  ),
                  StdLib.seq(
                    ObjectLib.objSet(
                      StdLib.var("seen"),
                      StdLib.var("key"),
                      true,
                    ),
                    ObjectLib.objSet(
                      StdLib.var("v"),
                      "source",
                      StdLib.var("entityId"),
                    ),
                    ListLib.listPush(StdLib.var("verbs"), StdLib.var("v")),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),

      // 1. Player verbs
      StdLib.apply(
        StdLib.var("addVerbs"),
        ObjectLib.objGet(StdLib.var("player"), "id"),
      ),

      // 2. Room verbs
      StdLib.let(
        "locationId",
        ObjectLib.objGet(StdLib.var("player"), "location"),
      ),
      StdLib.if(
        StdLib.var("locationId"),
        StdLib.seq(
          StdLib.apply(StdLib.var("addVerbs"), StdLib.var("locationId")),

          // 3. Items in Room
          StdLib.let("room", CoreLib.entity(StdLib.var("locationId"))),
          StdLib.let(
            "contents",
            ObjectLib.objGet(StdLib.var("room"), "contents", ListLib.listNew()),
          ),
          StdLib.for(
            "itemId",
            StdLib.var("contents"),
            StdLib.apply(StdLib.var("addVerbs"), StdLib.var("itemId")),
          ),
        ),
      ),

      // 4. Inventory verbs
      StdLib.let(
        "inventory",
        ObjectLib.objGet(StdLib.var("player"), "contents", ListLib.listNew()),
      ),
      StdLib.for(
        "itemId",
        StdLib.var("inventory"),
        StdLib.apply(StdLib.var("addVerbs"), StdLib.var("itemId")),
      ),

      StdLib.var("verbs"),
    ),
  );

  addVerb(
    entityBaseId,
    "find",
    StdLib.seq(
      StdLib.let("query", StdLib.arg(0)),
      StdLib.let("locationId", ObjectLib.objGet(StdLib.caller(), "location")),
      StdLib.let("location", CoreLib.entity(StdLib.var("locationId"))),
      // Search contents only
      ListLib.listFind(
        ObjectLib.objGet(StdLib.var("location"), "contents", ListLib.listNew()),
        StdLib.lambda(
          ["id"],
          StdLib.seq(
            StdLib.let(
              "props",
              CoreLib.resolve_props(CoreLib.entity(StdLib.var("id"))),
            ),
            BooleanLib.eq(
              ObjectLib.objGet(StdLib.var("props"), "name"),
              StdLib.var("query"),
            ),
          ),
        ),
      ),
    ),
  );

  addVerb(
    entityBaseId,
    "find_exit",
    StdLib.seq(
      StdLib.let("query", StdLib.arg(0)),
      StdLib.let("locationId", ObjectLib.objGet(StdLib.caller(), "location")),
      StdLib.let("location", CoreLib.entity(StdLib.var("locationId"))),
      // Search exits
      ListLib.listFind(
        ObjectLib.objGet(StdLib.var("location"), "exits"),
        StdLib.lambda(
          ["id"],
          StdLib.seq(
            StdLib.let(
              "props",
              CoreLib.resolve_props(CoreLib.entity(StdLib.var("id"))),
            ),
            BooleanLib.or(
              BooleanLib.eq(
                ObjectLib.objGet(StdLib.var("props"), "name"),
                StdLib.var("query"),
              ),
              BooleanLib.eq(
                ObjectLib.objGet(StdLib.var("props"), "direction"),
                StdLib.var("query"),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  addVerb(
    entityBaseId,
    "on_enter",
    StdLib.seq(
      StdLib.let("mover", StdLib.arg(0)),
      StdLib.let(
        "cap",
        KernelLib.getCapability(
          "entity.control",
          ObjectLib.objNew([
            "target_id",
            ObjectLib.objGet(StdLib.this(), "id"),
          ]),
        ),
      ),
      StdLib.if(
        StdLib.var("cap"),
        StdLib.seq(
          StdLib.let(
            "contents",
            ObjectLib.objGet(StdLib.this(), "contents", ListLib.listNew()),
          ),
          ListLib.listPush(
            StdLib.var("contents"),
            ObjectLib.objGet(StdLib.var("mover"), "id"),
          ),
          CoreLib.set_entity(
            StdLib.var("cap"),
            ObjectLib.objSet(StdLib.this(), "contents", StdLib.var("contents")),
          ),
        ),
        StdLib.send("message", "The room refuses you."),
      ),
    ),
  );

  addVerb(
    entityBaseId,
    "on_leave",
    StdLib.seq(
      StdLib.let("mover", StdLib.arg(0)),
      StdLib.let(
        "cap",
        KernelLib.getCapability(
          "entity.control",
          ObjectLib.objNew([
            "target_id",
            ObjectLib.objGet(StdLib.this(), "id"),
          ]),
        ),
      ),
      StdLib.if(
        StdLib.var("cap"),
        StdLib.seq(
          StdLib.let(
            "contents",
            ObjectLib.objGet(StdLib.this(), "contents", ListLib.listNew()),
          ),
          StdLib.let(
            "newContents",
            ListLib.listFilter(
              StdLib.var("contents"),
              StdLib.lambda(
                ["id"],
                BooleanLib.neq(
                  StdLib.var("id"),
                  ObjectLib.objGet(StdLib.var("mover"), "id"),
                ),
              ),
            ),
          ),
          CoreLib.set_entity(
            StdLib.var("cap"),
            ObjectLib.objSet(
              StdLib.this(),
              "contents",
              StdLib.var("newContents"),
            ),
          ),
        ),
        StdLib.send("message", "The room refuses to let you go."),
      ),
    ),
  );

  addVerb(
    entityBaseId,
    "move",
    StdLib.seq(
      StdLib.let("arg", StdLib.arg(0)),
      StdLib.if(
        BooleanLib.not(StdLib.var("arg")),
        StdLib.send("message", "Where do you want to go?"),
        StdLib.seq(
          StdLib.let("destId", null),
          StdLib.if(
            BooleanLib.eq(StdLib.typeof(StdLib.var("arg")), "number"),
            StdLib.let("destId", StdLib.var("arg")),
            StdLib.seq(
              StdLib.let(
                "exitId",
                CoreLib.call(StdLib.this(), "find_exit", StdLib.var("arg")),
              ),
              StdLib.if(
                StdLib.var("exitId"),
                StdLib.let(
                  "destId",
                  ObjectLib.objGet(
                    CoreLib.resolve_props(CoreLib.entity(StdLib.var("exitId"))),
                    "destination",
                  ),
                ),
              ),
            ),
          ),
          StdLib.if(
            StdLib.var("destId"),
            StdLib.seq(
              StdLib.let("mover", StdLib.caller()),
              // Recursive Check
              StdLib.let("checkId", StdLib.var("destId")),
              StdLib.let("isRecursive", false),
              StdLib.while(
                StdLib.var("checkId"),
                StdLib.seq(
                  StdLib.if(
                    BooleanLib.eq(
                      StdLib.var("checkId"),
                      ObjectLib.objGet(StdLib.var("mover"), "id"),
                    ),
                    StdLib.seq(
                      StdLib.set("isRecursive", true),
                      StdLib.set("checkId", null), // Break
                    ),
                    // Step up
                    StdLib.set(
                      "checkId",
                      ObjectLib.objGet(
                        CoreLib.entity(StdLib.var("checkId")),
                        "location",
                        null,
                      ),
                    ),
                  ),
                ),
              ),
              StdLib.if(
                StdLib.var("isRecursive"),
                StdLib.send(
                  "message",
                  "You can't put something inside itself.",
                ),
                StdLib.seq(
                  StdLib.let(
                    "oldLocId",
                    ObjectLib.objGet(StdLib.var("mover"), "location"),
                  ),
                  StdLib.let("oldLoc", CoreLib.entity(StdLib.var("oldLocId"))),
                  StdLib.let("newLoc", CoreLib.entity(StdLib.var("destId"))),

                  // Leave old loc
                  CoreLib.call(
                    StdLib.var("oldLoc"),
                    "on_leave",
                    StdLib.var("mover"),
                  ),

                  // Enter new loc
                  CoreLib.call(
                    StdLib.var("newLoc"),
                    "on_enter",
                    StdLib.var("mover"),
                  ),

                  // Update mover location (needs self control)
                  StdLib.let(
                    "selfCap",
                    KernelLib.getCapability(
                      "entity.control",
                      ObjectLib.objNew([
                        "target_id",
                        ObjectLib.objGet(StdLib.var("mover"), "id"),
                      ]),
                    ),
                  ),

                  StdLib.if(
                    StdLib.var("selfCap"),
                    StdLib.seq(
                      ObjectLib.objSet(
                        StdLib.var("mover"),
                        "location",
                        StdLib.var("destId"),
                      ),
                      CoreLib.set_entity(
                        StdLib.var("selfCap"),
                        StdLib.var("mover"),
                      ),
                    ),
                    StdLib.send("message", "You cannot move yourself."),
                  ),

                  StdLib.send(
                    "room_id",
                    ObjectLib.objNew(["roomId", StdLib.var("destId")]),
                  ),
                  CoreLib.call(StdLib.caller(), "look"),
                ),
              ),
            ),
            StdLib.send("message", "That way leads nowhere."),
          ),
        ),
      ),
    ),
  );

  addVerb(
    entityBaseId,
    "say",
    StdLib.send("message", "Say is not yet implemented."),
  );

  addVerb(
    entityBaseId,
    "tell",
    StdLib.seq(
      StdLib.let("msg", StdLib.arg(0)),
      StdLib.send("message", StdLib.var("msg")),
    ),
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
    StdLib.if(
      ListLib.listEmpty(StdLib.args()),
      StdLib.seq(
        StdLib.let(
          "room",
          CoreLib.resolve_props(
            CoreLib.entity(ObjectLib.objGet(StdLib.caller(), "location")),
          ),
        ),
        StdLib.let(
          "contents",
          ObjectLib.objGet(StdLib.var("room"), "contents", ListLib.listNew()),
        ),
        StdLib.let(
          "exits",
          ObjectLib.objGet(StdLib.var("room"), "exits", ListLib.listNew()),
        ),
        StdLib.let(
          "resolvedContents",
          ListLib.listMap(
            StdLib.var("contents"),
            StdLib.lambda(
              ["id"],
              CoreLib.resolve_props(CoreLib.entity(StdLib.var("id"))),
            ),
          ),
        ),
        StdLib.let(
          "resolvedExits",
          ListLib.listMap(
            StdLib.var("exits"),
            StdLib.lambda(
              ["id"],
              CoreLib.resolve_props(CoreLib.entity(StdLib.var("id"))),
            ),
          ),
        ),
        StdLib.send(
          "update",
          ObjectLib.objNew([
            "entities",
            ListLib.listConcat(
              ListLib.listNew(StdLib.var("room")),
              ListLib.listConcat(
                StdLib.var("resolvedContents"),
                StdLib.var("resolvedExits"),
              ),
            ),
          ]),
        ),
      ),
      StdLib.seq(
        StdLib.let("targetName", StdLib.arg(0)),
        StdLib.let(
          "targetId",
          CoreLib.call(StdLib.caller(), "find", StdLib.var("targetName")),
        ),
        StdLib.if(
          StdLib.var("targetId"),
          StdLib.seq(
            StdLib.let(
              "target",
              CoreLib.resolve_props(CoreLib.entity(StdLib.var("targetId"))),
            ),
            StdLib.send(
              "update",
              ObjectLib.objNew([
                "entities",
                ListLib.listNew(StdLib.var("target")),
              ]),
            ),
          ),
          StdLib.send("message", "You don't see that here."),
        ),
      ),
    ),
  );

  addVerb(
    playerBaseId,
    "inventory",
    StdLib.seq(
      StdLib.let("player", CoreLib.resolve_props(StdLib.caller())),
      StdLib.let(
        "contents",
        ObjectLib.objGet(StdLib.var("player"), "contents", ListLib.listNew()),
      ),
      StdLib.let(
        "resolvedItems",
        ListLib.listMap(
          StdLib.var("contents"),
          StdLib.lambda(
            ["id"],
            CoreLib.resolve_props(CoreLib.entity(StdLib.var("id"))),
          ),
        ),
      ),
      StdLib.let(
        "finalList",
        ListLib.listConcat(
          ListLib.listNew(StdLib.var("player")),
          StdLib.var("resolvedItems"),
        ),
      ),
      StdLib.send(
        "update",
        ObjectLib.objNew(["entities", StdLib.var("finalList")]),
      ),
    ),
  );

  addVerb(
    playerBaseId,
    "whoami",
    StdLib.send(
      "player_id",
      ObjectLib.objNew(["playerId", ObjectLib.objGet(StdLib.caller(), "id")]),
    ),
  );

  addVerb(
    playerBaseId,
    "dig",
    StdLib.seq(
      StdLib.let("direction", StdLib.arg(0)),
      StdLib.let(
        "roomName",
        StringLib.strJoin(ListLib.listSlice(StdLib.args(), 1), " "),
      ),
      StdLib.if(
        BooleanLib.not(StdLib.var("direction")),
        StdLib.send("message", "Where do you want to dig?"),
        StdLib.seq(
          // Get Capabilities
          StdLib.let("createCap", KernelLib.getCapability("sys.create")),
          StdLib.let(
            "controlCap",
            KernelLib.getCapability(
              "entity.control",
              ObjectLib.objNew([
                "target_id",
                ObjectLib.objGet(StdLib.caller(), "location"),
              ]),
            ),
          ),
          // Try wildcard if specific control cap missing
          StdLib.if(
            BooleanLib.not(StdLib.var("controlCap")),
            StdLib.set(
              "controlCap",
              KernelLib.getCapability(
                "entity.control",
                ObjectLib.objNew(["*", true]),
              ),
            ),
          ),

          StdLib.if(
            BooleanLib.and(StdLib.var("createCap"), StdLib.var("controlCap")),
            StdLib.seq(
              StdLib.let("newRoomData", ObjectLib.objNew()),
              ObjectLib.objSet(
                StdLib.var("newRoomData"),
                "name",
                StdLib.var("roomName"),
              ),
              StdLib.let(
                "newRoomId",
                CoreLib.create(
                  StdLib.var("createCap"),
                  StdLib.var("newRoomData"),
                ),
              ),

              // Create exit
              StdLib.let("exitData", ObjectLib.objNew()),
              ObjectLib.objSet(
                StdLib.var("exitData"),
                "name",
                StdLib.var("direction"),
              ),
              ObjectLib.objSet(
                StdLib.var("exitData"),
                "location",
                ObjectLib.objGet(StdLib.caller(), "location"),
              ),
              ObjectLib.objSet(
                StdLib.var("exitData"),
                "direction",
                StdLib.var("direction"),
              ),
              ObjectLib.objSet(
                StdLib.var("exitData"),
                "destination",
                StdLib.var("newRoomId"),
              ),
              StdLib.let(
                "exitId",
                CoreLib.create(StdLib.var("createCap"), StdLib.var("exitData")),
              ),
              // Set prototype to Entity Base
              CoreLib.set_prototype(
                StdLib.var("controlCap"),
                CoreLib.entity(StdLib.var("newRoomId")),
                entityBaseId,
              ),

              // Update current room exits
              StdLib.let(
                "currentRoom",
                CoreLib.entity(ObjectLib.objGet(StdLib.caller(), "location")),
              ),
              StdLib.let(
                "currentExits",
                ObjectLib.objGet(
                  StdLib.var("currentRoom"),
                  "exits",
                  ListLib.listNew(),
                ),
              ),
              ListLib.listPush(
                StdLib.var("currentExits"),
                StdLib.var("exitId"),
              ),
              CoreLib.set_entity(
                StdLib.var("controlCap"),
                ObjectLib.objSet(
                  StdLib.var("currentRoom"),
                  "exits",
                  StdLib.var("currentExits"),
                ),
              ),

              // Move player
              CoreLib.call(StdLib.caller(), "move", StdLib.var("direction")),
            ),
            StdLib.send("message", "You do not have permission to dig here."),
          ),
        ),
      ),
    ),
  );

  addVerb(
    playerBaseId,
    "create",
    StdLib.seq(
      StdLib.let("name", StdLib.arg(0)),
      StdLib.if(
        BooleanLib.not(StdLib.var("name")),
        StdLib.send("message", "What do you want to create?"),
        StdLib.seq(
          // Get Capabilities
          StdLib.let("createCap", KernelLib.getCapability("sys.create")),
          StdLib.let(
            "controlCap",
            KernelLib.getCapability(
              "entity.control",
              ObjectLib.objNew([
                "target_id",
                ObjectLib.objGet(StdLib.caller(), "location"),
              ]),
            ),
          ),
          // Try wildcard
          StdLib.if(
            BooleanLib.not(StdLib.var("controlCap")),
            StdLib.set(
              "controlCap",
              KernelLib.getCapability(
                "entity.control",
                ObjectLib.objNew(["*", true]),
              ),
            ),
          ),

          StdLib.if(
            BooleanLib.and(StdLib.var("createCap"), StdLib.var("controlCap")),
            StdLib.seq(
              StdLib.let("itemData", ObjectLib.objNew()),
              ObjectLib.objSet(
                StdLib.var("itemData"),
                "name",
                StdLib.var("name"),
              ),
              ObjectLib.objSet(
                StdLib.var("itemData"),
                "location",
                ObjectLib.objGet(StdLib.caller(), "location"),
              ),
              StdLib.let(
                "itemId",
                CoreLib.create(StdLib.var("createCap"), StdLib.var("itemData")),
              ),
              // Set prototype to Entity Base
              CoreLib.set_prototype(
                StdLib.var("controlCap"),
                CoreLib.entity(StdLib.var("itemId")),
                entityBaseId,
              ),

              // Update room contents
              StdLib.let(
                "room",
                CoreLib.entity(ObjectLib.objGet(StdLib.caller(), "location")),
              ),
              StdLib.let(
                "contents",
                ObjectLib.objGet(
                  StdLib.var("room"),
                  "contents",
                  ListLib.listNew(),
                ),
              ),
              ListLib.listPush(StdLib.var("contents"), StdLib.var("itemId")),
              CoreLib.set_entity(
                StdLib.var("controlCap"),
                ObjectLib.objSet(
                  StdLib.var("room"),
                  "contents",
                  StdLib.var("contents"),
                ),
              ),

              StdLib.send(
                "message",
                StringLib.strConcat("You create ", StdLib.var("name"), "."),
              ),
              CoreLib.call(StdLib.caller(), "look"),
              // Return item ID
              StdLib.var("itemId"),
            ),
            StdLib.send(
              "message",
              "You do not have permission to create here.",
            ),
          ),
        ),
      ),
    ),
  );

  addVerb(
    playerBaseId,
    "set",
    StdLib.seq(
      StdLib.let("targetName", StdLib.arg(0)),
      StdLib.let("propName", StdLib.arg(1)),
      StdLib.let("value", StdLib.arg(2)),
      StdLib.if(
        BooleanLib.or(
          BooleanLib.not(StdLib.var("targetName")),
          BooleanLib.not(StdLib.var("propName")),
        ),
        StdLib.send("message", "Usage: set <target> <prop> <value>"),
        StdLib.seq(
          StdLib.let(
            "targetId",
            CoreLib.call(StdLib.this(), "find", StdLib.var("targetName")),
          ),
          StdLib.if(
            StdLib.var("targetId"),
            StdLib.seq(
              StdLib.seq(
                // Get Capability
                StdLib.let(
                  "controlCap",
                  KernelLib.getCapability(
                    "entity.control",
                    ObjectLib.objNew(["target_id", StdLib.var("targetId")]),
                  ),
                ),
                StdLib.if(
                  BooleanLib.not(StdLib.var("controlCap")),
                  StdLib.set(
                    "controlCap",
                    KernelLib.getCapability(
                      "entity.control",
                      ObjectLib.objNew(["*", true]),
                    ),
                  ),
                ),
                StdLib.if(
                  StdLib.var("controlCap"),
                  StdLib.seq(
                    CoreLib.set_entity(
                      StdLib.var("controlCap"),
                      ObjectLib.objMerge(
                        CoreLib.entity(StdLib.var("targetId")),
                        ObjectLib.objNew([
                          StdLib.var("propName"),
                          StdLib.var("value"),
                        ]),
                      ),
                    ),
                    StdLib.send("message", "Property set."),
                  ),
                  StdLib.send(
                    "message",
                    "You do not have permission to modify this object.",
                  ),
                ),
              ),
            ),
            StdLib.send("message", "I don't see that here."),
          ),
        ),
      ),
    ),
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
    adjectives: [
      "color:black",
      "effect:shiny",
      "material:stone",
      "material:obsidian",
    ],
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
    adjectives: [
      "color:gold",
      "weight:heavy",
      "material:metal",
      "material:gold",
    ],
  });

  createEntity({
    name: "Platinum Ring",
    location: gemstoreId,
    description: "A precious platinum ring.",
    adjectives: [
      "color:platinum",
      "value:precious",
      "material:metal",
      "material:platinum",
    ],
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

  addVerb(
    watchId,
    "tell",
    StdLib.send("message", TimeLib.timeFormat(TimeLib.timeNow(), "time")),
  );

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
    StdLib.seq(
      StdLib.let("mover", StdLib.caller()),
      StdLib.let("destId", ObjectLib.objGet(StdLib.this(), "destination")),
      StdLib.let("oldLocId", ObjectLib.objGet(StdLib.var("mover"), "location")),
      StdLib.let("oldLoc", CoreLib.entity(StdLib.var("oldLocId"))),
      StdLib.let("newLoc", CoreLib.entity(StdLib.var("destId"))),
      CoreLib.set_entity(
        // Update mover
        ObjectLib.objMerge(
          StdLib.var("mover"),
          ObjectLib.objNew(["location", StdLib.var("destId")]),
        ),
        // Update old location
        ObjectLib.objMerge(
          StdLib.var("oldLoc"),
          ObjectLib.objNew([
            "contents",
            ListLib.listFilter(
              ObjectLib.objGet(StdLib.var("oldLoc"), "contents"),
              StdLib.lambda(
                ["id"],
                BooleanLib.neq(
                  StdLib.var("id"),
                  ObjectLib.objGet(StdLib.var("mover"), "id"),
                ),
              ),
            ),
          ]),
        ),
        // Update new location
        ObjectLib.objMerge(
          StdLib.var("newLoc"),
          ObjectLib.objNew([
            "contents",
            ListLib.listConcat(
              ObjectLib.objGet(StdLib.var("newLoc"), "contents"),
              ListLib.listNew(ObjectLib.objGet(StdLib.var("mover"), "id")),
            ),
          ]),
        ),
      ),
      StdLib.send("message", "Whoosh! You have been teleported."),
    ),
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
    StdLib.send("message", "Status check disabled."),
  );

  console.log("Seeding complete!");

  // Color Library
  const colorLibId = createEntity({
    name: "Color Library", // Or a system object
    location: voidId, // Hidden
    props: {
      colors: [
        "red",
        "green",
        "blue",
        "purple",
        "orange",
        "yellow",
        "cyan",
        "magenta",
      ],
    },
  });

  addVerb(
    colorLibId,
    "random_color",
    ListLib.listGet(
      ObjectLib.objGet(StdLib.this(), "colors"),
      // random(0, len-1)
      MathLib.random(
        0,
        MathLib.sub(
          ListLib.listLen(ObjectLib.objGet(StdLib.this(), "colors")),
          1,
        ),
      ),
    ),
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
    StdLib.seq(
      StdLib.let("libId", ObjectLib.objGet(StdLib.this(), "color_lib")),
      StdLib.let("newColor", CoreLib.call(StdLib.var("libId"), "random_color")),
      CoreLib.set_entity(
        ObjectLib.objSet(
          StdLib.this(),
          "adjectives",
          ListLib.listNew(
            StringLib.strConcat("color:", StdLib.var("newColor")),
            "material:silver",
          ),
        ),
      ),
      CoreLib.schedule("update_color", ListLib.listNew(), 5000),
    ),
  );

  // Kickoff
  // We need a way to start it. Let's add a 'touch' verb to start it.
  addVerb(
    moodRingId,
    "touch",
    CoreLib.schedule("update_color", ListLib.listNew(), 0),
  );

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
    ListLib.listNew(
      StringLib.strConcat(
        "color:hsl(",
        StringLib.strConcat(
          MathLib.mul(TimeLib.timeToTimestamp(TimeLib.timeNow()), 0.1),
          ", 100%, 50%)",
        ),
      ), // Rotating hue
      "material:gold",
    ),
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
    StdLib.seq(
      // broadcast missing
      StdLib.send(
        "message",
        StringLib.strConcat(
          "Tick Tock: ",
          TimeLib.timeFormat(TimeLib.timeNow(), "time"),
        ),
      ),
      CoreLib.schedule("tick", ListLib.listNew(), 10000),
    ),
  );
  addVerb(
    specialWatchId,
    "start",
    CoreLib.schedule("tick", ListLib.listNew(), 0),
  );

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
    StdLib.seq(
      // broadcast missing
      StdLib.send(
        "message",
        StringLib.strConcat(
          "BONG! It is ",
          TimeLib.timeFormat(TimeLib.timeNow(), "time"),
        ),
      ),
      CoreLib.schedule("tick", ListLib.listNew(), 15000),
    ),
  );
  addVerb(clockId, "start", CoreLib.schedule("tick", ListLib.listNew(), 0));

  // 4. Clock Tower (Global Broadcast)
  const towerId = createEntity({
    name: "Clock Tower", // Or ROOM/BUILDING
    location: voidId, // Hidden, or visible somewhere
    props: { description: "The source of time." },
  });

  addVerb(
    towerId,
    "toll",
    StdLib.seq(
      // broadcast missing
      StdLib.send(
        "message",
        StringLib.strConcat(
          "The Clock Tower tolls: ",
          TimeLib.timeFormat(TimeLib.timeNow(), "time"),
        ),
      ),
      CoreLib.schedule("toll", ListLib.listNew(), 60000),
    ),
  );
  addVerb(towerId, "start", CoreLib.schedule("toll", ListLib.listNew(), 0));

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
    StdLib.send("message", "Deposit disabled."),
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
