import { defineFullOpcode } from "../types";

/** Adds numbers.*/
export const add = defineFullOpcode<[number, number, ...number[]], number>("+", {
  handler: ([first, ...rest], _ctx) => {
    let sum = first;
    for (const val of rest) {
      sum += val;
    }
    return sum;
  },
  metadata: {
    category: "math",
    description: "Adds numbers.",
    label: "Add",
    layout: "infix",
    parameters: [
      { description: "The first number.", name: "left", type: "number" },
      { description: "The second number.", name: "right", type: "number" },
      {
        description: "Additional numbers to add.",
        name: "...args",
        optional: false,
        type: "number[]",
      },
    ],
    returnType: "number",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },
});

/** Subtracts numbers. */
export const sub = defineFullOpcode<[number, number, ...number[]], number>("-", {
  handler: ([first, ...rest], _ctx) => {
    let diff = first;
    for (const val of rest) {
      diff -= val;
    }
    return diff;
  },
  metadata: {
    category: "math",
    description: "Subtracts numbers.",
    label: "-",
    layout: "infix",
    parameters: [
      { description: "The number to subtract from.", name: "left", type: "number" },
      { description: "The number to subtract.", name: "right", type: "number" },
      {
        description: "Additional numbers to subtract.",
        name: "...args",
        optional: false,
        type: "number[]",
      },
    ],
    returnType: "number",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },
});

/** Multiplies numbers. */
export const mul = defineFullOpcode<[number, number, ...number[]], number>("*", {
  handler: ([first, ...rest], _ctx) => {
    let prod = first;
    for (const val of rest) {
      prod *= val;
    }
    return prod;
  },
  metadata: {
    category: "math",
    description: "Multiplies numbers.",
    label: "*",
    layout: "infix",
    parameters: [
      { description: "The first number.", name: "left", type: "number" },
      { description: "The second number.", name: "right", type: "number" },
      {
        description: "Additional numbers to multiply.",
        name: "...args",
        optional: false,
        type: "number[]",
      },
    ],
    returnType: "number",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },
});

/** Divides numbers. */
export const div = defineFullOpcode<[number, number, ...number[]], number>("/", {
  handler: ([first, ...rest], _ctx) => {
    let quot = first;
    for (const val of rest) {
      quot /= val;
    }
    return quot;
  },
  metadata: {
    category: "math",
    description: "Divides numbers.",
    label: "/",
    layout: "infix",
    parameters: [
      { description: "The dividend.", name: "left", type: "number" },
      { description: "The divisor.", name: "right", type: "number" },
      { description: "Additional divisors.", name: "...args", type: "number[]" },
    ],
    returnType: "number",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },
});

/** Calculates the modulo of two numbers. */
export const mod = defineFullOpcode<[number, number], number>("%", {
  handler: ([left, right], _ctx) => left % right,
  metadata: {
    category: "math",
    description: "Calculates the modulo of two numbers.",
    label: "%",
    layout: "infix",
    parameters: [
      { description: "The dividend.", name: "left", type: "number" },
      { description: "The divisor.", name: "right", type: "number" },
    ],
    returnType: "number",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },
});

/** Calculates exponentiation (power tower). */
export const pow = defineFullOpcode<[number, number, ...number[]], number>("^", {
  handler: (args, _ctx) => {
    // Power tower
    let pow = args.at(-1)!;
    for (let idx = args.length - 2; idx >= 0; idx -= 1) {
      const next = args[idx]!;
      pow = next ** pow;
    }
    return pow;
  },
  metadata: {
    category: "math",
    description: "Calculates exponentiation (power tower).",
    label: "^",
    layout: "infix",
    parameters: [
      { description: "The base number.", name: "base", type: "number" },
      { description: "The exponent.", name: "exp", type: "number" },
      { description: "Additional exponents.", name: "...args", type: "number[]" },
    ],
    returnType: "number",
    slots: [
      { name: "Base", type: "block" },
      { name: "Exp", type: "block" },
    ],
  },
});

