import { createStore } from "solid-js/store";

export type GameMessage =
  | { type: "message"; text: string }
  | { type: "error"; text: string }
  | RoomMessage
  | InventoryMessage
  | ItemMessage;

export interface RichItem {
  id: number;
  name: string;
  kind: string;
  location_detail: string | null;
  contents: RichItem[];
  destination_name?: string;
  adjectives?: string[];
  custom_css?: string;
  image?: string;
  verbs?: string[];
}

export interface RoomMessage {
  type: "room";
  name: string;
  description: string;
  contents: RichItem[];
  custom_css?: string;
  image?: string;
}

export interface InventoryMessage {
  type: "inventory";
  items: RichItem[];
}

export interface ItemMessage {
  type: "item";
  name: string;
  description: string;
  contents: RichItem[];
  custom_css?: string;
}

interface GameState {
  isConnected: boolean;
  messages: GameMessage[];
  room: RoomMessage | null;
  inventory: InventoryMessage | null;
  inspectedItem: ItemMessage | null;
  socket: WebSocket | null;
}

const [state, setState] = createStore<GameState>({
  isConnected: false,
  messages: [],
  room: null,
  inventory: null,
  inspectedItem: null,
  socket: null,
});

export const gameStore = {
  state,

  // connect method is now handled by the global connect function
  // and the socket is managed in state.
  // The original connect method is effectively replaced by the new global connect logic.

  send: (command: string) => {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      const id = Date.now(); // Simple ID generation
      // We assume command is a verb string like "look" or "go north"
      // We send it as method="command" for now, or we can parse it?
      // The server expects `method` to be the verb.
      // But if we have arguments? "go north".
      // Let's send method="command" and params=[command] to match the legacy fallback in server?
      // NO, I updated server to use `method` as the verb.
      // So we need to split the command string.
      const parts = command.split(" ");
      const method = parts[0];
      const params = parts.slice(1);

      state.socket.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "execute",
          params: [method, ...params],
          id,
        }),
      );
    } else {
      console.error("Socket not connected");
    }
  },

  addMessage: (msg: GameMessage) => {
    setState("messages", (msgs) => [...msgs, msg]);
  },
};
