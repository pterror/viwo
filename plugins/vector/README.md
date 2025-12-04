# @viwo/plugin-vector

A core plugin for Viwo that provides vector database capabilities using `sqlite-vec`.

## Features

- **Vector Storage**: Store high-dimensional vectors in SQLite.
- **Similarity Search**: Perform fast similarity searches (KNN) on stored vectors.
- **Virtual Tables**: Uses `vec0` virtual tables for efficient storage and retrieval.

## Usage

This plugin exports a `VectorDatabase` class that wraps the `sqlite-vec` functionality.

```typescript
import { VectorDatabase } from "@viwo/plugin-vector";
import { Database } from "bun:sqlite";

const db = new Database(":memory:");
const vectorDb = new VectorDatabase(db);

// Create a table for 1536-dimensional vectors
vectorDb.createTable("items", 1536);

// Insert a vector
vectorDb.insert("items", 1, [0.1, 0.2, ...]);

// Search
const results = vectorDb.search("items", [0.1, 0.2, ...], 5);
```

## Dependencies

- `sqlite-vec`: The underlying vector search extension for SQLite.
- `bun:sqlite`: Used for database interaction.
