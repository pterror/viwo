import { evaluate } from "../interpreter";
import { defineOpcode } from "../def";

// Comparison
/** Checks if all arguments are equal. */
export const eq = defineOpcode<[unknown, unknown, ...unknown[]], boolean>("==", {
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
  handler: ([first, ...rest], _ctx) => {
    let prev = first;
    for (const next of rest) {
      if (prev !== next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});

/** Checks if adjacent arguments are different. */
export const neq = defineOpcode<[unknown, unknown, ...unknown[]], boolean>("!=", {
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
  handler: ([first, ...rest], _ctx) => {
    let prev = first;
    for (const next of rest) {
      if (prev === next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});

/** Checks if arguments are strictly increasing. */
export const lt = defineOpcode<[number, number, ...number[]], boolean>("<", {
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
  handler: ([first, ...rest], _ctx) => {
    let prev = first;
    for (const next of rest) {
      if (prev >= next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});

/** Checks if arguments are strictly decreasing. */
export const gt = defineOpcode<[number, number, ...number[]], boolean>(">", {
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
  handler: ([first, ...rest], _ctx) => {
    let prev = first;
    for (const next of rest) {
      if (prev <= next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});

/** Checks if arguments are non-decreasing. */
export const lte = defineOpcode<[number, number, ...number[]], boolean>("<=", {
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
  handler: ([first, ...rest], _ctx) => {
    let prev = first;
    for (const next of rest) {
      if (prev > next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});

/** Checks if arguments are non-increasing. */
export const gte = defineOpcode<[number, number, ...number[]], boolean>(">=", {
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
  handler: ([first, ...rest], _ctx) => {
    let prev = first;
    for (const next of rest) {
      if (prev < next) {
        return false;
      }
      prev = next;
    }
    return true;
  },
});

// Logic
/** Logical AND. */
export const and = defineOpcode<[boolean, boolean, ...boolean[]], boolean, true>("and", {
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
    lazy: true,
  },
  handler: ([a, b, ...rest], ctx) => {
    let i = 0;
    const args = [a, b, ...rest];
    const next = (): any => {
      if (i >= args.length) return true;

      const arg = args[i++]!;
      const result = evaluate(arg, ctx);

      if (result instanceof Promise) {
        return result.then((res) => {
          if (!res) return false;
          return next();
        });
      }

      if (!result) return false;
      return next();
    };

    return next();
  },
});

/** Logical OR. */
export const or = defineOpcode<[boolean, boolean, ...boolean[]], boolean, true>("or", {
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
    lazy: true,
  },
  handler: ([a, b, ...rest], ctx) => {
    let i = 0;
    const args = [a, b, ...rest];
    const next = (): any => {
      if (i >= args.length) return false;

      const arg = args[i++]!;
      const result = evaluate(arg, ctx);

      if (result instanceof Promise) {
        return result.then((res) => {
          if (res) return true;
          return next();
        });
      }

      if (result) return true;
      return next();
    };

    return next();
  },
});

/**
 * Logical NOT.
 */
export const not = defineOpcode<[boolean], boolean>("not", {
  metadata: {
    label: "Not",
    category: "logic",
    description: "Logical NOT",
    slots: [{ name: "Val", type: "block" }],
    parameters: [{ name: "val", type: "any" }],
    returnType: "boolean",
  },
  handler: ([val], _ctx) => {
    return !val;
  },
});
