import { describe, test, expect } from "bun:test";
import { decompile } from "./decompiler";

describe("Decompiler", () => {
  test("literals", () => {
    expect(decompile(1)).toBe("1");
    expect(decompile("hello")).toBe('"hello"');
    expect(decompile(true)).toBe("true");
    expect(decompile(null)).toBe("null");
  });

  test("simple sequence", () => {
    const script = ["seq", ["let", "x", 1], ["var", "x"]];
    const expected = 'let("x", 1);\nvar("x");';
    expect(decompile(script)).toBe(expected);
  });

  test("nested sequence", () => {
    const script = ["seq", ["if", true, ["seq", ["let", "y", 2]], null]];
    // Note: The decompiler currently formats nested seqs with indentation
    // seq(
    //   let("y", 2)
    // )
    // So the if call would be: if(true, seq(...), null)

    const output = decompile(script);
    expect(output).toContain("if(true");
    expect(output).toContain("seq(");
    expect(output).toContain('let("y", 2)');
  });

  test("function call", () => {
    const script = ["+", 1, 2];
    expect(decompile(script)).toBe("+(1, 2)");
  });
});
