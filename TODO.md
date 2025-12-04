# Viwo TODOs

- **Frontends**: Flesh out all frontends

  - TUI (should have the same layout as web frontend)
  - Discord bot

- Flesh out transpiler and compiler:

  - packages/scripting/src/transpiler.ts
  - packages/scripting/src/compiler.ts
  - docs/scripting/transpiler.md
  - docs/scripting/compiler.md
  - Add support for `i += 1`; `-=`, `||=`, `**=`, etc.
  - Add support for `for (a; b; c)`
  - Add support for `for (... in ...)`

- packages/scripting/src/interpreter.ts: Lambdas should be interpreted inside the stack machine, instead of a recursive `evaluate` call
- packages/core/src/runtime/lib/kernel.ts: In a real system, we'd need to ensure restrictions are actually restrictive (subset)
- packages/core/src/index.ts: In a real system, we would check authentication here.
- apps/tui/src/App.tsx: Fetch script content properly. For now, mock or try to find in entities if loaded.
- apps/web/src/components/ItemEditor.tsx: Batch retrieve items.
- apps/web/src/components/GameLog.tsx: ErrorView
- packages/core/src/runtime/lib/core.ts: How to update multiple entities transactionally, considering `setEntity` needs a capability now? Do we:

  - Accept a list of capabilities, and then keep entities as spread arguments? (This might cause performance issues since we might need to look through all capabilities to find the right one for each entity)
  - Accept a list of [capability, entity]
  - Something else?

- packages/scripting/src/lib/object.ts: Type-safe codegen by adding generic parameters
