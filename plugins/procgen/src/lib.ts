import { defineFullOpcode } from "@viwo/scripting";
import { createNoise2D } from "simplex-noise";
import { Xoroshiro128Plus } from "./xoroshiro";

// Default seed
let prng = new Xoroshiro128Plus(12345);
let noise2D = createNoise2D(() => prng.float());

/**
 * Seeds the procedural generation system.
 * This affects both `procgen.noise` and `procgen.random`.
 */
export const seed = defineFullOpcode<[number], void>("procgen.seed", {
  metadata: {
    label: "Seed ProcGen",
    category: "procgen",
    description: "Seeds the procedural generation system.",
    slots: [{ name: "Seed", type: "number" }],
    parameters: [{ name: "seed", type: "number", description: "The seed value." }],
    returnType: "void",
  },
  handler: ([seedVal], _ctx) => {
    prng = new Xoroshiro128Plus(seedVal);
    // Re-create noise generator to use the new PRNG state effectively
    // initialized from the start of the sequence
    noise2D = createNoise2D(() => prng.float());
  },
});

/**
 * Generates 2D Simplex noise.
 * Returns a value between -1 and 1.
 */
export const noise = defineFullOpcode<[number, number], number>("procgen.noise", {
  metadata: {
    label: "Noise 2D",
    category: "procgen",
    description: "Generates 2D Simplex noise.",
    slots: [
      { name: "X", type: "block" },
      { name: "Y", type: "block" },
    ],
    parameters: [
      { name: "x", type: "number", description: "The X coordinate." },
      { name: "y", type: "number", description: "The Y coordinate." },
    ],
    returnType: "number",
  },
  handler: ([x, y], _ctx) => {
    return noise2D(x, y);
  },
});

/**
 * Generates a seeded random number.
 * - `random()`: Float 0..1
 * - `random(max)`: 0..max
 * - `random(min, max)`: min..max
 */
export const random = defineFullOpcode<[number?, number?], number>("procgen.random", {
  metadata: {
    label: "Seeded Random",
    category: "procgen",
    description: "Generates a seeded random number.",
    slots: [
      { name: "Min", type: "number", default: 0 },
      { name: "Max", type: "number", default: 1 },
    ],
    parameters: [
      { name: "min", type: "number", optional: true, description: "Min value (inclusive)." },
      { name: "max", type: "number", optional: true, description: "Max value (inclusive)." },
    ],
    returnType: "number",
  },
  handler: (args, _ctx) => {
    if (args.length === 0) return prng.float();

    let min = 0;
    let max = 1;

    if (args.length === 1) {
      max = args[0] as number;
    } else {
      [min, max] = args as [number, number];
    }

    return prng.range(min, max);
  },
});
