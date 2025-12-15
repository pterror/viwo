import * as boolean from "../src/lib/boolean";
import * as math from "../src/lib/math";
import * as std from "../src/lib/std";
import { createOpcodeRegistry, createScriptContext, evaluate } from "../src/interpreter";
import { compile } from "../src/compiler";

// Create opcode registry
const opcodes = createOpcodeRegistry(std, boolean, math);

// Helper to create context
function createContext() {
  return createScriptContext({
    caller: { id: 1 },
    gas: 10_000_000,
    ops: opcodes,
    this: { id: 1 },
  });
}

// Benchmark runner
function benchmark(name: string, fn: () => void, iterations = 1000) {
  // Warmup
  for (let idx = 0; idx < 10; idx += 1) {
    fn();
  }

  // Actual benchmark
  const start = performance.now();
  for (let idx = 0; idx < iterations; idx += 1) {
    fn();
  }
  const end = performance.now();

  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log(`${name}:`);
  console.log(`  Total: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average: ${avgTime.toFixed(4)}ms (${(avgTime * 1000).toFixed(2)}μs)`);
  console.log();

  return avgTime;
}

console.log("COMPILER vs INTERPRETER: Break/Continue Performance");
console.log("=".repeat(70));
console.log();

// Test script: loop with break
const breakScript = std.seq(
  std.let("count", 0),
  std.while(
    true,
    std.seq(
      std.set("count", math.add(std.var("count"), 1)),
      std.if(boolean.eq(std.var("count"), 100), std.break()),
    ),
  ),
  std.var("count"),
);

// Test script: loop with continue
const continueScript = std.seq(
  std.let("count", 0),
  std.let("sum", 0),
  std.while(
    boolean.lt(std.var("count"), 100),
    std.seq(
      std.set("count", math.add(std.var("count"), 1)),
      std.if(boolean.eq(math.mod(std.var("count"), 2), 0), std.continue()),
      std.set("sum", math.add(std.var("sum"), std.var("count"))),
    ),
  ),
  std.var("sum"),
);

// Baseline: simple loop without break/continue
const baselineScript = std.seq(
  std.let("count", 0),
  std.while(boolean.lt(std.var("count"), 100), std.set("count", math.add(std.var("count"), 1))),
  std.var("count"),
);

console.log("TEST 1: Loop with break (100 iterations)");
console.log("-".repeat(70));

const interpretedBreakTime = benchmark("Interpreted (with exception-based break)", () => {
  evaluate(breakScript, createContext());
});

const compiledBreak = compile(breakScript, opcodes);
const compiledBreakTime = benchmark("Compiled (native break statement)", () => {
  compiledBreak(createContext());
});

console.log(`Speedup: ${(interpretedBreakTime / compiledBreakTime).toFixed(2)}x faster`);
console.log();

console.log("TEST 2: Loop with continue (50 continues out of 100 iterations)");
console.log("-".repeat(70));

const interpretedContinueTime = benchmark("Interpreted (with exception-based continue)", () => {
  evaluate(continueScript, createContext());
});

const compiledContinue = compile(continueScript, opcodes);
const compiledContinueTime = benchmark("Compiled (native continue statement)", () => {
  compiledContinue(createContext());
});

console.log(`Speedup: ${(interpretedContinueTime / compiledContinueTime).toFixed(2)}x faster`);
console.log();

console.log("TEST 3: Baseline loop (no break/continue)");
console.log("-".repeat(70));

const interpretedBaselineTime = benchmark("Interpreted (no control flow signals)", () => {
  evaluate(baselineScript, createContext());
});

const compiledBaseline = compile(baselineScript, opcodes);
const compiledBaselineTime = benchmark("Compiled (native loop)", () => {
  compiledBaseline(createContext());
});

console.log(`Speedup: ${(interpretedBaselineTime / compiledBaselineTime).toFixed(2)}x faster`);
console.log();

console.log("ANALYSIS");
console.log("=".repeat(70));

const interpretedBreakOverhead = interpretedBreakTime - interpretedBaselineTime;
const compiledBreakOverhead = compiledBreakTime - compiledBaselineTime;

const interpretedContinueOverhead = interpretedContinueTime - interpretedBaselineTime;
const compiledContinueOverhead = compiledContinueTime - compiledBaselineTime;

console.log("Break overhead:");
console.log(`  Interpreted: ${(interpretedBreakOverhead * 1000).toFixed(2)}μs`);
console.log(`  Compiled: ${(compiledBreakOverhead * 1000).toFixed(2)}μs`);
console.log(
  `  Exception overhead: ${((interpretedBreakOverhead - compiledBreakOverhead) * 1000).toFixed(
    2,
  )}μs`,
);
console.log();

console.log("Continue overhead (per 50 continues):");
console.log(`  Interpreted: ${(interpretedContinueOverhead * 1000).toFixed(2)}μs`);
console.log(`  Compiled: ${(compiledContinueOverhead * 1000).toFixed(2)}μs`);
console.log(
  `  Exception overhead: ${(
    (interpretedContinueOverhead - compiledContinueOverhead) *
    1000
  ).toFixed(2)}μs`,
);
console.log(
  `  Per continue: ${(
    ((interpretedContinueOverhead - compiledContinueOverhead) / 50) *
    1000
  ).toFixed(2)}μs`,
);
console.log();

console.log("Overall interpreter overhead (baseline):");
console.log(
  `  ${(interpretedBaselineTime / compiledBaselineTime - 1).toFixed(1)}x slower than compiled`,
);
console.log();

console.log("CONCLUSION:");
console.log("  The exception-based approach adds measurable overhead on top of");
console.log("  the already-high interpreter overhead. Compiled code uses native");
console.log("  break/continue without any exception overhead.");
