import { ScriptError, defineFullOpcode } from "../types";

/** Returns a random floating-point number between 0 (inclusive) and 1 (exclusive). */
export const number = defineFullOpcode<[], number>("random.number", {
  handler: (_args, _ctx) => Math.random(),
  metadata: {
    category: "math",
    description: "Returns a random floating-point number between 0 (inclusive) and 1 (exclusive).",
    label: "Random Number",
    parameters: [],
    returnType: "number",
    slots: [],
  },
});

/** Returns a random integer between min (inclusive) and max (inclusive). */
export const between = defineFullOpcode<[number, number], number>("random.between", {
  handler: ([min, max], _ctx) => {
    if (min > max) {
      throw new ScriptError("random.between: min must be less than or equal to max");
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  metadata: {
    category: "math",
    description: "Returns a random integer between min (inclusive) and max (inclusive).",
    label: "Random Integer",
    parameters: [
      { description: "The minimum value (inclusive).", name: "min", type: "number" },
      { description: "The maximum value (inclusive).", name: "max", type: "number" },
    ],
    returnType: "number",
    slots: [
      { name: "Min", type: "number" },
      { name: "Max", type: "number" },
    ],
  },
});

/** Returns a random item from a list. */
export const choice = defineFullOpcode<[unknown[]], unknown>("random.choice", {
  handler: ([list], _ctx) => {
    if (!Array.isArray(list)) {
      throw new ScriptError("random.choice: argument must be a list");
    }
    if (list.length === 0) {
      return null;
    }
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  },
  metadata: {
    category: "math",
    description: "Returns a random item from a list.",
    label: "Random Choice",
    parameters: [{ description: "The list to pick from.", name: "list", type: "any[]" }],
    returnType: "any",
    slots: [{ name: "List", type: "block" }],
  },
});
