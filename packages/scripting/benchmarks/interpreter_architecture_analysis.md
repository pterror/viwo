# Interpreter Architecture Analysis

This document provides a systematic analysis of the ViwoScript interpreter's `evaluate` function, identifying architecture-level performance bottlenecks.

## Overview

The interpreter uses an **explicit stack machine** with a **Structure of Arrays (SOA)** layout to evaluate S-expression ASTs. While this design avoids recursion limits and provides good control over execution, it introduces several sources of overhead.

## Architecture Components

### 1. Stack Machine Implementation (SOA)

**Location**: [interpreter.ts:93-112](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L93-L112)

```typescript
// SOA Stack (Dynamic)
const stackOp: string[] = [];
const stackArgs: unknown[][] = [];
const stackAst: any[][] = [];
const stackIdx: number[] = [];
let sp = 0;
```

**Characteristics**:

- 4 separate arrays for stack frames (op, args, ast, idx)
- Stack pointer (`sp`) manually managed
- Every frame push requires 5 operations (4 array writes + sp increment)
- Every frame pop requires 1 operation (sp decrement)

**Performance Impact**:

| Operation    | Cost            | Notes                                       |
| ------------ | --------------- | ------------------------------------------- |
| Frame push   | ~4 array writes | stackOp[sp] = ..., stackArgs[sp] = [], etc. |
| Frame pop    | ~1 decrement    | sp -= 1                                     |
| Frame access | ~4 array reads  | stackOp[top], stackArgs[top], etc.          |

**Bottlenecks**:

1. **Memory access pattern**: 4 separate array accesses per frame operation
2. **Array bounds**: No pre-allocation, arrays grow dynamically
3. **Cache locality**: Separate arrays reduce cache effectiveness

**Why SOA?**

- Avoids object allocation overhead
- Better for V8 optimization (homogeneous arrays)
- Trade-off: More array accesses vs fewer object allocations

---

### 2. Opcode Resolution

**Location**: [interpreter.ts:102-104, 134-138](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L102-L104)

```typescript
const [op] = ast;
if (typeof op !== "string" || !ctx.ops[op]) {
  throw new ScriptError(`Unknown opcode: ${op}`, []);
}
```

**Characteristics**:

- Hash table lookup on every opcode execution: `ctx.ops[op]`
- Type check: `typeof op !== "string"`
- Existence check: `!ctx.ops[op]`

**Performance Impact**:

| Operation       | Cost                  | Frequency                 |
| --------------- | --------------------- | ------------------------- |
| Hash lookup     | ~1-2ns (V8 optimized) | Every opcode              |
| Type check      | ~0.5ns                | Every opcode              |
| Metadata access | ~1ns                  | Every opcode (lazy check) |

**Bottlenecks**:

1. **Repeated lookups**: Same opcode looked up every time (no caching)
2. **Two-phase lookup**: First check existence, then access `.metadata`, then access `.handler`
3. **Indirect call**: Function pointer through hash table prevents inlining

**Potential Optimizations**:

- Opcode numbering (map strings to integers during parse)
- Direct opcode array (avoid hash table)
- Inline common opcodes (if/while/seq)

---

### 3. Type Checking

**Location**: [interpreter.ts:189-191, 276-392](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L189-L191)

```typescript
if (typecheck && def.metadata.parameters) {
  validateArgs(op, args, def.metadata);
}
```

**Characteristics**:

- Per-opcode validation
- Complex type checking logic (275+ lines)
- String type comparisons
- Regex tests for some types
- Special handling for arrays, rest params, unions

**Performance Impact**:

The `validateArgs` function performs:

1. Arity checking (min/max arguments)
2. Per-argument type validation
3. Optional parameter handling
4. Rest parameter handling
5. Union type checking
6. Special entity/capability type checks

**Bottlenecks**:

1. **Loops within loops**: For each argument, check against parameter type
2. **String operations**: Type splitting on `|`, regex tests with `/\W/`
3. **Conditional complexity**: Many nested if statements
4. **Repeated metadata access**: Multiple accesses to `metadata.genericParameters`

**Current Optimization**:

- Can be disabled globally via `setTypechecking(false)`
- Whitelisted types skip validation

**Measured Impact** (from break/continue benchmarks):

- Unknown - not isolated in current benchmarks
- Likely significant in opcode-heavy scripts

---

### 4. Gas Tracking

**Location**: [interpreter.ts:126-131](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L126-L131)

