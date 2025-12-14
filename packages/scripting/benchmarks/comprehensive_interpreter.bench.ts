import * as boolean from "../src/lib/boolean";
import * as math from "../src/lib/math";
import * as std from "../src/lib/std";
import {
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
  setTypechecking,
} from "../src/interpreter";

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
console.log("COMPREHENSIVE INTERPRETER BENCHMARKS");
console.log("=".repeat(80));
console.log();

// ============================================================================
// 1. BASELINE OPERATIONS
// ============================================================================
console.log("1. BASELINE OPERATIONS");
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

// ============================================================================
// 2. OPCODE LOOKUP OVERHEAD
// ============================================================================
console.log("2. OPCODE LOOKUP OVERHEAD");
console.log("-".repeat(80));
console.log();

benchmark("same opcode repeated (addition × 20)", () => {
  const script = [
    "+",
    ["+", ["+", ["+", ["+", 1, 2], 3], 4], 5],
    ["+", ["+", ["+", ["+", 6, 7], 8], 9], 10],
    ["+", ["+", ["+", ["+", 11, 12], 13], 14], 15],
    ["+", ["+", ["+", ["+", 16, 17], 18], 19], 20],
  ];
  evaluate(script, createContext());
});

benchmark("different opcodes mixed (20 operations)", () => {
  const script = [
    "std.seq",
    ["+", 1, 2],
    ["-", 5, 3],
    ["*", 2, 3],
    ["/", 10, 2],
    ["%", 7, 3],
    ["<", 1, 2],
    [">", 3, 2],
    ["<=", 3, 3],
    [">=", 4, 3],
    ["==", 5, 5],
    ["!=", 6, 7],
    ["and", true, false],
    ["or", true, false],
    ["not", true],
    ["+", 10, 20],
    ["-", 30, 10],
    ["*", 5, 5],
    ["/", 100, 5],
    ["%", 15, 4],
    ["<", 10, 20],
  ];
  evaluate(script, createContext());
});

benchmark("deeply nested (depth = 20)", () => {
  let script: any = 0;
  for (let idx = 0; idx < 20; idx += 1) {
    script = ["+", script, 1];
  }
  evaluate(script, createContext());
});

// ============================================================================
// 3. SCOPE & VARIABLE MANAGEMENT
// ============================================================================
console.log("3. SCOPE & VARIABLE MANAGEMENT");
console.log("-".repeat(80));
console.log();

benchmark("variable creation (10 lets)", () => {
  evaluate(
    [
      "std.seq",
      ["std.let", "a", 1],
      ["std.let", "b", 2],
      ["std.let", "c", 3],
      ["std.let", "d", 4],
      ["std.let", "e", 5],
      ["std.let", "f", 6],
      ["std.let", "g", 7],
      ["std.let", "h", 8],
      ["std.let", "i", 9],
      ["std.let", "j", 10],
    ],
    createContext(),
  );
});

benchmark("variable access (100 reads)", () => {
  const reads = [];
  for (let idx = 0; idx < 100; idx += 1) {
    reads.push(["std.var", "x"]);
  }
  const script = ["std.seq", ["std.let", "x", 42], ...reads];
  evaluate(script, createContext());
});

benchmark("variable updates (100 sets)", () => {
  const updates = [];
  for (let idx = 0; idx < 100; idx += 1) {
    updates.push(["std.set", "x", ["+", ["std.var", "x"], 1]]);
  }
  const script = ["std.seq", ["std.let", "x", 0], ...updates, ["std.var", "x"]];
  evaluate(script, createContext());
});

benchmark("nested scopes (lambda with closure, depth = 5)", () => {
  const script = [
    "std.seq",
    ["std.let", "a", 1],
    [
      "std.let",
      "f1",
      [
        "std.lambda",
        [],
        [
          "std.seq",
          ["std.let", "b", 2],
          [
            "std.let",
            "f2",
            [
              "std.lambda",
              [],
              [
                "std.seq",
                ["std.let", "c", 3],
                [
                  "std.let",
                  "f3",
                  [
                    "std.lambda",
                    [],
                    [
                      "std.seq",
                      ["std.let", "d", 4],
                      [
                        "std.let",
                        "f4",
                        [
                          "std.lambda",
                          [],
                          [
                            "std.seq",
                            ["std.let", "e", 5],
                            [
                              "+",
                              ["std.var", "a"],
                              [
                                "+",
                                ["std.var", "b"],
                                ["+", ["std.var", "c"], ["+", ["std.var", "d"], ["std.var", "e"]]],
                              ],
                            ],
                          ],
                        ],
                      ],
                      ["std.apply", ["std.var", "f4"]],
                    ],
                  ],
                ],
                ["std.apply", ["std.var", "f3"]],
              ],
            ],
          ],
          ["std.apply", ["std.var", "f2"]],
        ],
      ],
    ],
    ["std.apply", ["std.var", "f1"]],
  ];
  evaluate(script, createContext());
});

