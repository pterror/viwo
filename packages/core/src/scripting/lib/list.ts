import {
  evaluate,
  executeLambda,
  ScriptError,
} from "../interpreter";
import { defineOpcode, ScriptValue } from "../def";

const listNew = defineOpcode<[...ScriptValue<unknown>[]], any[]>(
  "list.new",
  {
    metadata: {
      label: "List",
      category: "list",
      description: "Create a list",
      slots: [],
      parameters: [{ name: "...args", type: "unknown[]" }],
      returnType: "any[]",
    },
    handler: async (args, ctx) => {
      const result = [];
      for (const arg of args) {
        result.push(await evaluate(arg, ctx));
      }
      return result;
    },
  }
);
export { listNew as "list.new" };

const listLen = defineOpcode<[ScriptValue<readonly unknown[]>], number>(
  "list.len",
  {
    metadata: {
      label: "List Length",
      category: "list",
      description: "Get list length",
      slots: [{ name: "List", type: "block" }],
      parameters: [{ name: "List", type: "unknown[]" }],
      returnType: "number",
    },
    handler: async (args, ctx) => {
      const list = await evaluate(args[0], ctx);
      if (!Array.isArray(list)) return 0;
      return list.length;
    },
  }
);
export { listLen as "list.len" };

const listEmpty = defineOpcode<[ScriptValue<readonly unknown[]>], boolean>(
  "list.empty",
  {
    metadata: {
      label: "Is Empty",
      category: "list",
      description: "Check if list is empty",
      slots: [{ name: "List", type: "block" }],
      parameters: [{ name: "List", type: "unknown[]" }],
      returnType: "boolean",
    },
    handler: async (args, ctx) => {
      const list = await evaluate(args[0], ctx);
      if (!Array.isArray(list)) return true;
      return list.length === 0;
    },
  }
);
export { listEmpty as "list.empty" };

const listGet = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<number>], any>(
  "list.get",
  {
    metadata: {
      label: "Get Item",
      category: "list",
      description: "Get item at index",
      slots: [
        { name: "List", type: "block" },
        { name: "Index", type: "number" },
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Index", type: "number" },
      ],
      returnType: "any",
    },
    handler: async (args, ctx) => {
      const list = await evaluate(args[0], ctx);
      const index = await evaluate(args[1], ctx);
      if (!Array.isArray(list)) return null;
      return list[index];
    },
  }
);
export { listGet as "list.get" };

const listSet = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<number>, ScriptValue<unknown>], any>(
  "list.set",
  {
    metadata: {
      label: "Set Item",
      category: "list",
      description: "Set item at index",
      slots: [
        { name: "List", type: "block" },
        { name: "Index", type: "number" },
        { name: "Value", type: "block" },
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Index", type: "number" },
        { name: "Value", type: "unknown" },
      ],
      returnType: "any",
    },
    handler: async (args, ctx) => {
      const list = await evaluate(args[0], ctx);
      const index = await evaluate(args[1], ctx);
      const val = await evaluate(args[2], ctx);
      if (!Array.isArray(list)) return null;
      list[index] = val;
      return val;
    },
  }
);
export { listSet as "list.set" };

const listPush = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<unknown>], number>(
  "list.push",
  {
    metadata: {
      label: "Push",
      category: "list",
      description: "Add item to end",
      slots: [
        { name: "List", type: "block" },
        { name: "Value", type: "block" },
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Value", type: "unknown" },
      ],
      returnType: "number",
    },
    handler: async (args, ctx) => {
      const list = await evaluate(args[0], ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.push: expected list");
      }
      const val = await evaluate(args[1], ctx);
      list.push(val);
      return list.length;
    },
  }
);
export { listPush as "list.push" };