```typescript
if (ctx.gas !== undefined) {
  ctx.gas -= 1;
  if (ctx.gas < 0) {
    throw new ScriptError("Script ran out of gas!");
  }
}
```

**Characteristics**:

- Checked **on every iteration** of the main loop
- Requires: 1 undefined check + 1 decrement + 1 comparison
- Branch in hot path

**Performance Impact**:

| Operation       | Cost   | Frequency                             |
| --------------- | ------ | ------------------------------------- |
| Undefined check | ~0.5ns | Every loop iteration                  |
| Decrement       | ~0.5ns | Every loop iteration (if gas defined) |
| Comparison      | ~0.5ns | Every loop iteration (if gas defined) |

**Bottlenecks**:

1. **Branch prediction**: `if (ctx.gas !== undefined)` may mispredict
2. **Hot path pollution**: Code in the tightest loop
3. **Register pressure**: Gas value must stay in register

**Optimization Ideas**:

- Separate "gas mode" vs "no-gas mode" interpreters
- Count up instead of down (avoid negative check)
- Check gas less frequently (every N operations)

**Actual Impact**: Likely small (~1-2% of total time) but measurable

---

### 5. Variable Scoping

**Location**: [interpreter.ts:44](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L44)

```typescript
const newVars = Object.create(lambda.closure ?? null);
```

**Characteristics**:

- Prototypal inheritance for closures
- `Object.create()` called on lambda execution
- Variable lookup walks prototype chain

**Performance Impact**:

| Operation         | Cost           | Notes                             |
| ----------------- | -------------- | --------------------------------- |
| `Object.create()` | ~50-100ns      | Creates new object with prototype |
| Variable lookup   | ~2-5ns × depth | Walks prototype chain             |
| Variable write    | ~2-3ns         | Direct property write             |

**Bottlenecks**:

1. **Object allocation**: Every lambda call creates new scope object
2. **Prototype chain**: Lookups slower with deep nesting
3. **Property access**: Dynamic property access prevents optimization

**Why Prototypes?**:

- Elegant closure implementation
- Automatic scope chain
- No manual scope tracking needed

**Measured Impact**:

- Unknown - not isolated in current benchmarks
- Likely more significant with deeply nested lambdas

---

### 6. Async Handling

**Location**: [interpreter.ts:228-231, 248-266](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L228-L231)

```typescript
if (result instanceof Promise) {
  return handleAsyncResult(result, ctx, sp, stackOp, stackArgs, stackAst, stackIdx, options);
}
```

**Characteristics**:

- `instanceof Promise` check on every opcode result
- Stack state preserved across async boundaries
- Async function called for continuation

**Performance Impact**:

| Operation            | Cost     | Notes                                |
| -------------------- | -------- | ------------------------------------ |
| `instanceof Promise` | ~2-3ns   | On every opcode result               |
| Async continuation   | ~1000ns+ | Promise overhead, stack preservation |

**Bottlenecks**:

1. **Instanceof check**: Required for every sync operation (most common case)
2. **Function call overhead**: `handleAsyncResult` function call
3. **Array parameter passing**: 5 arrays passed to continuation

**Why Async?**:

- Necessary for database I/O, network requests, etc.
- Alternative would be separate sync/async interpreters

**Optimization Ideas**:

- Opcode metadata flag for "always sync" opcodes
- Skip instanceof check for known-sync operations
- Faster type checking (check for `.then` method?)

**Actual Impact**: Minimal for sync operations (~2-3ns per op), significant when async actually occurs

---

## Performance Hierarchy

Based on architectural analysis, estimated overhead per opcode execution:

```
Component               Estimated Cost    % of Total
================================================
Stack machine ops       ~10-20ns         ~15-25%
Opcode lookup          ~5-10ns          ~10-15%
Type checking          ~20-50ns         ~30-40% (when enabled)
Gas tracking           ~2-5ns           ~5%
Variable access        ~5-15ns          ~10-15%
Async check            ~2-3ns           ~5%
Actual opcode work     ~10-30ns         ~15-25%
================================================
TOTAL per opcode:      ~50-130ns        100%
```

> [!NOTE]
> These are **rough estimates** based on code structure. Actual measurements would require detailed profiling.

For comparison:

- **Compiled code**: ~1-5ns per operation (direct JavaScript)
- **Interpreter**: ~50-130ns per operation
- **Slowdown**: ~10-100x just from interpreter overhead

---

