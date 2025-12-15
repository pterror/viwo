import * as boolean from "../src/lib/boolean";
import * as math from "../src/lib/math";
import * as std from "../src/lib/std";
import {
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
  setTypechecking,
} from "../src/interpreter";
import { compile } from "../src/compiler";

const opcodes = createOpcodeRegistry(std, boolean, math);

function createContext() {
  return createScriptContext({
    caller: { id: 1 },
    gas: undefined, // No gas limit for profiling
    ops: opcodes,
    this: { id: 1 },
  });
}

// Simple workload for profiling
const script = std.seq(
  std.let("sum", 0),
  std.let("idx", 0),
  std.while(
    boolean.lt(std.var("idx"), 1000),
    std.seq(
      std.set("sum", math.add(std.var("sum"), std.var("idx"))),
      std.set("idx", math.add(std.var("idx"), 1)),
    ),
  ),
  std.var("sum"),
);

console.log("=".repeat(60));
console.log("INTERPRETER PROFILING");
console.log("=".repeat(60));
console.log();

// Profile interpreter WITH type checking
console.log("Running interpreter WITH type checking (100 iterations)...");
setTypechecking(true);
const start1 = performance.now();
for (let i = 0; i < 100; i += 1) {
  evaluate(script, createContext());
}
const end1 = performance.now();
console.log(`Time: ${end1 - start1}ms (${(end1 - start1) / 100}ms per iteration)`);
console.log();

// Profile interpreter WITHOUT type checking
console.log("Running interpreter WITHOUT type checking (100 iterations)...");
setTypechecking(false);
const start2 = performance.now();
for (let i = 0; i < 100; i += 1) {
  evaluate(script, createContext());
}
const end2 = performance.now();
console.log(`Time: ${end2 - start2}ms (${(end2 - start2) / 100}ms per iteration)`);
console.log();

// Profile compiler
console.log("Running compiler (100 iterations)...");
const compiled = compile(script, opcodes);
const start3 = performance.now();
for (let i = 0; i < 100; i += 1) {
  compiled(createContext());
}
const end3 = performance.now();
console.log(`Time: ${end3 - start3}ms (${(end3 - start3) / 100}ms per iteration)`);
console.log();

console.log("=".repeat(60));
console.log("COMPARISON");
console.log("=".repeat(60));
const interpreterWithCheck = (end1 - start1) / 100;
const interpreterNoCheck = (end2 - start2) / 100;
const compilerTime = (end3 - start3) / 100;

console.log(`Interpreter (type check ON):  ${interpreterWithCheck.toFixed(3)}ms`);
console.log(`Interpreter (type check OFF): ${interpreterNoCheck.toFixed(3)}ms`);
console.log(`Compiler:                      ${compilerTime.toFixed(3)}ms`);
console.log();
console.log(
  `Type checking overhead:        ${(interpreterWithCheck / interpreterNoCheck).toFixed(1)}x`,
);
console.log(
  `Interpreter vs Compiler:       ${(interpreterNoCheck / compilerTime).toFixed(1)}x slower`,
);
console.log(
  `Interpreter+TC vs Compiler:    ${(interpreterWithCheck / compilerTime).toFixed(1)}x slower`,
);
