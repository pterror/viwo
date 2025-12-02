import { describe, it, expect, mock, beforeEach } from "bun:test";
import { ViwoClient } from "./client";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  onopen: () => void = () => {};
  onclose: () => void = () => {};
  onmessage: (event: any) => void = () => {};
  onerror: (err: any) => void = () => {};
  readyState = 1; // OPEN
  send = mock(() => {});
  close = mock(() => {});

  constructor() {}
}

global.WebSocket = MockWebSocket as any;

describe("ViwoClient", () => {
  let client: ViwoClient;
  let ws: MockWebSocket;

  beforeEach(() => {
    client = new ViwoClient();
    client.connect();
    ws = (client as any).socket;
  });

  it("should connect", () => {
    expect((client as any).socket).toBeInstanceOf(MockWebSocket);
  });

  it("should update state on connection", () => {
    // Mock sendRequest to prevent actual logic from running and creating dangling promises
    // We cast to any to overwrite the private/protected method if needed, or just public
    const originalSendRequest = client.sendRequest;
    client.sendRequest = mock(() => Promise.resolve());

    ws.onopen();
    expect(client.getState().isConnected).toBe(true);

    // Restore
    client.sendRequest = originalSendRequest;
  });

  it("should send requests", async () => {
    // We don't call ws.onopen() here to avoid the initial flood of requests
    // or we mock the initial requests if we did.
    // For this test, we just want to verify execute() sends data.

    // Manually set connected state if needed, but sendRequest only checks readyState
    // which is 1 in MockWebSocket.

    const promise = client.execute(["look"]);

    // Check if send was called
    expect(ws.send).toHaveBeenCalled();
    const sentData = JSON.parse((ws.send.mock.calls as any)[0][0]);
    expect(sentData.method).toBe("execute");
    expect(sentData.params).toEqual(["look"]);

    // Simulate response
    ws.onmessage({
      data: JSON.stringify({
        jsonrpc: "2.0",
        id: sentData.id,
        result: "You see a room.",
      }),
    });

    const result = await promise;
    expect(result).toBe("You see a room.");
  });

  it("should handle notifications", () => {
    // No need to call onopen, just test onmessage

    // Simulate update notification
    ws.onmessage({
      data: JSON.stringify({
        jsonrpc: "2.0",
        method: "update",
        params: {
          entities: [{ id: 1, name: "Room" }],
        },
      }),
    });

    expect(client.getState().entities.get(1)).toEqual({ id: 1, name: "Room" });
  });

  it("should notify listeners", () => {
    const listener = mock(() => {});
    client.subscribe(listener);

    // Listener should be called with initial state
    expect(listener).toHaveBeenCalled();

    // Simulate update
    ws.onmessage({
      data: JSON.stringify({
        jsonrpc: "2.0",
        method: "room_id",
        params: { roomId: 123 },
      }),
    });

    expect(listener).toHaveBeenCalledTimes(2); // Initial + Update
    expect(client.getState().roomId).toBe(123);
  });
});
