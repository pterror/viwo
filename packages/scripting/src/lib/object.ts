import { ScriptError, type ScriptRaw, type ScriptValue, defineFullOpcode } from "../types";
import { evaluate, executeLambda } from "../interpreter";

const DISALLOWED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** Creates a new object from key-value pairs. */
export const objNew = defineFullOpcode<
  [...ScriptRaw<[key: ScriptValue<string>, value: ScriptValue<unknown>]>[]],
  any,
  true
>("obj.new", {
  handler: (args, ctx) => {
    // args: [[key1, val1], [key2, val2], ...] (variadic)
    const obj: Record<string, unknown> = {};
    let idx = 0;
    const next = (): Record<string, unknown> | Promise<Record<string, unknown>> => {
      for (; idx < args.length; idx += 1) {
        if (!Array.isArray(args[idx]) || args[idx]!.length !== 2) {
          throw new ScriptError(
            `obj.new: expected pair at index ${idx}, got ${JSON.stringify(args[idx])}`,
          );
        }
        const [keyExpr, valueExpr] = args[idx]!;
        const key = evaluate(keyExpr, ctx);
        const val = evaluate(valueExpr, ctx);
        if (key instanceof Promise || val instanceof Promise) {
          return Promise.all([key, val]).then(([key, val]) => {
            if (typeof key !== "string") {
              throw new ScriptError(
                `obj.new: expected string key at index ${idx}, got ${JSON.stringify(key)}`,
              );
            }
            obj[key] = val;
            return next();
          });
        }
        if (typeof key !== "string") {
          throw new ScriptError(
            `obj.new: expected string key at index ${idx}, got ${JSON.stringify(key)}`,
          );
        }
        obj[key] = val;
      }
      return obj;
    };
    return next();
  },
  metadata: {
    category: "data",
    description: "Creates a new object from key-value pairs.",
    genericParameters: [
      "Kvs extends [] | readonly (readonly [key: '' | (string & {}), value: unknown])[]",
    ],
    label: "New Object",
    lazy: true,
    parameters: [{ description: "Key-value pairs.", name: "...kvs", type: "any[]" }],
    returnType:
      // This is an intentional template curly (part of TypeScript's type syntax)
      // oxlint-disable-next-line no-template-curly-in-string
      "{ [Key in keyof Kvs & `${number}` as (Kvs[Key] & [string, unknown])[0]]: (Kvs[Key] & [string, unknown])[1] }",
    slots: [],
  },
});

/** Returns an array of a given object's own enumerable property names. */
export const objKeys = defineFullOpcode<[object], string[]>("obj.keys", {
  handler: ([obj], _ctx) => Object.getOwnPropertyNames(obj),
  metadata: {
    category: "object",
    description: "Returns an array of a given object's own enumerable property names.",
    genericParameters: ["Type"],
    label: "Keys",
    parameters: [{ description: "The object to get keys from.", name: "object", type: "Type" }],
    returnType: "readonly (keyof Type)[]",
    slots: [{ name: "Object", type: "block" }],
  },
});

/** Returns an array of a given object's own enumerable property values. */
export const objValues = defineFullOpcode<[object], any[]>("obj.values", {
  handler: ([obj], _ctx) => Object.getOwnPropertyNames(obj).map((key) => (obj as any)[key]),
  metadata: {
    category: "object",
    description: "Returns an array of a given object's own enumerable property values.",
    genericParameters: ["Type"],
    label: "Values",
    parameters: [{ description: "The object to get values from.", name: "object", type: "Type" }],
    returnType: "readonly (Type[keyof Type])[]",
    slots: [{ name: "Object", type: "block" }],
  },
});

/** Returns an array of a given object's own enumerable string-keyed property [key, value] pairs. */
export const objEntries = defineFullOpcode<[object], [string, any][]>("obj.entries", {
  handler: ([obj], _ctx) => Object.getOwnPropertyNames(obj).map((key) => [key, (obj as any)[key]]),
  metadata: {
    category: "object",
    description:
      "Returns an array of a given object's own enumerable string-keyed property [key, value] pairs.",
    genericParameters: ["Type"],
    label: "Entries",
    parameters: [
      {
        description: "The object to get entries from.",
        name: "object",
        optional: false,
        type: "Type",
      },
    ],
    returnType: "readonly { [Key in keyof Type]: [Key, Type[Key]]; }[keyof Type][]",
    slots: [{ name: "Object", type: "block" }],
  },
});

