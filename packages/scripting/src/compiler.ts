import { OPS, BreakSignal } from "./interpreter";
import { ScriptContext, ScriptError, ScriptValue } from "./types";

/**
 * Compiles a ViwoScript AST into a JavaScript function.
 *
 * @param script The script to compile.
 * @returns A function that takes a ScriptContext and returns a Promise resolving to the result.
 */
export function compile<T>(script: ScriptValue<T>): (ctx: ScriptContext) => T {
  // Collect ALL variables used in the script (free or bound)
  const allVars = collectAllVars(script);

  // Declaration: let x = ctx.vars['x'] ?? null;
  const decls =
    allVars.length > 0
      ? `let ${allVars
          .map((v) => `${toJSName(v)} = ctx.vars[${JSON.stringify(v)}] ?? null`)
          .join(", ")};`
      : "";

  const code = compileNode(script);

  const body = `
    return function(ctx) {
      ${decls}
      let result;
      try {
        result = ${code};
      } catch (e) {
        if (e instanceof ScriptError) throw e;
        throw new ScriptError(e.message || String(e));
      }
      return result;
    }
  `;

  // Create the factory function
  const factory = new Function("OPS", "ScriptError", "BreakSignal", body);

  // Return the executable function, injecting dependencies
  return factory(OPS, ScriptError, BreakSignal);
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
  "ctx",
  "OPS",
  "ScriptError",
  "BreakSignal",
]);

function toJSName(name: string): string {
  // Replace invalid characters with _
  let safe = name.replace(/[^a-zA-Z0-9_$]/g, "_");

  // Cannot start with digit
  if (/^[0-9]/.test(safe)) {
    safe = "_" + safe;
  }

  // Avoid keywords
  if (KEYWORDS.has(safe)) {
    return "_" + safe;
  }

  return safe;
}

// Collects variables declared in the IMMEDIATE scope (for let/seq/etc)
function collectVars(node: any): string[] {
  const vars = new Set<string>();

  function visit(node: any) {
    if (!Array.isArray(node) || node.length === 0) return;

    const [op, ...args] = node;

    if (op === "let") {
      if (typeof args[0] === "string") {
        vars.add(args[0]);
      }
      visit(args[1]); // Recurse into value
      return;
    }

    // Stop recursion at scope boundaries
    if (op === "seq" || op === "while" || op === "for" || op === "lambda") {
      return;
    }

    // Recurse into arguments for other nodes
    for (const arg of args) {
      visit(arg);
    }
  }

  visit(node);
  return Array.from(vars);
}

// Collects ALL variable names used anywhere in the script
function collectAllVars(node: any): string[] {
  const vars = new Set<string>();

  function visit(node: any) {
    if (!Array.isArray(node) || node.length === 0) return;

    const [op, ...args] = node;

    if (op === "let" || op === "var" || op === "set") {
      if (typeof args[0] === "string") {
        vars.add(args[0]);
      }
    } else if (op === "lambda") {
      // Params are variables too
      const params = args[0];
      if (Array.isArray(params)) {
        params.forEach((p: any) => {
          if (typeof p === "string") vars.add(p);
        });
      }
    }

    // Recurse into all arguments
    for (const arg of args) {
      visit(arg);
    }
  }

  visit(node);
  return Array.from(vars);
}

function compileNode(node: any): string {
  if (node === null || node === undefined) {
    return "null";
  }

  if (typeof node === "number" || typeof node === "boolean") {
    return String(node);
  }

  if (typeof node === "string") {
    return JSON.stringify(node);
  }

  if (Array.isArray(node)) {
    if (node.length === 0) return "[]";

    const [op, ...args] = node;

    switch (op) {
      case "seq":
        return compileSeq(args);
      case "if":
        return compileIf(args);
      case "while":
        return compileWhile(args);
      case "for":
        return compileFor(args);
      case "let":
        return compileLet(args);
      case "var":
        return compileVar(args);
      case "set":
        return compileSet(args);
      case "lambda":
        return compileLambda(args);
      case "apply":
        return compileApply(args);
      case "try":
        return compileTry(args);
      case "throw":
        return compileThrow(args);
      case "break":
        return compileBreak(args);
      case "list.new":
        return `[${args.map(compileNode).join(", ")}]`;
      case "obj.new":
        return compileObjNew(args);
    }

    if (typeof op === "string" && OPS[op]) {
      return compileOpcodeCall(op, args);
    }

    throw new Error(`Unknown opcode: ${op}`);
  }

  throw new Error(`Unknown node type: ${typeof node}`);
}