## Key Findings

### 1. Type Checking is Likely the Biggest Bottleneck

The `validateArgs` function is complex and runs on every opcode:

- 116 lines of validation logic
- String parsing, regex tests, array iterations
- Nested conditionals with many branches

**Recommendation**: Run benchmarks with type checking disabled to measure impact.

### 2. Stack Machine Overhead is Unavoidable

SOA design is optimization-aware but still requires:

- 4 array accesses per frame operation
- Manual stack pointer management
- Dynamic array growth

**Recommendation**: This is fundamental to the design. Alternative would be full compiler.

### 3. Opcode Lookup is Repeated Work

Every opcode requires hash table lookup:

- Same opcode in a loop? Looked up every time
- No caching or optimization

**Recommendation**: Consider bytecode compilation (map opcodes to integers once).

### 4. Gas Tracking is in the Hot Path

Gas check happens in the tightest loop:

- Every stack operation checks gas
- Branch prediction may suffer

**Recommendation**: Separate interpreters for gas/no-gas mode, or check gas less frequently.

### 5. Async Overhead is Minimal (for Sync Code)

The `instanceof Promise` check is cheap:

- Only ~2-3ns per operation
- Only matters when promises actually occur

**Recommendation**: Not a priority for optimization.

---

## Comparison: Interpreter vs Compiler

The compiler (`packages/scripting/src/compiler.ts`) avoids these costs:

| Component        | Interpreter         | Compiler                 |
| ---------------- | ------------------- | ------------------------ |
| Stack operations | Explicit SOA stack  | JavaScript call stack    |
| Opcode lookup    | Hash table per op   | Direct function calls    |
| Type checking    | Runtime validation  | None (or TypeScript)     |
| Gas tracking     | Every operation     | None                     |
| Variable access  | Prototype chain     | V8-optimized closures    |
| Async check      | `instanceof` per op | None (uses native async) |

This explains the **500-4000x slowdown**:

- Interpreter: ~100ns per operation × 1000 operations = ~100μs
- Compiler: ~1ns per operation × 1000 operations = ~1μs
- **Ratio: 100x**

The actual measured ratio (500-4000x) suggests additional overhead from:

- Function call overhead
- Exception handling (break/continue)
- GC pressure from temporary objects

---

## Recommendations

### For Users

1. **Use the compiler for performance-critical code** (1000-4000x speedup)
2. **Use the interpreter for development/debugging** (better error messages)
3. **Profile before optimizing** - measure actual bottlenecks

### For Interpreter Optimization (if needed)

Priority order based on expected impact:

1. **HIGH: Type checking** (~30-40% of time)

   - Measure impact by benchmarking with `setTypechecking(false)`
   - Consider simplified type checking
   - Cache validation results for repeated opcodes

2. **MEDIUM: Opcode lookup** (~10-15% of time)

   - Bytecode compilation (map opcodes to integers)
   - Direct opcode array instead of hash table
   - Inline hot opcodes (if/while/seq)

3. **MEDIUM: Stack operations** (~15-25% of time)

   - Pre-allocate stack arrays
   - Consider AoS (Array of Structs) for better cache locality
   - Benchmark different stack depths

4. **LOW: Gas tracking** (~5% of time)

   - Separate gas/no-gas interpreters
   - Check gas every N operations instead of every operation

5. **LOW: Variable scoping** (~10-15% of time)

   - Alternative: flat scope array with indices
   - Pre-allocated scope objects
   - Direct variable indices instead of string names

6. **VERY LOW: Async checking** (~5% of time)
   - Already minimal overhead
   - Not worth optimizing

---

## Next Steps

1. **Run comprehensive benchmarks** to validate these estimates
2. **Profile with V8 profiler** to see actual hotspots
3. **Measure individual components** (type checking, opcode lookup, etc.)
4. **Compare with compiler** on identical workloads
5. **Document findings** and update recommendations

---

## Appendix: Relevant Code Sections

- Main evaluation loop: [interpreter.ts:125-241](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L125-L241)
- Stack frame setup: [interpreter.ts:93-112](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L93-L112)
- Type validation: [interpreter.ts:276-392](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L276-L392)
- Gas tracking: [interpreter.ts:126-131](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L126-L131)
- Async handling: [interpreter.ts:248-266](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L248-L266)
- Lambda execution: [interpreter.ts:39-50](file:///home/me/git/viwo/packages/scripting/src/interpreter.ts#L39-L50)
