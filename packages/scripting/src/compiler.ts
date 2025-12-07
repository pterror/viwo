import { type ScriptContext, ScriptError, type ScriptOps, type ScriptValue } from "./types";

const chainedCompare = {
  "<": (...args: any[]) => {
    for (let idx = 0; idx < args.length - 1; idx += 1) {
      if (args[idx] >= args[idx + 1]) {
        return false;
      }
    }
    return true;
  },
  "<=": (...args: any[]) => {
    for (let idx = 0; idx < args.length - 1; idx += 1) {
      if (args[idx] > args[idx + 1]) {
        return false;
      }
    }
    return true;
  },
  ">": (...args: any[]) => {
    for (let idx = 0; idx < args.length - 1; idx += 1) {
      if (args[idx] <= args[idx + 1]) {
        return false;
      }
    }
    return true;
  },
  ">=": (...args: any[]) => {
    for (let idx = 0; idx < args.length - 1; idx += 1) {
      if (args[idx] < args[idx + 1]) {
        return false;
      }
    }
    return true;
  },
};

/**
 * Compiles a ViwoScript AST into a JavaScript function.
 *
 * @param script The script to compile.
 * @param ops The opcode registry to use for compilation.
 * @returns A function that takes a ScriptContext and returns a Promise resolving to the result.
 */
export function compile<Type>(
  script: ScriptValue<Type>,
  ops: ScriptOps,
): (ctx: ScriptContext) => Type {
  // oxlint-disable-next-line no-new-func
  return new Function(
    "__chained_compare__",
    `return function compiled(__ctx__) {
${compileValue(script, ops, true)}}`,
  )(chainedCompare);
}

const KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "enum",
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "await",
  "null",
  "true",
  "false",
  "NaN",
  "Infinity",
  "undefined",
  "arguments",
  "eval",
  // Internal variables
  "__ctx__",
  "__ops__",
  "__chained_compare__",
]);

function toJSName(name: string): string {
  // Replace invalid characters with _
  let safe = name.replaceAll(/[^a-zA-Z0-9_$]/g, "_");
  // Cannot start with digit
  if (/^[0-9]/.test(safe)) {
    safe = `_${safe}`;
  }
  // Avoid keywords
  if (KEYWORDS.has(safe)) {
    return `_${safe}`;
  }
  return safe;
}

function compileChainedComparison(argExprs: string[], op: string): string {
  return argExprs.length < 2
    ? "true"
    : argExprs.length === 2
      ? `(${argExprs[0]} ${op} ${argExprs[1]})`
      : `__chained_compare__["${op}"](${argExprs.join(", ")})`;
}

