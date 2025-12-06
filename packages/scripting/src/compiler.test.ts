import { describe, test, expect } from "bun:test";
import { ScriptContext, createScriptContext, createOpcodeRegistry } from "./interpreter";
import { compile } from "./compiler";
import * as Std from "./lib/std";
import * as ObjectLib from "./lib/object";
import * as List from "./lib/list";
import * as StringLib from "./lib/string";
import * as MathLib from "./lib/math";
import * as BooleanLib from "./lib/boolean";
import { Entity } from "@viwo/shared/jsonrpc";

describe("Compiler", () => {
  const TEST_OPS = createOpcodeRegistry(Std, ObjectLib, List, StringLib, MathLib, BooleanLib);

  const caller: Entity = { id: 1 };
  const target: Entity = { id: 2 };
  target["owner"] = 1;

  const ctx = createScriptContext({ caller, this: target, ops: TEST_OPS });

  function run(script: any, context: ScriptContext = ctx) {
    return compile(script, TEST_OPS)(context);
  }

  test("literals", () => {
    expect(run(1)).toBe(1);
    expect(run("hello")).toBe("hello");
    expect(run(true)).toBe(true);
  });

  test("math", () => {
    expect(run(MathLib.add(1, 2))).toBe(3);
    expect(run(MathLib.sub(5, 3))).toBe(2);
    expect(run(MathLib.mul(2, 3))).toBe(6);
    expect(run(MathLib.div(6, 2))).toBe(3);
  });

  test("math extended", () => {
    expect(run(MathLib.mod(10, 3))).toBe(1);
    expect(run(MathLib.pow(2, 3))).toBe(8);
  });

  test("logic", () => {
    expect(run(BooleanLib.and(true, true))).toBe(true);
    expect(run(BooleanLib.or(true, false))).toBe(true);
    expect(run(BooleanLib.not(true))).toBe(false);
    expect(run(BooleanLib.eq(1, 1))).toBe(true);
    expect(run(BooleanLib.gt(2, 1))).toBe(true);
  });

  test("control flow", () => {
    expect(run(Std.if(true, 1, 2))).toBe(1);
    expect(run(Std.if(false, 1, 2))).toBe(2);

    expect(run(Std.seq(1, 2, 3))).toBe(3);
  });

  test("loops", () => {
    // sum = 0; for x in [1, 2, 3]: sum += x
    const script = Std.seq(
      Std.let("sum", 0),
      Std.for(
        "x",
        List.listNew(1, 2, 3),
        Std.set("sum", MathLib.add(Std.var("sum"), Std.var("x"))),
      ),
      Std.var("sum"),
    );
    expect(run(script)).toBe(6);
  });

  test("errors", () => {
    // Unknown opcode
    try {
      run(["unknown_op"]);
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toContain("Unknown opcode: unknown_op");
    }
  });

  test("comparisons", () => {
    expect(run(BooleanLib.neq(1, 2))).toBe(true);
    expect(run(BooleanLib.lt(1, 2))).toBe(true);
    expect(run(BooleanLib.gte(2, 2))).toBe(true);
    expect(run(BooleanLib.lte(2, 2))).toBe(true);
  });

  test("if else", () => {
    expect(run(Std.if(false, "then", "else"))).toBe("else");
    expect(run(Std.if(false, "then"))).toBe(null); // No else branch
  });

  test("lambda & apply", () => {
    // (lambda (x) (+ x 1))
    const inc = Std.lambda(["x"], MathLib.add(Std.var("x"), 1));
    expect(run(Std.apply(inc, 1))).toBe(2);
  });

  test("closure capture", () => {
    // (let x 10); (let addX (lambda (y) (+ x y))); (apply addX 5) -> 15
    expect(
      run(
        Std.seq(
          Std.let("x", 10),
          Std.let("addX", Std.lambda(["y"], MathLib.add(Std.var("x"), Std.var("y")))),
          Std.apply(Std.var("addX"), 5),
        ),
      ),
    ).toBe(15);
  });

  test("closure reference capture", () => {
    // (let x 1); (let f (lambda [] x)); (set x 2); (apply f) -> 2
    expect(
      run(
        Std.seq(
          Std.let("x", 1),
          Std.let("f", Std.lambda([], Std.var("x"))),
          Std.set("x", 2),
          Std.apply(Std.var("f")),
        ),
      ),
    ).toBe(2);
  });

  test("try/catch", () => {
    // try { throw "error" } catch { return "caught" }
    const script = Std.try(Std.throw("oops"), "_err", "caught");
    expect(run(script)).toBe("caught");
  });

  test("try/catch with error variable", () => {
    // try { throw "error" } catch(e) { return e }
    const script = Std.try(Std.throw("oops"), "err", Std.var("err"));
    expect(run(script)).toBe("oops");
  });

  test("object operations", () => {
    const script = Std.seq(
      Std.let("o", ObjectLib.objNew(["a", 1], ["b", 2])),
      ObjectLib.objSet(Std.var("o"), "c", 3),
      Std.let("res", ObjectLib.objGet(Std.var("o"), "c")),
      Std.let("hasB", ObjectLib.objHas(Std.var("o"), "b")),
      ObjectLib.objDel(Std.var("o"), "b"),
      Std.let("hasBAfter", ObjectLib.objHas(Std.var("o"), "b")),
      List.listNew(Std.var("res"), Std.var("hasB"), Std.var("hasBAfter")),
    );

    const res = run(script);
    expect(res[0]).toBe(3);
    expect(res[1]).toBe(true);
    expect(res[2]).toBe(false);
  });

  test("break in loop", () => {
    // sum = 0; for x in [1, 2, 3, 4, 5]: if (x > 3) break; sum += x
    const script = Std.seq(
      Std.let("sum", 0),
      Std.for(
        "x",
        List.listNew(1, 2, 3, 4, 5),
        Std.seq(
          Std.if(BooleanLib.gt(Std.var("x"), 3), Std.break()),
          Std.set("sum", MathLib.add(Std.var("sum"), Std.var("x"))),
        ),
      ),
      Std.var("sum"),
    );
    expect(run(script)).toBe(6);
  });

  test("return from lambda", () => {
    // (let f (lambda [] (return "early") "late")) (apply f) -> "early"
    const script = Std.seq(
      Std.let("f", Std.lambda([], Std.seq(Std.return("early"), "late"))),
      Std.apply(Std.var("f")),
    );
    expect(run(script)).toBe("early");
  });

  test("nested loops break", () => {
    // outer loop breaks inner loop? No, break only breaks innermost loop.
    // We don't have labeled break yet.
    // for i in [1, 2]: for j in [1, 2]: if j==2 break; sum += j
    // i=1: j=1 (sum+=1), j=2 (break)
    // i=2: j=1 (sum+=1), j=2 (break)
    // sum = 2
    const script = Std.seq(
      Std.let("sum", 0),
      Std.for(
        "i",
        List.listNew(1, 2),
        Std.for(
          "j",
          List.listNew(1, 2),
          Std.seq(
            Std.if(BooleanLib.eq(Std.var("j"), 2), Std.break()),
            Std.set("sum", MathLib.add(Std.var("sum"), Std.var("j"))),
          ),
        ),
      ),
      Std.var("sum"),
    );
    expect(run(script)).toBe(2);
  });

  test("list.find", () => {
    // find element > 2: [1, 2, 3, 4] -> 3
    const script = List.listFind(
      List.listNew(1, 2, 3, 4),
      Std.lambda(["x"], BooleanLib.gt(Std.var("x"), 2)),
    );
    expect(run(script)).toBe(3);
  });

  test("list.map", () => {
    // map x -> x * 2: [1, 2, 3] -> [2, 4, 6]
    const script = List.listMap(
      List.listNew(1, 2, 3),
      Std.lambda(["x"], MathLib.mul(Std.var("x"), 2)),
    );
    expect(run(script)).toEqual([2, 4, 6]);
  });

  test("list.filter", () => {
    // filter x > 1: [1, 2, 3] -> [2, 3]
    const script = List.listFilter(
      List.listNew(1, 2, 3),
      Std.lambda(["x"], BooleanLib.gt(Std.var("x"), 1)),
    );
    expect(run(script)).toEqual([2, 3]);
  });

  test("list.reduce", () => {
    // reduce (acc, x) -> acc + x, 0: [1, 2, 3] -> 6
    const script = List.listReduce(
      List.listNew(1, 2, 3),
      Std.lambda(["acc", "x"], MathLib.add(Std.var("acc"), Std.var("x"))),
      0,
    );
    expect(run(script)).toBe(6);
  });

  test("list.flatMap", () => {
    // flatMap x -> [x, x]: [1, 2] -> [1, 1, 2, 2]
    const script = List.listFlatMap(
      List.listNew(1, 2),
      Std.lambda(["x"], List.listNew(Std.var("x"), Std.var("x"))),
    );
    expect(run(script)).toEqual([1, 1, 2, 2]);
  });

  test("random", () => {
    // Check that random returns a number
    const r1 = run(MathLib.random()); // 0-1
    expect(typeof r1).toBe("number");
    expect(r1).toBeGreaterThanOrEqual(0);
    expect(r1).toBeLessThan(1);

    // random(max)
    const r2 = run(MathLib.random(10)); // 0-10 int
    expect(typeof r2).toBe("number");
    expect(Number.isInteger(r2)).toBe(true);
    expect(r2).toBeGreaterThanOrEqual(0);
    expect(r2).toBeLessThanOrEqual(10);

    // random(min, max)
    const r3 = run(MathLib.random(5, 10)); // 5-10 int
    expect(typeof r3).toBe("number");
    expect(Number.isInteger(r3)).toBe(true);
    expect(r3).toBeGreaterThanOrEqual(5);
    expect(r3).toBeLessThanOrEqual(10);
  });

  test("obj.map", () => {
    // map {a: 1, b: 2} x -> x * 2 -> {a: 2, b: 4}
    const script = ObjectLib.objMap(
      ObjectLib.objNew(["a", 1], ["b", 2]),
      Std.lambda(["v", "k"], MathLib.mul(Std.var("v"), 2)),
    );
    expect(run(script)).toEqual({ a: 2, b: 4 });
  });

  test("obj.filter", () => {
    // filter {a: 1, b: 2} v > 1 -> {b: 2}
    const script = ObjectLib.objFilter(
      ObjectLib.objNew(["a", 1], ["b", 2]),
      Std.lambda(["v", "k"], BooleanLib.gt(Std.var("v"), 1)),
    );
    expect(run(script)).toEqual({ b: 2 });
  });

  test("obj.reduce", () => {
    // reduce {a: 1, b: 2} (acc, v) -> acc + v, 0 -> 3
    const script = ObjectLib.objReduce(
      ObjectLib.objNew(["a", 1], ["b", 2]),
      Std.lambda(["acc", "v"], MathLib.add(Std.var("acc"), Std.var("v"))),
      0,
    );
    expect(run(script)).toBe(3);
  });

  test("obj.flatMap", () => {
    // flatMap {a: 1} v -> { [k]: v*2 } -> {a: 2}
    // Actually flatMap calls lambda(v, k) which returns an object to merge.
    // lambda(v, k) -> objNew(k, v*2)
    const script = ObjectLib.objFlatMap(
      ObjectLib.objNew(["a", 1]),
      Std.lambda(["v", "k"], ObjectLib.objNew([Std.var("k"), MathLib.mul(Std.var("v"), 2)])),
    );
    expect(run(script)).toEqual({ a: 2 });
  });

  test("typeof", () => {
    // typeof(1) -> "number"
    // We need to construct the op manually as it might not be in a lib file helper?
    // Let's assume there is no BooleanLib.typeof helper yet (it was missing from compiler, implies likely missing from library definitions verification?)
    // Wait, \`typeof\` is likely an operator, usually in \`std\` or \`boolean\` or \`type\` lib.
    // The check script found it in \`src/lib/*.ts\` definitions.
    // I should check where \`typeof\` is defined. It's likely in \`std.ts\` or \`core.ts\`?
    // For now, I'll use the manual op construction: ["typeof", 1]
    expect(run(["typeof", 1])).toBe("number");
    expect(run(["typeof", "s"])).toBe("string");
    expect(run(["typeof", true])).toBe("boolean");
    expect(run(["typeof", List.listNew()])).toBe("array");
    expect(run(["typeof", null])).toBe("null");
    expect(run(["typeof", ObjectLib.objNew()])).toBe("object");
  });

  test("json", () => {
    const obj = ObjectLib.objNew(["a", 1]);
    const str = run(["json.stringify", obj]);
    expect(str).toBe('{"a":1}');

    const parsed = run(["json.parse", str]);
    expect(parsed).toEqual({ a: 1 });

    // Invalid json
    expect(run(["json.parse", "{invalid"])).toBe(null);
  });
});
