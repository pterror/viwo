import { evaluate, registerOpcode } from "../interpreter";

export function registerStringLibrary() {
  registerOpcode("str.len", async (args, ctx) => {
    const val = await evaluate(args[0], ctx);
    if (typeof val !== "string") return 0;
    return val.length;
  });

  registerOpcode("str.split", async (args, ctx) => {
    const val = await evaluate(args[0], ctx);
    const delim = await evaluate(args[1], ctx);
    if (typeof val !== "string" || typeof delim !== "string") return [];
    return val.split(delim);
  });

  registerOpcode("str.join", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    const delim = await evaluate(args[1], ctx);
    if (!Array.isArray(list) || typeof delim !== "string") return "";
    return list.join(delim);
  });

  registerOpcode("str.concat", async (args, ctx) => {
    const a = await evaluate(args[0], ctx);
    const b = await evaluate(args[1], ctx);
    return String(a) + String(b);
  });

  registerOpcode("str.slice", async (args, ctx) => {
    const val = await evaluate(args[0], ctx);
    const start = await evaluate(args[1], ctx);
    const end = args.length > 2 ? await evaluate(args[2], ctx) : undefined;
    if (typeof val !== "string") return "";
    return val.slice(start, end);
  });

  registerOpcode("str.lower", async (args, ctx) => {
    const val = await evaluate(args[0], ctx);
    if (typeof val !== "string") return val;
    return val.toLowerCase();
  });

  registerOpcode("str.upper", async (args, ctx) => {
    const val = await evaluate(args[0], ctx);
    if (typeof val !== "string") return val;
    return val.toUpperCase();
  });

  registerOpcode("str.trim", async (args, ctx) => {
    const val = await evaluate(args[0], ctx);
    if (typeof val !== "string") return val;
    return val.trim();
  });

  registerOpcode("str.includes", async (args, ctx) => {
    const val = await evaluate(args[0], ctx);
    const sub = await evaluate(args[1], ctx);
    if (typeof val !== "string" || typeof sub !== "string") return false;
    return val.includes(sub);
  });

  registerOpcode("str.replace", async (args, ctx) => {
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
  });
}
