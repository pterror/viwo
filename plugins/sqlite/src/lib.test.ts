import { describe, expect, test } from "bun:test";
import { SqliteExec, SqliteOpen, SqliteQuery } from "./lib";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

// Helper to generate test capability IDs
const testCapId = () => crypto.randomUUID();

describe("SQLite Plugin", () => {
  describe("SqliteOpen", () => {
    test("should open :memory: database with allowMemory", () => {
      const cap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const ctx = { this: { id: 1 } };
      const db = cap.open(":memory:", ctx);

      expect(db).toBeDefined();
      expect(db.__db).toBeDefined();

      db.__db.close();
    });

    test("should reject :memory: database without allowMemory", () => {
      const cap = new SqliteOpen(testCapId(), 1, { path: "/tmp" });
      const ctx = { this: { id: 1 } };

      expect(() => cap.open(":memory:", ctx)).toThrow("memory databases not allowed");
    });

    test("should open file database within allowed path", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "sqlite-test-"));
      const dbPath = join(tempDir, "test.db");

      try {
        const cap = new SqliteOpen(testCapId(), 1, { path: tempDir });
        const ctx = { this: { id: 1 } };
        const db = cap.open(dbPath, ctx);

        expect(db).toBeDefined();
        expect(db.__db).toBeDefined();

        db.__db.close();
      } finally {
        rmSync(tempDir, { force: true, recursive: true });
      }
    });

    test("should reject file database outside allowed path", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "sqlite-test-"));

      try {
        const cap = new SqliteOpen(testCapId(), 1, { path: tempDir });
        const ctx = { this: { id: 1 } };

        expect(() => cap.open("/etc/passwd", ctx)).toThrow("path not allowed");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("should reject when ownerId does not match", () => {
      const cap = new SqliteOpen(testCapId(), 2, { allowMemory: true });
      const ctx = { this: { id: 1 } };

      expect(() => cap.open(":memory:", ctx)).toThrow("missing capability");
    });

    test("should reject non-string path", () => {
      const cap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const ctx = { this: { id: 1 } };

      expect(() => cap.open(123 as any, ctx)).toThrow("path must be a string");
    });

    test("should open database in readonly mode", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "sqlite-test-"));
      const dbPath = join(tempDir, "test.db");

      try {
        // Create database first
        const createCap = new SqliteOpen(testCapId(), 1, { path: tempDir });
        const ctx = { this: { id: 1 } };
        const createDb = createCap.open(dbPath, ctx);
        createDb.__db.run("CREATE TABLE test (id INTEGER)");
        createDb.__db.close();

        // Open in readonly mode
        const readCap = new SqliteOpen(testCapId(), 1, { path: tempDir, readonly: true });
        const db = readCap.open(dbPath, ctx);

        expect(db).toBeDefined();
        expect(() => db.__db.run("INSERT INTO test VALUES (1)")).toThrow();

        db.__db.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("SqliteQuery", () => {
    test("should execute SELECT query", () => {
      const openCap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const queryCap = new SqliteQuery(testCapId(), 1, {});
      const ctx = { this: { id: 1 } };

      const db = openCap.open(":memory:", ctx);
      db.__db.run("CREATE TABLE test (id INTEGER, name TEXT)");
      db.__db.run("INSERT INTO test VALUES (1, 'Alice')");
      db.__db.run("INSERT INTO test VALUES (2, 'Bob')");

      const results = queryCap.query(db, "SELECT * FROM test ORDER BY id", undefined, ctx);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 1, name: "Alice" });
      expect(results[1]).toEqual({ id: 2, name: "Bob" });

      db.__db.close();
    });

    test("should execute parameterized query", () => {
      const openCap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const queryCap = new SqliteQuery(testCapId(), 1, {});
      const ctx = { this: { id: 1 } };

      const db = openCap.open(":memory:", ctx);
      db.__db.run("CREATE TABLE test (id INTEGER, name TEXT)");
      db.__db.run("INSERT INTO test VALUES (1, 'Alice')");
      db.__db.run("INSERT INTO test VALUES (2, 'Bob')");

      const results = queryCap.query(db, "SELECT * FROM test WHERE id = ?", [1], ctx);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ id: 1, name: "Alice" });

      db.__db.close();
    });

    test("should reject when ownerId does not match", () => {
      const openCap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const queryCap = new SqliteQuery(testCapId(), 2, {});
      const ctx = { this: { id: 1 } };

      const db = openCap.open(":memory:", ctx);

      expect(() => queryCap.query(db, "SELECT 1", undefined, ctx)).toThrow("missing capability");

      db.__db.close();
    });

    test("should reject invalid database handle", () => {
      const queryCap = new SqliteQuery(testCapId(), 1, {});
      const ctx = { this: { id: 1 } };

      expect(() => queryCap.query({} as any, "SELECT 1", undefined, ctx)).toThrow(
        "invalid database handle",
      );
    });

    test("should reject non-string SQL", () => {
      const openCap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const queryCap = new SqliteQuery(testCapId(), 1, {});
      const ctx = { this: { id: 1 } };

      const db = openCap.open(":memory:", ctx);

      expect(() => queryCap.query(db, 123 as any, undefined, ctx)).toThrow("sql must be a string");

      db.__db.close();
    });
  });

  describe("SqliteExec", () => {
    test("should execute INSERT statement", () => {
      const openCap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const execCap = new SqliteExec(testCapId(), 1, {});
      const ctx = { this: { id: 1 } };

      const db = openCap.open(":memory:", ctx);
      db.__db.run("CREATE TABLE test (id INTEGER, name TEXT)");

      const changes = execCap.exec(db, "INSERT INTO test VALUES (1, 'Alice')", undefined, ctx);

      expect(changes).toBe(1);

      db.__db.close();
    });

    test("should execute parameterized INSERT", () => {
      const openCap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const execCap = new SqliteExec(testCapId(), 1, {});
      const ctx = { this: { id: 1 } };

      const db = openCap.open(":memory:", ctx);
      db.__db.run("CREATE TABLE test (id INTEGER, name TEXT)");

      const changes = execCap.exec(db, "INSERT INTO test VALUES (?, ?)", [1, "Alice"], ctx);

      expect(changes).toBe(1);

      db.__db.close();
    });

    test("should execute UPDATE statement", () => {
      const openCap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const execCap = new SqliteExec(testCapId(), 1, {});
      const ctx = { this: { id: 1 } };

      const db = openCap.open(":memory:", ctx);
      db.__db.run("CREATE TABLE test (id INTEGER, name TEXT)");
      db.__db.run("INSERT INTO test VALUES (1, 'Alice')");
      db.__db.run("INSERT INTO test VALUES (2, 'Bob')");

      const changes = execCap.exec(
        db,
        "UPDATE test SET name = 'Charlie' WHERE id = 1",
        undefined,
        ctx,
      );

      expect(changes).toBe(1);

      db.__db.close();
    });

    test("should execute DELETE statement", () => {
      const openCap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const execCap = new SqliteExec(testCapId(), 1, {});
      const ctx = { this: { id: 1 } };

      const db = openCap.open(":memory:", ctx);
      db.__db.run("CREATE TABLE test (id INTEGER, name TEXT)");
      db.__db.run("INSERT INTO test VALUES (1, 'Alice')");
      db.__db.run("INSERT INTO test VALUES (2, 'Bob')");

      const changes = execCap.exec(db, "DELETE FROM test WHERE id = 1", undefined, ctx);

      expect(changes).toBe(1);

      db.__db.close();
    });

    test("should reject when ownerId does not match", () => {
      const openCap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const execCap = new SqliteExec(testCapId(), 2, {});
      const ctx = { this: { id: 1 } };

      const db = openCap.open(":memory:", ctx);

      expect(() => execCap.exec(db, "SELECT 1", undefined, ctx)).toThrow("missing capability");

      db.__db.close();
    });

    test("should reject invalid database handle", () => {
      const execCap = new SqliteExec(testCapId(), 1, {});
      const ctx = { this: { id: 1 } };

      expect(() => execCap.exec({} as any, "SELECT 1", undefined, ctx)).toThrow(
        "invalid database handle",
      );
    });

    test("should reject non-string SQL", () => {
      const openCap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const execCap = new SqliteExec(testCapId(), 1, {});
      const ctx = { this: { id: 1 } };

      const db = openCap.open(":memory:", ctx);

      expect(() => execCap.exec(db, 123 as any, undefined, ctx)).toThrow("sql must be a string");

      db.__db.close();
    });
  });

  describe("Helper Methods", () => {
    test("close should close database", () => {
      const openCap = new SqliteOpen(testCapId(), 1, { allowMemory: true });
      const ctx = { this: { id: 1 } };

      const db = openCap.open(":memory:", ctx);

      const result = openCap.close(db, ctx);

      expect(result).toBeNull();
    });
  });
});
