import { Xoroshiro128Plus } from "./xoroshiro";
import { createNoise2D } from "simplex-noise";
import { defineFullOpcode } from "@viwo/scripting";

// Default seed
let prng = new Xoroshiro128Plus(12_345);
let noise2D = createNoise2D(() => prng.float());

/**
 * Seeds the procedural generation system.
 * This affects both `procgen.noise` and `procgen.random`.
 */
export const seed = defineFullOpcode<[number], void>("procgen.seed", {
  handler: ([seedVal], _ctx) => {
    prng = new Xoroshiro128Plus(seedVal);
    // Re-create noise generator to use the new PRNG state effectively
    // initialized from the start of the sequence
    noise2D = createNoise2D(() => prng.float());
  },
  metadata: {
    category: "procgen",
    description: "Seeds the procedural generation system.",
    label: "Seed ProcGen",
    parameters: [{ description: "The seed value.", name: "seed", type: "number" }],
    returnType: "void",
    slots: [{ name: "Seed", type: "number" }],
  },
});

/**
 * Generates 2D Simplex noise.
 * Returns a value between -1 and 1.
 */
export const noise = defineFullOpcode<[cx: number, cy: number], number>("procgen.noise", {
  handler: ([cx, cy], _ctx) => noise2D(cx, cy),
  metadata: {
    category: "procgen",
    description: "Generates 2D Simplex noise.",
    label: "Noise 2D",
    parameters: [
      { description: "The X coordinate.", name: "x", type: "number" },
      { description: "The Y coordinate.", name: "y", type: "number" },
    ],
    returnType: "number",
    slots: [
      { name: "X", type: "block" },
      { name: "Y", type: "block" },
    ],
  },
});

/**
 * Generates a seeded random number.
 * - `random()`: Float 0..1
 * - `random(max)`: 0..max
 * - `random(min, max)`: min..max
 */
export const random = defineFullOpcode<[min?: number, max?: number], number>("procgen.random", {
  handler: (args, _ctx) => {
    if (args.length === 0) {
      return prng.float();
    }

    let min = 0;
    let max = 1;

    if (args.length === 1) {
      max = args[0] as number;
    } else {
      [min, max] = args as [number, number];
    }

    return prng.range(min, max);
  },
  metadata: {
    category: "procgen",
    description: "Generates a seeded random number.",
    label: "Seeded Random",
    parameters: [
      { description: "Min value (inclusive).", name: "min", optional: true, type: "number" },
      { description: "Max value (inclusive).", name: "max", optional: true, type: "number" },
    ],
    returnType: "number",
    slots: [
      { default: 0, name: "Min", type: "number" },
      { default: 1, name: "Max", type: "number" },
    ],
  },
});
