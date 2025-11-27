import { evaluate, registerOpcode } from "../interpreter";

export function registerListLibrary() {
  registerOpcode("list.len", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    if (!Array.isArray(list)) return 0;
    return list.length;
  });

  registerOpcode("list.get", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    const index = await evaluate(args[1], ctx);
    if (!Array.isArray(list)) return null;
    return list[index];
  });

  registerOpcode("list.set", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    const index = await evaluate(args[1], ctx);
    const val = await evaluate(args[2], ctx);
    if (!Array.isArray(list)) return null;
    list[index] = val;
    return val;
  });

  registerOpcode("list.push", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    const val = await evaluate(args[1], ctx);
    if (!Array.isArray(list)) return null;
    list.push(val);
    return list.length;
  });

  registerOpcode("list.pop", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    if (!Array.isArray(list)) return null;
    return list.pop();
  });

  registerOpcode("list.unshift", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    const val = await evaluate(args[1], ctx);
    if (!Array.isArray(list)) return null;
    list.unshift(val);
    return list.length;
  });

  registerOpcode("list.shift", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    if (!Array.isArray(list)) return null;
    return list.shift();
  });

  registerOpcode("list.slice", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    const start = await evaluate(args[1], ctx);
    const end = args.length > 2 ? await evaluate(args[2], ctx) : undefined;
    if (!Array.isArray(list)) return [];
    return list.slice(start, end);
  });

  registerOpcode("list.splice", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    const start = await evaluate(args[1], ctx);
    const deleteCount = await evaluate(args[2], ctx);
    // Remaining args are items to insert
    const items = [];
    for (let i = 3; i < args.length; i++) {
      items.push(await evaluate(args[i], ctx));
    }
    if (!Array.isArray(list)) return [];
    return list.splice(start, deleteCount, ...items);
  });

  registerOpcode("list.concat", async (args, ctx) => {
    const list1 = await evaluate(args[0], ctx);
    const list2 = await evaluate(args[1], ctx);
    if (!Array.isArray(list1) || !Array.isArray(list2)) return [];
    return list1.concat(list2);
  });

  registerOpcode("list.includes", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    const val = await evaluate(args[1], ctx);
    if (!Array.isArray(list)) return false;
    return list.includes(val);
  });

  registerOpcode("list.reverse", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    if (!Array.isArray(list)) return list;
    return list.reverse();
  });

  registerOpcode("list.sort", async (args, ctx) => {
    const list = await evaluate(args[0], ctx);
    if (!Array.isArray(list)) return list;
    return list.sort();
  });
}
