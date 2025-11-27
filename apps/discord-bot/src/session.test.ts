import { describe, test, expect, mock, beforeEach } from "bun:test";

// Mock dependencies
const mockDb = {
  getActiveEntity: mock((): unknown => null),
  getDefaultEntity: mock((): unknown => null),
  setDefaultEntity: mock(() => {}),
  setActiveEntity: mock(() => {}),
};

const mockSocketManager = {
  getSystemSocket: mock(() => ({
    on: mock((event, handler) => {
      // Simulate immediate response for create_player
      if (event === "message") {
        handler({ type: "player_created", name: "NewPlayer", id: 999 });
      }
    }),
    off: mock(() => {}),
    send: mock(() => {}),
  })),
};

// Mock config to prevent invalid URL error if socket.ts loads
mock.module("./config", () => ({
  CONFIG: { CORE_URL: "ws://localhost:8080", DB_PATH: ":memory:" },
}));

// Mock ws to prevent actual connection attempts
mock.module("ws", () => ({
  default: class MockWebSocket {
    on = mock(() => {});
    send = mock(() => {});
    close = mock(() => {});
  },
}));

mock.module("./db", () => ({ db: mockDb }));
// We still try to mock socket, but if it fails, the above mocks save us
mock.module("./socket", () => ({ socketManager: mockSocketManager }));

// import { sessionManager } from "./session";
let sessionManager: any;

describe("Session Manager", () => {
  beforeEach(async () => {
    mockDb.getActiveEntity.mockClear();
    mockDb.getDefaultEntity.mockClear();
    mockDb.setDefaultEntity.mockClear();
    mockDb.setActiveEntity.mockClear();

    const module = await import("./session");
    sessionManager = module.sessionManager;
  });

  test("Existing Session", async () => {
    mockDb.getActiveEntity.mockReturnValue(123 as any);
    const id = await sessionManager.ensureSession("u1", "c1", "User");
    expect(id).toBe(123);
    expect(mockDb.getActiveEntity).toHaveBeenCalledWith("u1", "c1");
  });

  test("Default Entity", async () => {
    mockDb.getActiveEntity.mockReturnValue(null);
    mockDb.getDefaultEntity.mockReturnValue(456 as any);

    const id = await sessionManager.ensureSession("u1", "c1", "User");
    expect(id).toBe(456);
    expect(mockDb.setActiveEntity).toHaveBeenCalledWith("u1", "c1", 456);
  });

  test("Create New Player", async () => {
    mockDb.getActiveEntity.mockReturnValue(null);
    mockDb.getDefaultEntity.mockReturnValue(null);

    const id = await sessionManager.ensureSession("u1", "c1", "NewPlayer");
    expect(id).toBe(999); // From mock socket response
    expect(mockDb.setDefaultEntity).toHaveBeenCalledWith("u1", 999);
    expect(mockDb.setActiveEntity).toHaveBeenCalledWith("u1", "c1", 999);
  });

  test("Create New Player Timeout", async () => {
    mockDb.getActiveEntity.mockReturnValue(null);
    mockDb.getDefaultEntity.mockReturnValue(null);

    // Override socket mock to NOT respond
    mockSocketManager.getSystemSocket.mockReturnValue({
      on: mock(() => {}), // No response
      off: mock(() => {}),
      send: mock(() => {}),
    } as any);

    // Reduce timeout for test? We can't easily without modifying source or mocking setTimeout.
    // Since we use bun:test, we can use fake timers if available, or just mock setTimeout?
    // Bun test doesn't have full fake timers yet like Jest.
    // We'll just rely on the fact that it throws.
    // Wait, 5000ms is too long for a unit test.
    // We should probably make the timeout configurable or mock setTimeout.
    // For now, let's skip this or mock the whole createPlayer method if we could, but we want to test the method itself.
    // Let's mock global setTimeout.

    const originalSetTimeout = global.setTimeout;
    const mockSetTimeout = mock((cb, _ms) => {
      cb(); // Trigger immediately
      return 0 as any;
    });
    // @ts-expect-error
    global.setTimeout = mockSetTimeout;

    try {
      await sessionManager.ensureSession("u1", "c1", "TimeoutPlayer");
      expect(true).toBe(false); // Should not reach here
    } catch (e: any) {
      expect(e.message).toBe("Timeout creating player");
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  });

  test("Create New Player Ignored Message", async () => {
    mockDb.getActiveEntity.mockReturnValue(null);
    mockDb.getDefaultEntity.mockReturnValue(null);

    // Override socket to send an ignored message first
    mockSocketManager.getSystemSocket.mockReturnValue({
      on: mock((event, handler) => {
        if (event === "message") {
          // Send unrelated message
          handler({ type: "other_message" });
          // Then send correct message
          handler({ type: "player_created", name: "IgnoredPlayer", id: 777 });
        }
      }),
      off: mock(() => {}),
      send: mock(() => {}),
    } as any);

    const id = await sessionManager.ensureSession("u1", "c1", "IgnoredPlayer");
    expect(id).toBe(777);
  });
});