const listPop = defineOpcode<[ScriptValue<readonly unknown[]>], any>(
  "list.pop",
  {
    metadata: {
      label: "Pop",
      category: "list",
      description: "Remove item from end",
      slots: [{ name: "List", type: "block" }],
      parameters: [{ name: "List", type: "unknown[]" }],
      returnType: "any",
    },
    handler: async (args, ctx) => {
      if (args.length !== 1) {
        throw new ScriptError("list.pop: expected 1 argument");
      }
      const [listExpr] = args;
      const list = await evaluate(listExpr, ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.pop: expected list");
      }
      return list.pop();
    },
  }
);
export { listPop as "list.pop" };

const listUnshift = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<unknown>], number>(
  "list.unshift",
  {
    metadata: {
      label: "Unshift",
      category: "list",
      description: "Add item to start",
      slots: [
        { name: "List", type: "block" },
        { name: "Value", type: "block" },
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Value", type: "unknown" },
      ],
      returnType: "number",
    },
    handler: async (args, ctx) => {
      const list = await evaluate(args[0], ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.unshift: expected list");
      }
      const val = await evaluate(args[1], ctx);
      list.unshift(val);
      return list.length;
    },
  }
);
export { listUnshift as "list.unshift" };

const listShift = defineOpcode<[ScriptValue<readonly unknown[]>], any>(
  "list.shift",
  {
    metadata: {
      label: "Shift",
      category: "list",
      description: "Remove item from start",
      slots: [{ name: "List", type: "block" }],
      parameters: [{ name: "List", type: "unknown[]" }],
      returnType: "any",
    },
    handler: async (args, ctx) => {
      const list = await evaluate(args[0], ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.shift: expected list");
      }
      return list.shift();
    },
  }
);
export { listShift as "list.shift" };

const listSlice = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<number>, ScriptValue<number>?], any[]>(
  "list.slice",
  {
    metadata: {
      label: "Slice List",
      category: "list",
      description: "Extract part of list",
      slots: [
        { name: "List", type: "block" },
        { name: "Start", type: "number" },
        { name: "End", type: "number", default: null },
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Start", type: "number" },
        { name: "End", type: "number" },
      ],
      returnType: "any[]",
    },
    handler: async (args, ctx) => {
      if (args.length < 2 || args.length > 3) {
        throw new ScriptError("list.slice: expected 2 or 3 arguments");
      }
      const [listExpr, startExpr, endExpr] = args;
      const list = await evaluate(listExpr, ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.slice: expected list");
      }
      const start = await evaluate(startExpr, ctx);
      if (typeof start !== "number") {
        throw new ScriptError("list.slice: expected number");
      }
      const end = endExpr ? await evaluate(endExpr, ctx) : undefined;
      return list.slice(start, end);
    },
  }
);
export { listSlice as "list.slice" };

const listSplice = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<number>, ScriptValue<number>, ...ScriptValue<unknown>[]], any[]>(
  "list.splice",
  {
    metadata: {
      label: "Splice List",
      category: "list",
      description: "Remove/Replace items",
      slots: [
        { name: "List", type: "block" },
        { name: "Start", type: "number" },
        { name: "Delete Count", type: "number" },
        { name: "Items", type: "block" }, // Variadic
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Start", type: "number" },
        { name: "Delete Count", type: "number" },
        { name: "...args", type: "unknown[]" },
      ],
      returnType: "any[]",
    },
    handler: async (args, ctx) => {
      const list = await evaluate(args[0], ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.splice: expected list");
      }
      const start = await evaluate(args[1], ctx);
      if (typeof start !== "number") {
        throw new ScriptError("list.splice: expected number");
      }
      const deleteCount = await evaluate(args[2], ctx);
      if (typeof deleteCount !== "number") {
        throw new ScriptError("list.splice: expected number");
      }
      // Remaining args are items to insert
      const items = [];
      for (let i = 3; i < args.length; i++) {
        items.push(await evaluate(args[i], ctx));
      }
      return list.splice(start, deleteCount, ...items);
    },
  }
);
export { listSplice as "list.splice" };

