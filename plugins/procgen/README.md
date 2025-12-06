# @viwo/plugin-procgen

Procedural Generation plugin for Viwo. Provides capabilities for noise generation and seeded random numbers.

## Installation

```bash
bun add @viwo/plugin-procgen
```

## Usage

Register the plugin in your server:

```typescript
import { ProcGenPlugin } from "@viwo/plugin-procgen";

await pluginManager.loadPlugin(new ProcGenPlugin());
```

## Opcodes

- `procgen.seed(seed)`: Seeds the procedural generation system.
- `procgen.noise(x, y)`: Generates 2D Simplex noise (-1 to 1).
- `procgen.random(min?, max?)`: Generates a seeded random number.