/** Rounds down a number. */
export const floor = defineFullOpcode<[number], number>("math.floor", {
  handler: ([num], _ctx) => Math.floor(num),
  metadata: {
    category: "math",
    description: "Rounds down a number.",
    label: "Floor",
    parameters: [{ description: "The number to floor.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

/** Rounds up a number. */
export const ceil = defineFullOpcode<[number], number>("math.ceil", {
  handler: ([num], _ctx) => Math.ceil(num),
  metadata: {
    category: "math",
    description: "Rounds up a number.",
    label: "Ceil",
    parameters: [{ description: "The number to ceil.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

/** Returns the integer part of a number. */
export const trunc = defineFullOpcode<[number], number>("math.trunc", {
  handler: ([num], _ctx) => Math.trunc(num),
  metadata: {
    category: "math",
    description: "Returns the integer part of a number.",
    label: "Trunc",
    parameters: [{ description: "The number to truncate.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

/** Rounds a number to the nearest integer. */
export const round = defineFullOpcode<[number], number>("math.round", {
  handler: ([num], _ctx) => Math.round(num),
  metadata: {
    category: "math",
    description: "Rounds a number to the nearest integer.",
    label: "Round",
    parameters: [{ description: "The number to round.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

// Trigonometry

/** Returns the sine of a number. */
export const sin = defineFullOpcode<[number], number>("math.sin", {
  handler: ([angle], _ctx) => Math.sin(angle),
  metadata: {
    category: "math",
    description: "Returns the sine of a number.",
    label: "Sin",
    parameters: [{ description: "The angle in radians.", name: "angle", type: "number" }],
    returnType: "number",
    slots: [{ name: "Angle", type: "block" }],
  },
});

/** Returns the cosine of a number. */
export const cos = defineFullOpcode<[number], number>("math.cos", {
  handler: ([angle], _ctx) => Math.cos(angle),
  metadata: {
    category: "math",
    description: "Returns the cosine of a number.",
    label: "Cos",
    parameters: [{ description: "The angle in radians.", name: "angle", type: "number" }],
    returnType: "number",
    slots: [{ name: "Angle", type: "block" }],
  },
});

/** Returns the tangent of a number. */
export const tan = defineFullOpcode<[number], number>("math.tan", {
  handler: ([angle], _ctx) => Math.tan(angle),
  metadata: {
    category: "math",
    description: "Returns the tangent of a number.",
    label: "Tan",
    parameters: [{ description: "The angle in radians.", name: "angle", type: "number" }],
    returnType: "number",
    slots: [{ name: "Angle", type: "block" }],
  },
});

/** Returns the arcsine of a number. */
export const asin = defineFullOpcode<[number], number>("math.asin", {
  handler: ([num], _ctx) => Math.asin(num),
  metadata: {
    category: "math",
    description: "Returns the arcsine of a number.",
    label: "Asin",
    parameters: [{ description: "The number.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

/** Returns the arccosine of a number. */
export const acos = defineFullOpcode<[number], number>("math.acos", {
  handler: ([num], _ctx) => Math.acos(num),
  metadata: {
    category: "math",
    description: "Returns the arccosine of a number.",
    label: "Acos",
    parameters: [{ description: "The number.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

/** Returns the arctangent of a number. */
export const atan = defineFullOpcode<[number], number>("math.atan", {
  handler: ([num], _ctx) => Math.atan(num),
  metadata: {
    category: "math",
    description: "Returns the arctangent of a number.",
    label: "Atan",
    parameters: [{ description: "The number.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

/** Returns the angle (in radians) from the X axis to a point. */
export const atan2 = defineFullOpcode<[number, number], number>("math.atan2", {
  handler: ([dy, dx], _ctx) => Math.atan2(dy, dx),
  metadata: {
    category: "math",
    description: "Returns the angle (in radians) from the X axis to a point.",
    label: "Atan2",
    parameters: [
      { description: "The y coordinate.", name: "dy", type: "number" },
      { description: "The x coordinate.", name: "dx", type: "number" },
    ],
    returnType: "number",
    slots: [
      { name: "Y", type: "block" },
      { name: "X", type: "block" },
    ],
  },
});

// Log/Exp

/** Returns the natural logarithm (base e) of a number. */
export const log = defineFullOpcode<[number], number>("math.log", {
  handler: ([num], _ctx) => Math.log(num),
  metadata: {
    category: "math",
    description: "Returns the natural logarithm (base e) of a number.",
    label: "Log",
    parameters: [{ description: "The number.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

/** Returns the base 2 logarithm of a number. */
export const log2 = defineFullOpcode<[number], number>("math.log2", {
  handler: ([num], _ctx) => Math.log2(num),
  metadata: {
    category: "math",
    description: "Returns the base 2 logarithm of a number.",
    label: "Log2",
    parameters: [{ description: "The number.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

/** Returns the base 10 logarithm of a number. */
export const log10 = defineFullOpcode<[number], number>("math.log10", {
  handler: ([num], _ctx) => Math.log10(num),
  metadata: {
    category: "math",
    description: "Returns the base 10 logarithm of a number.",
    label: "Log10",
    parameters: [{ description: "The number.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

/** Returns e raised to the power of a number. */
export const exp = defineFullOpcode<[number], number>("math.exp", {
  handler: ([num], _ctx) => Math.exp(num),
  metadata: {
    category: "math",
    description: "Returns e raised to the power of a number.",
    label: "Exp",
    parameters: [{ description: "The exponent.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

/** Returns the square root of a number. */
export const sqrt = defineFullOpcode<[number], number>("math.sqrt", {
  handler: ([num], _ctx) => Math.sqrt(num),
  metadata: {
    category: "math",
    description: "Returns the square root of a number.",
    label: "Sqrt",
    parameters: [{ description: "The number.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

// Utilities

/** Returns the absolute value of a number. */
export const abs = defineFullOpcode<[number], number>("math.abs", {
  handler: ([num], _ctx) => Math.abs(num),
  metadata: {
    category: "math",
    description: "Returns the absolute value of a number.",
    label: "Abs",
    parameters: [{ description: "The number.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});

/** Returns the smallest of the given numbers. */
export const min = defineFullOpcode<[number, ...number[]], number>("math.min", {
  handler: (args, _ctx) => Math.min(...args),
  metadata: {
    category: "math",
    description: "Returns the smallest of the given numbers.",
    label: "Min",
    parameters: [
      { description: "First number.", name: "arg0", type: "number" },
      { description: "Additional numbers.", name: "...args", type: "number[]" },
    ],
    returnType: "number",
    slots: [{ name: "Args", type: "block" }],
  },
});

/** Returns the largest of the given numbers. */
export const max = defineFullOpcode<[number, ...number[]], number>("math.max", {
  handler: (args, _ctx) => Math.max(...args),
  metadata: {
    category: "math",
    description: "Returns the largest of the given numbers.",
    label: "Max",
    parameters: [
      { description: "First number.", name: "arg0", type: "number" },
      { description: "Additional numbers.", name: "...args", type: "number[]" },
    ],
    returnType: "number",
    slots: [{ name: "Args", type: "block" }],
  },
});

/** Clamps a number between a minimum and maximum value. */
export const clamp = defineFullOpcode<[number, number, number], number>("math.clamp", {
  handler: ([val, min, max], _ctx) => Math.min(Math.max(val, min), max),
  metadata: {
    category: "math",
    description: "Clamps a number between a minimum and maximum value.",
    label: "Clamp",
    parameters: [
      { description: "The value to clamp.", name: "val", type: "number" },
      { description: "The minimum value.", name: "min", type: "number" },
      { description: "The maximum value.", name: "max", type: "number" },
    ],
    returnType: "number",
    slots: [
      { name: "Val", type: "block" },
      { name: "Min", type: "block" },
      { name: "Max", type: "block" },
    ],
  },
});

/** Returns the sign of a number. */
export const sign = defineFullOpcode<[number], number>("math.sign", {
  handler: ([num], _ctx) => Math.sign(num),
  metadata: {
    category: "math",
    description:
      "Returns the sign of a number, indicating whether the number is positive, negative or zero.",
    label: "Sign",
    parameters: [{ description: "The number.", name: "num", type: "number" }],
    returnType: "number",
    slots: [{ name: "Num", type: "block" }],
  },
});