function compileSeq(args: any[]): string {
  if (args.length === 0) return "null";

  const vars = new Set<string>();
  for (const arg of args) {
    const argVars = collectVars(arg);
    argVars.forEach((v) => vars.add(v));
  }

  // Initialize locals to null to match ViwoScript behavior (undefined vars are null)
  const decls =
    vars.size > 0
      ? `let ${Array.from(vars)
          .map((v) => `${toJSName(v)} = null`)
          .join(", ")};`
      : "";

  const statements = args.map(compileNode);
  const last = statements.pop();

  return `(() => {
    ${decls}
    ${statements.map((s) => s + ";").join("\n")}
    return ${last};
  })()`;
}

function compileIf(args: any[]): string {
  const [cond, thenBranch, elseBranch] = args;
  return `(${compileNode(cond)} ? ${compileNode(thenBranch)} : ${
    elseBranch ? compileNode(elseBranch) : "null"
  })`;
}

function compileWhile(args: any[]): string {
  const [cond, body] = args;

  const vars = collectVars(body);
  const decls =
    vars.length > 0 ? `let ${vars.map((v) => `${toJSName(v)} = null`).join(", ")};` : "";

  return `(() => {
    let result = null;
    while (${compileNode(cond)}) {
      try {
        (() => {
          ${decls}
          result = ${compileNode(body)};
        })();
      } catch (e) {
        if (e instanceof BreakSignal) {
          return e.value ?? result;
        }
        throw e;
      }
    }
    return result;
  })()`;
}

function compileFor(args: any[]): string {
  const [varName, listExpr, body] = args;

  const vars = collectVars(body);
  const loopVar = toJSName(varName);
  const bodyDecls = vars.filter((v) => toJSName(v) !== loopVar).map((v) => `${toJSName(v)} = null`);

  const declsStr = bodyDecls.length > 0 ? `let ${bodyDecls.join(", ")};` : "";

  return `(() => {
    const list = ${compileNode(listExpr)};
    let result = null;
    if (Array.isArray(list)) {
      for (const ${loopVar} of list) {
        try {
          (() => {
            ${declsStr}
            result = ${compileNode(body)};
          })();
        } catch (e) {
          if (e instanceof BreakSignal) {
            return e.value ?? result;
          }
          throw e;
        }
      }
    }
    return result;
  })()`;
}

function compileLet(args: any[]): string {
  const [name, val] = args;
  const jsName = toJSName(name);
  return `(${jsName} = ${compileNode(val)})`;
}

function compileVar(args: any[]): string {
  const [name] = args;
  return toJSName(name);
}

function compileSet(args: any[]): string {
  const [name, val] = args;
  const jsName = toJSName(name);
  return `(${jsName} = ${compileNode(val)})`;
}

function compileLambda(args: any[]): string {
  const [params, body] = args;
  const paramNames = (params as string[]).map(toJSName);

  const vars = collectVars(body);
  const bodyDecls = vars.filter((v) => !params.includes(v)).map((v) => `${toJSName(v)} = null`);

  const declsStr = bodyDecls.length > 0 ? `let ${bodyDecls.join(", ")};` : "";

  return `({
    type: "lambda",
    args: ${JSON.stringify(params)},
    execute: (ctx, ...args) => {
      ${paramNames.map((p, i) => `let ${p} = args[${i}];`).join("\n")}
      ${declsStr}
      return ${compileNode(body)};
    }
  })`;
}

