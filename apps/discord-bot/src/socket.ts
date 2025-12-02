import { ViwoClient } from "@viwo/client";
import { CONFIG } from "./config";
import { EventEmitter } from "events";

export class GameSocket extends EventEmitter {
  private client: ViwoClient;
  private entityId: number | null = null;
  private connected = false;

  constructor(entityId?: number) {
    super();
    this.entityId = entityId || null;
    this.client = new ViwoClient(CONFIG.CORE_URL);

    this.client.subscribe((state) => {
      if (state.isConnected && !this.connected) {
        this.connected = true;
        console.log(`Socket connected (Entity: ${this.entityId})`);

        if (this.entityId) {
          this.send(["login", this.entityId.toString()]);
        }
      } else if (!state.isConnected && this.connected) {
        this.connected = false;
        console.log(`Socket disconnected (Entity: ${this.entityId})`);
        // Reconnect logic is handled by ViwoClient? No, ViwoClient doesn't auto-reconnect yet.
        // We might need to implement it or just let it be.
        // For now, let's assume ViwoClient doesn't auto-reconnect, so we might need to re-instantiate or call connect again.
        // But ViwoClient.connect() is one-off.
        // Let's just call connect again after timeout if disconnected.
        setTimeout(() => this.client.connect(), 5000);
      }
    });

    this.client.onMessage((msg) => {
      // Emit message for external listeners (like the bot)
      // The bot expects the raw JSON-RPC message or something similar?
      // The original code emitted the parsed JSON.
      // ViwoClient.onMessage gives GameMessage { type, text }.
      // We might need to adapt or just emit what we have.
      // The bot likely uses this to send messages to Discord.
      this.emit("message", {
        method: "message",
        params: {
          type: msg.type === "message" ? "info" : "error",
          text: msg.text,
        },
      });
    });
  }

  connect() {
    this.client.connect();
  }

  send(command: readonly string[]) {
    this.client.execute(command);
  }

  close() {
    this.client.disconnect();
  }
}

export class SocketManager extends EventEmitter {
  private sockets: Map<number, GameSocket> = new Map();
  private systemSocket: GameSocket;

  constructor() {
    super();
    // System socket for creating players, etc. (acting as Guest or Admin)
    this.systemSocket = new GameSocket();
  }

  connect() {
    this.systemSocket.connect();
  }

  getSystemSocket() {
    return this.systemSocket;
  }

  getSocket(entityId: number): GameSocket {
    if (!this.sockets.has(entityId)) {
      const socket = new GameSocket(entityId);
      socket.connect();

      // Forward messages to the manager
      socket.on("message", (data) => {
        this.emit("message", entityId, data);
      });

      this.sockets.set(entityId, socket);
    }
    return this.sockets.get(entityId)!;
  }
}

export const socketManager = new SocketManager();
