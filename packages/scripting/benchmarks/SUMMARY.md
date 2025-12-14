# Break/Continue Performance Investigation Summary

## What We Did

We investigated the performance of the exception-based `BreakSignal` and `ContinueSignal` implementation in the ViwoScript interpreter to determine if the TODO item suggesting a refactor to return values was warranted.

## Key Discoveries

### 1. Exception Overhead is Real But Not the Main Problem

- **Break**: ~167μs overhead for a single break in a 100-iteration loop
- **Continue**: ~16μs overhead per continue signal
- This is measurable, but...

### 2. The Interpreter is 500-4000x Slower Than Compiled Code

- Baseline loop: **547x slower**
- Loop with break: **1024x slower**
- Loop with continue: **4270x slower**
- The compiled version runs in ~0.3μs vs interpreter's ~145-928μs

### 3. The Compiler Uses Native Break/Continue

- Zero exception overhead
- Compiles to JavaScript's native `break` and `continue` statements
- See `packages/scripting/src/compiler.ts` lines 283-287

## The Math

For a 100-iteration loop with 50 continues:

| Implementation                        | Time   | Speedup       |
| ------------------------------------- | ------ | ------------- |
| **Current Interpreter**               | 928μs  | 1x (baseline) |
| Hypothetical return-value interpreter | ~245μs | ~3.8x         |
| **Compiled Code**                     | 0.22μs | **4220x**     |

Even if we optimized break/continue to use return values:

- We'd still be **1100x slower** than compiled code
- We'd only save ~73% in continue-heavy code
- The interpreter would still be the bottleneck

## Recommendation

**DO NOT refactor break/continue to return values**

**Instead:**

1. **For performance-critical code**: Use the compiler (1000-4000x speedup)
2. **For development/debugging**: The interpreter is fine (better error messages)
3. **If optimizing the interpreter**: Profile first, then address the real bottlenecks (scope management, opcode lookup, etc.)

---

# Comprehensive Interpreter Analysis (2025-12-15)

## Architecture-Level Performance Analysis

We conducted a systematic analysis of the interpreter's `evaluate` function and identified 6 major bottleneck categories. See [`interpreter_architecture_analysis.md`](file:///home/me/git/viwo/packages/scripting/benchmarks/interpreter_architecture_analysis.md) for full details.

### Estimated Overhead Per Opcode

```
Component               Est. Cost     % of Total
==================================================
Stack machine ops       ~10-20ns      ~15-25%
Opcode lookup          ~5-10ns       ~10-15%
Type checking          ~20-50ns      ~30-40% (when enabled)
Gas tracking           ~2-5ns        ~5%
Variable access        ~5-15ns       ~10-15%
Async check            ~2-3ns        ~5%
Actual opcode work     ~10-30ns      ~15-25%
==================================================
TOTAL per opcode:      ~50-130ns     100%
```

**Compiler**: ~1-5ns per operation (direct JavaScript)  
**Slowdown**: ~10-100x just from interpreter overhead

### Key Findings from Comprehensive Benchmarks

#### 1. Type Checking Has Significant Impact (~60% average overhead)

**Detailed analysis**: See [`typecheck_overhead_analysis.md`](file:///home/me/git/viwo/packages/scripting/benchmarks/typecheck_overhead_analysis.md)

```
Type checking ENABLED:   10.49μs per iteration
Type checking DISABLED:  6.17μs per iteration
Average overhead: ~60% across all operations
```

**By category:**

- Variable updates: **80%** overhead
- Variable access: **78%** overhead
- Mixed opcodes: **71%** overhead
- Lambda creation: **65%** overhead
- Arithmetic operations: **30-36%** overhead

This is the single biggest optimization opportunity for the interpreter.

#### 2. Variable Operations Are Expensive

```
variable creation (10 lets):     11.09μs
variable access (100 reads):     50.86μs  (~0.5μs per access)
variable updates (100 sets):     188.49μs (~1.9μs per update)
```

Variable updates are particularly costly due to prototype chain traversal and validation.

#### 3. Nested Scopes Add Overhead

```
nested scopes (lambda with closure, depth = 5): 32.76μs
```

Each lambda closure requires `Object.create()` and adds to the prototype chain depth.

#### 4. Opcode Lookup is Repeated Work

```
same opcode repeated (20× addition):      20.43μs (~1.0μs per op)
different opcodes mixed (20 operations):  26.71μs (~1.3μs per op)
```

Mixed opcodes are ~30% slower, likely due to cache misses in the hash table.

#### 5. Gas Tracking Overhead is Minimal

From the data, gas tracking adds minimal overhead (~5 of total time) and is not a priority for optimization.

## Optimization Priorities

Based on measured data:

1. **HIGH: Type Checking** - Measured ~70% overhead

   - Consider simplified validation
   - Cache validation results
   - Provide "fast mode" without type checks

2. **MEDIUM: Variable Updates** - ~1.9μs per update

   - Alternative scoping mechanism
   - Direct variable indices instead of string lookups

3. **MEDIUM: Opcode Lookup** - ~1.3μs per mixed opcode

   - Bytecode compilation (opcode → integer mapping)
   - Inline hot opcodes (if/while/seq)

4. **LOW: Everything Else**
   - Stack operations, gas tracking, async checks are already optimized

## New Benchmark Files

1. **[`comprehensive_interpreter.bench.ts`](file:///home/me/git/viwo/packages/scripting/benchmarks/comprehensive_interpreter.bench.ts)** - Covers 8 categories:

   - Baseline operations
   - Opcode lookup overhead
   - Scope & variable management
   - Type checking impact
   - Gas tracking impact
   - Control flow
   - Nested evaluation
   - Real-world scenarios

2. **[`interpreter_vs_compiler_comprehensive.bench.ts`](file:///home/me/git/viwo/packages/scripting/benchmarks/interpreter_vs_compiler_comprehensive.bench.ts)** - Side-by-side comparisons:

   - Arithmetic operations
   - Variable operations
   - Control flow
   - Function calls
   - Array operations
   - Real-world scenarios

3. **[`interpreter_architecture_analysis.md`](file:///home/me/git/viwo/packages/scripting/benchmarks/interpreter_architecture_analysis.md)** - Full architectural analysis

## Conclusion

The comprehensive analysis confirms that:

1. **Type checking is the biggest bottleneck** (~70% overhead when enabled)
2. **Variable updates are costly** (~1.9μs each due to prototypes)
3. **The compiler remains the best solution** for performance-critical code (1000-4000x faster)
4. **Interpreter optimizations should focus on type checking first**, then variable scoping

The interpreter serves its purpose well for development/debugging, where execution speed is less critical than error messages and introspection. For production or performance-critical paths, the compiler should always be used.

## Files Created

### Initial Break/Continue Investigation

1. `benchmarks/break_continue.bench.ts` - Initial benchmarks
2. `benchmarks/break_continue_revised.bench.ts` - More accurate isolated measurements
3. `benchmarks/compiler_vs_interpreter.bench.ts` - Compiler comparison
4. `benchmarks/break_continue_analysis.md` - Full analysis and recommendations

### Comprehensive Analysis (New)

5. `benchmarks/comprehensive_interpreter.bench.ts` - Comprehensive interpreter benchmarks
6. `benchmarks/interpreter_vs_compiler_comprehensive.bench.ts` - Extended compiler comparisons
7. `benchmarks/interpreter_architecture_analysis.md` - Architecture-level analysis

## TODO.md Updated

The TODO item has been updated with LOW PRIORITY status and a note to use the compiler for performance-critical code.
