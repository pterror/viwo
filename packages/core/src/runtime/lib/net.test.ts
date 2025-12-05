import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { createScriptContext, evaluate, registerLibrary, ScriptError } from "@viwo/scripting";
import { createCapability } from "../../repo";
import * as KernelLib from "./kernel";
import * as NetLib from "./net";

// Mock fetch
const originalFetch = global.fetch;
const mockFetch = mock();

registerLibrary(KernelLib);
registerLibrary(NetLib);

describe("net.http", () => {
  const ctx = createScriptContext({ this: { id: 1 }, caller: { id: 1 } });
  const ctxWithoutMethod = createScriptContext({ this: { id: 2 }, caller: { id: 2 } });

  beforeEach(() => {
    createCapability(1, "net.http", { domain: "example.com", method: ["GET"] });
    createCapability(2, "net.http", { domain: "example.com" });
    mockFetch.mockReset();
    // @ts-expect-error
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("net.http.fetch", () => {
    it("should fetch with valid capability", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "Content-Type": "text/plain" }),
        text: async () => "Hello World",
        bytes: async () => new Uint8Array(new TextEncoder().encode("Hello World").buffer),
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

    it("should fail if capability is missing", async () => {
      expect(evaluate(NetLib.netHttpFetch(null, "https://example.com", {}), ctx)).rejects.toThrow(
        ScriptError,
      );
    });

    it("should fail if domain does not match", async () => {
      expect(
        evaluate(
          NetLib.netHttpFetch(KernelLib.getCapability("net.http"), "https://google.com", {}),
          ctx,
        ),
      ).rejects.toThrow(ScriptError);
    });

    it("should fail if method is not allowed", async () => {
      createCapability(1, "net.http", { domain: "example.com", methods: ["GET"] });

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
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        text: async () => "",
        bytes: async () => new Uint8Array(),
      });

      await evaluate(
        NetLib.netHttpFetch(KernelLib.getCapability("net.http"), "https://example.com", {
          method: "POST",
        }),
        ctxWithoutMethod,
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("response parsing", () => {
    const mockResponse: NetLib.HttpResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {},
      __response: {
        text: async () => '{"foo":"bar"}',
        json: async () => ({ foo: "bar" }),
        bytes: async () => new Uint8Array(new TextEncoder().encode('{"foo":"bar"}').buffer),
      } as Response,
    };

    it("should parse text", async () => {
      const text = await evaluate(NetLib.netHttpResponseText(mockResponse), ctx);
      expect(text).toBe('{"foo":"bar"}');
    });

    it("should parse json", async () => {
      const json = await evaluate(NetLib.netHttpResponseJson(mockResponse), ctx);
      expect(json).toEqual({ foo: "bar" });
    });

    it("should parse bytes", async () => {
      const bytes = await evaluate(NetLib.netHttpResponseBytes(mockResponse), ctx);
      expect(bytes).toEqual(Array.from(new TextEncoder().encode('{"foo":"bar"}')));
    });
  });
});
