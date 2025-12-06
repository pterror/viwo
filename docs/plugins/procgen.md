# ProcGen Plugin

The ProcGen plugin (`@viwo/plugin-procgen`) provides procedural generation capabilities for the Viwo engine, allowing for the creation of noise-based terrains, random events, and seeded content.

## Opcodes

The plugin exposes the following opcodes under the `procgen` namespace:

### `procgen.seed(seed)`

Seeds the procedural generation system. This affects both noise generation and random number generation sequences.

- **Parameters**:
  - `seed` (number): The seed value.
- **Returns**: `void`.

### `procgen.noise(x, y)`

Generates 2D Simplex noise at the specified coordinates.

- **Parameters**:
  - `x` (number): The X coordinate.
  - `y` (number): The Y coordinate.
- **Returns**: `number` (value between -1 and 1).

### `procgen.random(min?, max?)`

Generates a seeded random number.

- **Parameters**:
  - `min` (number, optional): Minimum value (inclusive). Defaults to 0.
  - `max` (number, optional): Maximum value (inclusive). Defaults to 1.
- **Returns**: `number`.

**Usage Variations**:

- `procgen.random()`: Returns a float between 0 and 1.
- `procgen.random(max)`: Returns a number between 0 and `max`.
- `procgen.random(min, max)`: Returns a number between `min` and `max`.

## Example

```typescript
// Seed the generator
procgen.seed(12345);

// Generate terrain height
const height = procgen.noise(10, 20);

// Get a random loot item index
const lootIndex = procgen.random(0, 5);
```
