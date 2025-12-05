# Client Package

Client-side SDK for connecting to Viwo. Provides libraries and utilities for building custom clients that interact with the Viwo server.

## Overview

The Client package abstracts the complexity of WebSocket management and JSON-RPC communication, providing a clean API for developers to build custom frontends or bots for Viwo.

## Key Classes

### `ViwoClient`

The main entry point for the SDK. It manages the WebSocket connection, handles automatic reconnection, and routes incoming messages.

- **Connection Management**: Handles connecting, disconnecting, and automatic reconnection strategies.
- **JSON-RPC**: Provides methods to send requests (`execute`, `plugin_rpc`) and handle responses.
- **State Management**: Maintains a local cache of the game state (entities, messages) and provides subscription methods for updates.

## Usage

```typescript
import { ViwoClient } from "@viwo/client";

const client = new ViwoClient("ws://localhost:8080");

// Subscribe to state updates
client.subscribe((state) => {
  console.log("Current Room:", state.roomId);
});

// Connect to server
client.connect();

// Execute a command
await client.execute("look", []);
```
