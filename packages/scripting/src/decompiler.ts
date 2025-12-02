export function decompile(script: any, indentLevel: number = 0): string {
  const indent = "  ".repeat(indentLevel);

  if (script === null || script === undefined) {
    return "null";
  }

  if (typeof script === "string") {
    return JSON.stringify(script);
  }

  if (typeof script === "number" || typeof script === "boolean") {
    return String(script);
  }

  if (Array.isArray(script)) {
    if (script.length === 0) {
      return "[]";
    }

    const opcode = script[0];

    // Handle sequence specifically for better formatting
    if (opcode === "seq") {
      // If it's the top-level script (indentLevel 0), join with newlines
      if (indentLevel === 0) {
        const statements = script
          .slice(1)
          .map((stmt) => decompile(stmt, indentLevel));
        return statements.join(";\n") + (statements.length > 0 ? ";" : "");
      }

      // Nested seq
      const statements = script
        .slice(1)
        .map((stmt) => decompile(stmt, indentLevel + 1));
      return `seq(\n${statements
        .map((s) => indent + "  " + s)
        .join(",\n")}\n${indent})`;
    }

    // Handle other opcodes
    const args = script.slice(1).map((arg) => decompile(arg, indentLevel + 1));

    // Special handling for infix operators if we wanted to be fancy, but function call style is safer for now
    // except maybe for math/logic if we want it to look like JS.
    // For now, let's stick to function call syntax for everything to match the internal representation closely.
    // e.g. ["+", 1, 2] -> "+(1, 2)"
    // But wait, the opcodes are namespaced in many cases (e.g. MathLib["+"]).
    // The editor uses raw opcodes.
    // Let's try to make it look somewhat readable.

    return `${opcode}(${args.join(", ")})`;
  }

  return JSON.stringify(script);
}
