import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createCapability } from "../../repo";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { createScriptContext, evaluate, registerLibrary } from "@viwo/scripting";
import * as KernelLib from "./kernel";
import * as FsLib from "./fs";

registerLibrary(KernelLib);
registerLibrary(FsLib);

const ctx = createScriptContext({ this: { id: 1 }, caller: { id: 1 } });

describe("FS Library", () => {
  const testDir = path.resolve(`./tmp_test_fs_${Math.random()}`);

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    createCapability(1, "fs.write", { path: testDir });
    createCapability(1, "fs.read", { path: testDir });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should write to a file", async () => {
    const filePath = path.join(testDir, "test.txt");
    await evaluate(
      FsLib.fsWrite(KernelLib.getCapability("fs.write"), filePath, "Hello World"),
      ctx,
    );

    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toBe("Hello World");
  });

  it("should list files in a directory", async () => {
    const filePath = path.join(testDir, "test2.txt");
    await fs.writeFile(filePath, "Test 2");
    const files = await evaluate(FsLib.fsList(KernelLib.getCapability("fs.read"), testDir), ctx);
    expect(files).toContain("test.txt");
    expect(files).toContain("test2.txt");
  });

  it("should fail without capability", async () => {
    expect(evaluate(FsLib.fsWrite(null, "path", "content"), ctx)).rejects.toThrow(
      "fs.write: missing capability",
    );
  });
});
