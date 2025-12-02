import { evaluate, ScriptError } from "../interpreter";
import { defineOpcode, ScriptValue } from "../def";

// Comparison
/**
 * Checks if all arguments are equal.
 */
const eq = defineOpcode<
  [ScriptValue<unknown>, ScriptValue<unknown>, ...ScriptValue<unknown>[]],
  boolean
>("==", {
  metadata: {
    label: "==",
    category: "logic",
    description: "Equality check",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "unknown" },
      { name: "b", type: "unknown" },
      { name: "...args", type: "unknown[]" },
    ],
    returnType: "boolean",
  },
  handler: async (args, ctx) => {
    if (args.length < 2) {
      throw new ScriptError("==: expected at least 2 arguments");
    }
    let prev = await evaluate(args[0], ctx);
    for (let i = 1; i < args.length; i++) {
      const next = await evaluate(args[i], ctx);
      if (prev !== next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});
export { eq as "==" };

/**
 * Checks if adjacent arguments are different.
 */
const neq = defineOpcode<
  [ScriptValue<unknown>, ScriptValue<unknown>, ...ScriptValue<unknown>[]],
  boolean
>("!=", {
  metadata: {
    label: "!=",
    category: "logic",
    description: "Inequality check",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "unknown" },
      { name: "b", type: "unknown" },
      { name: "...args", type: "unknown[]" },
    ],
    returnType: "boolean",
  },
  handler: async (args, ctx) => {
    if (args.length < 2) {
      throw new ScriptError("!=: expected at least 2 arguments");
    }
    let prev = await evaluate(args[0], ctx);
    for (let i = 1; i < args.length; i++) {
      const next = await evaluate(args[i], ctx);
      if (prev === next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});
export { neq as "!=" };

/**
 * Checks if arguments are strictly increasing.
 */
const lt = defineOpcode<
  [ScriptValue<number>, ScriptValue<number>, ...ScriptValue<number>[]],
  boolean
>("<", {
  metadata: {
    label: "<",
    category: "logic",
    description: "Less than",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "number" },
      { name: "b", type: "number" },
      { name: "...args", type: "number[]" },
    ],
    returnType: "boolean",
  },
  handler: async (args, ctx) => {
    if (args.length < 2) {
      throw new ScriptError("<: expected at least 2 arguments");
    }
    let prev = await evaluate(args[0], ctx);
    for (let i = 1; i < args.length; i++) {
      const next = await evaluate(args[i], ctx);
      if (prev >= next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});
export { lt as "<" };

/**
 * Checks if arguments are strictly decreasing.
 */
const gt = defineOpcode<
  [ScriptValue<number>, ScriptValue<number>, ...ScriptValue<number>[]],
  boolean
>(">", {
  metadata: {
    label: ">",
    category: "logic",
    description: "Greater than",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "number" },
      { name: "b", type: "number" },
      { name: "...args", type: "number[]" },
    ],
    returnType: "boolean",
  },
  handler: async (args, ctx) => {
    if (args.length < 2) {
      throw new ScriptError(">: expected at least 2 arguments");
    }
    let prev = await evaluate(args[0], ctx);
    for (let i = 1; i < args.length; i++) {
      const next = await evaluate(args[i], ctx);
      if (prev <= next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});
export { gt as ">" };

/**
 * Checks if arguments are non-decreasing.
 */
const lte = defineOpcode<
  [ScriptValue<number>, ScriptValue<number>, ...ScriptValue<number>[]],
  boolean
>("<=", {
  metadata: {
    label: "<=",
    category: "logic",
    description: "Less than or equal",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "number" },
      { name: "b", type: "number" },
      { name: "...args", type: "number[]" },
    ],
    returnType: "boolean",
  },
  handler: async (args, ctx) => {
    if (args.length < 2) {
      throw new ScriptError("<=: expected at least 2 arguments");
    }
    let prev = await evaluate(args[0], ctx);
    for (let i = 1; i < args.length; i++) {
      const next = await evaluate(args[i], ctx);
      if (prev > next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});
export { lte as "<=" };

/**
 * Checks if arguments are non-increasing.
 */
const gte = defineOpcode<
  [ScriptValue<number>, ScriptValue<number>, ...ScriptValue<number>[]],
  boolean
>(">=", {
  metadata: {
    label: ">=",
    category: "logic",
    description: "Greater than or equal",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "number" },
      { name: "b", type: "number" },
      { name: "...args", type: "number[]" },
    ],
    returnType: "boolean",
  },
  handler: async (args, ctx) => {
    if (args.length < 2) {
      throw new ScriptError(">=: expected at least 2 arguments");
    }
    let prev = await evaluate(args[0], ctx);
    for (let i = 1; i < args.length; i++) {
      const next = await evaluate(args[i], ctx);
      if (prev < next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});
export { gte as ">=" };

// Logic
/**
 * Logical AND.
 */
export const and = defineOpcode<
  [ScriptValue<boolean>, ScriptValue<boolean>, ...ScriptValue<boolean>[]],
  boolean
>("and", {
  metadata: {
    label: "And",
    category: "logic",
    description: "Logical AND",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "unknown" },
      { name: "b", type: "unknown" },
      { name: "...args", type: "unknown[]" },
    ],
    returnType: "boolean",
  },
  handler: async (args, ctx) => {
    if (args.length < 2) {
      throw new ScriptError("and: expected at least 2 arguments");
    }
    for (const arg of args) {
      if (!(await evaluate(arg, ctx))) return false;
    }
    return true;
  },
});

/**
 * Logical OR.
 */
export const or = defineOpcode<
  [ScriptValue<boolean>, ScriptValue<boolean>, ...ScriptValue<boolean>[]],
  boolean
>("or", {
  metadata: {
    label: "Or",
    category: "logic",
    description: "Logical OR",
    layout: "infix",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
    parameters: [
      { name: "a", type: "unknown" },
      { name: "b", type: "unknown" },
      { name: "...args", type: "unknown[]" },
    ],
    returnType: "boolean",
  },
  handler: async (args, ctx) => {
    if (args.length < 2) {
      throw new ScriptError("or: expected at least 2 arguments");
    }
    for (const arg of args) {
      if (await evaluate(arg, ctx)) return true;
    }
    return false;
  },
});

/**
 * Logical NOT.
 */
export const not = defineOpcode<[ScriptValue<boolean>], boolean>("not", {
  metadata: {
    label: "Not",
    category: "logic",
    description: "Logical NOT",
    slots: [{ name: "Val", type: "block" }],
    parameters: [{ name: "val", type: "unknown" }],
    returnType: "boolean",
  },
  handler: async (args, ctx) => {
    if (args.length !== 1) {
      throw new ScriptError("not: expected 1 argument");
    }
    return !(await evaluate(args[0], ctx));
  },
});
