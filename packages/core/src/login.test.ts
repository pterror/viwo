import { describe, expect, mock, test } from "bun:test";
import type { JsonRpcRequest } from "@viwo/shared/jsonrpc";
import { createEntity } from "./repo";
import { handleJsonRpcRequest } from "./index";

describe("Login Logic", () => {
  test("Login with valid entity ID", async () => {
    const entityId = createEntity({ description: "Test", name: "Test User" });
    const ws = {
      data: { userId: 0 },
      send: mock(() => {}),
    };

    const req: JsonRpcRequest = {
      id: 1,
      jsonrpc: "2.0",
      method: "login",
      params: { entityId },
    };

    const response = await handleJsonRpcRequest(req, 0, ws);

    expect(response).toEqual({
      id: 1,
      jsonrpc: "2.0",
      result: { playerId: entityId, status: "ok" },
    });

    expect(ws.data.userId).toBe(entityId);
    expect(ws.send).toHaveBeenCalled(); // Should send player_id notification
  });

  test("Login with invalid entity ID", async () => {
    const ws = {
      data: { userId: 0 },
      send: mock(() => {}),
    };

    const req: JsonRpcRequest = {
      id: 2,
      jsonrpc: "2.0",
      method: "login",
      params: { entityId: 999_999 }, // Non-existent ID
    };

    const response = await handleJsonRpcRequest(req, 0, ws);

    expect(response).toEqual({
      error: { code: -32_000, message: "Entity not found" },
      id: 2,
      jsonrpc: "2.0",
    });

    expect(ws.data.userId).toBe(0);
  });

  test("Login with missing params", async () => {
    const ws = {
      data: { userId: 0 },
      send: mock(() => {}),
    };

    const req: JsonRpcRequest = {
      id: 3,
      jsonrpc: "2.0",
      method: "login",
      params: {}, // Missing entityId
    };

    const response = await handleJsonRpcRequest(req, 0, ws);

    expect(response).toEqual({
      error: { code: -32_602, message: "Invalid params: entityId required" },
      id: 3,
      jsonrpc: "2.0",
    });
  });
});
