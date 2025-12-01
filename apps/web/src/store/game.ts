import { createStore } from "solid-js/store";

export type CommandArgument =
  | string
  | number
  | boolean
  | null
  | readonly CommandArgument[];

export type GameMessage =
  | { type: "message"; text: string }
  | { type: "error"; text: string };

export interface Entity {
  /** Unique ID of the entity */
  id: number;
  /**
   * Resolved properties (merged from prototype and instance).
   * Contains arbitrary game data like description, adjectives, custom_css.
   */
  [key: string]: unknown;
}

export interface UpdateMessage {
  type: "update";
  entities: Entity[];
}

export interface RoomChangeMessage {
  type: "room_change";
  roomId: number;
}

export interface PlayerIdMessage {
  type: "player_id";
  playerId: number;
}

interface GameState {
  responseResolveFunctions: Map<number, (value: any) => void>;
  isConnected: boolean;
  messages: GameMessage[];
  entities: Map<number, Entity>;
  roomId: number | null;
  playerId: number | null;
  inspectedItem: number | null;
  opcodes: any[] | null;
  socket: WebSocket | null;
}

const [state, setState] = createStore<GameState>({
  responseResolveFunctions: new Map(),
  isConnected: false,
  messages: [],
  entities: new Map(),
  roomId: null,
  playerId: null,
  inspectedItem: null,
  opcodes: null,
  socket: null,
});

let idCounter = 1;

export const gameStore = {
  state,

  connect: () => {
    if (state.isConnected) return;

    const socket = new WebSocket("ws://localhost:8080");
    setState("socket", socket);

    socket.onopen = () => {
      setState("isConnected", true);
      // Initial fetch
      gameStore.execute(["whoami"]);
      gameStore.execute(["look"]);
      gameStore.execute(["inventory"]);

      // Fetch opcodes
      socket?.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "get_opcodes",
          id: 0, // Static ID for now
          params: [],
        }),
      );
    };

    socket.onclose = () => {
      setState("isConnected", false);
      gameStore.addMessage({
        type: "error",
        text: "Disconnected from server.",
      });
      setState("socket", null);
    };

    const handleServerMessage = (msg: any) => {
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "update") {
        const update = msg as UpdateMessage;
        const newEntities = new Map(state.entities);
        for (const entity of update.entities) {
          newEntities.set(entity.id, entity);
        }
        setState("entities", newEntities);
      } else if (msg.type === "room_change") {
        setState("roomId", (msg as RoomChangeMessage).roomId);
      } else if (msg.type === "player_id") {
        setState("playerId", (msg as PlayerIdMessage).playerId);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle JSON-RPC Responses
        if (data.jsonrpc === "2.0") {
          if (data.result) {
            if (data.id) {
              const resolve = state.responseResolveFunctions.get(data.id);
              if (resolve) {
                resolve(data.result);
                state.responseResolveFunctions.delete(data.id);
              }
            }
            // Check if this is the opcode response
            if (
              Array.isArray(data.result) &&
              data.result.length > 0 &&
              data.result[0].opcode
            ) {
              setState("opcodes", data.result);
              return;
            }

            // Handle Server Messages (Single or Array)
            if (Array.isArray(data.result)) {
              data.result.forEach(handleServerMessage);
            } else {
              handleServerMessage(data.result);
            }
          } else if (data.method === "message" && data.params) {
            gameStore.addMessage(structuredClone(data.params));
          }
          return;
        }
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    };
  },

  execute: (
    command: readonly [command: string, ...args: CommandArgument[]],
  ) => {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      const id = idCounter;
      idCounter += 1;

      state.socket.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "execute",
          params: command,
          id,
        }),
      );
      return new Promise((resolve) => {
        state.responseResolveFunctions.set(id, resolve);
      });
    } else {
      throw new Error("Socket not connected");
    }
  },

  lookAt: (item: number | string) => gameStore.execute(["look", item]),

  addMessage: (msg: GameMessage) => {
    setState("messages", (msgs) => [...msgs, msg]);
  },
};
