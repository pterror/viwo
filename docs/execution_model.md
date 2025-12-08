# Execution Model & Architecture

This document outlines the Viwo engine's execution model, explaining the relationship between the **Kernel**, **Opcodes**, and the **Polyglot SDKs**.

## The "Sandwich" Architecture

Viwo uses a layered architecture to achieve security, determinism, and language agnosticism.

1.  **Top Layer: The Host Language (SDK)**

    - **Languages:** TypeScript, Lua, Python, etc.
    - **Role:** The "Developer Experience" layer.
    - **Artifact:** Developers write code here (e.g., `cap.create_entity()`).
    - **Compilation:** This code is **compiled (or transpiled)** into S-Expressions (JSON AST). It is _never_ executed directly by the engine.

2.  **Middle Layer: The Universal Bytecode (S-Expressions)**

    - **Format:** JSON Arrays (e.g., `["std.call_method", "cap", "create", ["arg"]]`).
    - **Role:** The stable **Application Binary Interface (ABI)**.
    - **Characteristics:**
      - **Language Agnostic:** Does not care if it came from TS or Lua.
      - **Serializable:** Can be saved to DB, sent over network, or paused mid-execution.
      - **Secure:** Cannot execute arbitrary native code. Restricted to the Opcode set.

3.  **Bottom Layer: The Kernel (VM & Opcodes)**
    - **Implementation:** TypeScript (currently), running on Bun/Node.
    - **Role:** Executes the S-Expressions.
    - **Component:** **Opcodes** (e.g., `sys.create`, `std.if`).
    - **Responsibility:** Enforces security, gas metering, and state transitions.

---

## Why Opcodes? (Why not just run JS?)

One might ask: _"If the kernel is written in TS, and we write scripts in TS, why compile to Opcodes? Why not just `eval()` the TS?"_

### 1. Determinism & Security (The Sandbox)

- **No "Escape":** If we ran raw JS `eval()`, a script could potentially access the global `process`, `fs`, or hang the server with `while(true)`.
- **Gas Metering:** The VM counts every opcode executed. If a script runs too long (infinite loop), the VM kills it. This is impossible with raw `eval()` without using heavy worker threads (which are slow/complex for thousands of entities).

### 2. State Serialization (Pause/Resume)

- **Workflow:** Viwo scripts are often "Process Managers" (Quest Sagas, complex behaviors).
- **Feature:** Because the VM executes a data structure (AST), we can **serialize the entire Call Stack** to JSON at any point.
- **Result:** Use `std.sleep(1000)`. The server saves the script state to disk and shuts down. Next week, it loads the state and resumes _exactly_ where it left off. You cannot do this with a native Promise.

### 3. Language Agnosticism

- **Universal Target:** By compiling to a neutral JSON S-expression format, we decouple the engine from the source language.
- **Polyglot:** We can write a Lua-to-SExpr compiler. Now Lua scripts run on the _exact same_ engine, share the same capabilities, and interact with TS entities seamlessly.

---

## The "Typed Facade" (SDK) Role

The **SDK** is a thin compile-time shim.

- **It exists to:**
  1.  Provide Type Safety (TypeScript Interfaces).
  2.  Provide Autocomplete (DX).
  3.  Compile idiomatic syntax (`obj.method()`) into the correct Opcode pattern (`["std.call_method", ...]`).
- **It does NOT:**
  1.  Execute logic. All logic happens in the Kernel via Opcodes.
  2.  Bypass security. It just calls the opcodes.

### Example Flow

**1. Developer Writes (TypeScript):**

```typescript
// Implicitly uses EntityControl SDK Class
const cap = std.arg(0) as EntityControl;
cap.destroy();
```

**2. Compiler Produces (S-Expression):**

```json
[
  "std.seq",
  ["std.let", "cap", ["std.arg", 0]],
  ["std.call_method", ["std.var", "cap"], "destroy", []]
]
```

**3. Kernel Executes:**

- `std.arg`: Fetches argument (Prototype of EntityControl).
- `std.call_method`:
  - Look up `destroy` method on the prototype.
  - Execute it.
  - Inside `destroy`: Calls `sys.destroy`.
  - Kernel validates `sys.destroy` (Checks permissions).
  - Entity is deleted.

---

## Summary

- **Opcodes** are the **Physics** of the world. They are the only things that can actually _change_ state.
- **Scripts (S-Expr)** are the compiled instructions.
- **SDKs** are the **User Interface** for writing those instructions.
