import { serve } from "bun";
import { createEntity, getEntity, Entity, getVerbs } from "./repo";
import {
  createScriptContext,
  evaluate,
  registerLibrary,
  ScriptError,
  ScriptSystemContext,
} from "./scripting/interpreter";
import * as Core from "./scripting/lib/core";
import * as List from "./scripting/lib/list";
import * as Object from "./scripting/lib/object";
import * as String from "./scripting/lib/string";
import * as Time from "./scripting/lib/time";
import { seed } from "./seed";
import { PluginManager, CommandContext } from "./plugin";

export { PluginManager };
export type { CommandContext };
export type { Plugin, PluginContext } from "./plugin";

export const pluginManager = new PluginManager();

registerLibrary(Core);
registerLibrary(List);
registerLibrary(Object);
registerLibrary(String);
registerLibrary(Time);

// Seed the database
seed();

export function startServer(port: number = 8080) {
  const server = serve<{ userId: number }>({
    port,
    async fetch(req, server) {
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        if (server.upgrade(req, { data: { userId: 0 } })) {
          return;
        }
        return new Response("Upgrade failed", { status: 500 });
      }
      return new Response("Hello from Viwo Core!");
    },
    websocket: {
      async open(ws) {
        console.log("Client connected");
        // Create a temporary player for this session
        // In a real game, we'd handle login/auth
        const playerId = createEntity(
          {
            name: "Player",
            kind: "ACTOR",
            location: 1, // Start in The Void (or Lobby if seeded)
            description: "A new player.",
          },
          2, // Inherit from Player Base
        );

        ws.data = { userId: playerId };

        // Send initial state
        const player = getEntity(playerId);
        if (player) {
          ws.send(JSON.stringify({ type: "connected", payload: { playerId } }));
        }
      },
      async message(ws, message) {
        const data = JSON.parse(message as string);
        const player = getEntity(ws.data.userId);

        if (!player) return;

        if (data.type === "command") {
          const { command, args } = data.payload;
          console.log(`Command: ${command} args: ${args}`);

          // Handle built-in commands or scriptable verbs
          // We'll try to find a verb on the player, room, or items
          const verbs = await getAvailableVerbs(player);
          const verb = verbs.find((v) => v.name === command);

          if (verb) {
            try {
              await executeVerb(player, verb, args, ws);
            } catch (e: any) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  payload: { message: e.message },
                }),
              );
            }
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                payload: { message: "Unknown command." },
              }),
            );
          }
        }
      },
      close() {
        console.log("Client disconnected");
      },
    },
  });

  console.log(`Listening on localhost:${server.port}`);
  return server;
}

if (import.meta.main) {
  startServer();
}

// TODO: Move this to scripting too
async function getAvailableVerbs(player: Entity) {
  const verbs: { name: string; code: any; source: number }[] = [];
  const seen = new Set<string>();

  const addVerbs = (entityId: number) => {
    const entityVerbs = getVerbs(entityId);
    for (const v of entityVerbs) {
      const key = `${v.name}:${entityId}`;
      if (!seen.has(key)) {
        seen.add(key);
        verbs.push({ ...v, source: entityId });
      }
    }
  };

  // 1. Player verbs
  addVerbs(player.id);

  // 2. Room verbs
  const locationId = player["location"];
  if (typeof locationId === "number") {
    addVerbs(locationId);

    // 3. Items in Room
    // We need to resolve contents manually
    const room = getEntity(locationId);
    if (room) {
      const contentIds = (room["contents"] as number[]) || [];
      for (const id of contentIds) {
        addVerbs(id);
      }
    }
  }

  // 4. Inventory verbs
  const inventoryIds = player["contents"];
  if (Array.isArray(inventoryIds)) {
    for (const id of inventoryIds) {
      if (typeof id === "number") {
        addVerbs(id);
      }
    }
  }

  return verbs;
}

async function executeVerb(
  player: Entity,
  verb: { name: string; code: any; source: number },
  args: string[],
  ws: any,
) {
  const ctx = createScriptContext({
    caller: player,
    this: getEntity(verb.source)!,
    args,
    sys: createSystemContext(ws),
  });

  await evaluate(verb.code, ctx);
}

function createSystemContext(ws: WebSocket): ScriptSystemContext {
  return {
    send: (msg: unknown) => {
      if (typeof msg === "string") {
        ws.send(JSON.stringify({ type: "info", payload: { message: msg } }));
      } else {
        // Assume it's an object to send directly
        ws.send(JSON.stringify(msg));
      }
    },
    call: async (caller, targetId, verbName, args, warnings) => {
      const target = getEntity(targetId);
      if (!target) {
        throw new ScriptError(`Target ${targetId} not found`);
      }
      const verbs = getVerbs(targetId);
      const verb = verbs.find((v) => v.name === verbName);
      if (!verb) {
        throw new ScriptError(`Verb ${verbName} not found on ${targetId}`);
      }
      return await evaluate(
        verb.code,
        createScriptContext({
          caller,
          this: target,
          args,
          sys: createSystemContext(ws),
          warnings,
        }),
      );
    },
  };
}
