import { createEntity, addVerb } from "../repo";
import { transpile } from "@viwo/scripting";
import { extractVerb } from "../verb_loader";
import { resolve } from "path";

const verbsPath = resolve(__dirname, "verbs.ts");

export function seedHotel(lobbyId: number, voidId: number) {
  // 1. Hotel Lobby (already exists as lobbyId, passed in)
  // We'll add some specific hotel logic to it later if needed.

  // 2. Elevator
  const elevatorId = createEntity({
    name: "Glass Elevator",
    location: lobbyId,
    description: "A shiny glass elevator that can take you to any floor.",
    current_floor: 1,
  });

  addVerb(elevatorId, "push", transpile(extractVerb(verbsPath, "elevator_push")));

  // 3. Floors and Rooms
  const floors = 5;
  const roomsPerFloor = 4;

  for (let f = 2; f <= floors; f++) {
    // Create a "Wing" or "Hallway" for each floor
    const wingId = createEntity({
      name: `Floor ${f} Hallway`,
      location: voidId, // Initially in void, reachable via elevator
      description: `The hallway for the ${f}th floor.`,
    });

    // Link Elevator to Wing (conceptually - elevator needs logic to move there)
    // For now, let's just say the elevator can teleport you there.
    // Updating the elevator push verb to handle this would be complex in this loop.
    // Instead, let's just make the elevator have a "go" verb that teleports.

    // Actually, let's make the Wing have an "enter" verb that the elevator calls?
    // Or better: The elevator is a vehicle.
    // When you push a button, the elevator moves to that floor (location).
    // So we need to set the elevator's location to the wing?
    // No, the elevator is IN the lobby. If it moves to floor 2, it should be IN floor 2 hallway?
    // Or maybe the hallway is IN the elevator shaft?
    // Let's keep it simple: Elevator stays in Lobby, but teleports you to the Wing.
    // Wait, that's a teleporter.
    // Real elevator: You enter it. It moves. You exit.
    // So Elevator needs to change its location.
    // So we need to create the Wings first.

    // Create Rooms for this floor
    for (let r = 1; r <= roomsPerFloor; r++) {
      const roomNumber = f * 100 + r;
      const roomId = createEntity({
        name: `Room ${roomNumber}`,
        location: wingId,
        description: "A standard hotel room.",
        room_number: roomNumber,
        owner: null, // Available
      });

      // Room needs a way to leave (back to hallway)
      // And maybe a lock?

      // We need to override on_leave to handle locking/unlocking if we want.
      // For now, just standard movement.

      // Let's add a custom on_leave that notifies the lobby if the owner leaves?
      // Or maybe just auto-locks?

      addVerb(
        roomId,
        "leave",
        transpile(
          extractVerb(verbsPath, "hotel_room_leave").replace(
            "HOTEL_LOBBY_ID_PLACEHOLDER",
            String(lobbyId),
          ),
        ),
      );
    }

    // Add 'enter' verb to Wing to describe it
    addVerb(wingId, "enter", transpile(extractVerb(verbsPath, "wing_enter")));
  }

  // 4. NPCs

  // Receptionist
  const receptionistId = createEntity({
    name: "Receptionist",
    location: lobbyId,
    description: "A friendly receptionist standing behind the desk.",
  });

  addVerb(receptionistId, "on_hear", transpile(extractVerb(verbsPath, "receptionist_on_hear")));

  // Golem
  const golemId = createEntity({
    name: "Security Golem",
    location: lobbyId,
    description: "A massive stone golem guarding the entrance.",
  });

  addVerb(golemId, "on_hear", transpile(extractVerb(verbsPath, "golem_on_hear")));
}
