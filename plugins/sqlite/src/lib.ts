import { BaseCapability, registerCapabilityClass } from "@viwo/core";
import { Database } from "bun:sqlite";
import { ScriptError } from "@viwo/scripting";
import { resolve } from "node:path";

export interface SqliteDatabase {
  __db: Database;
}

export class SqliteOpen extends BaseCapability {
  static override readonly type = "sqlite.open";

  open(path: string, ctx: any): SqliteDatabase {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("sqlite.open: missing capability");
    }

    if (typeof path !== "string") {
      throw new ScriptError("sqlite.open: path must be a string");
    }

    // Handle :memory: database
    if (path === ":memory:") {
      const { allowMemory } = this.params;
      if (!allowMemory) {
        throw new ScriptError("sqlite.open: memory databases not allowed");
      }
      // Note: readonly mode is not supported for :memory: databases
      const db = new Database(":memory:");
      return { __db: db };
    }

    // Handle file-based database
    const allowedPath = this.params["path"];
    if (!allowedPath || typeof allowedPath !== "string") {
      throw new ScriptError("sqlite.open: invalid capability params");
    }

    const resolvedTarget = resolve(path);
    const resolvedAllowed = resolve(allowedPath);
    if (!resolvedTarget.startsWith(resolvedAllowed)) {
      throw new ScriptError("sqlite.open: path not allowed");
    }

    try {
      const readonly = this.params["readonly"] ?? false;
      // bun:sqlite uses SQLITE_OPEN_READONLY (0x00000001) flag
      const db = readonly ? new Database(path, { readonly: true }) : new Database(path);
      return { __db: db };
    } catch (error: any) {
      throw new ScriptError(`sqlite.open failed: ${error.message}`);
    }
  }

  close(db: SqliteDatabase, ctx: any): null {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("sqlite.close: missing capability");
    }

    if (!db || !db.__db) {
      throw new ScriptError("sqlite.close: invalid database handle");
    }

    try {
      db.__db.close();
      return null;
    } catch (error: any) {
      throw new ScriptError(`sqlite.close failed: ${error.message}`);
    }
  }
}

export class SqliteQuery extends BaseCapability {
  static override readonly type = "sqlite.query";

  query(db: SqliteDatabase, sql: string, params?: any[], ctx?: any): any[] {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("sqlite.query: missing capability");
    }

    if (!db || !db.__db) {
      throw new ScriptError("sqlite.query: invalid database handle");
    }

    if (typeof sql !== "string") {
      throw new ScriptError("sqlite.query: sql must be a string");
    }

    try {
      const stmt = db.__db.query(sql);
      if (params && Array.isArray(params)) {
        return stmt.all(...params);
      }
      return stmt.all();
    } catch (error: any) {
      throw new ScriptError(`sqlite.query failed: ${error.message}`);
    }
  }
}

export class SqliteExec extends BaseCapability {
  static override readonly type = "sqlite.exec";

  exec(db: SqliteDatabase, sql: string, params?: any[], ctx?: any): number {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("sqlite.exec: missing capability");
    }

    if (!db || !db.__db) {
      throw new ScriptError("sqlite.exec: invalid database handle");
    }

    if (typeof sql !== "string") {
      throw new ScriptError("sqlite.exec: sql must be a string");
    }

    try {
      const stmt = db.__db.prepare(sql);
      let result;
      if (params && Array.isArray(params)) {
        result = stmt.run(...params);
      } else {
        result = stmt.run();
      }
      // Return the changes count from the statement execution result
      return result.changes;
    } catch (error: any) {
      throw new ScriptError(`sqlite.exec failed: ${error.message}`);
    }
  }
}

declare module "@viwo/core" {
  interface CapabilityRegistry {
    [SqliteOpen.type]: typeof SqliteOpen;
    [SqliteQuery.type]: typeof SqliteQuery;
    [SqliteExec.type]: typeof SqliteExec;
  }
}

registerCapabilityClass(SqliteOpen);
registerCapabilityClass(SqliteQuery);
registerCapabilityClass(SqliteExec);