/** Retrieves a property from an object. */
export const objGet = defineFullOpcode<[object, string, unknown?], any>("obj.get", {
  handler: ([obj, key, defVal], _ctx) => {
    if (!Object.hasOwn(obj, key)) {
      if (defVal !== undefined) {
        return defVal;
      }
      throw new ScriptError(`obj.get: key '${key}' not found`);
    }
    return (obj as any)[key];
  },
  metadata: {
    category: "object",
    description: "Retrieves a property from an object.",
    genericParameters: ["Type", "Key extends keyof Type = keyof Type"],
    label: "Get",
    parameters: [
      { description: "The object to query.", name: "object", type: "Type" },
      { description: "The property key.", name: "key", type: "Key" },
      {
        description: "The default value if the key is missing.",
        name: "default",
        optional: true,
        type: "Type[Key]",
      },
    ],
    returnType: "Type[Key]",
    slots: [
      { name: "Object", type: "block" },
      { name: "Key", type: "string" },
      { default: null, name: "Default", type: "block" },
    ],
  },
});

/** Sets a property on an object. Returns the entire object. */
export const objSet = defineFullOpcode<[object, string, unknown], any>("obj.set", {
  handler: ([obj, key, val], _ctx) => {
    if (DISALLOWED_KEYS.has(key)) {
      throw new ScriptError(`obj.set: disallowed key '${key}'`);
    }
    (obj as any)[key] = val;
    return obj;
  },
  metadata: {
    category: "object",
    description: "Sets a property on an object. Returns the entire object.",
    genericParameters: ["Type", "Key extends keyof Type = keyof Type"],
    label: "Set",
    parameters: [
      { description: "The object to modify.", name: "object", type: "Type" },
      { description: "The property key.", name: "key", type: "Key" },
      { description: "The new value.", name: "value", type: "Type[Key]" },
    ],
    returnType: "Type",
    slots: [
      { name: "Object", type: "block" },
      { name: "Key", type: "string" },
      { name: "Value", type: "block" },
    ],
  },
});

/** Checks if an object has a specific property. */
export const objHas = defineFullOpcode<[object, string], boolean>("obj.has", {
  handler: ([obj, key], _ctx) => Object.hasOwn(obj, key),
  metadata: {
    category: "object",
    description: "Checks if an object has a specific property.",
    genericParameters: ["Type", "Key extends keyof Type = keyof Type"],
    label: "Has Key",
    parameters: [
      { description: "The object to check.", name: "object", type: "Type" },
      { description: "The property key.", name: "key", type: "Key" },
    ],
    returnType: "boolean",
    slots: [
      { name: "Object", type: "block" },
      { name: "Key", type: "string" },
    ],
  },
});

/** Deletes a property from an object. */
export const objDel = defineFullOpcode<[object, string], boolean>("obj.del", {
  handler: ([obj, key], _ctx) => {
    if (Object.hasOwn(obj, key)) {
      delete (obj as any)[key];
      return true;
    }
    return false;
  },
  metadata: {
    category: "object",
    description: "Deletes a property from an object.",
    genericParameters: ["Type", "Key extends keyof Type = keyof Type"],
    label: "Delete Key",
    parameters: [
      { description: "The object to modify.", name: "object", type: "Type" },
      { description: "The property key.", name: "key", type: "Key" },
    ],
    returnType: "boolean",
    slots: [
      { name: "Object", type: "block" },
      { name: "Key", type: "string" },
    ],
  },
});

/** Merges multiple objects into a new object. */
export const objMerge = defineFullOpcode<[object, object, ...object[]], any>("obj.merge", {
  handler: ([...objs], _ctx) => Object.assign({}, ...objs),
  metadata: {
    category: "object",
    description: "Merges multiple objects into a new object.",
    genericParameters: ["Ts extends object[]"],
    label: "Merge",
    parameters: [{ description: "The objects to merge.", name: "...objects", type: "Ts" }],
    returnType: "UnionToIntersection<Ts[number]>",
    slots: [
      { name: "Objects", type: "block" }, // Variadic
    ],
  },
});

/** Creates a new object with the same keys as the original, but with values transformed by a function. */
export const objMap = defineFullOpcode<[object, unknown], any>("obj.map", {
  handler: ([obj, func], ctx) => {
    if (!func || (func as any).type !== "lambda") {
      throw new ScriptError(`obj.map: expected lambda, got ${JSON.stringify(func)}`);
    }
    const result: Record<string, unknown> = {};
    const entries = Object.entries(obj);
    let idx = 0;
    const next = (): Record<string, unknown> | Promise<Record<string, unknown>> => {
      for (; idx < entries.length; idx += 1) {
        const [key, val] = entries[idx]!;
        const res = executeLambda(func as any, [val, key], ctx);
        if (res instanceof Promise) {
          return res.then((res) => {
            result[key] = res;
            return next();
          });
        }
        result[key] = res;
      }
      return result;
    };
    return next();
  },
  metadata: {
    category: "object",
    description:
      "Creates a new object with the same keys as the original, but with values transformed by a function.",
    genericParameters: ["Type", "Result"],
    label: "Map Object",
    parameters: [
      { description: "The object to map.", name: "object", type: "Type" },
      {
        description: "The mapping function.",
        name: "lambda",
        type: "(...kv: readonly { [Key in keyof Type]: [Key, Type[Key]] }[keyof Type][]) => Result",
      },
    ],
    returnType: "Record<keyof Type, Result>",
    slots: [
      { name: "Object", type: "block" },
      { name: "Lambda", type: "block" },
    ],
  },
});

