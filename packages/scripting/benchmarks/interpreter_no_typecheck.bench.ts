import * as boolean from "../src/lib/boolean";
import * as math from "../src/lib/math";
import * as std from "../src/lib/std";
import {
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
  setTypechecking,
} from "../src/interpreter";

// Disable type checking for ALL benchmarks in this file
setTypechecking(false);

// Create opcode registry
const opcodes = createOpcodeRegistry(std, boolean, math);

// Helper to create context
function createContext(gasLimit = 10_000_000) {
  return createScriptContext({
    caller: { id: 1 },
    gas: gasLimit,
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
  console.log(`  Average: ${(avgTime * 1000).toFixed(2)}μs per iteration`);
  console.log(`  Ops/sec: ${(1000 / avgTime).toFixed(0)}`);
  console.log();
}

console.log("=".repeat(80));
console.log("INTERPRETER BENCHMARKS - TYPE CHECKING DISABLED");
console.log("=".repeat(80));
console.log();
console.log("NOTE: All benchmarks run with setTypechecking(false)");
console.log();

// ============================================================================
// 1. BASELINE OPERATIONS (NO TYPE CHECKING)
// ============================================================================
console.log("1. BASELINE OPERATIONS (NO TYPE CHECKING)");
console.log("-".repeat(80));
console.log();

benchmark("empty script (just return value)", () => {
  evaluate(42, createContext());
});

benchmark("single opcode (simple addition)", () => {
  evaluate(["+", 1, 2], createContext());
});

benchmark("arithmetic chain (5 operations)", () => {
  evaluate(["+", ["+", 1, 2], ["+", 3, ["+", 4, 5]]], createContext());
});

benchmark("arithmetic chain (10 operations)", () => {
  evaluate(
    ["+", ["+", ["+", 1, 2], ["+", 3, 4]], ["+", ["+", 5, 6], ["+", ["+", 7, 8], ["+", 9, 10]]]],
    createContext(),
  );
});

benchmark("arithmetic chain (20 operations)", () => {
  evaluate(
    [
      "+",
      ["+", ["+", ["+", 1, 2], ["+", 3, 4]], ["+", ["+", 5, 6], ["+", 7, 8]]],
      ["+", ["+", ["+", 9, 10], ["+", 11, 12]], ["+", ["+", 13, 14], ["+", 15, 16]]],
      ["+", ["+", 17, 18], ["+", 19, 20]],
    ],
    createContext(),
  );
});

// ============================================================================
// 2. OPCODE LOOKUP (NO TYPE CHECKING)
// ============================================================================
console.log("2. OPCODE LOOKUP (NO TYPE CHECKING)");
console.log("-".repeat(80));
console.log();

benchmark("same opcode repeated (addition × 50)", () => {
  let script: any = 0;
  for (let idx = 0; idx < 50; idx += 1) {
    script = ["+", script, 1];
  }
  evaluate(script, createContext());
});

benchmark("different opcodes mixed (50 operations)", () => {
  const ops = [];
  for (let idx = 0; idx < 50; idx += 1) {
    ops.push(["+", idx, 1]);
  }
  evaluate(["std.seq", ...ops], createContext());
});

benchmark("deeply nested (depth = 50)", () => {
  let script: any = 0;
  for (let idx = 0; idx < 50; idx += 1) {
    script = ["+", script, 1];
  }
  evaluate(script, createContext());
});

// ============================================================================
// 3. VARIABLE OPERATIONS (NO TYPE CHECKING)
// ============================================================================
console.log("3. VARIABLE OPERATIONS (NO TYPE CHECKING)");
console.log("-".repeat(80));
console.log();

benchmark("variable creation (50 lets)", () => {
  const lets = [];
  for (let idx = 0; idx < 50; idx += 1) {
    lets.push(["std.let", `var${idx}`, idx]);
  }
  evaluate(["std.seq", ...lets], createContext());
});

benchmark("variable access (500 reads)", () => {
  const reads = [];
  for (let idx = 0; idx < 500; idx += 1) {
    reads.push(["std.var", "x"]);
  }
  const script = ["std.seq", ["std.let", "x", 42], ...reads];
  evaluate(script, createContext());
});

benchmark("variable updates (500 sets)", () => {
  const updates = [];
  for (let idx = 0; idx < 500; idx += 1) {
    updates.push(["std.set", "x", ["+", ["std.var", "x"], 1]]);
  }
  const script = ["std.seq", ["std.let", "x", 0], ...updates, ["std.var", "x"]];
  evaluate(script, createContext());
});

benchmark("mixed var operations (100 let/get/set)", () => {
  const ops = [];
  for (let idx = 0; idx < 100; idx += 1) {
    ops.push(
      ["std.let", `v${idx}`, idx],
      ["std.var", `v${idx}`],
      ["std.set", `v${idx}`, ["+", ["std.var", `v${idx}`], 1]],
    );
  }
  evaluate(["std.seq", ...ops], createContext());
});

// ============================================================================
// 4. CONTROL FLOW (NO TYPE CHECKING)
// ============================================================================
console.log("4. CONTROL FLOW (NO TYPE CHECKING)");
console.log("-".repeat(80));
console.log();

benchmark("sequential operations (std.seq × 100)", () => {
  const ops = [];
  for (let idx = 0; idx < 100; idx += 1) {
    ops.push(["+", idx, 1]);
  }
  evaluate(["std.seq", ...ops], createContext());
});

benchmark("conditionals (50 if-then-else)", () => {
  const ops = [];
  for (let idx = 0; idx < 50; idx += 1) {
    ops.push(["std.if", idx % 2 === 0, idx, idx + 1]);
  }
  evaluate(["std.seq", ...ops], createContext());
});

benchmark("while loop (500 iterations)", () => {
  const script = [
    "std.seq",
    ["std.let", "idx", 0],
    ["std.while", ["<", ["std.var", "idx"], 500], ["std.set", "idx", ["+", ["std.var", "idx"], 1]]],
    ["std.var", "idx"],
  ];
  evaluate(script, createContext());
});

benchmark("nested loops (50×10)", () => {
  const script = [
    "std.seq",
    ["std.let", "total", 0],
    ["std.let", "outer", 0],
    [
      "std.while",
      ["<", ["std.var", "outer"], 50],
      [
        "std.seq",
        ["std.let", "inner", 0],
        [
          "std.while",
          ["<", ["std.var", "inner"], 10],
          [
            "std.seq",
            ["std.set", "total", ["+", ["std.var", "total"], 1]],
            ["std.set", "inner", ["+", ["std.var", "inner"], 1]],
          ],
        ],
        ["std.set", "outer", ["+", ["std.var", "outer"], 1]],
      ],
    ],
    ["std.var", "total"],
  ];
  evaluate(script, createContext());
});

// ============================================================================
// 5. FUNCTION CALLS (NO TYPE CHECKING)
// ============================================================================
console.log("5. FUNCTION CALLS (NO TYPE CHECKING)");
console.log("-".repeat(80));
console.log();

benchmark("lambda creation (50 lambdas)", () => {
  const ops = [];
  for (let idx = 0; idx < 50; idx += 1) {
    ops.push(["std.let", `f${idx}`, ["std.lambda", ["x"], ["+", ["std.var", "x"], idx]]]);
  }
  evaluate(["std.seq", ...ops], createContext());
});

benchmark("lambda invocation (100 calls)", () => {
  const calls = [];
  for (let idx = 0; idx < 100; idx += 1) {
    calls.push(["std.apply", ["std.var", "add"], idx, idx + 1]);
  }
  const script = [
    "std.seq",
    ["std.let", "add", ["std.lambda", ["x", "y"], ["+", ["std.var", "x"], ["std.var", "y"]]]],
    ...calls,
  ];
  evaluate(script, createContext());
});

benchmark("recursive calls (fibonacci n=15)", () => {
  const script = [
    "std.seq",
    [
      "std.let",
      "fib",
      [
        "std.lambda",
        ["n"],
        [
          "std.if",
          ["<", ["std.var", "n"], 2],
          ["std.var", "n"],
          [
            "+",
            ["std.apply", ["std.var", "fib"], ["-", ["std.var", "n"], 1]],
            ["std.apply", ["std.var", "fib"], ["-", ["std.var", "n"], 2]],
          ],
        ],
      ],
    ],
    ["std.apply", ["std.var", "fib"], 15],
  ];
  evaluate(script, createContext());
});

// ============================================================================
// 6. GAS TRACKING COMPARISON
// ============================================================================
console.log("6. GAS TRACKING COMPARISON (NO TYPE CHECKING)");
console.log("-".repeat(80));
console.log();

const gasScript = [
  "std.seq",
  ["std.let", "count", 0],
  [
    "std.while",
    ["<", ["std.var", "count"], 500],
    ["std.set", "count", ["+", ["std.var", "count"], 1]],
  ],
  ["std.var", "count"],
];

benchmark("gas tracking DISABLED (undefined gas)", () => {
  const ctx = createScriptContext({
    caller: { id: 1 },
    gas: undefined,
    ops: opcodes,
    this: { id: 1 },
  });
  evaluate(gasScript, ctx);
});

benchmark("gas tracking ENABLED (high limit)", () => {
  evaluate(gasScript, createContext(50_000_000));
});

// ============================================================================
// 7. REAL-WORLD SCENARIOS (NO TYPE CHECKING)
// ============================================================================
console.log("7. REAL-WORLD SCENARIOS (NO TYPE CHECKING)");
console.log("-".repeat(80));
console.log();

benchmark("factorial (iterative, n=50)", () => {
  const script = [
    "std.seq",
    ["std.let", "n", 50],
    ["std.let", "result", 1],
    ["std.let", "idx", 1],
    [
      "std.while",
      ["<=", ["std.var", "idx"], ["std.var", "n"]],
      [
        "std.seq",
        ["std.set", "result", ["*", ["std.var", "result"], ["std.var", "idx"]]],
        ["std.set", "idx", ["+", ["std.var", "idx"], 1]],
      ],
    ],
    ["std.var", "result"],
  ];
  evaluate(script, createContext());
});

benchmark("sum of squares (1-100)", () => {
  const script = [
    "std.seq",
    ["std.let", "sum", 0],
    ["std.let", "idx", 1],
    [
      "std.while",
      ["<=", ["std.var", "idx"], 100],
      [
        "std.seq",
        [
          "std.set",
          "sum",
          ["+", ["std.var", "sum"], ["*", ["std.var", "idx"], ["std.var", "idx"]]],
        ],
        ["std.set", "idx", ["+", ["std.var", "idx"], 1]],
      ],
    ],
    ["std.var", "sum"],
  ];
  evaluate(script, createContext());
});

benchmark("nested computation (complex workload)", () => {
  const script = [
    "std.seq",
    ["std.let", "total", 0],
    ["std.let", "outer", 0],
    [
      "std.while",
      ["<", ["std.var", "outer"], 20],
      [
        "std.seq",
        ["std.let", "inner", 0],
        [
          "std.while",
          ["<", ["std.var", "inner"], 20],
          [
            "std.seq",
            [
              "std.set",
              "total",
              ["+", ["std.var", "total"], ["*", ["std.var", "outer"], ["std.var", "inner"]]],
            ],
            ["std.set", "inner", ["+", ["std.var", "inner"], 1]],
          ],
        ],
        ["std.set", "outer", ["+", ["std.var", "outer"], 1]],
      ],
    ],
    ["std.var", "total"],
  ];
  evaluate(script, createContext());
});

console.log("=".repeat(80));
console.log("ANALYSIS: TYPE CHECKING DISABLED");
console.log("=".repeat(80));
console.log();
console.log("Compare these results with comprehensive_interpreter.bench.ts");
console.log("to isolate the overhead from other interpreter components:");
console.log();
console.log("  - Stack machine operations");
console.log("  - Opcode lookup");
console.log("  - Variable scoping");
console.log("  - Gas tracking");
console.log();
console.log("The difference between these benchmarks and the type-checking-enabled");
console.log("benchmarks reveals the TRUE cost of type validation.");
console.log();
