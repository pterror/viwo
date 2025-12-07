import * as NetLib from "./lib";
import { KernelLib, createCapability, createEntity, db, getEntity } from "@viwo/core";
import {
  ListLib,
  ObjectLib,
  ScriptError,
  StdLib,
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
} from "@viwo/scripting";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

// Mock fetch
const originalFetch = globalThis.fetch;
const mockFetch = mock();

const TEST_OPS = createOpcodeRegistry(StdLib, ObjectLib, ListLib, KernelLib, NetLib);

describe("net.http", () => {
  let admin: { id: number };
  let user: { id: number };

  beforeEach(() => {
    // Reset DB state
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM capabilities").run();
    db.query("DELETE FROM sqlite_sequence").run();

    // Create Admin (with full access)
    const adminId = createEntity({ name: "Admin" });
    admin = getEntity(adminId)!;
    createCapability(adminId, "net.http", { domain: "example.com", method: ["GET"] });

    // Create User (no rights)
    const userId = createEntity({ name: "User" });
    user = getEntity(userId)!;

    mockFetch.mockReset();
    // @ts-expect-error We do not need preconnect.
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("net.http.fetch", () => {
    it("should fetch with valid capability", async () => {
      const ctx = createScriptContext({ caller: admin, ops: TEST_OPS, this: admin });
      mockFetch.mockResolvedValue({
        bytes: () =>
          Promise.resolve(new Uint8Array(new TextEncoder().encode("Hello World").buffer)),
        headers: new Headers({ "Content-Type": "text/plain" }),
        ok: true,
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve("Hello World"),
      });

      const response = await evaluate(
        NetLib.netHttpFetch(KernelLib.getCapability("net.http"), "https://example.com/api", {}),
        ctx,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/api",
        expect.objectContaining({ method: "GET" }),
      );
      expect(response).toEqual(
        expect.objectContaining({
          ok: true,
          status: 200,
          statusText: "OK",
        }),
      );
    });

    it("should fail if capability is missing", () => {
      const ctx = createScriptContext({ caller: user, ops: TEST_OPS, this: user });
      expect(evaluate(NetLib.netHttpFetch(null, "https://example.com", {}), ctx)).rejects.toThrow(
        ScriptError,
      );
    });

    it("should fail if domain does not match", () => {
      const ctx = createScriptContext({ caller: admin, ops: TEST_OPS, this: admin });
      expect(
        evaluate(
          NetLib.netHttpFetch(KernelLib.getCapability("net.http"), "https://google.com", {}),
          ctx,
        ),
      ).rejects.toThrow(ScriptError);
    });

    it("should fail if method is not allowed", () => {
      const ctx = createScriptContext({ caller: admin, ops: TEST_OPS, this: admin });
      // Admin only has GET
      expect(
        evaluate(
          NetLib.netHttpFetch(KernelLib.getCapability("net.http"), "https://example.com", {
            method: "POST",
          }),
          ctx,
        ),
      ).rejects.toThrow(ScriptError);
    });

    it("should allow method if methods param is missing", async () => {
      // Create a user with no method restriction
      const unrestrictedId = createEntity({ name: "Unrestricted" });
      const unrestricted = getEntity(unrestrictedId)!;
      createCapability(unrestrictedId, "net.http", { domain: "example.com" });

      const ctx = createScriptContext({ caller: unrestricted, ops: TEST_OPS, this: unrestricted });

      mockFetch.mockResolvedValue({
        bytes: () => Promise.resolve(new Uint8Array()),
        headers: new Headers(),
        ok: true,
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve(""),
      });

      await evaluate(
        NetLib.netHttpFetch(KernelLib.getCapability("net.http"), "https://example.com", {
          method: "POST",
        }),
        ctx,
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("response parsing", () => {
    const mockResponse: NetLib.HttpResponse = {
      __response: {
        bytes: () =>
          Promise.resolve(new Uint8Array(new TextEncoder().encode('{"foo":"bar"}').buffer)),
        json: () => Promise.resolve({ foo: "bar" }),
        text: () => Promise.resolve('{"foo":"bar"}'),
      } as Response,
      headers: {},
      ok: true,
      status: 200,
      statusText: "OK",
    };

    it("should parse text", async () => {
      const ctx = createScriptContext({ caller: admin, ops: TEST_OPS, this: admin });
      const text = await evaluate(NetLib.netHttpResponseText(mockResponse), ctx);
      expect(text).toBe('{"foo":"bar"}');
    });

    it("should parse json", async () => {
      const ctx = createScriptContext({ caller: admin, ops: TEST_OPS, this: admin });
      const json = await evaluate(NetLib.netHttpResponseJson(mockResponse), ctx);
      expect(json).toEqual({ foo: "bar" });
    });

    it("should parse bytes", async () => {
      const ctx = createScriptContext({ caller: admin, ops: TEST_OPS, this: admin });
      const bytes = await evaluate(NetLib.netHttpResponseBytes(mockResponse), ctx);
      expect(bytes).toEqual(Array.from(new TextEncoder().encode('{"foo":"bar"}')));
    });
  });
});
