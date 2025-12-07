import {
  BooleanLib,
  ListLib,
  MathLib,
  ObjectLib,
  type ScriptContext,
  StdLib,
  StringLib,
  compile,
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
} from "./index";
import { describe, expect, test } from "bun:test";

// Register libraries once
const TEST_OPS = createOpcodeRegistry(StdLib, MathLib, BooleanLib, ListLib, ObjectLib, StringLib);

function createTestContext(): ScriptContext {
  return createScriptContext({
    args: [],
    caller: { id: 200 } as any,
    gas: 10_000,
    ops: TEST_OPS,
    this: { id: 100 } as any,
  });
}

function checkParity(name: string, ast: any, ctxOverride?: Partial<ScriptContext>) {
  test(name, async () => {
    const ctx1 = { ...createTestContext(), ...ctxOverride };
    const ctx2 = { ...createTestContext(), ...ctxOverride };

    let errInterp, resInterp;
    try {
      resInterp = await evaluate(ast, ctx1);
    } catch (error) {
      errInterp = error;
    }

    let errCompile, resCompile;
    try {
      const compiledFn = compile(ast, TEST_OPS);
      resCompile = await compiledFn(ctx2);
    } catch (error) {
      errCompile = error;
    }

    if (errInterp) {
      console.log(errInterp);
      expect(errCompile).toBeDefined();
      // We might want to check error message parity too, but for now just existence
      // expect(errCompile.message).toBe(errInterp.message);
    } else {
      expect(errCompile).toBeUndefined();
      expect(resCompile).toEqual(resInterp);

      // Also check that they produced the same side effects on vars if any
      // Note: This requires the compiler to implement scoping correctly!
      expect(ctx2.vars).toEqual(ctx1.vars);
    }
  });
}