function compileApply(args: any[]): string {
  const [funcExpr, ...argExprs] = args;
  return `(() => {
    const func = ${compileNode(funcExpr)};
    if (!func || func.type !== "lambda") throw new ScriptError("apply: func must be a lambda");
    
    const args = [${argExprs.map(compileNode).join(", ")}];
    
    if (func.execute) {
      return func.execute(ctx, ...args);
    } else {
      throw new ScriptError("apply: lambda has no compiled code");
    }
  })()`;
}

function compileTry(args: any[]): string {
  const [tryBlock, errorVar, catchBlock] = args;

  const errDecl = errorVar ? `let ${toJSName(errorVar)} = e.message || String(e);` : "";

  return `(() => {
    try {
      return ${compileNode(tryBlock)};
    } catch (e) {
      ${errDecl}
      return ${compileNode(catchBlock)};
    }
  })()`;
}

function compileThrow(args: any[]): string {
  const [msg] = args;
  return `(() => { throw new ScriptError(${compileNode(msg)}); })()`;
}

function compileBreak(args: any[]): string {
  const [val] = args;
  return `(() => { throw new BreakSignal(${val ? compileNode(val) : "null"}); })()`;
}

function compileObjNew(args: any[]): string {
  const props = [];
  for (const arg of args) {
    props.push(`[${compileNode(arg[0])}]: ${compileNode(arg[1])}`);
  }
  return `({ ${props.join(", ")} })`;
}

function compileOpcodeCall(op: string, args: any[]): string {
  switch (op) {
    case "+":
      return `(${compileNode(args[0])} + ${compileNode(args[1])})`;
    case "-":
      return `(${compileNode(args[0])} - ${compileNode(args[1])})`;
    case "*":
      return `(${compileNode(args[0])} * ${compileNode(args[1])})`;
    case "/":
      return `(${compileNode(args[0])} / ${compileNode(args[1])})`;
    case "%":
      return `(${compileNode(args[0])} % ${compileNode(args[1])})`;
    case "^":
      return `Math.pow(${compileNode(args[0])}, ${compileNode(args[1])})`;
    case "==":
      return `(${compileNode(args[0])} === ${compileNode(args[1])})`;
    case "!=":
      return `(${compileNode(args[0])} !== ${compileNode(args[1])})`;
    case "<":
      return `(${compileNode(args[0])} < ${compileNode(args[1])})`;
    case ">":
      return `(${compileNode(args[0])} > ${compileNode(args[1])})`;
    case "<=":
      return `(${compileNode(args[0])} <= ${compileNode(args[1])})`;
    case ">=":
      return `(${compileNode(args[0])} >= ${compileNode(args[1])})`;
    case "and":
      return `(${compileNode(args[0])} && ${compileNode(args[1])})`;
    case "or":
      return `(${compileNode(args[0])} || ${compileNode(args[1])})`;
    case "not":
      return `!(${compileNode(args[0])})`;

    case "obj.get":
      return `(${compileNode(args[0])})[${compileNode(args[1])}] ?? ${
        args[2] ? compileNode(args[2]) : "null"
      }`;
    case "obj.set":
      return `((${compileNode(args[0])})[${compileNode(args[1])}] = ${compileNode(args[2])})`;
    case "obj.has":
      return `(${compileNode(args[1])} in ${compileNode(args[0])})`;
    case "obj.del":
      return `(delete (${compileNode(args[0])})[${compileNode(args[1])}])`;

    case "log":
      return `console.log(${args.map((a) => compileNode(a)).join(", ")})`;
    case "str.concat":
      return `("" + ${args.map((a) => compileNode(a)).join(" + ")})`;
    case "this_":
      return "ctx.this";
  }

  const def = OPS[op];
  if (!def) throw new ScriptError("Unknown opcode: " + op);

  if (def.metadata.lazy) {
    return `OPS[${JSON.stringify(op)}].handler(${JSON.stringify(args)}, ctx)`;
  }

  return `(() => {
    const args = [${args.map(compileNode).join(", ")}];
    const wrappedArgs = args.map(a => Array.isArray(a) ? ["quote", a] : a);
    return OPS[${JSON.stringify(op)}].handler(wrappedArgs, ctx);
  })()`;
}
