# @viwo/plugin-memory

A plugin for Viwo that implements a RAG-based (Retrieval-Augmented Generation) long-term memory system.

## Features

- **Semantic Memory**: Stores text content with automatically generated embeddings.
- **Semantic Search**: Retrieve memories based on meaning rather than just keyword matching.
- **Integration**: Works seamlessly with `@viwo/plugin-ai` for embedding generation and `@viwo/plugin-vector` for storage.

## Usage

The plugin registers a `memory` command for interaction and exposes a `MemoryManager` for programmatic access.

### Commands

- `memory add <content>`: Add a new memory.
- `memory search <query>`: Search for relevant memories.

### Programmatic Usage

```typescript
import { MemoryPlugin } from "@viwo/plugin-memory";

// In your plugin or script
const memoryPlugin = ctx.getPlugin("memory") as MemoryPlugin;
const memoryManager = memoryPlugin.memoryManager;

// Add a memory
await memoryManager.add("The secret key is under the mat.");

// Search memories
const results = await memoryManager.search("Where is the key?");
console.log(results[0].content); // "The secret key is under the mat."
```

## Configuration

Requires `@viwo/plugin-ai` to be loaded and configured with an embedding provider (default: `openai:text-embedding-3-small`).
