/// <reference types="bun" />
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { gameStore } from "./game";

// Capture instances
let mockSockets: MockWebSocket[] = [];

class MockWebSocket {
  static OPEN = 1;
  readyState = 1;
  onopen: (() => void) | undefined = undefined;
  onclose: (() => void) | undefined = undefined;
  onmessage: ((event: { data: string }) => void) | undefined = undefined;
  send = mock((_data: string) => {});
  close = mock(() => {});

  constructor(_url: string) {
    mockSockets.push(this);
    setTimeout(() => {
      if (this.onopen) {
        this.onopen();
      }
    }, 0);
  }
}

Object.defineProperty(globalThis, "WebSocket", { value: MockWebSocket });

describe("Game Store", () => {
  beforeEach(() => {
    mockSockets = [];
    // Reset store state if possible, but it's a singleton.
    // We might need to just rely on connect() check.
  });

  afterEach(() => {
    // Close all sockets to reset store state
    mockSockets.forEach((socket) => {
      socket.onclose?.();
    });
  });

  test("Initial state", () => {
    expect(gameStore.state.isConnected).toBe(false);
    expect(gameStore.state.messages).toBeArray();
  });

  test("Connect and Receive Message", async () => {
    gameStore.connect();

    // Wait for onopen
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(gameStore.state.isConnected).toBe(true);

    const [socket] = mockSockets;
    expect(socket).toBeDefined();

    // Simulate receiving a message
    if (socket?.onmessage) {
      socket.onmessage({
        data: JSON.stringify({
          jsonrpc: "2.0",
          method: "message",
          params: {
            text: "Hello World",
            type: "message",
          },
        }),
      });
    }

    expect(gameStore.state.messages.length).toBeGreaterThan(0);
    const lastMsg = gameStore.state.messages.at(-1);
    if (lastMsg && lastMsg.type === "message") {
      expect(lastMsg.text).toBe("Hello World");
    }
  });

  test("Send Message", async () => {
    // Ensure connected
    if (!gameStore.state.isConnected) {
      gameStore.connect();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const [socket] = mockSockets;
    gameStore.execute("look", []);
    expect(socket?.send).toHaveBeenCalled();
    expect(socket?.send.mock.lastCall?.[0]).toContain(JSON.stringify(["look"]));
  });

  test("Handle Malformed Message", async () => {
    gameStore.connect();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const [socket] = mockSockets;

    // Mock console.error to keep output clean
    const originalError = console.error;
    console.error = mock(() => {});

    if (socket?.onmessage) {
      socket.onmessage({ data: "invalid json" });
    }

    expect(console.error).toHaveBeenCalled();
    console.error = originalError;
  });
});
