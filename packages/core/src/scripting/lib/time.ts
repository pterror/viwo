import { evaluate, ScriptError } from "../interpreter";
import { defineOpcode, ScriptValue } from "../def";

const timeNow = defineOpcode<[], string>(
  "time.now",
  {
    metadata: {
      label: "Now",
      category: "time",
      description: "Get current time (ISO)",
      slots: [],
    },
    handler: async (args, _ctx) => {
      if (args.length !== 0) {
        throw new ScriptError("time.now: expected 0 arguments");
      }
      return new Date().toISOString();
    },
  }
);
export { timeNow as "time.now" };

const timeFormat = defineOpcode<[ScriptValue<string>, ScriptValue<string>?], string>(
  "time.format",
  {
    metadata: {
      label: "Format Time",
      category: "time",
      description: "Format timestamp",
      slots: [
        { name: "Time", type: "string" },
        { name: "Format", type: "string", default: null }, // Format string not really used yet?
      ],
    },
    handler: async (args, ctx) => {
      if (args.length < 1 || args.length > 2) {
        throw new ScriptError("time.format: expected 1 or 2 arguments");
      }
      const [timestampExpr] = args;
      const timestamp = await evaluate(timestampExpr, ctx);
      if (typeof timestamp !== "string") {
        throw new ScriptError("time.format: expected string for timestamp");
      }
      return new Date(timestamp).toISOString();
    },
  }
);
export { timeFormat as "time.format" };

const timeParse = defineOpcode<[ScriptValue<string>], string>(
  "time.parse",
  {
    metadata: {
      label: "Parse Time",
      category: "time",
      description: "Parse datetime string",
      slots: [{ name: "Time", type: "string" }],
    },
    handler: async (args, ctx) => {
      if (args.length !== 1) {
        throw new ScriptError("time.parse: expected 1 argument");
      }
      const [datetimeExpr] = args;
      const datetime = await evaluate(datetimeExpr, ctx);
      if (typeof datetime !== "string") {
        throw new ScriptError("time.parse: expected string for datetime");
      }
      return new Date(datetime).toISOString();
    },
  }
);
export { timeParse as "time.parse" };

const timeFromTimestamp = defineOpcode<[ScriptValue<number>], string>(
  "time.from_timestamp",
  {
    metadata: {
      label: "From Timestamp",
      category: "time",
      description: "Convert number to ISO",
      slots: [{ name: "Timestamp", type: "number" }],
    },
    handler: async (args, ctx) => {
      if (args.length !== 1) {
        throw new ScriptError("time.from_timestamp: expected 1 argument");
      }
      const [timestampExpr] = args;
      const timestamp = await evaluate(timestampExpr, ctx);
      if (typeof timestamp !== "number") {
        throw new ScriptError(
          "time.from_timestamp: expected number for timestamp",
        );
      }
      return new Date(timestamp).toISOString();
    },
  }
);
export { timeFromTimestamp as "time.from_timestamp" };

const timeToTimestamp = defineOpcode<[ScriptValue<string>], number>(
  "time.to_timestamp",
  {
    metadata: {
      label: "To Timestamp",
      category: "time",
      description: "Convert ISO to number",
      slots: [{ name: "Time", type: "string" }],
    },
    handler: async (args, ctx) => {
      if (args.length !== 1) {
        throw new ScriptError("time.to_timestamp: expected 1 argument");
      }
      const [datetimeExpr] = args;
      const datetime = await evaluate(datetimeExpr, ctx);
      if (typeof datetime !== "string") {
        throw new ScriptError(
          "time.to_timestamp: expected string for datetime",
        );
      }
      return new Date(datetime).getTime();
    },
  }
);
export { timeToTimestamp as "time.to_timestamp" };

const timeOffset = defineOpcode<[ScriptValue<number>, ScriptValue<string>, ScriptValue<string>?], string>(
  "time.offset",
  {
    metadata: {
      label: "Offset Time",
      category: "time",
      description: "Add offset to time",
      slots: [
        { name: "Amount", type: "number" },
        { name: "Unit", type: "string" },
        { name: "Base", type: "string", default: null },
      ],
    },
    handler: async (args, ctx) => {
      if (args.length < 2 || args.length > 3) {
        throw new ScriptError("time.offset: expected 2 or 3 arguments");
      }
      const [amountExpr, unitExpr, baseExpr] = args;
      const amount = await evaluate(amountExpr, ctx);
      if (typeof amount !== "number") {
        throw new ScriptError("time.offset: expected number for amount");
      }
      const unit = await evaluate(unitExpr, ctx);
      if (typeof unit !== "string") {
        throw new ScriptError("time.offset: expected string for unit");
      }
      const base = baseExpr
        ? await evaluate(baseExpr, ctx)
        : new Date().toISOString();
      if (typeof base !== "string") {
        throw new ScriptError("time.offset: expected string for base");
      }

      const date = new Date(base);
      switch (unit) {
        case "year":
        case "years": {
          date.setFullYear(date.getFullYear() + amount);
          break;
        }
        case "month":
        case "months": {
          date.setMonth(date.getMonth() + amount);
          break;
        }
        case "day":
        case "days": {
          date.setDate(date.getDate() + amount);
          break;
        }
        case "hour":
        case "hours": {
          date.setHours(date.getHours() + amount);
          break;
        }
        case "minute":
        case "minutes": {
          date.setMinutes(date.getMinutes() + amount);
          break;
        }
        case "second":
        case "seconds": {
          date.setSeconds(date.getSeconds() + amount);
          break;
        }
        default: {
          throw new ScriptError("time.offset: unknown unit");
        }
      }
      return date.toISOString();
    },
  }
);
export { timeOffset as "time.offset" };
