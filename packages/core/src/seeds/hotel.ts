import { addVerb, createCapability, createEntity } from "../repo";
import { extractVerb } from "../verb_loader";
import { resolve } from "path";
import { transpile } from "@viwo/scripting";

const verbsPath = resolve(__dirname, "verbs.ts");

export function seedHotel(lobbyId: number, voidId: number, entityBaseId: number) {
  // 1. Hotel Lobby (already exists as lobbyId, passed in)
  addVerb(lobbyId, "room_vacated", transpile(extractVerb(verbsPath, "hotel_lobby_room_vacated")));

  // 1b. Room Prototype
  const roomProtoId = createEntity(
    {
      description: "A standard hotel room.",
      location: voidId,
      name: "Room Prototype",
    },
    entityBaseId,
  );
  addVerb(
    roomProtoId,
    "on_leave",
    transpile(
      extractVerb(verbsPath, "hotel_room_on_leave").replace(
        "HOTEL_LOBBY_ID_PLACEHOLDER",
        String(lobbyId),
      ),
    ),
  );

  // 1c. Wing Prototype
  const wingProtoId = createEntity(
    {
      description: "A hotel wing.",
      location: voidId,
      name: "Wing Prototype",
    },
    entityBaseId,
  );
  addVerb(wingProtoId, "on_enter", transpile(extractVerb(verbsPath, "wing_on_enter")));
  addVerb(
    wingProtoId,
    "enter",
    transpile(
      extractVerb(verbsPath, "wing_enter_room").replace(
        "HOTEL_ROOM_PROTO_ID_PLACEHOLDER",
        String(roomProtoId),
      ),
    ),
  );

  // 2. Elevator
  const elevatorId = createEntity(
    {
      current_floor: 1,
      description: "A shiny glass elevator that can take you to any floor.",
      floors: {},
      location: lobbyId,
      name: "Glass Elevator",
    },
    entityBaseId,
  );
  createCapability(elevatorId, "entity.control", { target_id: elevatorId });

  addVerb(elevatorId, "push", transpile(extractVerb(verbsPath, "elevator_push")));
  addVerb(
    elevatorId,
    "go",
    transpile(
      extractVerb(verbsPath, "elevator_go").replace(
        "WING_PROTO_ID_PLACEHOLDER",
        String(wingProtoId),
      ),
    ),
  );

  // 3. Floors and Rooms
  // Floors are now created on demand by the elevator.
  // We need to give the elevator the ability to create things.
  createCapability(elevatorId, "sys.create", {});
  // Also needs control over everything to link exits?
  // Actually, when it creates a floor, it gets control of it.
  // But it needs to link the floor lobby to itself (the elevator).
  // The elevator is already created.

  // We also need to give the elevator the 'on_enter' verb so it can clean up floors when people leave them.
  // Wait, 'on_enter' on the elevator means when someone enters the elevator.
  // Yes, if they enter the elevator FROM a floor, we check if that floor is empty.
  addVerb(elevatorId, "on_enter", transpile(extractVerb(verbsPath, "elevator_on_enter")));

  // 4. NPCs
  const receptionistId = createEntity(
    {
      description: "A friendly receptionist standing behind the desk.",
      location: lobbyId,
      name: "Receptionist",
    },
    entityBaseId,
  );
  addVerb(receptionistId, "on_hear", transpile(extractVerb(verbsPath, "receptionist_on_hear")));

  const golemId = createEntity(
    {
      description: "A massive stone golem guarding the entrance.",
      location: lobbyId,
      name: "Security Golem",
    },
    entityBaseId,
  );
  addVerb(golemId, "on_hear", transpile(extractVerb(verbsPath, "golem_on_hear")));
}
