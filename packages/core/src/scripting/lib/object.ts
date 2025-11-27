import { evaluate, registerOpcode, executeLambda } from "../interpreter";

export function registerObjectLibrary() {
  registerOpcode("obj", async (args, ctx) => {
    const result: Record<string, unknown> = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = await evaluate(args[i], ctx);
      const val = await evaluate(args[i + 1], ctx);
      if (typeof key === "string") {
        result[key] = val;
      }
    }
    return result;
  });

  registerOpcode("obj.keys", async (args, ctx) => {
    const obj = await evaluate(args[0], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return [];
    return Object.keys(obj);
  });

  registerOpcode("obj.values", async (args, ctx) => {
    const obj = await evaluate(args[0], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return [];
    return Object.values(obj);
  });

  registerOpcode("obj.entries", async (args, ctx) => {
    const obj = await evaluate(args[0], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return [];
    return Object.entries(obj);
  });

  registerOpcode("obj.get", async (args, ctx) => {
    const obj = await evaluate(args[0], ctx);
    const key = await evaluate(args[1], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return null;
    return obj[key];
  });

  registerOpcode("obj.set", async (args, ctx) => {
    const obj = await evaluate(args[0], ctx);
    const key = await evaluate(args[1], ctx);
    const val = await evaluate(args[2], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return null;
    obj[key] = val;
    return val;
  });

  registerOpcode("obj.has", async (args, ctx) => {
    const obj = await evaluate(args[0], ctx);
    const key = await evaluate(args[1], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return false;
    return key in obj;
  });

  registerOpcode("obj.del", async (args, ctx) => {
    const obj = await evaluate(args[0], ctx);
    const key = await evaluate(args[1], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return false;
    if (key in obj) {
      delete obj[key];
      return true;
    }
    return false;
  });

  registerOpcode("obj.merge", async (args, ctx) => {
    const obj1 = await evaluate(args[0], ctx);
    const obj2 = await evaluate(args[1], ctx);
    if (typeof obj1 !== "object" || obj1 === null || Array.isArray(obj1))
      return {};
    if (typeof obj2 !== "object" || obj2 === null || Array.isArray(obj2))
      return { ...obj1 };
    return { ...obj1, ...obj2 };
  });

  registerOpcode("obj.map", async (args, ctx) => {
    const obj = await evaluate(args[0], ctx);
    const func = await evaluate(args[1], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return {};

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = await executeLambda(func, [val, key], ctx);
    }
    return result;
  });

  registerOpcode("obj.filter", async (args, ctx) => {
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
  });

  registerOpcode("obj.reduce", async (args, ctx) => {
    const obj = await evaluate(args[0], ctx);
    const func = await evaluate(args[1], ctx);
    let acc = await evaluate(args[2], ctx);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
      return acc;

    for (const [key, val] of Object.entries(obj)) {
      acc = await executeLambda(func, [acc, val, key], ctx);
    }
    return acc;
  });

  registerOpcode("obj.flatMap", async (args, ctx) => {
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
  });
}