function compileValue(node: any, ops: ScriptOps, shouldReturn = false): string {
  const prefix = shouldReturn ? "return " : "";
  if (!Array.isArray(node)) {
    if (
      node === null ||
      node === undefined ||
      typeof node === "number" ||
      typeof node === "boolean" ||
      typeof node === "string"
    ) {
      return `${prefix}${JSON.stringify(node)}`;
    }
    throw new Error(`Unknown node type ${typeof node}`);
  }
  const [op, ...args] = node;
  switch (op) {
    case "seq": {
      if (args.length === 0) {
        return "null";
      }
      let code = "";
      for (let idx = 0; idx < args.length; idx += 1) {
        const result = compileValue(args[idx], ops, shouldReturn && idx === args.length - 1);
        code += `${result}\n`;
      }
      return code;
    }
    case "if": {
      return `if (${compileValue(args[0], ops)}) {
${compileValue(args[1], ops, shouldReturn)}}${
        args[2]
          ? ` else {
${compileValue(args[2], ops, shouldReturn)}}`
          : shouldReturn
            ? `else {
return null}`
            : ""
      }`;
    }
    case "while": {
      return `while (${compileValue(args[0], ops)}) {
${compileValue(args[1], ops)}}`;
    }
    case "for": {
      return `for (const ${toJSName(args[0])} of ${compileValue(args[1], ops)}) {
${compileValue(args[2], ops)}}`;
    }
    case "let": {
      return `let ${toJSName(args[0])} = ${compileValue(args[1], ops)};`;
    }
    case "set": {
      return `${toJSName(args[0])} = ${compileValue(args[1], ops)};`;
    }
    case "break": {
      return "break;";
    }
    case "continue": {
      return "continue;";
    }
    case "return": {
      return `return ${args[0] ? compileValue(args[0], ops) : "null"};`;
    }
    case "throw": {
      return `throw ${compileValue(args[0], ops)};`;
    }
    case "try": {
      return `try {
${compileValue(args[0], ops, shouldReturn)}
} catch (${args[1]}) {
${compileValue(args[2], ops, shouldReturn)}
}`;
    }
    case "var": {
      return `${prefix}${toJSName(args[0])}`;
    }
    case "lambda": {
      return `(${(args[0] as string[]).map((name) => toJSName(name)).join(", ")}) => {
${compileValue(args[1], ops, true)}}`;
    }
    case "quote": {
      return `${prefix}${JSON.stringify(args[0])}`;
    }
    case "list.new": {
      const compiledArgs = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}[${compiledArgs.join(", ")}]`;
    }
    case "obj.new": {
      const props = [];
      for (const arg of args) {
        const keyExpr = compileValue(arg[0], ops);
        const valExpr = compileValue(arg[1], ops);
        props.push(`[${keyExpr}]: ${valExpr}`);
      }
      return `${prefix}({ ${props.join(", ")} })`;
    }
    case "apply": {
      const applyExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${applyExprs[0]})(${applyExprs.slice(1).join(", ")})`;
    }
    case "+": {
      const plusExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${plusExprs.join(" + ")})`;
    }
    case "-": {
      const minusExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${minusExprs.join(" - ")})`;
    }
    case "*": {
      const multExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${multExprs.join(" * ")})`;
    }
    case "/": {
      const divExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${divExprs.join(" / ")})`;
    }
    case "%": {
      const modExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${modExprs.join(" % ")})`;
    }
    case "^": {
      const powExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${powExprs.join(" ** ")})`;
    }
    case "==": {
      const eqExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${eqExprs.join(" === ")})`;
    }
    case "!=": {
      const neqExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${neqExprs.join(" !== ")})`;
    }
    case "<": {
      const ltExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${compileChainedComparison(ltExprs, "<")}`;
    }
    case ">": {
      const gtExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${compileChainedComparison(gtExprs, ">")}`;
    }
    case "<=": {
      const lteExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${compileChainedComparison(lteExprs, "<=")}`;
    }
    case ">=": {
      const gteExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${compileChainedComparison(gteExprs, ">=")}`;
    }
    case "and": {
      const andExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${andExprs.join(" && ")})`;
    }
    case "or": {
      const orExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${orExprs.join(" || ")})`;
    }
    case "not": {
      const notExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}!${notExprs[0]}`;
    }
    case "log": {
      const logExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}console.log(${logExprs.join(", ")})`;
    }
    case "str.concat": {
      const concatExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}("" + ${concatExprs.join(" + ")})`;
    }
    case "this": {
      return `${prefix}__ctx__.this`;
    }
    case "caller": {
      return `${prefix}__ctx__.caller`;
    }

    // System Opcodes
    case "arg": {
      const argExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(__ctx__.args?.[${argExprs[0]}] ?? null)`;
    }
    case "args": {
      return `${prefix}[...(__ctx__.args ?? [])]`;
    }
    case "warn": {
      const warnExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}__ctx__.warnings.push(String(${warnExprs[0]}))`;
    }
    case "send": {
      const sendExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(__ctx__.send?.(${sendExprs[0]}, ${sendExprs[1]}) || null)`;
    }

    // Math Opcodes
    case "math.floor": {
      const floorExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.floor(${floorExprs[0]})`;
    }
    case "math.ceil": {
      const ceilExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.ceil(${ceilExprs[0]})`;
    }
    case "math.trunc": {
      const truncExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.trunc(${truncExprs[0]})`;
    }
    case "math.round": {
      const roundExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.round(${roundExprs[0]})`;
    }
    case "math.sin": {
      const sinExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.sin(${sinExprs[0]})`;
    }
    case "math.cos": {
      const cosExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.cos(${cosExprs[0]})`;
    }
    case "math.tan": {
      const tanExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.tan(${tanExprs[0]})`;
    }
    case "math.asin": {
      const asinExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.asin(${asinExprs[0]})`;
    }
    case "math.acos": {
      const acosExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.acos(${acosExprs[0]})`;
    }
    case "math.atan": {
      const atanExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.atan(${atanExprs[0]})`;
    }
    case "math.atan2": {
      const atan2Exprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.atan2(${atan2Exprs[0]}, ${atan2Exprs[1]})`;
    }
    case "math.log": {
      const logMExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.log(${logMExprs[0]})`;
    }
    case "math.log2": {
      const log2Exprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.log2(${log2Exprs[0]})`;
    }
    case "math.log10": {
      const log10Exprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.log10(${log10Exprs[0]})`;
    }
    case "math.exp": {
      const expExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.exp(${expExprs[0]})`;
    }
    case "math.sqrt": {
      const sqrtExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.sqrt(${sqrtExprs[0]})`;
    }
    case "math.abs": {
      const absExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.abs(${absExprs[0]})`;
    }
    case "math.min": {
      const minExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.min(${minExprs.join(", ")})`;
    }
    case "math.max": {
      const maxExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.max(${maxExprs.join(", ")})`;
    }
    case "math.clamp": {
      const clampExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.min(Math.max(${clampExprs[0]}, ${clampExprs[1]}), ${clampExprs[2]})`;
    }
    case "math.sign": {
      const signExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Math.sign(${signExprs[0]})`;
    }

    case "random": {
      const randomExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      // Inline implementation of random using IIFE to handle variable arguments and integer checks
      const argsArray = `[${randomExprs.join(", ")}]`;
      return `${prefix}(() => {
        const args = ${argsArray};
        if (args.length === 0) return Math.random();
        let min = 0, max = 1;
        if (args.length === 1) max = args[0];
        else [min, max] = args;
        if (min > max) throw new Error("random: min must be less than or equal to max");
        const roll = Math.random() * (max - min + 1) + min;
        const shouldFloor = Number.isInteger(min) && Number.isInteger(max);
        return shouldFloor ? Math.floor(roll) : roll;
      })()`;
    }

    // List Opcodes
    case "list.len": {
      const listLenExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listLenExprs[0]}.length`;
    }
    case "list.empty": {
      const listEmptyExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${listEmptyExprs[0]}.length === 0)`;
    }
    case "list.get": {
      const listGetExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listGetExprs[0]}[${listGetExprs[1]}]`;
    }
    case "list.set": {
      const listSetExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${listSetExprs[0]}[${listSetExprs[1]}] = ${listSetExprs[2]})`;
    }
    case "list.push": {
      const listPushExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listPushExprs[0]}.push(${listPushExprs[1]})`;
    }
    case "list.pop": {
      const listPopExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listPopExprs[0]}.pop()`;
    }
    case "list.unshift": {
      const listUnshiftExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listUnshiftExprs[0]}.unshift(${listUnshiftExprs[1]})`;
    }
    case "list.shift": {
      const listShiftExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listShiftExprs[0]}.shift()`;
    }
    case "list.slice": {
      const listSliceExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listSliceExprs[0]}.slice(${listSliceExprs[1]}${
        args[2] ? `, ${listSliceExprs[2]}` : ""
      })`;
    }
    case "list.splice": {
      const listSpliceExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      const items = listSpliceExprs.slice(3);
      return `${prefix}${listSpliceExprs[0]}.splice(${listSpliceExprs[1]}, ${listSpliceExprs[2]}${
        items.length > 0 ? `, ${items.join(", ")}` : ""
      })`;
    }
    case "list.find": {
      const listFindExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${listFindExprs[0]}.find((item) => (${listFindExprs[1]})(item)) ?? null)`;
    }
    case "list.map": {
      const listMapExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listMapExprs[0]}.map((item) => (${listMapExprs[1]})(item))`;
    }
    case "list.filter": {
      const listFilterExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listFilterExprs[0]}.filter((item) => (${listFilterExprs[1]})(item))`;
    }
    case "list.reduce": {
      const listReduceExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listReduceExprs[0]}.reduce((acc, item) => (${listReduceExprs[1]})(acc, item), ${listReduceExprs[2]})`;
    }
    case "list.flatMap": {
      const listFlatMapExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listFlatMapExprs[0]}.flatMap((item) => (${listFlatMapExprs[1]})(item))`;
    }
    case "list.concat": {
      const listConcatExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}[].concat(${listConcatExprs.join(", ")})`;
    }
    case "list.includes": {
      const listIncludesExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listIncludesExprs[0]}.includes(${listIncludesExprs[1]})`;
    }
    case "list.reverse": {
      const listReverseExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listReverseExprs[0]}.toReversed()`;
    }
    case "list.sort": {
      const listSortExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${listSortExprs[0]}.toSorted()`;
    }

    // Object Opcodes
    case "obj.get": {
      const objGetExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}((${objGetExprs[0]})[${objGetExprs[1]}] ?? ${
        args[2] ? objGetExprs[2] : "null"
      })`;
    }
    case "obj.set": {
      const objSetExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}((${objSetExprs[0]})[${objSetExprs[1]}] = ${objSetExprs[2]})`;
    }
    case "obj.has": {
      const objHasExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(${objHasExprs[1]} in ${objHasExprs[0]})`;
    }
    case "obj.del": {
      const objDelExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}(delete ${objDelExprs[0]}[${objDelExprs[1]}])`;
    }
    case "obj.keys": {
      const objKeysExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Object.getOwnPropertyNames(${objKeysExprs[0]})`;
    }
    case "obj.values": {
      const objValuesExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Object.getOwnPropertyNames(${objValuesExprs[0]}).map(k => ${objValuesExprs[0]}[k])`;
    }
    case "obj.entries": {
      const objEntriesExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Object.getOwnPropertyNames(${objEntriesExprs[0]}).map(k => [k, ${objEntriesExprs[0]}[k]])`;
    }
    case "obj.merge": {
      const objMergeExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Object.assign({}, ${objMergeExprs.join(", ")})`;
    }
    case "obj.map": {
      const objMapExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Object.fromEntries(Object.entries(${objMapExprs[0]}).map(([k, v]) => [k, (${objMapExprs[1]})(v, k)]))`;
    }
    case "obj.filter": {
      const objFilterExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Object.fromEntries(Object.entries(${objFilterExprs[0]}).filter(([k, v]) => (${objFilterExprs[1]})(v, k)))`;
    }
    case "obj.reduce": {
      const objReduceExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Object.entries(${objReduceExprs[0]}).reduce((acc, [k, v]) => (${objReduceExprs[1]})(acc, v, k), ${objReduceExprs[2]})`;
    }
    case "obj.flatMap": {
      const objFlatMapExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}Object.entries(${objFlatMapExprs[0]}).reduce((acc, [k, v]) => {
        const res = (${objFlatMapExprs[1]})(v, k);
        if (res && typeof res === 'object' && !Array.isArray(res)) Object.assign(acc, res);
        return acc;
      }, {})`;
    }

    // JSON Opcodes
    case "json.stringify": {
      const jsonStringifyExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}JSON.stringify(${jsonStringifyExprs[0]})`;
    }
    case "json.parse": {
      const jsonParseExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      // Need to handle try-catch for parse? The lib opcode wraps in try-catch returning null.
      // We can use an IIFE or ternary if we want to be safe, or just call JSON.parse directly if we trust input.
      // The lib implementation: try { return JSON.parse(str); } catch { return null; }
      return `${prefix}JSON.parse(${jsonParseExprs[0]})`;
    }
    case "typeof": {
      const typeofExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}((val) => Array.isArray(val) ? "array" : val === null ? "null" : typeof val)(${typeofExprs[0]})`;
    }

    // String Opcodes
    case "str.len": {
      const strLenExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${strLenExprs[0]}.length`;
    }
    case "str.split": {
      const strSplitExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${strSplitExprs[0]}.split(${strSplitExprs[1]})`;
    }
    case "str.slice": {
      const strSliceExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${strSliceExprs[0]}.slice(${strSliceExprs[1]}, ${
        args[2] ? strSliceExprs[2] : "undefined"
      })`;
    }
    case "str.upper": {
      const strUpperExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${strUpperExprs[0]}.toUpperCase()`;
    }
    case "str.lower": {
      const strLowerExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${strLowerExprs[0]}.toLowerCase()`;
    }
    case "str.trim": {
      const strTrimExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${strTrimExprs[0]}.trim()`;
    }
    case "str.replace": {
      const strReplaceExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${strReplaceExprs[0]}.replace(${strReplaceExprs[1]}, ${
        args[2] ? strReplaceExprs[2] : "undefined"
      })`;
    }
    case "str.includes": {
      const strIncludesExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${strIncludesExprs[0]}.includes(${strIncludesExprs[1]})`;
    }
    case "str.join": {
      const strJoinExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}${strJoinExprs[0]}.join(${strJoinExprs[1]})`;
    }

    // Time Opcodes
    case "time.now": {
      return `${prefix}new Date().toISOString()`;
    }
    case "time.format": {
      const timeFormatExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}new Date(${timeFormatExprs[0]}).toISOString()`;
    }
    case "time.parse": {
      const timeParseExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}new Date(${timeParseExprs[0]}).toISOString()`;
    }
    case "time.from_timestamp": {
      const timeFromTimestampExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}new Date(${timeFromTimestampExprs[0]}).toISOString()`;
    }
    case "time.to_timestamp": {
      const timeToTimestampExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `${prefix}new Date(${timeToTimestampExprs[0]}).getTime()`;
    }
    case "time.offset": {
      const timeOffsetExprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      const [amount, unit, base] = timeOffsetExprs;
      return `${prefix}(() => {
        const d = new Date(${base} !== undefined ? ${base} : new Date().toISOString());
        const amt = ${amount};
        switch (${unit}) {
          case "year": case "years": d.setFullYear(d.getFullYear() + amt); break;
          case "month": case "months": d.setMonth(d.getMonth() + amt); break;
          case "day": case "days": d.setDate(d.getDate() + amt); break;
          case "hour": case "hours": d.setHours(d.getHours() + amt); break;
          case "minute": case "minutes": d.setMinutes(d.getMinutes() + amt); break;
          case "second": case "seconds": d.setSeconds(d.getSeconds() + amt); break;
          default: throw new Error("time.offset: unknown unit " + ${unit});
        }
        return d.toISOString();
      })()`;
    }
    default: {
      const def = ops[op];
      if (!def) {
        throw new ScriptError(`Unknown opcode: ${op}`);
      }
      const exprs: string[] = args.map((arg: any) => compileValue(arg, ops));
      return `__ctx__.ops[${JSON.stringify(op)}].handler(${
        def.metadata.lazy ? JSON.stringify(args) : `[${exprs.join(", ")}]`
      }, __ctx__)`;
    }
  }
}
