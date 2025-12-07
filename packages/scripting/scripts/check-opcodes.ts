import fs from "fs";
import path from "path";

const SCRIPTING_PKG_ROOT = path.resolve(import.meta.dir, "..");
const COMPILER_PATH = path.join(SCRIPTING_PKG_ROOT, "src/compiler.ts");
const LIB_DIR = path.join(SCRIPTING_PKG_ROOT, "src/lib");

function getDefinedOpcodes(): Set<string> {
  const opcodes = new Set<string>();
  const files = fs.readdirSync(LIB_DIR);

  for (const file of files) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) {
      continue;
    }
    const content = fs.readFileSync(path.join(LIB_DIR, file), "utf8");

    // Simplified regex that looks for the function call and the string literal
    const opcodeRegex = /define(?:Full)?Opcode(?:<[\s\S]*?>)?\(\s*(["'`])(.+?)\1/g;

    let match;
    while ((match = opcodeRegex.exec(content)) !== null) {
      opcodes.add(match[2]);
    }
  }
  return opcodes;
}

function getHandledOpcodes(): Set<string> {
  const opcodes = new Set<string>();
  const content = fs.readFileSync(COMPILER_PATH, "utf8");

  // Look for case "OPCODE_NAME":
  const caseRegex = /case\s+(["'`])(.+?)\1\s*:/g;

  let match;
  while ((match = caseRegex.exec(content)) !== null) {
    opcodes.add(match[2]);
  }
  return opcodes;
}

function main() {
  console.log("Checking opcode coverage in compiler...");

  const definedOpcodes = getDefinedOpcodes();
  const handledOpcodes = getHandledOpcodes();

  const missing = new Set<string>();

  for (const op of definedOpcodes) {
    if (!handledOpcodes.has(op)) {
      missing.add(op);
    }
  }

  if (missing.size > 0) {
    console.error(
      "❌ The following opcodes are defined in src/lib but NOT handled in src/compiler.ts:",
    );
    for (const op of missing) {
      console.error(` - ${op}`);
    }
    process.exit(1);
  } else {
    console.log("✅ All opcodes are covered by the compiler.");
    process.exit(0);
  }
}

main();
