import * as MathOps from "../lib/math";
import {
  type ScriptContext,
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
} from "../interpreter";
import { beforeEach, expect } from "bun:test";
import { createLibraryTester } from "./test-utils";

createLibraryTester(MathOps, "Math Library", (test) => {
  const TEST_OPS = createOpcodeRegistry(MathOps);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      args: [],
      caller: { id: 1 } as any,
      ops: TEST_OPS,
      send: () => {},
      this: { id: 2 } as any,
      warnings: [],
    });
  });

  // Arithmetic
  test("+", () => {
    expect(evaluate(MathOps.add(1, 2), ctx)).toBe(3);
    expect(evaluate(MathOps.add(1, 2, 3), ctx)).toBe(6);
  });

  test("-", () => {
    expect(evaluate(MathOps.sub(3, 1), ctx)).toBe(2);
    expect(evaluate(MathOps.sub(10, 2, 3), ctx)).toBe(5);
  });

  test("*", () => {
    expect(evaluate(MathOps.mul(2, 3), ctx)).toBe(6);
    expect(evaluate(MathOps.mul(2, 3, 4), ctx)).toBe(24);
  });

  test("/", () => {
    expect(evaluate(MathOps.div(6, 2), ctx)).toBe(3);
    expect(evaluate(MathOps.div(12, 2, 3), ctx)).toBe(2);
  });

  test("%", () => {
    expect(evaluate(MathOps.mod(5, 2), ctx)).toBe(1);
  });

  test("^", () => {
    expect(evaluate(MathOps.pow(2, 3), ctx)).toBe(8);
    expect(evaluate(MathOps.pow(2, 3, 2), ctx)).toBe(512); // 2^(3^2) = 2^9 = 512
  });

  // Rounding
  test("math.floor", () => {
    expect(evaluate(MathOps.floor(1.5), ctx)).toBe(1);
    expect(evaluate(MathOps.floor(-1.5), ctx)).toBe(-2);
  });

  test("math.ceil", () => {
    expect(evaluate(MathOps.ceil(1.5), ctx)).toBe(2);
    expect(evaluate(MathOps.ceil(-1.5), ctx)).toBe(-1);
  });

  test("math.trunc", () => {
    expect(evaluate(MathOps.trunc(1.5), ctx)).toBe(1);
    expect(evaluate(MathOps.trunc(-1.5), ctx)).toBe(-1);
  });

  test("math.round", () => {
    expect(evaluate(MathOps.round(1.5), ctx)).toBe(2);
    expect(evaluate(MathOps.round(1.4), ctx)).toBe(1);
  });

  // Trigonometry
  test("math.sin", () => {
    expect(evaluate(MathOps.sin(Math.PI / 2), ctx)).toBeCloseTo(1);
  });

  test("math.cos", () => {
    expect(evaluate(MathOps.cos(Math.PI), ctx)).toBeCloseTo(-1);
  });

  test("math.tan", () => {
    expect(evaluate(MathOps.tan(0), ctx)).toBeCloseTo(0);
  });

  test("math.asin", () => {
    expect(evaluate(MathOps.asin(1), ctx)).toBeCloseTo(Math.PI / 2);
  });

  test("math.acos", () => {
    expect(evaluate(MathOps.acos(-1), ctx)).toBeCloseTo(Math.PI);
  });

  test("math.atan", () => {
    expect(evaluate(MathOps.atan(0), ctx)).toBeCloseTo(0);
  });

  test("math.atan2", () => {
    expect(evaluate(MathOps.atan2(1, 1), ctx)).toBeCloseTo(Math.PI / 4);
  });

  // Log/Exp
  test("math.log", () => {
    expect(evaluate(MathOps.log(Math.E), ctx)).toBeCloseTo(1);
  });

  test("math.log2", () => {
    expect(evaluate(MathOps.log2(8), ctx)).toBe(3);
  });

  test("math.log10", () => {
    expect(evaluate(MathOps.log10(100), ctx)).toBe(2);
  });

  test("math.exp", () => {
    expect(evaluate(MathOps.exp(1), ctx)).toBeCloseTo(Math.E);
  });

  test("math.sqrt", () => {
    expect(evaluate(MathOps.sqrt(9), ctx)).toBe(3);
  });

  // Utilities
  test("math.abs", () => {
    expect(evaluate(MathOps.abs(-5), ctx)).toBe(5);
  });

  test("math.min", () => {
    expect(evaluate(MathOps.min(1, 2, 3), ctx)).toBe(1);
  });

  test("math.max", () => {
    expect(evaluate(MathOps.max(1, 2, 3), ctx)).toBe(3);
  });

  test("math.clamp", () => {
    expect(evaluate(MathOps.clamp(5, 0, 10), ctx)).toBe(5);
    expect(evaluate(MathOps.clamp(-5, 0, 10), ctx)).toBe(0);
    expect(evaluate(MathOps.clamp(15, 0, 10), ctx)).toBe(10);
  });

  test("math.sign", () => {
    expect(evaluate(MathOps.sign(5), ctx)).toBe(1);
    expect(evaluate(MathOps.sign(-5), ctx)).toBe(-1);
    expect(evaluate(MathOps.sign(0), ctx)).toBe(0);
  });
});