/** Creates a new object with a subset of properties that pass the test implemented by the provided function. */
export const objFilter = defineFullOpcode<[object, unknown], any>("obj.filter", {
  handler: ([obj, func], ctx) => {
    if (!func || (func as any).type !== "lambda") {
      return {};
    }
    const result: Record<string, any> = {};
    const entries = Object.entries(obj);
    let idx = 0;
    const next = (): Record<string, any> | Promise<Record<string, any>> => {
      for (; idx < entries.length; idx += 1) {
        const [key, val] = entries[idx]!;
        const res = executeLambda(func as any, [val, key], ctx);
        if (res instanceof Promise) {
          return res.then((res) => {
            if (res) {
              result[key] = val;
            }
            return next();
          });
        }
        if (res) {
          result[key] = val;
        }
      }
      return result;
    };
    return next();
  },
  metadata: {
    category: "object",
    description:
      "Creates a new object with a subset of properties that pass the test implemented by the provided function.",
    genericParameters: ["Type"],
    label: "Filter Object",
    parameters: [
      { description: "The object to filter.", name: "object", type: "Type" },
      {
        description: "The testing function.",
        name: "lambda",
        type: "(...kv: readonly { [Key in keyof Type]: [Key, Type[Key]] }[keyof Type][]) => boolean",
      },
    ],
    returnType: "Partial<Type>",
    slots: [
      { name: "Object", type: "block" },
      { name: "Lambda", type: "block" },
    ],
  },
});

/** Executes a user-supplied "reducer" callback function on each entry of the object. */
export const objReduce = defineFullOpcode<[object, unknown, unknown], any>("obj.reduce", {
  handler: ([obj, func, init], ctx) => {
    let acc = init;
    if (!func || (func as any).type !== "lambda") {
      return acc;
    }
    const entries = Object.entries(obj);
    let idx = 0;
    const next = (): any | Promise<any> => {
      for (; idx < entries.length; idx += 1) {
        const [key, val] = entries[idx]!;
        const res = executeLambda(func as any, [acc, val, key], ctx);
        if (res instanceof Promise) {
          return res.then((res) => {
            acc = res;
            return next();
          });
        }
        acc = res;
      }
      return acc;
    };
    return next();
  },
  metadata: {
    category: "object",
    description:
      "Executes a user-supplied 'reducer' callback function on each entry of the object.",
    genericParameters: ["Acc"],
    label: "Reduce Object",
    parameters: [
      { description: "The object to reduce.", name: "object", type: "object" },
      { description: "The reducer function.", name: "lambda", type: "unknown" },
      { description: "The initial value.", name: "init", type: "Acc" },
    ],
    returnType: "Acc",
    slots: [
      { name: "Object", type: "block" },
      { name: "Lambda", type: "block" },
      { name: "Init", type: "block" },
    ],
  },
});

/** Creates a new object by applying a given callback function to each entry of the object, and then flattening the result. */
export const objFlatMap = defineFullOpcode<[object, unknown], any>("obj.flatMap", {
  handler: ([obj, func], ctx) => {
    if (!func || (func as any).type !== "lambda") {
      return {};
    }
    const result: Record<string, unknown> = {};
    const entries = Object.entries(obj);
    let idx = 0;
    const next = (): Record<string, unknown> | Promise<Record<string, unknown>> => {
      for (; idx < entries.length; idx += 1) {
        const [key, val] = entries[idx]!;
        const res = executeLambda(func as any, [val, key], ctx);
        if (res instanceof Promise) {
          return res.then((res) => {
            if (typeof res === "object" && res !== null && !Array.isArray(res)) {
              Object.assign(result, res);
            }
            return next();
          });
        }
        if (typeof res === "object" && res !== null && !Array.isArray(res)) {
          Object.assign(result, res);
        }
      }
      return result;
    };
    return next();
  },
  metadata: {
    category: "object",
    description:
      "Creates a new object by applying a given callback function to each entry of the object, and then flattening the result.",
    label: "FlatMap Object",
    parameters: [
      { description: "The object to map.", name: "object", type: "object" },
      { description: "The mapping function.", name: "lambda", type: "object" },
    ],
    returnType: "any",
    slots: [
      { name: "Object", type: "block" },
      { name: "Lambda", type: "block" },
    ],
  },
});
