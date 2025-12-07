import * as StdLib from "../lib/std";
import * as TimeLib from "../lib/time";
import {
  type ScriptContext,
  ScriptError,
  createOpcodeRegistry,
  createScriptContext,
  evaluate,
} from "../interpreter";
import { beforeEach, expect } from "bun:test";
import { createLibraryTester } from "./test-utils";

createLibraryTester(TimeLib, "Time Library", (test) => {
  const TEST_OPS = createOpcodeRegistry(StdLib, TimeLib);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      caller: { id: 1 } as any,
      ops: TEST_OPS,
      this: { id: 2 } as any,
    });
  });

  test("time.now", () => {
    const ts = evaluate(TimeLib.timeNow(), ctx) as any;
    expect(typeof ts).toBe("string");
    expect(new Date(ts).getTime()).toBeLessThanOrEqual(Date.now());
  });

  test("time.format", () => {
    expect(
      (() => {
        try {
          return evaluate(TimeLib.timeFormat("invalid-date", "time"), ctx);
        } catch (error) {
          return error;
        }
      })(),
    ).toBeInstanceOf(ScriptError);

    const dateStr = "2023-01-01T12:00:00Z";
    expect(typeof evaluate(TimeLib.timeFormat(dateStr, "time"), ctx)).toBe("string");
    expect(typeof evaluate(TimeLib.timeFormat(dateStr, "date"), ctx)).toBe("string");
    expect(typeof evaluate(TimeLib.timeFormat(dateStr, "full"), ctx)).toBe("string");
  });

  test("time.parse", () => {
    const iso = "2023-01-01T12:00:00.000Z";
    expect(evaluate(TimeLib.timeParse(iso), ctx)).toBe(iso);
  });

  test("time.from_timestamp", () => {
    const ts = 1_672_574_400_000; // 2023-01-01T12:00:00.000Z
    expect(evaluate(TimeLib.timeFromTimestamp(ts), ctx)).toBe("2023-01-01T12:00:00.000Z");
  });

  test("time.to_timestamp", () => {
    const iso = "2023-01-01T12:00:00.000Z";
    expect(evaluate(TimeLib.timeToTimestamp(iso), ctx)).toBe(1_672_574_400_000);
  });

  test("time.offset", () => {
    const base = "2023-01-01T00:00:00.000Z";

    // Years
    let res = evaluate(TimeLib.timeOffset(1, "years", base), ctx) as any;
    expect(new Date(res).getFullYear()).toBe(2024);

    // Months
    res = evaluate(TimeLib.timeOffset(1, "months", base), ctx);
    expect(new Date(res).getMonth()).toBe(1); // Feb

    // Days
    res = evaluate(TimeLib.timeOffset(1, "days", base), ctx);
    expect(new Date(res).getDate()).toBe(2);

    // Hours
    res = evaluate(TimeLib.timeOffset(1, "hours", base), ctx);
    expect(new Date(res).getHours()).not.toBe(new Date(base).getHours());

    // Minutes
    res = evaluate(TimeLib.timeOffset(1, "minutes", base), ctx);
    expect(new Date(res).getMinutes()).not.toBe(new Date(base).getMinutes());

    // Seconds
    res = evaluate(TimeLib.timeOffset(1, "seconds", base), ctx);
    expect(new Date(res).getSeconds()).not.toBe(new Date(base).getSeconds());

    // Default date (now)
    res = evaluate(TimeLib.timeOffset(0, "days"), ctx);
    expect(typeof res).toBe("string");

    // Invalid amount
    res = (() => {
      try {
        // @ts-expect-error We are testing invalid input
        return evaluate(TimeLib.timeOffset("invalid", "days"), ctx);
      } catch (error) {
        return error as never;
      }
    })();
    expect(res).toBeInstanceOf(ScriptError);
  });
});
