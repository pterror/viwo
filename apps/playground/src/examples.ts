import { BooleanLib, MathLib, type ScriptExpression, StdLib } from "@viwo/scripting";

const HelloWorld = StdLib.seq(StdLib.log("Hello World"));

const Counter = StdLib.seq(
  StdLib.let("i", 0),
  StdLib.while(
    BooleanLib.lt(StdLib.var("i"), 5),
    StdLib.seq(StdLib.log(StdLib.var("i")), StdLib.set("i", MathLib.add(StdLib.var("i"), 1))),
  ),
);

const Fibonacci = StdLib.seq(
  StdLib.let("a", 0),
  StdLib.let("b", 1),
  StdLib.log(StdLib.var("a")),
  StdLib.log(StdLib.var("b")),
  StdLib.let("count", 0),
  StdLib.while(
    BooleanLib.lt(StdLib.var("count"), 8),
    StdLib.seq(
      StdLib.let("temp", MathLib.add(StdLib.var("a"), StdLib.var("b"))),
      StdLib.log(StdLib.var("temp")),
      StdLib.set("a", StdLib.var("b")),
      StdLib.set("b", StdLib.var("temp")),
      StdLib.set("count", MathLib.add(StdLib.var("count"), 1)),
    ),
  ),
);

export const examples: Record<string, ScriptExpression<unknown[], any>> = {
  Counter: Counter,
  Fibonacci: Fibonacci,
  "Hello World": HelloWorld,
};
