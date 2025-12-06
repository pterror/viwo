import { expect, beforeEach } from "bun:test";
import {
  evaluate,
  ScriptContext,
  createOpcodeRegistry,
  ScriptError,
  createScriptContext,
} from "../interpreter";
import * as Core from "./std";
import * as Time from "./time";
import { createLibraryTester } from "./test-utils";

createLibraryTester(Time, "Time Library", (test) => {
  const TEST_OPS = createOpcodeRegistry(Core, Time);

  let ctx: ScriptContext;

  beforeEach(() => {
    ctx = createScriptContext({
      caller: { id: 1 } as any,
      this: { id: 2 } as any,
      ops: TEST_OPS,
    });
  });

  test("time.now", () => {
    const ts = evaluate(Time.timeNow(), ctx) as any;
    expect(typeof ts).toBe("string");
    expect(new Date(ts).getTime()).toBeLessThanOrEqual(Date.now());
  });

  test("time.format", () => {
    expect(
      (() => {
        try {
          return evaluate(Time.timeFormat("invalid-date", "time"), ctx);
        } catch (e) {
          return e;
        }
      })(),
    ).toBeInstanceOf(ScriptError);

    const dateStr = "2023-01-01T12:00:00Z";
    expect(typeof evaluate(Time.timeFormat(dateStr, "time"), ctx)).toBe("string");
    expect(typeof evaluate(Time.timeFormat(dateStr, "date"), ctx)).toBe("string");
    expect(typeof evaluate(Time.timeFormat(dateStr, "full"), ctx)).toBe("string");
  });

  test("time.parse", () => {
    const iso = "2023-01-01T12:00:00.000Z";
    expect(evaluate(Time.timeParse(iso), ctx)).toBe(iso);
  });

  test("time.from_timestamp", () => {
    const ts = 1672574400000; // 2023-01-01T12:00:00.000Z
    expect(evaluate(Time.timeFromTimestamp(ts), ctx)).toBe("2023-01-01T12:00:00.000Z");
  });

  test("time.to_timestamp", () => {
    const iso = "2023-01-01T12:00:00.000Z";
    expect(evaluate(Time.timeToTimestamp(iso), ctx)).toBe(1672574400000);
  });

  test("time.offset", () => {
    const base = "2023-01-01T00:00:00.000Z";

    // Years
    let res = evaluate(Time.timeOffset(1, "years", base), ctx) as any;
    expect(new Date(res).getFullYear()).toBe(2024);

    // Months
    res = evaluate(Time.timeOffset(1, "months", base), ctx);
    expect(new Date(res).getMonth()).toBe(1); // Feb

    // Days
    res = evaluate(Time.timeOffset(1, "days", base), ctx);
    expect(new Date(res).getDate()).toBe(2);

    // Hours
    res = evaluate(Time.timeOffset(1, "hours", base), ctx);
    expect(new Date(res).getHours()).not.toBe(new Date(base).getHours());

    // Minutes
    res = evaluate(Time.timeOffset(1, "minutes", base), ctx);
    expect(new Date(res).getMinutes()).not.toBe(new Date(base).getMinutes());

    // Seconds
    res = evaluate(Time.timeOffset(1, "seconds", base), ctx);
    expect(new Date(res).getSeconds()).not.toBe(new Date(base).getSeconds());

    // Default date (now)
    res = evaluate(Time.timeOffset(0, "days"), ctx);
    expect(typeof res).toBe("string");

    // Invalid amount
    res = (() => {
      try {
        // @ts-expect-error
        return evaluate(Time.timeOffset("invalid", "days"), ctx);
      } catch (e) {
        return e as never;
      }
    })();
    expect(res).toBeInstanceOf(ScriptError);
  });
});
