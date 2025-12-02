import { createStore } from "solid-js/store";
import {
  ViwoClient,
  GameMessage,
  GameState as ClientGameState,
} from "@viwo/client";
import { Entity } from "@viwo/shared/jsonrpc";

export type { Entity, GameMessage };

export type CommandArgument =
  | string
  | number
  | boolean
  | null
  | readonly CommandArgument[];

interface WebGameState extends ClientGameState {
  inspectedItem: number | null;
}

const client = new ViwoClient("ws://localhost:8080");

const [state, setState] = createStore<WebGameState>({
  isConnected: false,
  messages: [],
  entities: new Map(),
  roomId: null,
  playerId: null,
  opcodes: null,
  inspectedItem: null,
});

// Sync client state to Solid store
client.subscribe((newState) => {
  setState(newState);
});

client.onMessage((_msg) => {
  // Messages are already in state, but if we needed to trigger side effects we could here
});

export const gameStore = {
  state,

  connect: () => {
    client.connect();
  },

  execute: (
    command: readonly [command: string, ...args: CommandArgument[]],
  ) => {
    // Convert args to strings if necessary, but client.execute expects string[]
    // The original code passed command array directly.
    // ViwoClient.execute expects readonly string[].
    // We need to ensure args are strings.
    const [cmd, ...cmdArgs] = command;
    const stringArgs = cmdArgs.map((arg: CommandArgument) => String(arg));
    return client.execute([cmd, ...stringArgs]);
  },

  lookAt: (item: number | string) => gameStore.execute(["look", String(item)]),

  addMessage: (msg: GameMessage) => {
    // This might be tricky if we want to manually add messages that aren't from server.
    // ViwoClient doesn't expose addMessage publicly.
    // But we can update the local store if we want, but it might get out of sync if ViwoClient pushes a new state.
    // However, ViwoClient is the source of truth.
    // If we need to add local messages, we should probably add a method to ViwoClient or handle it separately.
    // For now, let's assume we don't need to manually add messages often, or we can just update the store
    // knowing it might be overwritten if we don't merge correctly.
    // But wait, setState merges.
    setState("messages", (msgs) => [...msgs, msg]);
  },
};
