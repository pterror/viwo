# Type Checking Overhead Analysis

This document compares benchmark results with and without type checking to quantify the exact overhead of type validation.

## Summary of Findings

**Type checking adds 40-70% overhead** depending on the operation type.

## Detailed Comparison

### Baseline Operations

| Benchmark           | With Type Check | Without Type Check | Overhead                     |
| ------------------- | --------------- | ------------------ | ---------------------------- |
| Empty script        | 0.98μs          | 0.98μs             | **0%** (no opcodes to check) |
| Single opcode (+)   | 3.11μs          | 2.89μs             | **8%**                       |
| Arithmetic (5 ops)  | 5.05μs          | 3.87μs             | **30%**                      |
| Arithmetic (10 ops) | 9.88μs          | 7.28μs             | **36%**                      |
| Arithmetic (20 ops) | N/A             | 13.95μs            | -                            |

**Finding**: Type checking overhead scales with operation count. Simple arithmetic sees ~30-36% overhead.

### Opcode Lookup

| Benchmark              | With Type Check | Without Type Check | Overhead |
| ---------------------- | --------------- | ------------------ | -------- |
| Same opcode (20×)      | 20.43μs         | 12.42μs            | **64%**  |
| Same opcode (50×)      | N/A             | 21.18μs            | -        |
| Mixed opcodes (20 ops) | 26.71μs         | 15.62μs            | **71%**  |
| Mixed opcodes (50 ops) | N/A             | 21.07μs            | -        |
| Deeply nested (20)     | 14.56μs         | 9.46μs             | **54%**  |
| Deeply nested (50)     | N/A             | 12.91μs            | -        |

**Finding**: Type checking adds **54-71% overhead** to opcode-heavy workloads. This is the highest overhead category!

### Variable Operations

| Benchmark                   | With Type Check | Without Type Check | Overhead |
| --------------------------- | --------------- | ------------------ | -------- |
| Variable creation (10 lets) | 11.09μs         | 7.22μs             | **54%**  |
| Variable creation (50 lets) | N/A             | 35.73μs            | -        |
| Variable access (100 reads) | 50.86μs         | 28.59μs            | **78%**  |
| Variable access (500 reads) | N/A             | 142.97μs           | -        |
| Variable updates (100 sets) | 188.49μs        | 104.88μs           | **80%**  |
| Variable updates (500 sets) | N/A             | 524.39μs           | -        |

**Finding**: Variable operations see the **highest type checking overhead at 78-80%**! This is because `std.let`, `std.var`, and `std.set` all validate their arguments.

**Key Insight**: Without type checking:

- Variable access: ~0.29μs per read (vs 0.51μs with checking)
- Variable updates: ~1.05μs per set (vs 1.88μs with checking)

The prototypal scoping overhead is ~0.29μs for reads and ~1.05μs for updates (when type checking is disabled). The remaining overhead with type checking on is pure validation cost!

### Control Flow

| Benchmark             | With Type Check | Without Type Check      | Overhead                 |
| --------------------- | --------------- | ----------------------- | ------------------------ |
| Sequential (20 ops)   | ~20+μs          | ~15+μs                  | ~**33%** (estimated)     |
| Sequential (100 ops)  | N/A             | 32.11μs                 | -                        |
| Conditionals (50)     | N/A             | 25.32μs                 | -                        |
| While loop (100 iter) | ~145μs          | ~100μs                  | ~**45%** (from previous) |
| While loop (500 iter) | N/A             | 1000.26μs (~2.0μs/iter) | -                        |
| Nested loops (50×10)  | N/A             | 1982.12μs (~4.0μs/iter) | -                        |

**Finding**: Loop overhead without type checking is ~2.0μs per iteration for simple loops, ~4.0μs for nested loops.

### Function Calls

| Benchmark               | With Type Check | Without Type Check     | Overhead             |
| ----------------------- | --------------- | ---------------------- | -------------------- |
| Lambda creation (10)    | ~33μs           | ~20μs                  | ~**65%** (estimated) |
| Lambda creation (50)    | N/A             | 49.93μs (~1.0μs each)  | -                    |
| Lambda invocation (10)  | ~23μs           | ~23.14μs               | ~**0%**              |
| Lambda invocation (100) | N/A             | 231.41μs (~2.3μs each) | -                    |

**Finding**: Lambda creation sees ~65% overhead from type checking, but invocation overhead is minimal.

### Gas Tracking (No Type Checking)

| Configuration | Time (500 iter) |
| ------------- | --------------- |
| Gas DISABLED  | Not measured    |
| Gas ENABLED   | 1000.26μs       |

**Finding**: With type checking disabled, we can better isolate gas tracking overhead. The difference would need separate measurement.

## Overall Type Checking Impact

### By Category (Overhead %)

1. **Variable updates**: 80% overhead
2. **Variable access**: 78% overhead
3. **Mixed opcodes**: 71% overhead
4. **Lambda creation**: ~65% overhead
5. **Same opcode repeated**: 64% overhead
6. **Variable creation**: 54% overhead
7. **Deeply nested**: 54% overhead
8. **Arithmetic operations**: 30-36% overhead

### Average Impact

**Average type checking overhead across all operations: ~60%**

This means the interpreter runs ~1.6x slower with type checking enabled.

## Cost Breakdown Without Type Checking

With type checking disabled, we can see the "true" cost of each interpreter component:

| Component                     | Est. Cost per Op |
| ----------------------------- | ---------------- |
| Stack machine + opcode lookup | ~0.3-0.5μs       |
| Variable read (w/ prototype)  | ~0.29μs          |
| Variable write (w/ prototype) | ~1.05μs          |
| Lambda creation               | ~1.0μs           |
| Lambda call overhead          | ~2.3μs           |
| Loop iteration                | ~2.0-4.0μs       |

## Recommendations

### 1. Provide Fast Mode (HIGH PRIORITY)

Implement a "fast mode" that disables type checking:

- **60% average speedup**
- **80% speedup for variable-heavy code**
- Still 1000-4000x slower than compiler, but better

### 2. Selective Type Checking (MEDIUM PRIORITY)

Only check types for:

- User-defined functions (not stdlib)
- First N executions of each opcode (cache results)
- When explicitly requested

### 3. Simplified Validation (MEDIUM PRIORITY)

Current validation is very thorough (276 lines). Consider:

- Whitelist-only simple checks (typeof x === "number")
- Skip union type parsing
- Skip generic parameter checks

### 4. Still Recommend Compiler for Performance

Even with type checking disabled:

- Interpreter: ~0.3-4.0μs per operation
- Compiler: ~0.001-0.005μs per operation
- **Compiler is still 100-1000x faster!**

## Conclusion

Type checking accounts for **~60% of interpreter overhead on average**, with some operations (variable updates) seeing up to **80% overhead**.

However, even without type checking, the interpreter is still **100-1000x slower** than the compiler due to:

- Stack machine operations
- Opcode hash table lookups
- Prototypal variable scoping
- Gas tracking

**For maximum performance, use the compiler.**  
**For development/debugging, disabling type checking provides a meaningful ~60% speedup.**
