# Execution Model & Architecture

This document outlines the Viwo engine's execution model, explaining the relationship between the **Kernel**, **Opcodes**, and the **Polyglot SDKs**.

## The "Sandwich" Architecture

Viwo uses a layered architecture to achieve security, determinism, and language agnosticism.

1.  **Top Layer: The Host Language (SDK)**

    - **Languages:** TypeScript, Lua, Python, etc.
    - **Role:** The "Developer Experience" layer.
    - **Artifact:** Developers write code here (e.g., `cap.create_entity()`).
    - **Transformation:** This code is **transpiled** into S-Expressions (JSON AST). It is _never_ executed directly by the engine.

2.  **Middle Layer: The Universal Bytecode (S-Expressions)**

    - **Format:** JSON Arrays (e.g., `["std.call_method", "cap", "create", ["arg"]]`).
    - **Role:** The stable **Application Binary Interface (ABI)**.
    - **Characteristics:**
      - **Language Agnostic:** Does not care if it came from TS or Lua.
      - **Serializable:** Can be saved to DB, sent over network, or paused mid-execution.
      - **Secure:** Cannot execute arbitrary native code. Restricted to the Opcode set.

3.  **Bottom Layer: The Kernel (VM & Opcodes)**
    - **Implementation:** TypeScript (currently), running on Bun/Node.
    - **Execution Modes:**
      - **Interpreter (`evaluate`):** Walks the JSON tree. Slower, but easy to debug and step through.
      - **JIT Compiler (`compile`):** converts S-Expressions to a native JS function (e.g., `(ctx) => ops.add.handler(...)`) for speed.
    - **Component:** **Opcodes** (e.g., `sys.create`, `std.if`).
    - **Responsibility:** Enforces security, gas metering, and state transitions. Only the Opcodes have access to the "Real World" (DB, Network).

---

## Why Opcodes? (Why not just run JS?)

The existence of `compiler.ts` (which compiles S-Expressions to JS) often leads to the question: _"Why do we need Opcodes if we end up compiling to JS anyway? Why not just write JS/TS and run it?"_

### 1. The "Sandbox" (Security)

Even when we use the **JIT Compiler** (`compiler.ts`), we **do not** compile user code into arbitrary JS.

- **User Code:** `while(true) {}`
- **JIT Output:** `while(true) { checkGas(); }`
- **User Code:** `fs.delete("/boot")`
- **JIT Output:** `ops.fs.delete(...)` -> **Throws Security Error**.

The **Opcodes** act as the **System Calls** of our Operating System. Just as a C program must use `syscalls` to talk to the Linux Kernel, our Scripts must use `opcodes` to talk to the Viwo Engine. The JIT compiler ensures that _only_ valid opcodes are generated. Pure JS execution would require heavy sandboxing (like V8 Isolates), which is resource-intensive.

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

**2. Transpiler Produces (S-Expression):**

```json
[
  "std.seq",
  ["std.let", "cap", ["std.arg", 0]],
  ["std.call_method", ["std.var", "cap"], "destroy", []]
]
```

**3. Kernel Executes (Interpreter or JIT):**

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
