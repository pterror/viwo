import { evaluate, executeLambda } from "../interpreter";

export const ObjectLibrary = {
  obj: async (args: any[], ctx: any) => {
    const result: Record<string, unknown> = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = await evaluate(args[i], ctx);
      const val = await evaluate(args[i + 1], ctx);
      if (typeof key === "string") {
        result[key] = val;
      }
    }
    return result;
  },

  "obj.keys": async (args: any[], ctx: any) => {
    const obj = await evaluate(args[0], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return [];
    return Object.keys(obj);
  },

  "obj.values": async (args: any[], ctx: any) => {
    const obj = await evaluate(args[0], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return [];
    return Object.values(obj);
  },

  "obj.entries": async (args: any[], ctx: any) => {
    const obj = await evaluate(args[0], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return [];
    return Object.entries(obj);
  },

  "obj.get": async (args: any[], ctx: any) => {
    const obj = await evaluate(args[0], ctx);
    const key = await evaluate(args[1], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return null;
    return obj[key];
  },

  "obj.set": async (args: any[], ctx: any) => {
    const obj = await evaluate(args[0], ctx);
    const key = await evaluate(args[1], ctx);
    const val = await evaluate(args[2], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return null;
    obj[key] = val;
    return val;
  },

  "obj.has": async (args: any[], ctx: any) => {
    const obj = await evaluate(args[0], ctx);
    const key = await evaluate(args[1], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return false;
    return key in obj;
  },

  "obj.del": async (args: any[], ctx: any) => {
    const obj = await evaluate(args[0], ctx);
    const key = await evaluate(args[1], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return false;
    if (key in obj) {
      delete obj[key];
      return true;
    }
    return false;
  },

  "obj.merge": async (args: any[], ctx: any) => {
    const obj1 = await evaluate(args[0], ctx);
    const obj2 = await evaluate(args[1], ctx);
    if (typeof obj1 !== "object" || obj1 === null || Array.isArray(obj1))
      return {};
    if (typeof obj2 !== "object" || obj2 === null || Array.isArray(obj2))
      return { ...obj1 };
    return { ...obj1, ...obj2 };
  },

  "obj.map": async (args: any[], ctx: any) => {
    const obj = await evaluate(args[0], ctx);
    const func = await evaluate(args[1], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return {};

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = await executeLambda(func, [val, key], ctx);
    }
    return result;
  },

  "obj.filter": async (args: any[], ctx: any) => {
    const obj = await evaluate(args[0], ctx);
    const func = await evaluate(args[1], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return {};

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (await executeLambda(func, [val, key], ctx)) {
        result[key] = val;
      }
    }
    return result;
  },

  "obj.reduce": async (args: any[], ctx: any) => {
    const obj = await evaluate(args[0], ctx);
    const func = await evaluate(args[1], ctx);
    let acc = await evaluate(args[2], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return acc;

    for (const [key, val] of Object.entries(obj)) {
      acc = await executeLambda(func, [acc, val, key], ctx);
    }
    return acc;
  },

  "obj.flatMap": async (args: any[], ctx: any) => {
    const obj = await evaluate(args[0], ctx);
    const func = await evaluate(args[1], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return {};

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      const mapped = await executeLambda(func, [val, key], ctx);
      if (
        typeof mapped === "object" &&
        mapped !== null &&
        !Array.isArray(mapped)
      ) {
        Object.assign(result, mapped);
      }
    }
    return result;
  },
};
