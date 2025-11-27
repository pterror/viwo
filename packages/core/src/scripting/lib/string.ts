import { evaluate } from "../interpreter";

export const StringLibrary = {
  "str.len": async (args: any[], ctx: any) => {
    const val = await evaluate(args[0], ctx);
    if (typeof val !== "string") return 0;
    return val.length;
  },

  "str.split": async (args: any[], ctx: any) => {
    const val = await evaluate(args[0], ctx);
    const delim = await evaluate(args[1], ctx);
    if (typeof val !== "string" || typeof delim !== "string") return [];
    return val.split(delim);
  },

  "str.join": async (args: any[], ctx: any) => {
    const list = await evaluate(args[0], ctx);
    const delim = await evaluate(args[1], ctx);
    if (!Array.isArray(list) || typeof delim !== "string") return "";
    return list.join(delim);
  },

  "str.concat": async (args: any[], ctx: any) => {
    let result = "";
    for (const arg of args) {
      result += String(await evaluate(arg, ctx));
    }
    return result;
  },

  "str.slice": async (args: any[], ctx: any) => {
    const val = await evaluate(args[0], ctx);
    const start = await evaluate(args[1], ctx);
    const end = args.length > 2 ? await evaluate(args[2], ctx) : undefined;
    if (typeof val !== "string") return "";
    return val.slice(start, end);
  },

  "str.lower": async (args: any[], ctx: any) => {
    const val = await evaluate(args[0], ctx);
    if (typeof val !== "string") return val;
    return val.toLowerCase();
  },

  "str.upper": async (args: any[], ctx: any) => {
    const val = await evaluate(args[0], ctx);
    if (typeof val !== "string") return val;
    return val.toUpperCase();
  },

  "str.trim": async (args: any[], ctx: any) => {
    const val = await evaluate(args[0], ctx);
    if (typeof val !== "string") return val;
    return val.trim();
  },

  "str.includes": async (args: any[], ctx: any) => {
    const val = await evaluate(args[0], ctx);
    const sub = await evaluate(args[1], ctx);
    if (typeof val !== "string" || typeof sub !== "string") return false;
    return val.includes(sub);
  },

  "str.replace": async (args: any[], ctx: any) => {
    const val = await evaluate(args[0], ctx);
    const search = await evaluate(args[1], ctx);
    const replace = await evaluate(args[2], ctx);
    if (
      typeof val !== "string" ||
      typeof search !== "string" ||
      typeof replace !== "string"
    )
      return val;
    return val.replace(search, replace);
  },
};
