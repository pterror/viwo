import * as BooleanLib from "./lib/boolean";
import * as ListLib from "./lib/list";
import * as MathLib from "./lib/math";
import * as ObjectLib from "./lib/object";
import * as RandomLib from "./lib/random";
import * as StdLib from "./lib/std";
import { describe, expect, test } from "bun:test";
import { decompile } from "./decompiler";
import { transpile } from "./transpiler";

describe("transpiler", () => {
  test("literals", () => {
    expect(transpile("1")).toBe(1);
    expect(transpile("'hello'")).toBe("hello");
    expect(transpile("true")).toBe(true);
    expect(transpile("false")).toBe(false);
    expect(transpile("null")).toBe(null);
  });

  test("variables", () => {
    expect(transpile("x")).toEqual(StdLib.var("x"));
    expect(transpile("let x = 1")).toEqual(StdLib.let("x", 1));
    expect(transpile("x = 2")).toEqual(StdLib.set("x", 2));
  });

  test("binary ops", () => {
    expect(transpile("1 + 2")).toEqual(MathLib.add(1, 2));
    expect(transpile("1 - 2")).toEqual(MathLib.sub(1, 2));
    expect(transpile("1 * 2")).toEqual(MathLib.mul(1, 2));
    expect(transpile("1 / 2")).toEqual(MathLib.div(1, 2));
    expect(transpile("1 % 2")).toEqual(MathLib.mod(1, 2));
    expect(transpile("1 == 2")).toEqual(BooleanLib.eq(1, 2));
    expect(transpile("1 != 2")).toEqual(BooleanLib.neq(1, 2));
    expect(transpile("1 < 2")).toEqual(BooleanLib.lt(1, 2));
    expect(transpile("1 > 2")).toEqual(BooleanLib.gt(1, 2));
    expect(transpile("1 <= 2")).toEqual(BooleanLib.lte(1, 2));
    expect(transpile("1 >= 2")).toEqual(BooleanLib.gte(1, 2));
    expect(transpile("true && false")).toEqual(BooleanLib.and(true, false));
    expect(transpile("true || false")).toEqual(BooleanLib.or(true, false));
    expect(transpile("'a' in obj")).toEqual(ObjectLib.objHas(StdLib.var("obj"), "a"));
    expect(transpile("2 ** 3")).toEqual(MathLib.pow(2, 3));
  });

  test("nested binary ops", () => {
    expect(transpile("1 + 2 * 3")).toEqual(MathLib.add(1, MathLib.mul(2, 3)));
    expect(transpile("(1 + 2) * 3")).toEqual(MathLib.mul(MathLib.add(1, 2), 3));
    expect(transpile("1 * 2 + 3")).toEqual(MathLib.add(MathLib.mul(1, 2), 3));
    expect(transpile("1 + 2 + 3")).toEqual(MathLib.add(MathLib.add(1, 2), 3));
  });

  test("unary ops", () => {
    expect(transpile("!true")).toEqual(BooleanLib.not(true));
  });

  test("arrays", () => {
    expect(transpile("[1, 2]")).toEqual(ListLib.listNew(1, 2));
  });

  test("objects", () => {
    expect(transpile("({ a: 1, b: 2 })")).toEqual(ObjectLib.objNew(["a", 1], ["b", 2]));
    expect(transpile("({ 'a': 1 })")).toEqual(ObjectLib.objNew(["a", 1]));
    expect(transpile("delete obj.x")).toEqual(ObjectLib.objDel(StdLib.var("obj"), "x"));
    expect(transpile("delete obj['x']")).toEqual(ObjectLib.objDel(StdLib.var("obj"), "x"));
  });

  test("property access", () => {
    expect(transpile("obj.x")).toEqual(ObjectLib.objGet(StdLib.var("obj"), "x"));
    expect(transpile("obj['x']")).toEqual(ObjectLib.objGet(StdLib.var("obj"), "x"));
    expect(transpile("arr[0]")).toEqual(ListLib.listGet(StdLib.var("arr"), 0));
    expect(transpile("arr[1]")).toEqual(ListLib.listGet(StdLib.var("arr"), 1));
  });

  test("property assignment", () => {
    expect(transpile("obj.x = 1")).toEqual(ObjectLib.objSet(StdLib.var("obj"), "x", 1));
  });

  test("function calls", () => {
    expect(transpile("f(x)")).toEqual(["f", StdLib.var("x")]);
    expect(transpile("std.log('msg')")).toEqual(StdLib.log("msg"));
    expect(transpile("throw('err')")).toEqual(StdLib.throw("err"));
    expect(transpile("obj.get(o, 'k')")).toEqual(ObjectLib.objGet(StdLib.var("o"), "k"));
    expect(transpile("list.push(l, 1)")).toEqual(ListLib.listPush(StdLib.var("l"), 1));
    // Sanitization test (mocking if_ usage if possible, or just checking logic)
    // Since we can't easily import type_generator output here, we assume user writes if_
    // But 'if' is a keyword, so we can't write `if(...)` as a call in TS source unless it's valid TS.
    // `if_` is valid TS identifier.
    // We need to ensure OPS has 'if'. It does.
    // expect(transpile("if_(c, t, e)")).toEqual(Std.if(Std.var("c"), Std.var("t"), Std.var("e")));
    // Actually Std.if returns ["if", ...].
  });

  test("shadowing opcodes", () => {
    const code = `
      let send = (msg) => { return msg; };
      send("hello");
    `;
    const expected = StdLib.seq(
      StdLib.let("send", StdLib.lambda(["msg"], StdLib.seq(StdLib.var("msg")))),
      StdLib.apply(StdLib.var("send"), "hello"),
    );
    expect(transpile(code)).toEqual(expected);
  });

  test("declare statements", () => {
    const code = `
      declare var log;
      log("hello");
    `;
    // Should be treated as opcode call because log is not in scope (declare ignored)
    expect(transpile(code)).toEqual(["log", "hello"]);
    const code2 = `
      declare namespace MyLib {
        function foo(x);
      }
      MyLib.foo(1);
    `;
    // Should be treated as opcode call ["MyLib.foo", 1]
    expect(transpile(code2)).toEqual(["MyLib.foo", 1]);
  });

  test("declare namespace", () => {
    const code = `
      declare namespace MyLib {
        function foo(x);
      }
      MyLib.foo(1);
    `;
    // Should be treated as opcode call ["MyLib.foo", 1]
    expect(transpile(code)).toEqual(["MyLib.foo", 1]);
  });

  test("function declarations", () => {
    const code = `
      function inc(x) { return x + 1; }
      inc(1);
    `;
    const expected = StdLib.seq(
      StdLib.let("inc", StdLib.lambda(["x"], StdLib.seq(MathLib.add(StdLib.var("x"), 1)))),
      StdLib.apply(StdLib.var("inc"), 1),
    );
    expect(transpile(code)).toEqual(expected);
  });

  test("lambdas", () => {
    expect(transpile("(x) => x + 1")).toEqual(
      StdLib.lambda(["x"], MathLib.add(StdLib.var("x"), 1)),
    );
    expect(transpile("(x) => { return x + 1; }")).toEqual(
      StdLib.lambda(["x"], StdLib.seq(MathLib.add(StdLib.var("x"), 1))),
    );
  });

  test("control flow", () => {
    expect(transpile("true ? 1 : 2")).toEqual(StdLib.if(true, 1, 2));
    expect(transpile("if (true) 1 else 2")).toEqual(StdLib.if(true, 1, 2));
    expect(transpile("if (true) { 1; }")).toEqual(StdLib.if(true, StdLib.seq(1)));
    expect(transpile("while (true) { 1; }")).toEqual(StdLib.while(true, StdLib.seq(1)));
    expect(transpile("for (const x of list) { x; }")).toEqual(
      StdLib.for("x", StdLib.var("list"), StdLib.seq(StdLib.var("x"))),
    );
    expect(transpile("for (const k in obj) { k; }")).toEqual(
      StdLib.for("k", ObjectLib.objKeys(StdLib.var("obj")), StdLib.seq(StdLib.var("k"))),
    );
    expect(transpile("for (let i = 0; i < 10; i++) { i; }")).toEqual(
      StdLib.seq(
        StdLib.let("i", 0),
        StdLib.while(
          BooleanLib.lt(StdLib.var("i"), 10),
          StdLib.seq(StdLib.seq(StdLib.var("i")), StdLib.set("i", MathLib.add(StdLib.var("i"), 1))),
        ),
      ),
    );
    expect(transpile("for (let i = 10; i > 0; i--) { i; }")).toEqual(
      StdLib.seq(
        StdLib.let("i", 10),
        StdLib.while(
          BooleanLib.gt(StdLib.var("i"), 0),
          StdLib.seq(StdLib.seq(StdLib.var("i")), StdLib.set("i", MathLib.sub(StdLib.var("i"), 1))),
        ),
      ),
    );
    expect(transpile("try { 1; } catch (e) { 2; }")).toEqual(
      StdLib.try(StdLib.seq(1), "e", StdLib.seq(2)),
    );
    expect(transpile("while (true) { break; }")).toEqual(
      StdLib.while(true, StdLib.seq(StdLib.break())),
    );
    expect(transpile("for (const x of list) { if (x) break; }")).toEqual(
      StdLib.for("x", StdLib.var("list"), StdLib.seq(StdLib.if(StdLib.var("x"), StdLib.break()))),
    );
  });

  test("sequence", () => {
    expect(transpile("1; 2;")).toEqual(StdLib.seq(1, 2));
  });

  test("round trip", () => {
    const script = StdLib.seq(StdLib.let("x", 1), StdLib.var("x"));
    const code = decompile(script, 0, true);
    const transpiled = transpile(code);
    expect(transpiled).toEqual(script);
  });
  test("compound assignment", () => {
    expect(transpile("x += 1")).toEqual(StdLib.set("x", MathLib.add(StdLib.var("x"), 1)));
    expect(transpile("x -= 1")).toEqual(StdLib.set("x", MathLib.sub(StdLib.var("x"), 1)));
    expect(transpile("x *= 2")).toEqual(StdLib.set("x", MathLib.mul(StdLib.var("x"), 2)));
    expect(transpile("x /= 2")).toEqual(StdLib.set("x", MathLib.div(StdLib.var("x"), 2)));
    expect(transpile("x %= 2")).toEqual(StdLib.set("x", MathLib.mod(StdLib.var("x"), 2)));
    expect(transpile("x **= 2")).toEqual(StdLib.set("x", MathLib.pow(StdLib.var("x"), 2)));

    expect(transpile("x &&= y")).toEqual(
      StdLib.if(StdLib.var("x"), StdLib.set("x", StdLib.var("y")), StdLib.var("x")),
    );
    expect(transpile("x ||= y")).toEqual(
      StdLib.if(StdLib.var("x"), StdLib.var("x"), StdLib.set("x", StdLib.var("y"))),
    );
    expect(transpile("x ??= y")).toEqual(
      StdLib.if(
        BooleanLib.neq(StdLib.var("x"), null),
        StdLib.var("x"),
        StdLib.set("x", StdLib.var("y")),
      ),
    );
  });

  test("compound assignment objects", () => {
    expect(transpile("o.p += 1")).toEqual(
      ObjectLib.objSet(
        StdLib.var("o"),
        "p",
        MathLib.add(ObjectLib.objGet(StdLib.var("o"), "p"), 1),
      ),
    );
  });

  test("typescript features", () => {
    // Type assertions
    expect(transpile("x as number")).toEqual(StdLib.var("x"));
    expect(transpile("<number>x")).toEqual(StdLib.var("x"));
    expect(transpile("x as any as number")).toEqual(StdLib.var("x"));

    // Non-null assertions
    expect(transpile("x!")).toEqual(StdLib.var("x"));
    expect(transpile("x!!.y")).toEqual(ObjectLib.objGet(StdLib.var("x"), "y"));

    // Generics in function calls
    expect(transpile("f<T>(x)")).toEqual(["f", StdLib.var("x")]);
    expect(transpile("f<T, U>(x)")).toEqual(["f", StdLib.var("x")]);

    // Generics in function declarations
    const funcDecl = `
      function id<T>(x: T): T { return x; }
      id<number>(1);
    `;
    const funcExpected = StdLib.seq(
      StdLib.let("id", StdLib.lambda(["x"], StdLib.seq(StdLib.var("x")))),
      StdLib.apply(StdLib.var("id"), 1),
    );
    expect(transpile(funcDecl)).toEqual(funcExpected);
  });

  test("random patterns", () => {
    expect(transpile("Math.random()")).toEqual(RandomLib.number());
    expect(transpile("Math.floor(Math.random() * 10)")).toEqual(RandomLib.between(0, 9));
    expect(transpile("Math.floor(Math.random() * 11) + 10")).toEqual(RandomLib.between(10, 20));
    // list[Math.floor(Math.random() * list.length)]
    // We need list to vary, so let's use a variable
    expect(transpile("list[Math.floor(Math.random() * list.length)]")).toEqual(
      RandomLib.choice(StdLib.var("list")),
    );
  });
});
