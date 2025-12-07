import * as FsLib from "./lib";
import { KernelLib, createCapability, createEntity, db, getEntity } from "@viwo/core";
import {
  ListLib,
  ObjectLib,
  StdLib,
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
} from "@viwo/scripting";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { join, resolve } from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const TEST_OPS = createOpcodeRegistry(StdLib, ObjectLib, ListLib, KernelLib, FsLib);

describe("FS Library", () => {
  const testDir = resolve(`./tmp_test_fs_${Math.random()}`);
  let admin: { id: number };
  let user: { id: number };

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { force: true, recursive: true });
  });

  beforeEach(() => {
    // Reset DB state
    db.query("DELETE FROM entities").run();
    db.query("DELETE FROM capabilities").run();
    db.query("DELETE FROM sqlite_sequence").run();

    // Create Admin (with full access)
    const adminId = createEntity({ name: "Admin" });
    admin = getEntity(adminId)!;
    createCapability(adminId, "fs.write", { path: testDir });
    createCapability(adminId, "fs.read", { path: testDir });

    // Create User (no rights)
    const userId = createEntity({ name: "User" });
    user = getEntity(userId)!;
  });

  it("should write to a file", async () => {
    const ctx = createScriptContext({ caller: admin, ops: TEST_OPS, this: admin });
    const filePath = join(testDir, "test.txt");
    await evaluate(
      FsLib.fsWrite(KernelLib.getCapability("fs.write"), filePath, "Hello World"),
      ctx,
    );

    const content = await readFile(filePath, "utf8");
    expect(content).toBe("Hello World");
  });

  it("should read from a file", async () => {
    const ctx = createScriptContext({ caller: admin, ops: TEST_OPS, this: admin });
    const filePath = join(testDir, "read_test.txt");
    await writeFile(filePath, "Read Me");
    const content = await evaluate(FsLib.fsRead(KernelLib.getCapability("fs.read"), filePath), ctx);
    expect(content).toBe("Read Me");
  });

  it("should list files in a directory", async () => {
    const ctx = createScriptContext({ caller: admin, ops: TEST_OPS, this: admin });
    const filePath = join(testDir, "test2.txt");
    await writeFile(filePath, "Test 2");
    const files = await evaluate(FsLib.fsList(KernelLib.getCapability("fs.read"), testDir), ctx);
    expect(files).toContain("test.txt");
    expect(files).toContain("test2.txt");
  });

  it("should fail without capability", () => {
    const ctx = createScriptContext({ caller: user, ops: TEST_OPS, this: user });
    expect(evaluate(FsLib.fsWrite(null, "path", "content"), ctx)).rejects.toThrow(
      "fs.write: missing capability",
    );
  });

  it("should fail to read without capability", () => {
    const ctx = createScriptContext({ caller: user, ops: TEST_OPS, this: user });
    expect(
      evaluate(
        FsLib.fsRead(
          KernelLib.getCapability("fs.read"), // User has none, returns null
          join(testDir, "test.txt"),
        ),
        ctx,
      ),
    ).rejects.toThrow();
  });

  it("should fail to read outside allowed path", () => {
    const ctx = createScriptContext({ caller: admin, ops: TEST_OPS, this: admin });
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
});
