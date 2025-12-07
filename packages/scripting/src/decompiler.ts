export function decompile(
  script: any,
  indentLevel = 0,
  isStatement = false,
  shouldReturn = false,
): string {
  const indent = "  ".repeat(indentLevel);

  if (script === null || script === undefined) {
    return shouldReturn ? "return null" : "null";
  }

  if (typeof script === "string") {
    const val = JSON.stringify(script);
    return shouldReturn ? `return ${val}` : val;
  }

  if (typeof script === "number" || typeof script === "boolean") {
    const val = String(script);
    return shouldReturn ? `return ${val}` : val;
  }

  if (Array.isArray(script)) {
    if (script.length === 0) {
      return shouldReturn ? "return []" : "[]";
    }
    const [opcode] = script;
    const args = script.slice(1);

    // --- Control Flow ---

    if (opcode === "seq") {
      // seq is always a block statement if isStatement is true
      // If isStatement is false, it's an IIFE or block expression?
      // For simplicity, let's assume seq is mostly used as a block.

      // The last statement in a sequence might need to be a return if it's an expression context?
      // But ViwoScript returns the last value.
      // In TS, a block doesn't return.
      // If we are in an expression context (e.g. lambda body), we might wrap in IIFE or just use { ... } if it's a lambda body.

      const statements = args.map((stmt, idx) => {
        const isLast = idx === args.length - 1;
        return decompile(
          stmt,
          indentLevel + (isStatement ? 0 : 1),
          true,
          shouldReturn && isLast, // Only return the last statement if seq should return
        );
      });

      if (isStatement) {
        // Top level or inside another block
        return statements
          .map((statement) =>
            statement.endsWith("}") || statement.endsWith(";") ? statement : `${statement};`,
          )
          .join(`\n${indent}`);
      }
      // Expression context (e.g. lambda body, or argument)
      // If it's a lambda body, we can return a block `{ ... }`
      // But we don't know if we are in a lambda body here.
      // Let's assume expression context means we need an expression.
      // (() => { ... })()
      return `(() => {\n${statements
        .map((statement) => `${indent}  ${statement.endsWith("}") ? statement : `${statement};`}`)
        .join("\n")}\n${indent}})()`;
    }

    if (opcode === "if") {
      const [cond, thenBranch, elseBranch] = args;
      if (isStatement) {
        // If we should return, we need to return from both branches
        const thenCode = decompile(thenBranch, indentLevel + 1, true, shouldReturn);
        let out = `if (${decompile(cond, indentLevel, false)}) {\n${indent}  ${thenCode}${
          thenCode.endsWith("}") || thenCode.endsWith(";") ? "" : ";"
        }\n${indent}}`;

        if (elseBranch) {
          const elseCode = decompile(elseBranch, indentLevel + 1, true, shouldReturn);
          out += ` else {\n${indent}  ${elseCode}${
            elseCode.endsWith("}") || elseCode.endsWith(";") ? "" : ";"
          }\n${indent}}`;
        } else if (shouldReturn) {
          // If we should return, but there is no else branch, we should implicitly return null
          // or just fall through? ViwoScript returns null if else is missing and condition is false.
          out += ` else {\n${indent}  return null;\n${indent}}`;
        }
        return out;
      }
      // Ternary
      return `${decompile(cond, indentLevel, false)} ? ${decompile(
        thenBranch,
        indentLevel,
        false,
      )} : ${decompile(elseBranch || null, indentLevel, false)}`;
    }

    if (opcode === "while") {
      const [cond, body] = args;
      // While is a statement. If used as expression, it returns null (or last result).
      // TS while doesn't return.
      // If expression, wrap in IIFE?
      if (isStatement) {
        const bodyCode = decompile(body, indentLevel + 1, true);
        return `while (${decompile(cond, indentLevel, false)}) {\n${indent}  ${bodyCode}${
          bodyCode.endsWith("}") || bodyCode.endsWith(";") ? "" : ";"
        }\n${indent}}`;
      }
      return `(() => { while (${decompile(cond, indentLevel + 1, false)}) { ${decompile(
        body,
        indentLevel + 1,
        true,
      )}; } })()`;
    }

    if (opcode === "for") {
      const [varName, list, body] = args;
      if (isStatement) {
        const bodyCode = decompile(body, indentLevel + 1, true);
        return `for (const ${varName} of ${decompile(
          list,
          indentLevel,
          false,
        )}) {\n${indent}  ${bodyCode}${
          bodyCode.endsWith("}") || bodyCode.endsWith(";") ? "" : ";"
        }\n${indent}}`;
      }
      return `(() => { for (const ${varName} of ${decompile(
        list,
        indentLevel + 1,
        false,
      )}) { ${decompile(body, indentLevel + 1, true)}; } })()`;
    }

    // --- Variables ---

    if (opcode === "let") {
      const [name, val] = args;
      // let returns the value.
      if (isStatement) {
        const decl = `let ${name} = ${decompile(val, indentLevel, false)}`;
        return shouldReturn ? `${decl};\n${indent}return ${name}` : decl;
      }
      // (let x = ...) is not valid.
      return `(() => { let ${name} = ${decompile(
        val,
        indentLevel + 1,
        false,
      )}; return ${name}; })()`;
    }

    if (opcode === "set") {
      const [name, val] = args;
      // Assignment is an expression in JS.
      const expr = `${name} = ${decompile(val, indentLevel, false)}`;
      return shouldReturn ? `return ${expr}` : expr;
    }

    if (opcode === "var") {
      const [name] = args;
      const expr = String(name);
      return shouldReturn ? `return ${expr}` : expr;
    }

    // --- Functions ---

    if (opcode === "lambda") {
      const [params, body] = args;
      // Lambda is an expression.
      // (args) => { ... }
      // If body is a seq, it will be decompiled as a block (if we pass isStatement=true? No, lambda body is a block).

      // Check if body is a sequence
      const bodyIsSeq = Array.isArray(body) && body[0] === "seq";

      if (bodyIsSeq) {
        // Decompile seq contents as statements
        // We explicitly tell the seq to handle returns for the last statement
        const statements = body.slice(1).map((stmt: any, idx: number) => {
          const isLast = idx === body.length - 2; // body[0] is opcode
          return decompile(stmt, indentLevel + 1, true, isLast);
        });

        return `(${params.join(", ")}) => {\n${statements
          .map(
            (string: string) =>
              `${indent}  ${string.endsWith("}") || string.endsWith(";") ? string : `${string};`}`,
          )
          .join("\n")}\n${indent}}`;
      }
      // Single expression body
      const bodyCode = decompile(body, indentLevel, false);
      return shouldReturn
        ? `return (${params.join(", ")}) => ${bodyCode}`
        : `(${params.join(", ")}) => ${bodyCode}`;
    }

    if (opcode === "apply") {
      const [func, ...funcArgs] = args;
      const expr = `${decompile(func, indentLevel, false)}(${funcArgs
        .map((arg) => decompile(arg, indentLevel, false))
        .join(", ")})`;
      return shouldReturn ? `return ${expr}` : expr;
    }

    // --- Data Structures ---

    if (opcode === "list.new") {
      const items = args.map((arg: any) => decompile(arg, indentLevel, false));
      const expr = `[${items.join(", ")}]`;
      return shouldReturn ? `return ${expr}` : expr;
    }

    if (opcode === "obj.new") {
      const props = [];
      for (const arg of args) {
        const key = decompile(arg[0], indentLevel, false);
        const val = decompile(arg[1], indentLevel, false);
        props.push(`${key}: ${val}`);
      }
      const expr = `{ ${props.join(", ")} }`;
      return shouldReturn ? `return ${expr}` : expr;
    }

    if (opcode === "obj.get") {
      const [obj, key, def] = args;
      const objCode = decompile(obj, indentLevel, false);
      const keyCode = decompile(key, indentLevel, false);

      let access = `${objCode}[${keyCode}]`;
      // Optimization: use dot notation if key is a valid identifier string literal
      if (keyCode.startsWith('"') && keyCode.endsWith('"')) {
        const inner = keyCode.slice(1, -1);
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(inner)) {
          access = `${objCode}.${inner}`;
        }
      }

      let expr = access;
      if (def !== undefined) {
        expr = `(${access} ?? ${decompile(def, indentLevel, false)})`;
      }
      return shouldReturn ? `return ${expr}` : expr;
    }

    if (opcode === "obj.set") {
      const [obj, key, val] = args;
      const objCode = decompile(obj, indentLevel, false);
      const keyCode = decompile(key, indentLevel, false);
      const valCode = decompile(val, indentLevel, false);

      let access = `${objCode}[${keyCode}]`;
      if (keyCode.startsWith('"') && keyCode.endsWith('"')) {
        const inner = keyCode.slice(1, -1);
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(inner)) {
          access = `${objCode}.${inner}`;
        }
      }

      const expr = `${access} = ${valCode}`;
      return shouldReturn ? `return ${expr}` : expr;
    }

    if (opcode === "obj.has") {
      const [obj, key] = args;
      const expr = `${decompile(key, indentLevel, false)} in ${decompile(obj, indentLevel, false)}`;
      return shouldReturn ? `return ${expr}` : expr;
    }

    if (opcode === "obj.del") {
      const [obj, key] = args;
      const objCode = decompile(obj, indentLevel, false);
      const keyCode = decompile(key, indentLevel, false);

      let access = `${objCode}[${keyCode}]`;
      if (keyCode.startsWith('"') && keyCode.endsWith('"')) {
        const inner = keyCode.slice(1, -1);
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(inner)) {
          access = `${objCode}.${inner}`;
        }
      }
      const expr = `delete ${access}`;
      return shouldReturn ? `return ${expr}` : expr;
    }

    // --- Infix Operators ---
    const infixOps: Record<string, string> = {
      "!=": "!==",
      "%": "%",
      "*": "*",
      "+": "+",
      "-": "-",
      "/": "/",
      "<": "<",
      "<=": "<=",
      "==": "===",
      ">": ">",
      ">=": ">=",
      and: "&&",
      or: "||",
    };

    if (infixOps[opcode]) {
      const op = infixOps[opcode];
      const expr = `(${decompile(args[0], indentLevel, false)} ${op} ${decompile(
        args[1],
        indentLevel,
        false,
      )})`;
      return shouldReturn ? `return ${expr}` : expr;
    }

    if (opcode === "^") {
      const expr = `Math.pow(${decompile(args[0], indentLevel, false)}, ${decompile(
        args[1],
        indentLevel,
        false,
      )})`;
      return shouldReturn ? `return ${expr}` : expr;
    }

    if (opcode === "not") {
      const expr = `!${decompile(args[0], indentLevel, false)}`;
      return shouldReturn ? `return ${expr}` : expr;
    }

    // --- Standard Library ---

    if (opcode === "log") {
      const expr = `console.log(${args
        .map((arg) => decompile(arg, indentLevel, false))
        .join(", ")})`;
      return shouldReturn ? `return ${expr}` : expr;
    }

    if (opcode === "new_return") {
      // Explicit return opcode if we add it
      const expr = args[0] ? decompile(args[0], indentLevel, false) : "null";
      return `return ${expr}`;
    }

    if (opcode === "throw") {
      return `throw ${decompile(args[0], indentLevel, false)}`;
    }

    if (opcode === "try") {
      const [tryBlock, errVar, catchBlock] = args;
      // try/catch handles returns recursively
      const tryCode = decompile(tryBlock, indentLevel + 1, true, shouldReturn);
      const catchCode = decompile(catchBlock, indentLevel + 1, true, shouldReturn);
      return `try {\n${indent}  ${tryCode}${
        tryCode.endsWith("}") || tryCode.endsWith(";") ? "" : ";"
      }\n${indent}} catch (${errVar}) {\n${indent}  ${catchCode}${
        catchCode.endsWith("}") || catchCode.endsWith(";") ? "" : ";"
      }\n${indent}}`;
    }

    // Generic function call
    const expr = `${opcode}(${args.map((arg) => decompile(arg, indentLevel, false)).join(", ")})`;
    return shouldReturn ? `return ${expr}` : expr;
  }

  const val = JSON.stringify(script);
  return shouldReturn ? `return ${val}` : val;
}
