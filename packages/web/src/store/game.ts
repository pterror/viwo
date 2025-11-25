import { createStore } from "solid-js/store";

interface GameState {
  messages: string[];
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
      gameStore.addMessage("Connected to Viwo server.");
    };

    ws.onclose = () => {
      setState("isConnected", false);
      gameStore.addMessage("Disconnected from server.");
      ws = null;
    };

    ws.onmessage = (event) => {
      gameStore.addMessage(event.data);
    };
  },

  send: (payload: unknown[]) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      gameStore.addMessage("Error: Not connected.");
      return;
    }
    ws.send(JSON.stringify(payload));
    // Add to history (if it's a simple command, maybe we log it differently?)
    // For now, just log the string representation
    // setState("history", (h) => [JSON.stringify(payload), ...h]);
    // setState("historyIndex", -1);
  },

  addMessage: (msg: string) => {
    setState("messages", (msgs) => [...msgs, msg]);
  },
};
