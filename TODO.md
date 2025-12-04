# Viwo TODOs

- **Frontends**: Flesh out all frontends

  - TUI (should have the same layout as web frontend)
  - Discord bot

- packages/scripting/src/interpreter.ts: Lambdas should be interpreted inside the stack machine, instead of a recursive `evaluate` call
- packages/core/src/runtime/lib/net.ts: GET/POST etc with binary output; GET/POST with JSON output
- packages/core/src/runtime/lib/net.ts: Also, return a response rather than just the response
- packages/core/src/runtime/lib/kernel.ts: In a real system, we'd need to ensure restrictions are actually restrictive (subset)
- packages/core/src/index.ts: In a real system, we would check authentication here.
- apps/tui/src/App.tsx: Fetch script content properly. For now, mock or try to find in entities if loaded.
- apps/web/src/components/ItemEditor.tsx: Batch retrieve items.
- apps/web/src/components/GameLog.tsx: ErrorView