const listConcat = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<readonly unknown[]>], any[]>(
  "list.concat",
  {
    metadata: {
      label: "Concat Lists",
      category: "list",
      description: "Concatenate lists",
      slots: [
        { name: "List 1", type: "block" },
        { name: "List 2", type: "block" },
      ],
      parameters: [
        { name: "List 1", type: "unknown[]" },
        { name: "List 2", type: "unknown[]" },
      ],
      returnType: "any[]",
    },
    handler: async (args, ctx) => {
      if (args.length !== 2) {
        throw new ScriptError("list.concat: expected 2 arguments");
      }
      const [list1Expr, list2Expr] = args;
      const list1 = await evaluate(list1Expr, ctx);
      const list2 = await evaluate(list2Expr, ctx);
      if (!Array.isArray(list1) || !Array.isArray(list2)) {
        throw new ScriptError("list.concat: expected list");
      }
      return list1.concat(list2);
    },
  }
);
export { listConcat as "list.concat" };

const listIncludes = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<unknown>], boolean>(
  "list.includes",
  {
    metadata: {
      label: "List Includes",
      category: "list",
      description: "Check if list includes item",
      slots: [
        { name: "List", type: "block" },
        { name: "Value", type: "block" },
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Value", type: "unknown" },
      ],
      returnType: "boolean",
    },
    handler: async (args, ctx) => {
      const list = await evaluate(args[0], ctx);
      const val = await evaluate(args[1], ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.includes: expected list");
      }
      return list.includes(val);
    },
  }
);
export { listIncludes as "list.includes" };

const listReverse = defineOpcode<[ScriptValue<readonly unknown[]>], any[]>(
  "list.reverse",
  {
    metadata: {
      label: "Reverse List",
      category: "list",
      description: "Reverse list order",
      slots: [{ name: "List", type: "block" }],
      parameters: [{ name: "List", type: "unknown[]" }],
      returnType: "any[]",
    },
    handler: async (args, ctx) => {
      const list = await evaluate(args[0], ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.reverse: expected list");
      }
      return list.reverse();
    },
  }
);
export { listReverse as "list.reverse" };

const listSort = defineOpcode<[ScriptValue<readonly unknown[]>], any[]>(
  "list.sort",
  {
    metadata: {
      label: "Sort List",
      category: "list",
      description: "Sort list",
      slots: [{ name: "List", type: "block" }],
      parameters: [{ name: "List", type: "unknown[]" }],
      returnType: "any[]",
    },
    handler: async (args, ctx) => {
      const list = await evaluate(args[0], ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.sort: expected list");
      }
      return list.sort();
    },
  }
);
export { listSort as "list.sort" };

const listFind = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<unknown>], any>(
  "list.find",
  {
    metadata: {
      label: "Find Item",
      category: "list",
      description: "Find item in list",
      slots: [
        { name: "List", type: "block" },
        { name: "Lambda", type: "block" },
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Lambda", type: "unknown" },
      ],
      returnType: "any",
    },
    handler: async (args, ctx) => {
      if (args.length !== 2) {
        throw new ScriptError("list.find: expected 2 arguments");
      }
      const [listExpr, funcExpr] = args;
      const list = await evaluate(listExpr, ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.find: expected list");
      }
      const func = await evaluate(funcExpr, ctx);
      if (!func || func.type !== "lambda") {
        throw new ScriptError("list.find: expected lambda");
      }
      for (const item of list) {
        if (await executeLambda(func, [item], ctx)) {
          return item;
        }
      }
      return null;
    },
  }
);
export { listFind as "list.find" };

