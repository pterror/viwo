import { createStore } from "solid-js/store";

export interface RichItem {
  id: number;
  name: string;
  kind: string;
  location_detail?: string;
  contents: RichItem[];
}

export interface RoomMessage {
  type: "room";
  name: string;
  description: string;
  contents: RichItem[];
}

export interface InventoryMessage {
  type: "inventory";
  items: RichItem[];
}

export interface TextMessage {
  type: "message" | "error";
  text: string;
}

export type GameMessage = RoomMessage | InventoryMessage | TextMessage;

interface GameState {
  messages: GameMessage[];
  isConnected: boolean;
  history: string[];
  historyIndex: number;
}

const [state, setState] = createStore<GameState>({
  messages: [],
  isConnected: false,
  history: [],
  historyIndex: -1,
});

let ws: WebSocket | null = null;

export const gameStore = {
  state,

  connect: () => {
    if (ws) return;
    ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      setState("isConnected", true);
      // We don't need a local message here, the server sends a welcome message
    };

    ws.onclose = () => {
      setState("isConnected", false);
      gameStore.addMessage({
        type: "error",
        text: "Disconnected from server.",
      });
      ws = null;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        gameStore.addMessage(data);
      } catch (e) {
        console.error("Failed to parse message", e, event.data);
        gameStore.addMessage({
          type: "error",
          text: "Received invalid data from server.",
        });
      }
    };
  },

  send: (payload: unknown[]) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      gameStore.addMessage({ type: "error", text: "Error: Not connected." });
      return;
    }
    ws.send(JSON.stringify(payload));
  },

  addMessage: (msg: GameMessage) => {
    setState("messages", (msgs) => [...msgs, msg]);
  },
};
