import {
  createEntity,
  addVerb,
  updateVerb,
  getVerb,
  createCapability,
  updateEntity,
  getEntity,
} from "../repo";
import { transpile } from "@viwo/scripting";

export function seedHotel(lobbyId: number, voidId: number, entityBaseId: number) {
  // Hotel Implementation
  const exitPrototypeId = 1;

  // Hotel Lobby
  const hotelLobbyProps = {
    name: "Grand Hotel Lobby",
    location: voidId,
    description: "The lavish lobby of the Grand Hotel. The elevator is to the side.",
  };
  const hotelLobbyId = createEntity(hotelLobbyProps, entityBaseId);

  createCapability(hotelLobbyId, "entity.control", { target_id: hotelLobbyId });

  // Connect Hotel Lobby to Main Lobby
  const hotelExitId = createEntity(
    {
      name: "hotel",
      location: lobbyId,
      direction: "hotel",
      destination: hotelLobbyId,
    },
    exitPrototypeId,
  );

  const outExitId = createEntity(
    {
      name: "out",
      location: hotelLobbyId,
      direction: "out",
      destination: lobbyId,
    },
    exitPrototypeId,
  );

  const lobby = getEntity(lobbyId)!;
  updateEntity({
    ...lobby,
    exits: [...((lobby["exits"] as never[]) ?? []), hotelExitId],
  });
  updateEntity({ id: hotelLobbyId, ...hotelLobbyProps, exits: [outExitId] });

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
    transpile(`
      call(caller(), "teleport", entity(${hotelLobbyId}));
      call(caller(), "tell", "You leave the room and it fades away behind you.");
      const cap = get_capability("entity.control", { target_id: this_().id });
      destroy(cap, this_());
    `),
  );

  // Update 'leave' verb to use prop
  updateVerb(
    getVerb(hotelRoomProtoId, "leave")!.id,
    transpile(`
      const lobbyId = obj.get(this_(), "lobby_id");
      call(caller(), "teleport", entity(lobbyId));
      call(caller(), "tell", "You leave the room and it fades away behind you.");
      const freshThis = entity(this_().id);
      const contents = obj.get(freshThis, "contents", list.new());
      for (const itemId of contents) {
        const item = entity(itemId);
        if (item) {
          const itemCap = get_capability("entity.control", { target_id: item.id });
          destroy(itemCap, item);
        }
      }
      const cap = get_capability("entity.control", { target_id: this_().id });
      destroy(cap, this_());
    `),
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
    transpile(`
      const floor = arg(0);
      obj.set(this_(), "current_floor", floor);
      set_entity(get_capability("entity.control"), this_());
      call(caller(), "tell", str.concat("The elevator hums and moves to floor ", floor, "."));
    `),
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

  // enter <room_number>
  addVerb(
    wingProtoId,
    "enter",
    transpile(`
      const roomNum = arg(0);
      let valid = true;
      const side = obj.get(this_(), "side");
      if (side == "West") {
        if (roomNum < 1 || roomNum > 50) {
          call(caller(), "tell", "Room numbers in the West Wing are 1-50.");
          valid = false;
        }
      }
      if (side == "East") {
        if (roomNum < 51 || roomNum > 99) {
          call(caller(), "tell", "Room numbers in the East Wing are 51-99.");
          valid = false;
        }
      }

      if (valid) {
        const createCap = get_capability("sys.create");
        const roomData = obj.new();
        obj.set(roomData, "name", str.concat("Room ", roomNum));
        obj.set(roomData, "kind", "ROOM");
        obj.set(roomData, "description", "A standard hotel room.");
        obj.set(roomData, "lobby_id", this_().id);
        const roomId = create(createCap, roomData);
        
        const roomFilter = obj.new();
        obj.set(roomFilter, "target_id", roomId);
        set_prototype(
          get_capability("entity.control", roomFilter),
          entity(roomId),
          ${hotelRoomProtoId}
        );

        // Bed
        const bedData = obj.new();
        obj.set(bedData, "name", "Bed");
        obj.set(bedData, "kind", "ITEM");
        obj.set(bedData, "location", roomId);
        const bedId = create(createCap, bedData);
        const bedFilter = obj.new();
        obj.set(bedFilter, "target_id", bedId);
        set_prototype(
          get_capability("entity.control", bedFilter),
          entity(bedId),
          ${bedProtoId}
        );
        give_capability(
          get_capability("entity.control", bedFilter),
          entity(roomId)
        );

        // Lamp
        const lampData = obj.new();
        obj.set(lampData, "name", "Lamp");
        obj.set(lampData, "kind", "ITEM");
        obj.set(lampData, "location", roomId);
        const lampId = create(createCap, lampData);
        const lampFilter = obj.new();
        obj.set(lampFilter, "target_id", lampId);
        set_prototype(
          get_capability("entity.control", lampFilter),
          entity(lampId),
          ${lampProtoId}
        );
        give_capability(
          get_capability("entity.control", lampFilter),
          entity(roomId)
        );

        // Chair
        const chairData = obj.new();
        obj.set(chairData, "name", "Chair");
        obj.set(chairData, "kind", "ITEM");
        obj.set(chairData, "location", roomId);
        const chairId = create(createCap, chairData);
        const chairFilter = obj.new();
        obj.set(chairFilter, "target_id", chairId);
        set_prototype(
          get_capability("entity.control", chairFilter),
          entity(chairId),
          ${chairProtoId}
        );
        give_capability(
          get_capability("entity.control", chairFilter),
          entity(roomId)
        );

        // Update Room Contents
        const room = entity(roomId);
        const contents = list.new();
        list.push(contents, bedId);
        list.push(contents, lampId);
        list.push(contents, chairId);
        obj.set(room, "contents", contents);
        set_entity(
          get_capability("entity.control", roomFilter),
          room
        );

        give_capability(
          delegate(
            get_capability("entity.control", roomFilter),
            {}
          ),
          entity(roomId)
        );

        call(caller(), "teleport", entity(roomId));
        call(caller(), "tell", str.concat("You enter Room ", roomNum, "."));
      }
    `),
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
    transpile(`
      const msg = arg(0);
      const speakerId = arg(1);
      if (str.includes(str.lower(msg), "room")) {
        call(caller(), "say", "We have lovely rooms available on floors 1-100. Just use the elevator!");
      }
      if (str.includes(str.lower(msg), "hello")) {
        call(caller(), "say", "Welcome to the Grand Hotel! How may I help you?");
      }
    `),
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
    transpile(`
      const msg = arg(0);
      const type = arg(2);
      if (type == "tell") {
        call(caller(), "say", str.concat("Golem echoes: ", msg));
      }
    `),
  );
}
