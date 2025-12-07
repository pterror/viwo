import * as BooleanLib from "./lib/boolean";
import * as ListLib from "./lib/list";
import * as MathLib from "./lib/math";
import * as ObjectLib from "./lib/object";
import * as StdLib from "./lib/std";
import { describe, expect, test } from "bun:test";
import { decompile } from "./decompiler";

describe("Decompiler", () => {
  test("literals", () => {
    expect(decompile(1)).toBe("1");
    expect(decompile("hello")).toBe('"hello"');
    expect(decompile(true)).toBe("true");
    expect(decompile(null)).toBe("null");
  });

  test("simple sequence (statement)", () => {
    const script = StdLib.seq(StdLib.let("x", 1), StdLib.var("x"));

    const expected = "let x = 1;\nx;";
    expect(decompile(script, 0, true)).toBe(expected);
  });

  test("nested sequence", () => {
    const script = StdLib.seq(StdLib.if(true, StdLib.seq(StdLib.let("y", 2))));

    const expected = `if (true) {
  let y = 2;
}`;
    expect(decompile(script, 0, true)).toBe(expected);
  });

  test("infix operators", () => {
    expect(decompile(MathLib.add(1, 2))).toBe("(1 + 2)");
    expect(decompile(MathLib.mul(3, 4))).toBe("(3 * 4)");
    expect(decompile(BooleanLib.eq(1, 1))).toBe("(1 === 1)");
  });

  test("nested infix operators", () => {
    // (1 + (2 * 3))
    const script = MathLib.add(1, MathLib.mul(2, 3));
    expect(decompile(script)).toBe("(1 + (2 * 3))");
  });

  test("lambda", () => {
    const script = StdLib.lambda(["x"], MathLib.add(StdLib.var("x"), 1));
    expect(decompile(script)).toBe("(x) => (x + 1)");
  });

  test("lambda with block", () => {
    const script = StdLib.lambda(
      ["x"],
      StdLib.seq(StdLib.let("y", 1), MathLib.add(StdLib.var("x"), StdLib.var("y"))),
    );
    const expected = `(x) => {
  let y = 1;
  return (x + y);
}`;
    expect(decompile(script)).toBe(expected);
  });

  test("function call", () => {
    const script = StdLib.apply(StdLib.var("f"), 1, 2);
    expect(decompile(script)).toBe("f(1, 2)");
  });

  test("loops", () => {
    // while (true) { log("loop") }
    const whileScript = StdLib.while(true, StdLib.log("loop"));
    const expectedWhile = `while (true) {
  console.log("loop");
}`;
    expect(decompile(whileScript, 0, true)).toBe(expectedWhile);

    // for (x of list) { log(x) }
    const forScript = StdLib.for("x", ListLib.listNew(1, 2), StdLib.log(StdLib.var("x")));
    const expectedFor = `for (const x of [1, 2]) {
  console.log(x);
}`;
    expect(decompile(forScript, 0, true)).toBe(expectedFor);
  });

  test("data structures", () => {
    const list = ListLib.listNew(1, 2, 3);
    expect(decompile(list)).toBe("[1, 2, 3]");

    const obj = ObjectLib.objNew(["a", 1], ["b", 2]);
    expect(decompile(obj)).toBe('{ "a": 1, "b": 2 }');

    // obj.get
    expect(decompile(ObjectLib.objGet(StdLib.var("o"), "k"))).toBe("o.k");
    expect(decompile(ObjectLib.objGet(StdLib.var("o"), "invalid-key"))).toBe('o["invalid-key"]');
    expect(decompile(ObjectLib.objGet(StdLib.var("o"), "k", "default"))).toBe('(o.k ?? "default")');

    // obj.set
    expect(decompile(ObjectLib.objSet(StdLib.var("o"), "k", 3))).toBe("o.k = 3");

    // obj.has
    expect(decompile(ObjectLib.objHas(StdLib.var("o"), "k"))).toBe('"k" in o');

    // obj.del
    expect(decompile(ObjectLib.objDel(StdLib.var("o"), "k"))).toBe("delete o.k");
  });
});
