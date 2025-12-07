import { type Capability, ScriptError, defineFullOpcode } from "@viwo/scripting";
import { checkCapability } from "@viwo/core";

function checkNetCapability(ctx: any, cap: Capability, targetDomain: string, method: string) {
  checkCapability(cap, ctx.this.id, "net.http", (params) => {
    const allowedDomain = params["domain"] as string;
    if (!allowedDomain) {
      return false;
    }

    // Simple domain suffix check
    // "example.com" allows "api.example.com"
    if (!targetDomain.endsWith(allowedDomain)) {
      return false;
    }

    // Method check
    const allowedMethods = params["methods"] as string[] | undefined;
    if (allowedMethods) {
      if (!Array.isArray(allowedMethods)) {
        return false;
      }
      if (!allowedMethods.includes(method)) {
        return false;
      }
    }

    return true;
  });
}

export interface HttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  __response: Response;
}

export const netHttpFetch = defineFullOpcode<
  [
    Capability | null,
    string,
    {
      readonly method?: string;
      readonly headers?: Record<string, string>;
      readonly body?: string;
    }?,
  ],
  Promise<HttpResponse>
>("net.http.fetch", {
  handler: async ([cap, urlStr, options], ctx) => {
    if (!cap) {
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

    checkNetCapability(ctx, cap, url.hostname, method);

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
  },
  metadata: {
    category: "net",
    description: "Perform an HTTP request",
    label: "HTTP Fetch",
    parameters: [
      { description: "The capability to use.", name: "cap", type: "Capability | null" },
      { description: "The URL to fetch.", name: "url", type: "string" },
      { description: "The fetch options.", name: "options", optional: true, type: "object" },
    ],
    returnType: "Promise<object>",
    slots: [
      { name: "Cap", type: "block" },
      { name: "URL", type: "string" },
      { name: "Options", type: "block" },
    ],
  },
});

export const netHttpResponseText = defineFullOpcode<[HttpResponse], string>(
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

export const netHttpResponseJson = defineFullOpcode<[HttpResponse], any>("net.http.response_json", {
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
});

export const netHttpResponseBytes = defineFullOpcode<[HttpResponse], number[]>(
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
