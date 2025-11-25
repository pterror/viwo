import { WebSocketServer, WebSocket } from "ws";
import { db } from "./db";
import { seed } from "./seed";
import { getEntity, getContents } from "./repo";

seed();

const wss = new WebSocketServer({ port: 8080 });

console.log("Viwo Core Server running on port 8080");

interface Client extends WebSocket {
  playerId?: number;
}

wss.on("connection", (ws: Client) => {
  console.log("New client connected");

  // Auto-login as the Guest player for now
  const guest = db
    .query("SELECT id FROM entities WHERE name = 'Guest'")
    .get() as { id: number };
  if (guest) {
    ws.playerId = guest.id;
    ws.send(`Welcome to Viwo! You are logged in as Guest (ID: ${guest.id}).`);
  } else {
    ws.send("Error: Guest player not found. Please re-seed.");
  }

  ws.on("message", (message) => {
    let data: unknown;
    try {
      data = JSON.parse(message.toString());
    } catch {
      ws.send("Error: Invalid JSON.");
      return;
    }

    if (!Array.isArray(data) || typeof data[0] !== "string") {
      ws.send(
        "Error: Invalid S-expression format. Expected [string, ...args].",
      );
      return;
    }

    const [command, ...args] = data as [string, ...any[]];
    console.log(
      `[Player ${ws.playerId}] Command: ${command}, Args: ${JSON.stringify(
        args,
      )}`,
    );

    if (!ws.playerId) return;

    const player = getEntity(ws.playerId);
    if (!player) return;

    if (command === "look") {
      if (!player.location_id) {
        ws.send("You are in the void.");
        return;
      }

      const room = getEntity(player.location_id);
      if (!room) {
        ws.send("Unknown location.");
        return;
      }

      const contents = getContents(room.id).filter((e) => e.id !== player.id);

      let output = `\n**${room.name}**\n`;
      output += `${room.props["description"] || "Nothing special."}\n`;

      if (contents.length > 0) {
        output += "\nYou see:\n";
        for (const item of contents) {
          output += `- ${item.name}`;
          if (item.location_detail) {
            output += ` (on ${item.location_detail})`;
          }
          const subContents = getContents(item.id);
          if (subContents.length > 0) {
            output += ` (containing: ${subContents
              .map((s) => s.name)
              .join(", ")})`;
          }
          output += "\n";
        }
      }

      ws.send(output);
    } else if (command === "inventory") {
      const items = getContents(player.id);
      if (items.length === 0) {
        ws.send("You are not carrying anything.");
      } else {
        ws.send(
          "You are carrying:\n" +
            items
              .map((i) => `- ${i.name} (${i.location_detail || "held"})`)
              .join("\n"),
        );
      }
    } else {
      ws.send(`Unknown command: ${command}`);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Keep the process alive
process.on("SIGINT", () => {
  console.log("Shutting down...");
  db.close();
  process.exit(0);
});