// ============================================================================
// 4. TYPE CHECKING IMPACT
// ============================================================================
console.log("4. TYPE CHECKING IMPACT");
console.log("-".repeat(80));
console.log();

const typeCheckScript = [
  "std.seq",
  ["+", 1, 2],
  ["-", 10, 5],
  ["*", 3, 4],
  ["/", 20, 2],
  ["<", 5, 10],
  [">", 15, 10],
  ["==", 7, 7],
  ["!=", 8, 9],
  ["and", true, false],
  ["or", false, true],
];

benchmark("type checking ENABLED (10 opcodes)", () => {
  setTypechecking(true);
  evaluate(typeCheckScript, createContext());
});

benchmark("type checking DISABLED (10 opcodes)", () => {
  setTypechecking(false);
  evaluate(typeCheckScript, createContext());
});

// Restore type checking
setTypechecking(true);

benchmark("complex type checking (arrays, optionals)", () => {
  const script = [
    "std.seq",
    ["std.let", "arr", ["std.array", 1, 2, 3, 4, 5]],
    ["std.array.length", ["std.var", "arr"]],
    ["std.array.push", ["std.var", "arr"], 6],
    ["std.array.get", ["std.var", "arr"], 0],
    ["std.array.set", ["std.var", "arr"], 0, 99],
  ];
  evaluate(script, createContext());
});

// ============================================================================
// 5. GAS TRACKING IMPACT
// ============================================================================
console.log("5. GAS TRACKING IMPACT");
console.log("-".repeat(80));
console.log();

const gasScript = [
  "std.seq",
  ["std.let", "count", 0],
  [
    "std.while",
    ["<", ["std.var", "count"], 100],
    ["std.set", "count", ["+", ["std.var", "count"], 1]],
  ],
  ["std.var", "count"],
];

benchmark("gas tracking DISABLED (undefined gas)", () => {
  const ctx = createScriptContext({
    caller: { id: 1 },
    gas: undefined, // No gas tracking
    ops: opcodes,
    this: { id: 1 },
  });
  evaluate(gasScript, ctx);
});

benchmark("gas tracking ENABLED (high limit)", () => {
  evaluate(gasScript, createContext(10_000_000));
});

// ============================================================================
// 6. CONTROL FLOW
// ============================================================================
console.log("6. CONTROL FLOW");
console.log("-".repeat(80));
console.log();

benchmark("sequential operations (std.seq × 20)", () => {
  const ops = [];
  for (let idx = 0; idx < 20; idx += 1) {
    ops.push(["+", idx, 1]);
  }
  evaluate(["std.seq", ...ops], createContext());
});

benchmark("conditionals (10 if-then-else)", () => {
  const script = [
    "std.seq",
    ["std.if", true, 1, 2],
    ["std.if", false, 3, 4],
    ["std.if", true, 5, 6],
    ["std.if", false, 7, 8],
    ["std.if", true, 9, 10],
    ["std.if", false, 11, 12],
    ["std.if", true, 13, 14],
    ["std.if", false, 15, 16],
    ["std.if", true, 17, 18],
    ["std.if", false, 19, 20],
  ];
  evaluate(script, createContext());
});

benchmark("while loop (100 iterations)", () => {
  const script = [
    "std.seq",
    ["std.let", "idx", 0],
    ["std.while", ["<", ["std.var", "idx"], 100], ["std.set", "idx", ["+", ["std.var", "idx"], 1]]],
    ["std.var", "idx"],
  ];
  evaluate(script, createContext());
});

benchmark("for loop (100 iterations)", () => {
  const script = [
    "std.seq",
    ["std.let", "sum", 0],
    ["std.for", "idx", 0, 100, ["std.set", "sum", ["+", ["std.var", "sum"], ["std.var", "idx"]]]],
    ["std.var", "sum"],
  ];
  evaluate(script, createContext());
});

benchmark("lambda creation (10 lambdas)", () => {
  const script = [
    "std.seq",
    ["std.let", "f1", ["std.lambda", ["x"], ["+", ["std.var", "x"], 1]]],
    ["std.let", "f2", ["std.lambda", ["x"], ["+", ["std.var", "x"], 2]]],
    ["std.let", "f3", ["std.lambda", ["x"], ["+", ["std.var", "x"], 3]]],
    ["std.let", "f4", ["std.lambda", ["x"], ["+", ["std.var", "x"], 4]]],
    ["std.let", "f5", ["std.lambda", ["x"], ["+", ["std.var", "x"], 5]]],
    ["std.let", "f6", ["std.lambda", ["x"], ["+", ["std.var", "x"], 6]]],
    ["std.let", "f7", ["std.lambda", ["x"], ["+", ["std.var", "x"], 7]]],
    ["std.let", "f8", ["std.lambda", ["x"], ["+", ["std.var", "x"], 8]]],
    ["std.let", "f9", ["std.lambda", ["x"], ["+", ["std.var", "x"], 9]]],
    ["std.let", "f10", ["std.lambda", ["x"], ["+", ["std.var", "x"], 10]]],
  ];
  evaluate(script, createContext());
});

