# SQLite Plugin

SQLite database access plugin for viwo, providing capability-based security for database operations.

## Overview

The SQLite plugin enables viwo scripts to interact with SQLite databases using `bun:sqlite`. Access is controlled through capabilities that restrict which databases can be opened and what operations can be performed.

## Installation

The plugin is included in the viwo plugins directory. To use it, load it in your viwo server:

```typescript
import { SqlitePlugin } from "@viwo/plugin-sqlite";

// Register the plugin
server.registerPlugin(new SqlitePlugin());
```

## Capabilities

### `sqlite.open`

Opens a database connection and returns a database handle. Also provides a `close()` method to close the connection.

**Parameters:**

- `path: string` - Directory path where file-based databases can be opened
- `allowMemory?: boolean` - If `true`, allows opening `:memory:` databases
- `readonly?: boolean` - If `true`, opens databases in read-only mode

**Methods:**

```typescript
open(path: string, ctx: ScriptContext): SqliteDatabase
close(db: SqliteDatabase, ctx: ScriptContext): null
```

**Example:**

```typescript
// Create capability to open file-based databases
const openCap = std.create_capability("sqlite.open", {
  path: "./data",
});

// Open a database
const db = std.call_method(openCap, "open", ["./data/mydb.sqlite"]);

// For in-memory databases
const memCap = std.create_capability("sqlite.open", {
  allowMemory: true,
});
const memDb = std.call_method(memCap, "open", [":memory:"]);
```

### `sqlite.query`

Executes a SELECT query and returns rows as an array of objects.

**Method:**

```typescript
query(db: SqliteDatabase, sql: string, params?: any[], ctx: ScriptContext): any[]
```

**Example:**

```typescript
const queryCap = std.create_capability("sqlite.query", {});

// Simple query
const rows = std.call_method(queryCap, "query", [db, "SELECT * FROM users"]);

// Parameterized query
const user = std.call_method(queryCap, "query", [db, "SELECT * FROM users WHERE id = ?", [userId]]);
```

### `sqlite.exec`

Executes INSERT, UPDATE, DELETE, or DDL statements. Returns the number of rows changed.

**Method:**

```typescript
exec(db: SqliteDatabase, sql: string, params?: any[], ctx: ScriptContext): number
```

**Example:**

```typescript
const execCap = std.create_capability("sqlite.exec", {});

// Create table
std.call_method(execCap, "exec", [db, "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"]);

// Insert data
const changes = std.call_method(execCap, "exec", [
  db,
  "INSERT INTO users (name) VALUES (?)",
  ["Alice"],
]);

// Update data
std.call_method(execCap, "exec", [db, "UPDATE users SET name = ? WHERE id = ?", ["Bob", 1]]);
```

## Security

The plugin uses capability-based security:

1. **Path Restrictions:** File-based databases must be within the directory specified in the capability's `path` parameter
2. **Memory Database Control:** In-memory databases (`:memory:`) require explicit permission via `allowMemory: true`
3. **Read-Only Mode:** Setting `readonly: true` prevents write operations
4. **Capability Ownership:** All operations verify that the calling entity owns the capability

## Complete Example

```typescript
// Create capabilities
const openCap = std.create_capability("sqlite.open", {
  path: "./data",
  allowMemory: true,
});
const queryCap = std.create_capability("sqlite.query", {});
const execCap = std.create_capability("sqlite.exec", {});

// Open database
const db = std.call_method(openCap, "open", [":memory:"]);

// Create table
std.call_method(execCap, "exec", [
  db,
  "CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT, done INTEGER)",
]);

// Insert data
std.call_method(execCap, "exec", [
  db,
  "INSERT INTO tasks (title, done) VALUES (?, ?)",
  ["Learn viwo", 0],
]);

const taskId = sqlite.last_insert_row_id(db);

// Query data
const tasks = std.call_method(queryCap, "query", [db, "SELECT * FROM tasks WHERE done = ?", [0]]);

// Update data
std.call_method(execCap, "exec", [db, "UPDATE tasks SET done = 1 WHERE id = ?", [taskId]]);

// Close database
std.call_method(openCap, "close", [db]);
```

## Error Handling

All operations throw `ScriptError` on failure:

- Invalid paths or missing capabilities
- SQL syntax errors
- Database integrity violations
- Invalid database handles

Always handle errors appropriately in your scripts.
