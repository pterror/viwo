# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Rule

ALWAYS NOTE THINGS DOWN. When you discover something important, write it immediately:
- Bugs/issues → fix them or add to TODO.md
- Design decisions → docs/ or code comments
- Future work → TODO.md
- Conventions → this file
- Areas for improvement → TODO.md (self-evaluate constantly)

## Negative Constraints

Do not:
- Announce actions with "I will now..." - just do them
- Write preamble or summary in generated content
- Leave work uncommitted

## Working Style

Start by checking TODO.md. Default: work through ALL items in "Next Up" unless user specifies otherwise.

Agentic by default - continue through tasks unless:
- Genuinely blocked and need clarification
- Decision has significant irreversible consequences
- User explicitly asked to be consulted

Fresh mode (active): Consider wrapping up when:
- Major feature complete
- 50+ tool calls
- Re-reading files repeatedly (context degradation)
- Conversation drifted across unrelated topics

See `docs/session-modes.md` to switch modes.

Self-evaluate constantly: note friction points and areas for improvement in TODO.md.

## Commits

Commit after each logical unit of work. Each commit = one logical change.

## Code Style

- Avoid one-letter names: `i` → `idx`, `e` → `event`, `a, b` → `left, right`
- Use `??` not `||` for fallbacks
- Use `+= 1` not `++`
- Avoid `any` - it's infectious like `NaN` for types
- Prefer `ts-expect-error` over `ts-ignore` (but avoid both)
- For `apps/web` and `apps/playground`: use BEM in `packages/shared/src/index.css`, not inline CSS
- Write tests with `bun test --coverage`

## Build & Development Commands

```bash
# Install dependencies
bun install

# Development
bun run dev:server     # Start core server (port 8080)
bun run dev:web        # Start web client (port 5173)
bun run dev:docs       # Start docs dev server

# Testing
bun test                           # Run all tests
bun --filter @viwo/core test       # Run tests for a specific package
bun test path/to/file.test.ts      # Run a single test file

# Code quality
bun lint                # Run oxlint
bun format              # Run oxfmt
bun run check:types     # Type check all packages (uses tsgo)
bun run check:unused    # Check for unused exports (knip)

# Database
bun run db:wipe         # Delete world.sqlite
```

## Architecture

Viwo is a multiplayer scriptable virtual world engine. The codebase is a Bun monorepo with workspaces:

### Core Packages
- **packages/scripting**: ViwoScript language - an S-expression language using JSON syntax
  - `transpiler.ts`: TypeScript → ViwoScript AST (uses TypeScript compiler API)
  - `compiler.ts`: ViwoScript AST → JavaScript function
  - `interpreter.ts`: Direct AST evaluation (fallback)
  - `decompiler.ts`: AST → source code
  - Standard library in `lib/` (std, math, string, list, object, boolean, time)

- **packages/core**: Game engine runtime
  - `index.ts`: WebSocket server, JSON-RPC handler
  - `repo.ts`: Entity/verb CRUD operations (SQLite)
  - `scheduler.ts`: Scheduled task execution
  - `runtime/opcodes.ts`: Game-specific opcodes
  - `runtime/lib/core.ts`: Core game operations (entity manipulation)
  - `runtime/lib/kernel.ts`: Capability-restricted kernel operations
  - `seeds/`: Entity definitions and world seed data

- **packages/shared**: JSON-RPC types and shared utilities
- **packages/client**: TypeScript client library for connecting to core

### Frontend Apps
- **apps/web**: SolidJS web client with visual script editor
- **apps/tui**: Terminal UI
- **apps/cli**: Command-line interface
- **apps/discord-bot**: Discord integration
- **apps/server**: Standalone server entry point

### Plugins
Plugins extend the scripting language with external capabilities:
- **plugins/ai**: AI/LLM integration (uses Vercel AI SDK with multiple providers)
- **plugins/vector**: Vector search with sqlite-vec
- **plugins/sqlite**: Direct SQLite access
- **plugins/memory**: Persistent memory for NPCs
- **plugins/procgen**: Procedural generation
- **plugins/diffusers**: Image generation

### Ops (CI/tooling)
- **ops/lint**, **ops/format**, **ops/types**, **ops/test**: Per-package tooling

## ViwoScript

Scripts are JSON S-expressions. Example:
```json
["seq",
  ["let", "name", ["arg", 0]],
  ["call", ["caller"], "tell", ["str.concat", "Hello, ", ["var", "name"], "!"]]
]
```

The transpiler converts TypeScript to ViwoScript AST. The compiler then generates optimized JavaScript. Standard opcodes are prefixed by library (e.g., `std.log`, `math.add`, `str.concat`).

## Key Patterns

- **Entities**: Everything in the world (rooms, items, NPCs, players) is an entity stored in SQLite
- **Verbs**: Scripts attached to entities, invoked by name
- **Capabilities**: Permission tokens that control what scripts can do
- **JSON-RPC**: Client-server communication protocol

## Type Checking

Uses TypeScript 6 native preview (`tsgo`) for fast type checking. Each package has its own `check:types` script.
