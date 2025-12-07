import { describe, expect, it } from "bun:test";
import { compile } from "./compiler";

describe("compiler security attributes", () => {
  const ops = {}; // No extra ops needed

  it("should prevent static access to dangerous keys (obj.get)", () => {
    expect(() => {
      compile(["obj.get", ["obj.new"], "__proto__"], ops);
    }).toThrow(/Security Error: Cannot access dangerous key "__proto__"/);
  });

  it("should prevent static access to dangerous keys (obj.set)", () => {
    expect(() => {
      compile(["obj.set", ["obj.new"], "constructor", 1], ops);
    }).toThrow(/Security Error: Cannot access dangerous key "constructor"/);
  });

  it("should prevent static access to dangerous keys (obj.new)", () => {
    expect(() => {
      compile(["obj.new", ["prototype", 1]], ops);
    }).toThrow(/Security Error: Cannot access dangerous key "prototype"/);
  });

  it("should prevent dynamic access to dangerous keys (runtime)", () => {
    const fn = compile(["std.let", "k", "constructor"], ops);
    // Wait, ["std.let", ...] is a statement. compile returns a function.
    // We need to use valid AST that does dynamic access.
    // ["std.seq", ["std.let", "k", "constructor"], ["obj.get", ["obj.new"], ["std.var", "k"]]]

    // But compile() returns a function that we must call with context.
    // However, our implementation wraps runtime check.

    const script = [
      "std.seq",
      ["std.let", "k", "constructor"],
      ["obj.get", ["obj.new"], ["std.var", "k"]],
    ];

    const context = {
      ops: {},
      vars: {}, // simplistic context
      // ... incomplete context
    };

    const compiledFn = compile(script, ops);

    // We need a proper context for std.let/std.var to work if they use context?
    // std.let uses JS variables in the compiled function.
    // std.var just references them.
    // It should work with minimal context since we refactored compiler to use JS vars?
    // Let's check compiler.ts std.let implementation.
    // It uses `let ${toJSName(name)} = ...`.
    // So we don't need context for vars.

    expect(() => {
      compiledFn(context as any);
    }).toThrow(/Security Error: Cannot access dangerous key "constructor"/);
  });

  it("should allow safe keys", () => {
    const script = ["obj.get", ["obj.new", ["foo", "bar"]], "foo"];
    const compiledFn = compile(script, ops);
    expect(compiledFn({} as any)).toBe("bar");
  });

  it("should prevent list.get with dangerous key", () => {
    const script = ["list.get", ["list.new", 1, 2], "constructor"];
    // Compile time check if "constructor" is string literal
    expect(() => {
      compile(script, ops);
    }).toThrow(/Security Error: Cannot access dangerous key "constructor"/);
  });

  it("should prevent list.get with dynamic dangerous key", () => {
    // Dynamic key
    const script = [
      "std.seq",
      ["std.let", "k", "constructor"],
      ["list.get", ["list.new"], ["std.var", "k"]],
    ];
    const compiledFn = compile(script, ops);
    expect(() => {
      compiledFn({} as any);
    }).toThrow(/Security Error: Cannot access dangerous key "constructor"/);
  });
});
