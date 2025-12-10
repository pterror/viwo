import { BaseCapability, registerCapabilityClass } from "@viwo/core";
import { ScriptError, defineFullOpcode } from "@viwo/scripting";

export class NetHttp extends BaseCapability {
  static override readonly type = "net.http";

  async fetch(
    urlStr: string,
    options?: { method?: string; headers?: Record<string, string>; body?: string },
    ctx?: any,
  ) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("net.http.fetch: missing capability");
    }

    if (typeof urlStr !== "string") {
      throw new ScriptError("net.http.fetch: url must be a string");
    }

    const method = (options?.method as string) || "GET";
    const headers = (options?.headers as Record<string, string>) || {};
    const body = (options?.body as string | undefined) ?? null;

    let url: URL;
    try {
      url = new URL(urlStr);
    } catch {
      throw new ScriptError("net.http.fetch: invalid url");
    }

    // Inline adaptation of checkNetCapability logic
    const allowedDomain = this.params["domain"] as string;
    if (!allowedDomain) {
      throw new ScriptError("net.http: invalid capability params");
    }
    if (!url.hostname.endsWith(allowedDomain)) {
      throw new ScriptError(`net.http: domain '${url.hostname}' not allowed`);
    }
    const allowedMethods = this.params["methods"] as string[] | undefined;
    if (allowedMethods) {
      if (Array.isArray(allowedMethods) && !allowedMethods.includes(method)) {
        throw new ScriptError(`net.http: method '${method}' not allowed`);
      }
    }

    console.log("Calling fetch with", urlStr, method);
    try {
      const response = await fetch(urlStr, { body, headers, method });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        __response: response,
        headers: responseHeaders,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error: any) {
      throw new ScriptError(`net.http.fetch failed: ${error.message}`);
    }
  }
}

declare module "@viwo/core" {
  interface CapabilityRegistry {
    [NetHttp.type]: typeof NetHttp;
  }
}

registerCapabilityClass(NetHttp);

export interface HttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  __response: Response;
}

export const netHttpResponseText = defineFullOpcode<[response: HttpResponse], string>(
  "net.http.response_text",
  {
    handler: async ([response], _ctx) => {
      if (!response || !response.__response) {
        throw new ScriptError("net.http.response_text: invalid response object");
      }
      return await (response as HttpResponse).__response.text();
    },
    metadata: {
      category: "net",
      description: "Get response body as text",
      label: "Response Text",
      parameters: [{ description: "The response object.", name: "response", type: "object" }],
      returnType: "string",
      slots: [{ name: "Response", type: "block" }],
    },
  },
);

export const netHttpResponseJson = defineFullOpcode<[response: HttpResponse], any>(
  "net.http.response_json",
  {
    handler: async ([response], _ctx) => {
      if (!response || !response.__response) {
        throw new ScriptError("net.http.response_json: invalid response object");
      }
      try {
        return await (response as HttpResponse).__response.json();
      } catch {
        throw new ScriptError("net.http.response_json: failed to parse JSON");
      }
    },
    metadata: {
      category: "net",
      description: "Get response body as JSON",
      label: "Response JSON",
      parameters: [{ description: "The response object.", name: "response", type: "object" }],
      returnType: "any",
      slots: [{ name: "Response", type: "block" }],
    },
  },
);

export const netHttpResponseBytes = defineFullOpcode<[response: HttpResponse], number[]>(
  "net.http.response_bytes",
  {
    handler: async ([response], _ctx) => {
      if (!response || !response.__response) {
        throw new ScriptError("net.http.response_bytes: invalid response object");
      }
      return Array.from(await (response as HttpResponse).__response.bytes());
    },
    metadata: {
      category: "net",
      description: "Get response body as bytes",
      label: "Response Bytes",
      parameters: [{ description: "The response object.", name: "response", type: "object" }],
      returnType: "number[]",
      slots: [{ name: "Response", type: "block" }],
    },
  },
);
