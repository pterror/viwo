import { describe, test, expect, beforeEach, mock } from "bun:test";

// Mock fs and fetch
mock.module("node:fs/promises", () => ({
  readFile: mock((_path: string) => Promise.resolve("file content")),
  writeFile: mock((_path: string, _content: string) => Promise.resolve()),
  readdir: mock((_path: string) => Promise.resolve(["file1.txt", "file2.txt"])),
}));

// const originalFetch = global.fetch;
global.fetch = mock((_url: string | Request | URL) =>
  Promise.resolve(new Response("http response")),
) as any;

import {
  evaluate,
  createScriptContext,
  registerLibrary,
  StdLib,
  ObjectLib,
  ListLib,
} from "@viwo/scripting";
import { Entity } from "@viwo/shared/jsonrpc";
import { createEntity, getEntity, createCapability } from "./repo";
import * as KernelLib from "./runtime/lib/kernel";
import * as FsLib from "./runtime/lib/fs";
import * as NetLib from "./runtime/lib/net";
import { db } from "./db";

describe("System Integration Security", () => {
  registerLibrary(StdLib);
  registerLibrary(ObjectLib);
  registerLibrary(ListLib);
  registerLibrary(KernelLib);
  registerLibrary(FsLib);
  registerLibrary(NetLib);

  let admin: Entity;
  let user: Entity;

  beforeEach(() => {
    // Reset DB state
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM capabilities").run();
    db.query("DELETE FROM sqlite_sequence").run();

    // Create Admin (with full access)
    const adminId = createEntity({ name: "Admin" });
    admin = getEntity(adminId)!;
    createCapability(adminId, "fs.read", { path: "/tmp" });
    createCapability(adminId, "fs.write", { path: "/tmp" });
    createCapability(adminId, "net.http", {
      domain: "example.com",
      methods: ["GET"],
    });

    // Create User (no rights)
    const userId = createEntity({ name: "User" });
    user = getEntity(userId)!;
  });

  test("FS.read with capability", async () => {
    const ctx = createScriptContext({ caller: admin, this: admin, args: [] });
    const content = await evaluate(
      FsLib.fsRead(KernelLib.getCapability("fs.read"), "/tmp/test.txt"),
      ctx,
    );
    expect(content).toBe("file content");
  });

  test("FS.read without capability", async () => {
    const ctx = createScriptContext({ caller: user, this: user, args: [] });
    expect(
      evaluate(
        FsLib.fsRead(
          KernelLib.getCapability("fs.read"), // User has none, returns null
          "/tmp/test.txt",
        ),
        ctx,
      ),
    ).rejects.toThrow();
  });

  test("FS.read outside allowed path", async () => {
    const ctx = createScriptContext({ caller: admin, this: admin, args: [] });
    expect(
      evaluate(
        FsLib.fsRead(
          KernelLib.getCapability("fs.read"),
          "/etc/passwd", // Outside /tmp
        ),
        ctx,
      ),
    ).rejects.toThrow();
  });

  test("Net.http.get with capability", async () => {
    const ctx = createScriptContext({ caller: admin, this: admin, args: [] });
    const response = await evaluate(
      NetLib.netHttpFetch(KernelLib.getCapability("net.http"), "https://api.example.com/data"),
      ctx,
    );
    expect(await response.__response.text()).toBe("http response");
  });

  test("Net.http.get domain mismatch", async () => {
    const ctx = createScriptContext({ caller: admin, this: admin, args: [] });
    expect(
      evaluate(
        NetLib.netHttpFetch(
          KernelLib.getCapability("net.http"),
          "https://google.com", // Not example.com
        ),
        ctx,
      ),
    ).rejects.toThrow();
  });
});
