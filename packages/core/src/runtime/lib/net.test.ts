import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  netHttpFetch,
  netHttpResponseText,
  netHttpResponseJson,
  netHttpResponseBytes,
} from "./net";
import { ScriptError } from "@viwo/scripting";

// Mock dependencies
const mockGetCapability = mock((id: string) => {
  console.log(`Mock getCapability called with ${id}`);
  return null as any;
});
mock.module("../../repo", () => ({
  getCapability: mockGetCapability,
}));

// Mock fetch
const originalFetch = global.fetch;
const mockFetch = mock();

describe("net.http", () => {
  const ctx: any = {
    this: { id: 1 },
  };

  const validCap = { __brand: "Capability", id: "cap1" };

  beforeEach(() => {
    mockGetCapability.mockReset();
    mockFetch.mockReset();
    // @ts-expect-error
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("net.http.fetch", () => {
    it("should fetch with valid capability", async () => {
      mockGetCapability.mockReturnValue({
        owner_id: 1,
        type: "net.http",
        params: { domain: "example.com" },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "Content-Type": "text/plain" }),
        text: async () => "Hello World",
        bytes: async () => new Uint8Array(new TextEncoder().encode("Hello World").buffer),
      });

      const response = await netHttpFetch.handler([validCap, "https://example.com/api", {}], ctx);

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

    it("should fail if capability is missing", async () => {
      expect(netHttpFetch.handler([null, "https://example.com", {}], ctx)).rejects.toThrow(
        ScriptError,
      );
    });

    it("should fail if domain does not match", async () => {
      mockGetCapability.mockReturnValue({
        owner_id: 1,
        type: "net.http",
        params: { domain: "example.com" },
      });

      expect(netHttpFetch.handler([validCap, "https://google.com", {}], ctx)).rejects.toThrow(
        ScriptError,
      );
    });

    it("should fail if method is not allowed", async () => {
      mockGetCapability.mockReturnValue({
        owner_id: 1,
        type: "net.http",
        params: { domain: "example.com", methods: ["GET"] },
      });

      expect(
        netHttpFetch.handler([validCap, "https://example.com", { method: "POST" }], ctx),
      ).rejects.toThrow(ScriptError);
    });

    it("should allow method if methods param is missing", async () => {
      mockGetCapability.mockReturnValue({
        owner_id: 1,
        type: "net.http",
        params: { domain: "example.com" },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        text: async () => "",
        bytes: async () => new Uint8Array(),
      });

      await netHttpFetch.handler([validCap, "https://example.com", { method: "POST" }], ctx);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  describe("response parsing", () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {},
      __response: {
        text: async () => '{"foo":"bar"}',
        json: async () => ({ foo: "bar" }),
        bytes: async () => new Uint8Array(new TextEncoder().encode('{"foo":"bar"}').buffer),
      },
    };

    it("should parse text", async () => {
      const text = await netHttpResponseText.handler([mockResponse], ctx);
      expect(text).toBe('{"foo":"bar"}');
    });

    it("should parse json", async () => {
      const json = await netHttpResponseJson.handler([mockResponse], ctx);
      expect(json).toEqual({ foo: "bar" });
    });

    it("should parse bytes", async () => {
      const bytes = await netHttpResponseBytes.handler([mockResponse], ctx);
      expect(bytes).toEqual(Array.from(new TextEncoder().encode('{"foo":"bar"}')));
    });
  });
});
