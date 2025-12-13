import { addVerb, createCapability, createEntity, getEntity, updateEntity } from "../repo";
import { loadEntityDefinition } from "./loader";
import { resolve } from "node:path";
import { transpile } from "@viwo/scripting";

export function seedHotel(voidId: number, lobbyId: number) {
  // 12. Hotel Seed (Stage 1)

  // Load Hotel Definitions
  const managerDef = loadEntityDefinition(
    resolve(__dirname, "./definitions/Hotel.ts"),
    "HotelManager",
  );

  const roomProtoDef = loadEntityDefinition(
    resolve(__dirname, "./definitions/Hotel.ts"),
    "HotelRoomPrototype",
  );

  // Create Hotel Manager
  const hotelManagerId = createEntity({
    description: "The concierge of the Grand Hotel.",
    location: voidId,
    name: "Hotel Manager",
  });

  // Grant capabilities
  createCapability(hotelManagerId, "sys.create", {});
  createCapability(hotelManagerId, "entity.control", { "*": true });

  // Add Manager Verbs
  for (const [name, code] of managerDef.verbs) {
    addVerb(hotelManagerId, name, code);
  }

  // Prototypes
  const hotelRoomProtoId = createEntity({
    description: "A standard hotel room.",
    name: "Hotel Room Prototype",
  });

  for (const [name, code] of roomProtoDef.verbs) {
    addVerb(hotelRoomProtoId, name, code);
  }

  const hotelLobbyProtoId = createEntity({
    description: "Points to the Hotel Manager.",
    name: "Hotel Lobby Prototype",
  });

  // Configure Manager with Prototypes
  updateEntity({
    ...getEntity(hotelManagerId)!,
    active_rooms: [],
    lobby_id: null,
    lobby_proto_id: hotelLobbyProtoId,
    room_proto_id: hotelRoomProtoId,
  });

  // Link Hotel Entry to Lobby (Optional/Temporary)
  // Let's add 'hotel' verb to Lobby to call manager:enter
  addVerb(lobbyId, "hotel", transpile(`call(entity(${hotelManagerId}), "enter")`));
}
