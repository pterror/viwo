import { BaseCapability, registerCapabilityClass } from "@viwo/core";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { ScriptError } from "@viwo/scripting";
import { resolve } from "node:path";

export class FsRead extends BaseCapability {
  static override readonly type = "fs.read";

  async read(filePath: string, ctx: any) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("fs.read: missing capability");
    }

    if (typeof filePath !== "string") {
      throw new ScriptError("fs.read: path must be a string");
    }

    // Reuse checkFsCapability logic or inline it
    // Inline adaptation:
    const allowedPath = this.params["path"];
    if (!allowedPath || typeof allowedPath !== "string") {
      throw new ScriptError("fs.read: invalid capability params");
    }
    const resolvedTarget = resolve(filePath);
    const resolvedAllowed = resolve(allowedPath);
    if (!resolvedTarget.startsWith(resolvedAllowed)) {
      throw new ScriptError("fs.read: path not allowed");
    }

    try {
      return await readFile(filePath, "utf8");
    } catch (error: any) {
      throw new ScriptError(`fs.read failed: ${error.message}`);
    }
  }

  async list(dirPath: string, ctx: any) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("fs.list: missing capability");
    }
    if (typeof dirPath !== "string") {
      throw new ScriptError("fs.list: path must be a string");
    }

    // Check against this capability params
    const allowedPath = this.params["path"];
    if (!allowedPath || typeof allowedPath !== "string") {
      throw new ScriptError("fs.list: invalid capability params");
    }
    const resolvedTarget = resolve(dirPath);
    const resolvedAllowed = resolve(allowedPath);
    if (!resolvedTarget.startsWith(resolvedAllowed)) {
      throw new ScriptError("fs.list: path not allowed");
    }

    try {
      return await readdir(dirPath);
    } catch (error: any) {
      throw new ScriptError(`fs.list failed: ${error.message}`);
    }
  }
}

export class FsWrite extends BaseCapability {
  static override readonly type = "fs.write";

  async write(filePath: string, content: string, ctx: any) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("fs.write: missing capability");
    }
    if (typeof filePath !== "string") {
      throw new ScriptError("fs.write: path must be a string");
    }
    if (typeof content !== "string") {
      throw new ScriptError("fs.write: content must be a string");
    }

    const allowedPath = this.params["path"];
    if (!allowedPath || typeof allowedPath !== "string") {
      throw new ScriptError("fs.write: invalid capability params");
    }
    const resolvedTarget = resolve(filePath);
    const resolvedAllowed = resolve(allowedPath);
    if (!resolvedTarget.startsWith(resolvedAllowed)) {
      throw new ScriptError("fs.write: path not allowed");
    }

    try {
      await writeFile(filePath, content, "utf8");
      return null;
    } catch (error: any) {
      throw new ScriptError(`fs.write failed: ${error.message}`);
    }
  }
}

declare module "@viwo/core" {
  interface CapabilityRegistry {
    [FsRead.type]: typeof FsRead;
    [FsWrite.type]: typeof FsWrite;
  }
}

registerCapabilityClass(FsRead);
registerCapabilityClass(FsWrite);