benchmark("lambda invocation (10 calls)", () => {
  const script = [
    "std.seq",
    ["std.let", "add", ["std.lambda", ["x", "y"], ["+", ["std.var", "x"], ["std.var", "y"]]]],
    ["std.apply", ["std.var", "add"], 1, 2],
    ["std.apply", ["std.var", "add"], 3, 4],
    ["std.apply", ["std.var", "add"], 5, 6],
    ["std.apply", ["std.var", "add"], 7, 8],
    ["std.apply", ["std.var", "add"], 9, 10],
    ["std.apply", ["std.var", "add"], 11, 12],
    ["std.apply", ["std.var", "add"], 13, 14],
    ["std.apply", ["std.var", "add"], 15, 16],
    ["std.apply", ["std.var", "add"], 17, 18],
    ["std.apply", ["std.var", "add"], 19, 20],
  ];
  evaluate(script, createContext());
});

// ============================================================================
// 7. NESTED EVALUATION
// ============================================================================
console.log("7. NESTED EVALUATION");
console.log("-".repeat(80));
console.log();

benchmark("shallow nesting (depth = 3)", () => {
  const script = ["+", ["+", ["+", 1, 2], 3], 4];
  evaluate(script, createContext());
});

benchmark("deep nesting (depth = 15)", () => {
  let script: any = 0;
  for (let idx = 0; idx < 15; idx += 1) {
    script = ["+", script, 1];
  }
  evaluate(script, createContext());
});

benchmark("wide tree (15 siblings)", () => {
  const ops = [];
  for (let idx = 0; idx < 15; idx += 1) {
    ops.push(["+", idx, 1]);
  }
  evaluate(["std.seq", ...ops], createContext());
});

benchmark("balanced tree (depth = 4, branching = 2)", () => {
  // Creates a binary tree of additions
  const script = ["+", ["+", ["+", 1, 2], ["+", 3, 4]], ["+", ["+", 5, 6], ["+", 7, 8]]];
  evaluate(script, createContext());
});

// ============================================================================
// 8. REAL-WORLD SCENARIOS
// ============================================================================
console.log("8. REAL-WORLD SCENARIOS");
console.log("-".repeat(80));
console.log();

benchmark("fibonacci (n=10, recursive)", () => {
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
    ["std.apply", ["std.var", "fib"], 10],
  ];
  evaluate(script, createContext());
});

benchmark("sum array (100 elements)", () => {
  const elements = [];
  for (let idx = 0; idx < 100; idx += 1) {
    elements.push(idx);
  }
  const script = [
    "std.seq",
    ["std.let", "arr", ["std.array", ...elements]],
    ["std.let", "sum", 0],
    ["std.let", "idx", 0],
    [
      "std.while",
      ["<", ["std.var", "idx"], ["std.array.length", ["std.var", "arr"]]],
      [
        "std.seq",
        [
          "std.set",
          "sum",
          ["+", ["std.var", "sum"], ["std.array.get", ["std.var", "arr"], ["std.var", "idx"]]],
        ],
        ["std.set", "idx", ["+", ["std.var", "idx"], 1]],
      ],
    ],
    ["std.var", "sum"],
  ];
  evaluate(script, createContext());
});

benchmark("map array (transform 50 elements)", () => {
  const elements = [];
  for (let idx = 0; idx < 50; idx += 1) {
    elements.push(idx);
  }
  const script = [
    "std.seq",
    ["std.let", "arr", ["std.array", ...elements]],
    ["std.let", "result", ["std.array"]],
    ["std.let", "idx", 0],
    [
      "std.while",
      ["<", ["std.var", "idx"], ["std.array.length", ["std.var", "arr"]]],
      [
        "std.seq",
        [
          "std.array.push",
          ["std.var", "result"],
          ["*", ["std.array.get", ["std.var", "arr"], ["std.var", "idx"]], 2],
        ],
        ["std.set", "idx", ["+", ["std.var", "idx"], 1]],
      ],
    ],
    ["std.var", "result"],
  ];
  evaluate(script, createContext());
});

console.log("=".repeat(80));
console.log("BENCHMARK COMPLETE");
console.log("=".repeat(80));
console.log();
