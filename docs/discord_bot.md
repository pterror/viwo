# Discord Bot

The Viwo Discord Bot (`apps/discord-bot`) serves as a bridge between Discord and the Viwo Core server, allowing users to play the game directly from Discord channels.

## Overview

The bot uses the `discord.js` library to interact with the Discord API and `@viwo/client` to communicate with the Viwo Core server via WebSockets. It maintains a mapping between Discord channels and game rooms, as well as between Discord users and game entities.

## Configuration

The bot is configured via environment variables (loaded from `.env`):

- `DISCORD_TOKEN`: The bot token provided by the Discord Developer Portal.
- `CORE_URL`: The WebSocket URL of the Viwo Core server (default: `ws://localhost:8080`).
- `DB_PATH`: Path to the SQLite database file used for storing mappings (default: `bot.sqlite`).
- `BOT_ENTITY_ID`: The ID of the entity representing the bot itself in the game (default: `4`).

## Commands

The bot supports a few slash-like commands (currently implemented as message prefixes):

- `!link <room_id>`: Links the current Discord channel to a specific game room ID. Messages sent in this channel will be routed to that room.
- `!ping`: A simple health check command that replies with "Pong!".

## Architecture

### SocketManager (`src/socket.ts`)

Manages the WebSocket connection to the Viwo Core. It uses a single connection for the bot but facilitates "sudo" commands to execute actions on behalf of other users.

### DatabaseManager (`src/db.ts`)

Handles persistence using `bun:sqlite`. It stores:

- **Channel Maps**: `channel_id` -> `room_id`
- **User Defaults**: `discord_id` -> `default_entity_id`
- **Active Sessions**: `(discord_id, channel_id)` -> `entity_id`

### SessionManager (`src/session.ts`)

Resolves a Discord user to a Viwo entity ID.

1. Checks for an active session in the current channel.
2. Checks for a default entity associated with the user.
3. If neither exists, it requests the Core to create a new player entity and links it.

### Message Routing

1. **Discord -> Core**:

   - User types a message.
   - Bot resolves the user to an entity ID.
   - Bot sends a `sudo` command to Core: `execute(target_id, verb, args)`.

2. **Core -> Discord**:
   - Core sends a `forward` message to the Bot's socket.
   - `SocketManager` emits the message.
   - `DiscordBot` receives the message, looks up active sessions for the target entity, and forwards the message to the appropriate Discord channel.

## Running Locally

To run the bot locally:

1. Ensure the Core server is running.
2. Set up your `.env` file with a valid `DISCORD_TOKEN`.
3. Run:
   ```bash
   cd apps/discord-bot
   bun run dev
   ```