const listMap = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<unknown>], any[]>(
  "list.map",
  {
    metadata: {
      label: "Map List",
      category: "list",
      description: "Map list items",
      slots: [
        { name: "List", type: "block" },
        { name: "Lambda", type: "block" },
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Lambda", type: "unknown" },
      ],
      returnType: "any[]",
    },
    handler: async (args, ctx) => {
      if (args.length !== 2) {
        throw new ScriptError("list.map: expected 2 arguments");
      }
      const [listExpr, funcExpr] = args;
      const list = await evaluate(listExpr, ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.map: expected list");
      }
      const func = await evaluate(funcExpr, ctx);
      if (!func || func.type !== "lambda") {
        throw new ScriptError("list.map: expected lambda");
      }
      const result: unknown[] = [];
      for (const item of list) {
        result.push(await executeLambda(func, [item], ctx));
      }
      return result;
    },
  }
);
export { listMap as "list.map" };

const listFilter = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<unknown>], any[]>(
  "list.filter",
  {
    metadata: {
      label: "Filter List",
      category: "list",
      description: "Filter list items",
      slots: [
        { name: "List", type: "block" },
        { name: "Lambda", type: "block" },
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Lambda", type: "unknown" },
      ],
      returnType: "any[]",
    },
    handler: async (args, ctx) => {
      if (args.length !== 2) {
        throw new ScriptError("list.filter: expected 2 arguments");
      }
      const [listExpr, funcExpr] = args;
      const list = await evaluate(listExpr, ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.filter: expected list");
      }
      const func = await evaluate(funcExpr, ctx);
      if (!func || func.type !== "lambda") {
        throw new ScriptError("list.filter: expected lambda");
      }
      const result: unknown[] = [];
      for (const item of list) {
        if (await executeLambda(func, [item], ctx)) {
          result.push(item);
        }
      }
      return result;
    },
  }
);
export { listFilter as "list.filter" };

const listReduce = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<unknown>, ScriptValue<unknown>], any>(
  "list.reduce",
  {
    metadata: {
      label: "Reduce List",
      category: "list",
      description: "Reduce list items",
      slots: [
        { name: "List", type: "block" },
        { name: "Lambda", type: "block" },
        { name: "Init", type: "block" },
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Lambda", type: "unknown" },
        { name: "Init", type: "unknown" },
      ],
      returnType: "any",
    },
    handler: async (args, ctx) => {
      if (args.length !== 3) {
        throw new ScriptError("list.reduce: expected 3 arguments");
      }
      const [listExpr, funcExpr, initExpr] = args;
      const list = await evaluate(listExpr, ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.reduce: expected list");
      }
      const func = await evaluate(funcExpr, ctx);
      if (!func || func.type !== "lambda") {
        throw new ScriptError("list.reduce: expected lambda");
      }
      let acc = await evaluate(initExpr, ctx);
      for (const item of list) {
        acc = await executeLambda(func, [acc, item], ctx);
      }
      return acc;
    },
  }
);
export { listReduce as "list.reduce" };

const listFlatMap = defineOpcode<[ScriptValue<readonly unknown[]>, ScriptValue<unknown>], any[]>(
  "list.flatMap",
  {
    metadata: {
      label: "FlatMap List",
      category: "list",
      description: "FlatMap list items",
      slots: [
        { name: "List", type: "block" },
        { name: "Lambda", type: "block" },
      ],
      parameters: [
        { name: "List", type: "unknown[]" },
        { name: "Lambda", type: "unknown" },
      ],
      returnType: "any[]",
    },
    handler: async (args, ctx) => {
      if (args.length !== 2) {
        throw new ScriptError("list.flatMap: expected 2 arguments");
      }
      const [listExpr, funcExpr] = args;
      const list = await evaluate(listExpr, ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("list.flatMap: expected list");
      }
      const func = await evaluate(funcExpr, ctx);
      if (!func || func.type !== "lambda") {
        throw new ScriptError("list.flatMap: expected lambda");
      }
      const result: unknown[] = [];
      for (const item of list) {
        const mapped = await executeLambda(func, [item], ctx);
        if (Array.isArray(mapped)) {
          result.push(...mapped);
        } else {
          result.push(mapped);
        }
      }
      return result;
    },
  }
);
export { listFlatMap as "list.flatMap" };
