import { createEntity, addVerb, updateVerb, getVerb, createCapability } from "../repo";
import { StdLib, ObjectLib, StringLib, ListLib, BooleanLib } from "@viwo/scripting";
import * as CoreLib from "../runtime/lib/core";
import * as KernelLib from "../runtime/lib/kernel";

export function seedHotel(lobbyId: number, voidId: number, entityBaseId: number) {
  // 7. Hotel Implementation
  // 7. Hotel Implementation
  const exitPrototypeId = 1;

  // Hotel Lobby
  const hotelLobbyId = createEntity(
    {
      name: "Grand Hotel Lobby",
      location: voidId,
      description: "The lavish lobby of the Grand Hotel. The elevator is to the side.",
    },
    entityBaseId,
  );

  createCapability(hotelLobbyId, "entity.control", { target_id: hotelLobbyId });

  // Connect Hotel Lobby to Main Lobby
  createEntity(
    {
      name: "hotel",
      location: lobbyId,
      direction: "hotel",
      destination: hotelLobbyId,
    },
    exitPrototypeId,
  );

  createEntity(
    {
      name: "out",
      location: hotelLobbyId,
      direction: "out",
      destination: lobbyId,
    },
    exitPrototypeId,
  );

  // Hotel Room Prototype (Hidden)
  const hotelRoomProtoId = createEntity(
    {
      name: "Hotel Room Prototype",
      location: voidId,
      description: "A generic hotel room.",
    },
    entityBaseId,
  );

  // Verb: leave (on the prototype)
  // Moves player back to lobby and destroys the room
  addVerb(
    hotelRoomProtoId,
    "leave",
    StdLib.seq(
      CoreLib.call(StdLib.caller(), "teleport", CoreLib.entity(hotelLobbyId)), // Move player out first
      CoreLib.call(StdLib.caller(), "tell", "You leave the room and it fades away behind you."),
      StdLib.let(
        "cap",
        KernelLib.getCapability(
          "entity.control",
          ObjectLib.objNew(["target_id", ObjectLib.objGet(StdLib.this(), "id")]),
        ),
      ),
      CoreLib.destroy(StdLib.var("cap"), StdLib.this()), // Destroy the room
    ),
  );

  // Update 'leave' verb to use prop
  updateVerb(
    getVerb(hotelRoomProtoId, "leave")!.id,
    StdLib.seq(
      StdLib.let("lobbyId", ObjectLib.objGet(StdLib.this(), "lobby_id")),
      CoreLib.call(StdLib.caller(), "teleport", CoreLib.entity(StdLib.var("lobbyId"))),
      CoreLib.call(StdLib.caller(), "tell", "You leave the room and it fades away behind you."),
      // Destroy contents (furnishings)
      StdLib.let("freshThis", CoreLib.entity(ObjectLib.objGet(StdLib.this(), "id"))),
      StdLib.let(
        "contents",
        ObjectLib.objGet(StdLib.var("freshThis"), "contents", ListLib.listNew()),
      ),
      StdLib.for(
        "itemId",
        StdLib.var("contents"),
        StdLib.seq(
          StdLib.let("item", CoreLib.entity(StdLib.var("itemId"))),
          StdLib.if(
            StdLib.var("item"),
            StdLib.seq(
              StdLib.let(
                "itemCap",
                KernelLib.getCapability(
                  "entity.control",
                  ObjectLib.objNew(["target_id", ObjectLib.objGet(StdLib.var("item"), "id")]),
                ),
              ),
              CoreLib.destroy(StdLib.var("itemCap"), StdLib.var("item")),
            ),
          ),
        ),
      ),
      StdLib.let(
        "cap",
        KernelLib.getCapability(
          "entity.control",
          ObjectLib.objNew(["target_id", ObjectLib.objGet(StdLib.this(), "id")]),
        ),
      ),
      CoreLib.destroy(StdLib.var("cap"), StdLib.this()),
    ),
  );

  // 8. Hotel Elevator & Floors

  // Elevator (Persistent)
  const elevatorId = createEntity(
    {
      name: "Hotel Elevator",
      location: hotelLobbyId,
      description:
        "A polished brass elevator. Buttons for floors 1-100. Type 'push <floor>' to select.",
      current_floor: 1,
    },
    entityBaseId,
  );

  createCapability(elevatorId, "sys.create", {});
  createCapability(elevatorId, "entity.control", { target_id: elevatorId });

  // Link Lobby -> Elevator
  createEntity(
    {
      name: "elevator",
      location: hotelLobbyId,
      direction: "elevator",
      destination_id: elevatorId,
    },
    exitPrototypeId,
  );

  // Floor Lobby Prototype (Ephemeral)
  const floorLobbyProtoId = createEntity(
    {
      name: "Floor Lobby Proto",
      location: voidId,
      description: "A quiet carpeted lobby.",
    },
    entityBaseId,
  );

  // Wing Prototype (Ephemeral)
  const wingProtoId = createEntity(
    {
      name: "Wing Proto",
      location: voidId,
      description: "A long hallway lined with doors.",
    },
    entityBaseId,
  );

  // --- Elevator Verbs ---

  // push <floor>
  addVerb(
    elevatorId,
    "push",
    StdLib.seq(
      StdLib.let("floor", StdLib.arg(0)),
      ObjectLib.objSet(StdLib.this(), "current_floor", StdLib.var("floor")),
      CoreLib.set_entity(KernelLib.getCapability("entity.control"), StdLib.this()),
      CoreLib.call(
        StdLib.caller(),
        "tell",
        StringLib.strConcat("The elevator hums and moves to floor ", StdLib.var("floor"), "."),
      ),
    ),
  );

  // out (Exit Elevator to Floor Lobby)
  addVerb(
    elevatorId,
    "out",
    StdLib.seq(
      StdLib.let("floor", ObjectLib.objGet(StdLib.this(), "current_floor")),
      // If floor 1, go to Main Hotel Lobby? Or just create Floor 1 Lobby?
      // Let's say Floor 1 is the Main Lobby.
      StdLib.if(
        BooleanLib.eq(StdLib.var("floor"), 1),
        StdLib.seq(
          CoreLib.call(StdLib.caller(), "teleport", CoreLib.entity(StdLib.var("lobbyId"))),
          CoreLib.call(StdLib.caller(), "tell", "The doors open to the Grand Lobby."),
        ),
        StdLib.seq(
          // Create Ephemeral Floor Lobby
          StdLib.let("createCap", KernelLib.getCapability("sys.create")),
          StdLib.let("lobbyData", {}),
          ObjectLib.objSet(
            StdLib.var("lobbyData"),
            "name",
            StringLib.strConcat("Floor ", StdLib.var("floor"), " Lobby"),
          ),
          ObjectLib.objSet(StdLib.var("lobbyData"), "kind", "ROOM"),

          ObjectLib.objSet(
            StdLib.var("lobbyData"),
            "description",
            StringLib.strConcat(
              "The lobby of floor ",
              StdLib.var("floor"),
              ". West and East wings extend from here.",
            ),
          ),
          ObjectLib.objSet(StdLib.var("lobbyData"), "floor", StdLib.var("floor")),
          ObjectLib.objSet(StdLib.var("lobbyData"), "elevator_id", elevatorId),
          StdLib.let("lobbyId", CoreLib.create(StdLib.var("createCap"), StdLib.var("lobbyData"))),
          StdLib.let("filter", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("filter"), "target_id", StdLib.var("lobbyId")),
          CoreLib.set_prototype(
            KernelLib.getCapability("entity.control", StdLib.var("filter")),
            CoreLib.entity(StdLib.var("lobbyId")),
            floorLobbyProtoId,
          ),
          // Give capabilities to Lobby
          // 1. sys.create
          StdLib.let("lobbyCreateCap", KernelLib.delegate(StdLib.var("createCap"), {})),
          KernelLib.giveCapability(
            StdLib.var("lobbyCreateCap"),
            CoreLib.entity(StdLib.var("lobbyId")),
          ),
          // 2. entity.control (self)
          StdLib.let(
            "lobbyControlCap",
            KernelLib.delegate(KernelLib.getCapability("entity.control", StdLib.var("filter")), {}),
          ),
          KernelLib.giveCapability(
            StdLib.var("lobbyControlCap"),
            CoreLib.entity(StdLib.var("lobbyId")),
          ),

          CoreLib.call(StdLib.caller(), "teleport", CoreLib.entity(StdLib.var("lobbyId"))),
          CoreLib.call(
            StdLib.caller(),
            "tell",
            StringLib.strConcat("The doors open to Floor ", StdLib.var("floor"), "."),
          ),
        ),
      ),
    ),
  );

  // --- Floor Lobby Verbs ---

  // elevator (Return to Elevator)
  addVerb(
    floorLobbyProtoId,
    "elevator",
    StdLib.seq(
      StdLib.let("elevId", ObjectLib.objGet(StdLib.this(), "elevator_id")),
      CoreLib.call(StdLib.caller(), "teleport", CoreLib.entity(StdLib.var("elevId"))),
      CoreLib.call(StdLib.caller(), "tell", "You step back into the elevator."),
      StdLib.let(
        "cap",
        KernelLib.getCapability(
          "entity.control",
          ObjectLib.objNew(["target_id", ObjectLib.objGet(StdLib.this(), "id")]),
        ),
      ),
      CoreLib.destroy(StdLib.var("cap"), StdLib.this()),
    ),
  );

  // west (Create Left Wing)
  addVerb(
    floorLobbyProtoId,
    "west",
    StdLib.seq(
      StdLib.let("floor", ObjectLib.objGet(StdLib.this(), "floor")),
      StdLib.let("createCap", KernelLib.getCapability("sys.create")),
      StdLib.let("wingData", {}),
      ObjectLib.objSet(
        StdLib.var("wingData"),
        "name",
        StringLib.strConcat("Floor ", StdLib.var("floor"), " West Wing"),
      ),
      ObjectLib.objSet(StdLib.var("wingData"), "kind", "ROOM"),

      ObjectLib.objSet(
        StdLib.var("wingData"),
        "description",
        "A long hallway. Rooms 01-50 are here.",
      ),
      ObjectLib.objSet(StdLib.var("wingData"), "floor", StdLib.var("floor")),
      ObjectLib.objSet(StdLib.var("wingData"), "side", "West"),
      ObjectLib.objSet(StdLib.var("wingData"), "return_id", ObjectLib.objGet(StdLib.this(), "id")), // Return to THIS lobby
      StdLib.let("wingId", CoreLib.create(StdLib.var("createCap"), StdLib.var("wingData"))),
      StdLib.let("filter", ObjectLib.objNew()),
      ObjectLib.objSet(StdLib.var("filter"), "target_id", StdLib.var("wingId")),
      CoreLib.set_prototype(
        KernelLib.getCapability("entity.control", StdLib.var("filter")),
        CoreLib.entity(StdLib.var("wingId")),
        wingProtoId,
      ),
      // Give capabilities to Wing
      // 1. sys.create
      StdLib.let("wingCreateCap", KernelLib.delegate(StdLib.var("createCap"), {})),
      KernelLib.giveCapability(StdLib.var("wingCreateCap"), CoreLib.entity(StdLib.var("wingId"))),
      // 2. entity.control (self)
      StdLib.let(
        "wingControlCap",
        KernelLib.delegate(KernelLib.getCapability("entity.control", StdLib.var("filter")), {}),
      ),
      KernelLib.giveCapability(StdLib.var("wingControlCap"), CoreLib.entity(StdLib.var("wingId"))),

      CoreLib.call(StdLib.caller(), "move", CoreLib.entity(StdLib.var("wingId"))),
      CoreLib.call(StdLib.caller(), "tell", "You walk down the West Wing."),
    ),
  );

  // east (Create Right Wing)
  addVerb(
    floorLobbyProtoId,
    "east",
    StdLib.seq(
      StdLib.let("floor", ObjectLib.objGet(StdLib.this(), "floor")),
      StdLib.let("createCap", KernelLib.getCapability("sys.create")),
      StdLib.let("wingData", ObjectLib.objNew()),
      ObjectLib.objSet(
        StdLib.var("wingData"),
        "name",
        StringLib.strConcat("Floor ", StdLib.var("floor"), " East Wing"),
      ),
      ObjectLib.objSet(StdLib.var("wingData"), "kind", "ROOM"),

      ObjectLib.objSet(
        StdLib.var("wingData"),
        "description",
        "A long hallway. Rooms 51-99 are here.",
      ),
      ObjectLib.objSet(StdLib.var("wingData"), "floor", StdLib.var("floor")),
      ObjectLib.objSet(StdLib.var("wingData"), "side", "East"),
      ObjectLib.objSet(StdLib.var("wingData"), "return_id", ObjectLib.objGet(StdLib.this(), "id")),
      StdLib.let("wingId", CoreLib.create(StdLib.var("createCap"), StdLib.var("wingData"))),
      StdLib.let("filter", ObjectLib.objNew()),
      ObjectLib.objSet(StdLib.var("filter"), "target_id", StdLib.var("wingId")),
      CoreLib.set_prototype(
        KernelLib.getCapability("entity.control", StdLib.var("filter")),
        CoreLib.entity(StdLib.var("wingId")),
        wingProtoId,
      ),
      // Give capabilities to Wing
      // 1. sys.create
      StdLib.let("wingCreateCap", KernelLib.delegate(StdLib.var("createCap"), {})),
      KernelLib.giveCapability(StdLib.var("wingCreateCap"), CoreLib.entity(StdLib.var("wingId"))),
      // 2. entity.control (self)
      StdLib.let(
        "wingControlCap",
        KernelLib.delegate(KernelLib.getCapability("entity.control", StdLib.var("filter")), {}),
      ),
      KernelLib.giveCapability(StdLib.var("wingControlCap"), CoreLib.entity(StdLib.var("wingId"))),

      CoreLib.call(StdLib.caller(), "teleport", CoreLib.entity(StdLib.var("wingId"))),
      CoreLib.call(StdLib.caller(), "tell", "You walk down the East Wing."),
    ),
  );

  // Furnishings Prototypes
  const bedProtoId = createEntity({
    name: "Comfy Bed",
    location: voidId,
    description: "A soft, inviting bed with crisp white linens.",
  });

  const lampProtoId = createEntity({
    name: "Brass Lamp",
    location: voidId,
    description: "A polished brass lamp casting a warm glow.",
  });

  const chairProtoId = createEntity({
    name: "Velvet Chair",
    location: voidId,
    description: "A plush red velvet armchair.",
  });

  // --- Wing Verbs ---

  // back (Return to Floor Lobby)
  addVerb(
    wingProtoId,
    "back",
    StdLib.seq(
      StdLib.let("returnId", ObjectLib.objGet(StdLib.this(), "return_id")),
      CoreLib.call(StdLib.caller(), "teleport", CoreLib.entity(StdLib.var("returnId"))),
      CoreLib.call(StdLib.caller(), "tell", "You head back to the lobby."),
      StdLib.let(
        "cap",
        KernelLib.getCapability(
          "entity.control",
          ObjectLib.objNew(["target_id", ObjectLib.objGet(StdLib.this(), "id")]),
        ),
      ),
      CoreLib.destroy(StdLib.var("cap"), StdLib.this()),
    ),
  );

  // enter <room_number>
  addVerb(
    wingProtoId,
    "enter",
    StdLib.seq(
      StdLib.let("roomNum", StdLib.arg(0)),
      StdLib.let("valid", true),
      // Validate room number matches wing side
      StdLib.let("side", ObjectLib.objGet(StdLib.this(), "side")),
      StdLib.if(
        BooleanLib.eq(StdLib.var("side"), "West"),
        StdLib.if(
          BooleanLib.or(
            BooleanLib.lt(StdLib.var("roomNum"), 1),
            BooleanLib.gt(StdLib.var("roomNum"), 50),
          ),
          StdLib.seq(
            CoreLib.call(StdLib.caller(), "tell", "Room numbers in the West Wing are 1-50."),
            StdLib.set("valid", false),
          ),
        ),
      ),
      StdLib.if(
        BooleanLib.eq(StdLib.var("side"), "East"),
        StdLib.if(
          BooleanLib.or(
            BooleanLib.lt(StdLib.var("roomNum"), 51),
            BooleanLib.gt(StdLib.var("roomNum"), 99),
          ),
          StdLib.seq(
            CoreLib.call(StdLib.caller(), "tell", "Room numbers in the East Wing are 51-99."),
            StdLib.set("valid", false),
          ),
        ),
      ),
      // Execute if valid
      StdLib.if(
        StdLib.var("valid"),
        StdLib.seq(
          StdLib.let("createCap", KernelLib.getCapability("sys.create")),
          StdLib.let("roomData", ObjectLib.objNew()),
          ObjectLib.objSet(
            StdLib.var("roomData"),
            "name",
            StringLib.strConcat("Room ", StdLib.var("roomNum")),
          ),
          ObjectLib.objSet(StdLib.var("roomData"), "kind", "ROOM"),

          ObjectLib.objSet(StdLib.var("roomData"), "description", "A standard hotel room."),
          ObjectLib.objSet(
            StdLib.var("roomData"),
            "lobby_id",
            ObjectLib.objGet(StdLib.this(), "id"),
          ), // Return to THIS wing
          StdLib.let("roomId", CoreLib.create(StdLib.var("createCap"), StdLib.var("roomData"))),
          StdLib.let("roomFilter", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("roomFilter"), "target_id", StdLib.var("roomId")),
          CoreLib.set_prototype(
            KernelLib.getCapability("entity.control", StdLib.var("roomFilter")),
            CoreLib.entity(StdLib.var("roomId")),
            hotelRoomProtoId,
          ),
          // Furnish the room
          StdLib.let("bedData", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("bedData"), "name", "Bed"),
          ObjectLib.objSet(StdLib.var("bedData"), "kind", "ITEM"),
          ObjectLib.objSet(StdLib.var("bedData"), "location", StdLib.var("roomId")),
          StdLib.let("bedId", CoreLib.create(StdLib.var("createCap"), StdLib.var("bedData"))),
          StdLib.let("bedFilter", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("bedFilter"), "target_id", StdLib.var("bedId")),
          CoreLib.set_prototype(
            KernelLib.getCapability("entity.control", StdLib.var("bedFilter")),
            CoreLib.entity(StdLib.var("bedId")),
            bedProtoId,
          ),
          KernelLib.giveCapability(
            KernelLib.getCapability("entity.control", StdLib.var("bedFilter")),
            CoreLib.entity(StdLib.var("roomId")),
          ),
          StdLib.let("lampData", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("lampData"), "name", "Lamp"),
          ObjectLib.objSet(StdLib.var("lampData"), "kind", "ITEM"),
          ObjectLib.objSet(StdLib.var("lampData"), "location", StdLib.var("roomId")),
          StdLib.let("lampId", CoreLib.create(StdLib.var("createCap"), StdLib.var("lampData"))),
          StdLib.let("lampFilter", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("lampFilter"), "target_id", StdLib.var("lampId")),
          CoreLib.set_prototype(
            KernelLib.getCapability("entity.control", StdLib.var("lampFilter")),
            CoreLib.entity(StdLib.var("lampId")),
            lampProtoId,
          ),
          KernelLib.giveCapability(
            KernelLib.getCapability("entity.control", StdLib.var("lampFilter")),
            CoreLib.entity(StdLib.var("roomId")),
          ),
          StdLib.let("chairData", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("chairData"), "name", "Chair"),
          ObjectLib.objSet(StdLib.var("chairData"), "kind", "ITEM"),
          ObjectLib.objSet(StdLib.var("chairData"), "location", StdLib.var("roomId")),
          StdLib.let("chairId", CoreLib.create(StdLib.var("createCap"), StdLib.var("chairData"))),
          StdLib.let("chairFilter", ObjectLib.objNew()),
          ObjectLib.objSet(StdLib.var("chairFilter"), "target_id", StdLib.var("chairId")),
          CoreLib.set_prototype(
            KernelLib.getCapability("entity.control", StdLib.var("chairFilter")),
            CoreLib.entity(StdLib.var("chairId")),
            chairProtoId,
          ),
          KernelLib.giveCapability(
            KernelLib.getCapability("entity.control", StdLib.var("chairFilter")),
            CoreLib.entity(StdLib.var("roomId")),
          ),

          // Update Room Contents
          StdLib.let("room", CoreLib.entity(StdLib.var("roomId"))),
          StdLib.let("contents", ListLib.listNew()),
          ListLib.listPush(StdLib.var("contents"), StdLib.var("bedId")),
          ListLib.listPush(StdLib.var("contents"), StdLib.var("lampId")),
          ListLib.listPush(StdLib.var("contents"), StdLib.var("chairId")),
          ObjectLib.objSet(StdLib.var("room"), "contents", StdLib.var("contents")),
          CoreLib.set_entity(
            KernelLib.getCapability("entity.control", StdLib.var("roomFilter")),
            StdLib.var("room"),
          ),

          KernelLib.giveCapability(
            KernelLib.delegate(
              KernelLib.getCapability("entity.control", StdLib.var("roomFilter")),
              {},
            ),
            CoreLib.entity(StdLib.var("roomId")),
          ),

          CoreLib.call(StdLib.caller(), "teleport", CoreLib.entity(StdLib.var("roomId"))),
          CoreLib.call(
            StdLib.caller(),
            "tell",
            StringLib.strConcat("You enter Room ", StdLib.var("roomNum"), "."),
          ),
        ),
      ),
    ),
  );

  // 9. NPCs

  // Receptionist (in Hotel Lobby)
  const receptionistId = createEntity({
    name: "Receptionist",
    location: hotelLobbyId,
    description: "A friendly receptionist standing behind the desk.",
  });

  addVerb(
    receptionistId,
    "on_hear",
    StdLib.seq(
      StdLib.let("msg", StdLib.arg(0)),
      StdLib.let("speakerId", StdLib.arg(1)),
      // Simple heuristics
      StdLib.if(
        StringLib.strIncludes(StringLib.strLower(StdLib.var("msg")), "room"),
        CoreLib.call(
          StdLib.caller(),
          "say",
          "We have lovely rooms available on floors 1-100. Just use the elevator!",
        ),
      ),
      StdLib.if(
        StringLib.strIncludes(StringLib.strLower(StdLib.var("msg")), "hello"),
        CoreLib.call(StdLib.caller(), "say", "Welcome to the Grand Hotel! How may I help you?"),
      ),
    ),
  );

  // Golem (in Void for now, maybe move to lobby?)
  // Let's put the Golem in the Hotel Lobby too for testing
  const golemId = createEntity({
    name: "Stone Golem",
    location: hotelLobbyId,
    description: "A massive stone golem. It seems to be listening.",
  });

  addVerb(
    golemId,
    "on_hear",
    StdLib.seq(
      StdLib.let("msg", StdLib.arg(0)),
      StdLib.let("type", StdLib.arg(2)),
      StdLib.if(
        BooleanLib.eq(StdLib.var("type"), "tell"),
        CoreLib.call(
          StdLib.caller(),
          "say",
          StringLib.strConcat("Golem echoes: ", StdLib.var("msg")),
        ),
      ),
    ),
  );
}