describe("Parity: Interpreter vs Compiler", () => {
  describe("Primitives", () => {
    checkParity("number", 123);
    checkParity("string", "hello");
    checkParity("boolean", true);
    checkParity("null", null);
    // Invalid because 1 is not an opcode
    checkParity("invalid opcode", [1, 2, 3]);
    checkParity("quoted list", ["quote", [1, 2, 3]]);
  });

  describe("Arithmetic", () => {
    checkParity("add", ["+", 1, 2]);
    checkParity("sub", ["-", 10, 2]);
    checkParity("mul", ["*", 3, 4]);
    checkParity("div", ["/", 20, 5]);
    checkParity("mod", ["%", 10, 3]);
    checkParity("pow", ["^", 2, 3]);
    checkParity("nested math", ["+", ["*", 2, 3], ["-", 10, 4]]);
  });

  describe("Logic", () => {
    checkParity("eq true", ["==", 1, 1]);
    checkParity("eq false", ["==", 1, 2]);
    checkParity("neq", ["!=", 1, 2]);
    checkParity("lt", ["<", 1, 2]);
    checkParity("gt", [">", 2, 1]);
    checkParity("lte", ["<=", 1, 1]);
    checkParity("gte", [">=", 1, 1]);
    checkParity("and", ["and", true, false]);
    checkParity("or", ["or", false, true]);
    checkParity("not", ["not", true]);
  });

  describe("Control Flow", () => {
    checkParity("if true", ["if", true, 10, 20]);
    checkParity("if false", ["if", false, 10, 20]);
    checkParity("seq", ["seq", 1, 2, 3]);

    checkParity("while", [
      "seq",
      ["let", "i", 0],
      ["while", ["<", ["var", "i"], 3], ["set", "i", ["+", ["var", "i"], 1]]],
      ["var", "i"],
    ]);
  });

  describe("Variables", () => {
    checkParity("let/var", ["seq", ["let", "x", 42], ["var", "x"]]);

    checkParity("set", ["seq", ["let", "x", 1], ["set", "x", 2], ["var", "x"]]);
  });

  describe("Functions", () => {
    checkParity("lambda apply", ["apply", ["lambda", ["x"], ["*", ["var", "x"], 2]], 21]);

    checkParity("lambda closure", [
      "seq",
      ["let", "a", 10],
      ["apply", ["lambda", ["x"], ["+", ["var", "x"], ["var", "a"]]], 5],
    ]);
  });

  describe("Objects", () => {
    checkParity("obj.new", ["obj.new", ["a", 1], ["b", 2]]);
    checkParity("obj.get", ["obj.get", ["obj.new", ["a", 1]], "a"]);
  });
  describe("Chained Expressions", () => {
    checkParity("chained add", ["+", 1, 2, 3, 4]);
    checkParity("chained sub", ["-", 10, 1, 2, 3]);
    checkParity("chained mul", ["*", 1, 2, 3, 4]);
    checkParity("chained div", ["/", 24, 2, 3, 2]);
    checkParity("chained pow", ["^", 2, 3, 2]); // 2^3^2 = 64 (left associative)

    checkParity("chained and", ["and", true, true, true]);
    checkParity("chained and false", ["and", true, false, true]);
    checkParity("chained or", ["or", false, false, true]);
    checkParity("chained or false", ["or", false, false, false]);

    checkParity("chained lt", ["<", 1, 2, 3]);
    checkParity("chained gt", [">", 3, 2, 1]);
    checkParity("chained lte", ["<=", 1, 2, 2, 3]);
    checkParity("chained gte", [">=", 3, 2, 2, 1]);

    // Fail cases
    checkParity("chained lt fail", ["<", 1, 3, 2]);
  });

  describe("List Library", () => {
    checkParity("list.len", ["list.len", ["list.new", 1, 2, 3]]);
    checkParity("list.empty true", ["list.empty", ["list.new"]]);
    checkParity("list.empty false", ["list.empty", ["list.new", 1]]);
    checkParity("list.get", ["list.get", ["list.new", 10, 20, 30], 1]);
    checkParity("list.set", [
      "seq",
      ["let", "l", ["list.new", 1, 2, 3]],
      ["list.set", ["var", "l"], 1, 99],
      ["var", "l"],
    ]);
    checkParity("list.push", [
      "seq",
      ["let", "l", ["list.new", 1, 2]],
      ["list.push", ["var", "l"], 3],
      ["var", "l"],
    ]);
    checkParity("list.pop", [
      "seq",
      ["let", "l", ["list.new", 1, 2, 3]],
      ["let", "popped", ["list.pop", ["var", "l"]]],
      ["list.new", ["var", "popped"], ["var", "l"]],
    ]);
    checkParity("list.unshift", [
      "seq",
      ["let", "l", ["list.new", 2, 3]],
      ["list.unshift", ["var", "l"], 1],
      ["var", "l"],
    ]);
    checkParity("list.shift", [
      "seq",
      ["let", "l", ["list.new", 1, 2, 3]],
      ["let", "shifted", ["list.shift", ["var", "l"]]],
      ["list.new", ["var", "shifted"], ["var", "l"]],
    ]);
    checkParity("list.slice", ["list.slice", ["list.new", 1, 2, 3, 4, 5], 1, 4]);
    checkParity("list.splice", [
      "seq",
      ["let", "l", ["list.new", 1, 2, 3, 4, 5]],
      ["list.splice", ["var", "l"], 1, 2, 9, 10],
      ["var", "l"],
    ]);
    checkParity("list.concat", [
      "list.concat",
      ["list.new", 1, 2],
      ["list.new", 3, 4],
      ["list.new", 5],
    ]);
    checkParity("list.includes true", ["list.includes", ["list.new", 1, 2, 3], 2]);
    checkParity("list.includes false", ["list.includes", ["list.new", 1, 2, 3], 4]);
    checkParity("list.reverse", [
      "seq",
      ["let", "l", ["list.new", 1, 2, 3]],
      ["list.reverse", ["var", "l"]],
      ["var", "l"],
    ]);
    checkParity("list.sort", [
      "seq",
      ["let", "l", ["list.new", 3, 1, 2]],
      ["list.sort", ["var", "l"]],
      ["var", "l"],
    ]);
  });

  describe("Object Library", () => {
    checkParity("obj.keys", ["obj.keys", ["obj.new", ["a", 1], ["b", 2]]]);
    checkParity("obj.values", ["obj.values", ["obj.new", ["a", 1], ["b", 2]]]);
    checkParity("obj.entries", ["obj.entries", ["obj.new", ["a", 1], ["b", 2]]]);
    checkParity("obj.merge", [
      "obj.merge",
      ["obj.new", ["a", 1]],
      ["obj.new", ["b", 2]],
      ["obj.new", ["a", 3]], // Override
    ]);
  });

  describe("String Library", () => {
    checkParity("str.len", ["str.len", "hello"]);
    checkParity("str.split", ["str.split", "a-b-c", "-"]);
    checkParity("str.slice", ["str.slice", "hello world", 0, 5]);
    checkParity("str.upper", ["str.upper", "hello"]);
    checkParity("str.lower", ["str.lower", "HELLO"]);
    checkParity("str.trim", ["str.trim", "  hello  "]);
    checkParity("str.replace", ["str.replace", "hello world", "world", "viwo"]);
    checkParity("str.includes true", ["str.includes", "hello world", "world"]);
    checkParity("str.includes false", ["str.includes", "hello world", "viwo"]);
    checkParity("str.join", ["str.join", ["list.new", "x", "y", "z"], ","]);
  });
});
