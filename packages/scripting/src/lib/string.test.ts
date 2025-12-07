import * as BooleanLib from "../lib/boolean";
import * as ListLib from "../lib/list";
import * as MathLib from "../lib/math";
import * as StdLib from "../lib/std";
import * as StringLib from "../lib/string";
import {
  type ScriptContext,
  ScriptError,
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
} from "../interpreter";
import { beforeEach, expect } from "bun:test";
import { createLibraryTester } from "./test-utils";

createLibraryTester(StringLib, "String Library", (test) => {
  const TEST_OPS = createOpcodeRegistry(StdLib, StringLib, ListLib, MathLib, BooleanLib);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      caller: { id: 1 } as any,
      ops: TEST_OPS,
      this: { id: 2 } as any,
    });
  });

  test("str.len", () => {
    expect(evaluate(StringLib.strLen("hello"), ctx)).toBe(5);
    expect(evaluate(StringLib.strLen(""), ctx)).toBe(0);
    expect(
      (() => {
        try {
          // @ts-expect-error We are testing invalid input
          return evaluate(StringLib.strLen(123), ctx);
        } catch (error) {
          return error;
        }
      })(),
    ).toBeInstanceOf(ScriptError);
  });

  test("str.split", () => {
    expect(evaluate(StringLib.strSplit("a,b,c", ","), ctx)).toEqual(["a", "b", "c"]);
    expect(evaluate(StringLib.strSplit("abc", ""), ctx)).toEqual(["a", "b", "c"]);
  });

  test("str.join", () => {
    expect(evaluate(StringLib.strJoin(ListLib.listNew("a", "b", "c"), ","), ctx)).toBe("a,b,c");
    expect(evaluate(StringLib.strJoin(ListLib.listNew(), ","), ctx)).toBe("");
  });

  test("str.concat", () => {
    expect(evaluate(StringLib.strConcat("hello", " world"), ctx)).toBe("hello world");
    expect(evaluate(StringLib.strConcat("num: ", 123), ctx)).toBe("num: 123");
  });

  test("str.slice", () => {
    expect(evaluate(StringLib.strSlice("hello", 1), ctx)).toBe("ello");
    expect(evaluate(StringLib.strSlice("hello", 1, 3), ctx)).toBe("el");
  });

  test("str.lower", () => {
    expect(evaluate(StringLib.strLower("HELLO"), ctx)).toBe("hello");
  });

  test("str.upper", () => {
    expect(evaluate(StringLib.strUpper("hello"), ctx)).toBe("HELLO");
  });

  test("str.trim", () => {
    expect(evaluate(StringLib.strTrim("  hello  "), ctx)).toBe("hello");
  });

  test("str.includes", () => {
    expect(evaluate(StringLib.strIncludes("hello", "ell"), ctx)).toBe(true);
    expect(evaluate(StringLib.strIncludes("hello", "z"), ctx)).toBe(false);
  });

  test("str.replace", () => {
    expect(evaluate(StringLib.strReplace("hello", "l", "w"), ctx)).toBe("hewlo"); // Only first occurrence
  });
});
