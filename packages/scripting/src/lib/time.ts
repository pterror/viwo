import { defineFullOpcode } from "../types";

/** Returns the current time as an ISO 8601 string. */
export const timeNow = defineFullOpcode<[], string>("time.now", {
  handler: (_args, _ctx) => new Date().toISOString(),
  metadata: {
    category: "time",
    description: "Returns the current time as an ISO 8601 string.",
    label: "Now",
    parameters: [],
    returnType: "string",
    slots: [],
  },
});

/** Formats a timestamp string. */
export const timeFormat = defineFullOpcode<[string, string?], string>("time.format", {
  handler: ([timestamp], _ctx) => new Date(timestamp).toISOString(),
  metadata: {
    category: "time",
    description: "Formats a timestamp string.",
    label: "Format Time",
    parameters: [
      { description: "The timestamp to format.", name: "time", type: "string" },
      {
        description: "The format string (currently unused).",
        name: "format",
        optional: true,
        type: "string",
      },
    ],
    returnType: "string",
    slots: [
      { name: "Time", type: "string" },
      { default: null, name: "Format", type: "string" }, // Format string not really used yet?
    ],
  },
});

/** Parses a datetime string and returns it in ISO 8601 format. */
export const timeParse = defineFullOpcode<[string], string>("time.parse", {
  handler: ([datetime], _ctx) => new Date(datetime).toISOString(),
  metadata: {
    category: "time",
    description: "Parses a datetime string and returns it in ISO 8601 format.",
    label: "Add Time",
    parameters: [
      {
        description: "The datetime string to parse.",
        name: "time",
        optional: false,
        type: "string",
      },
    ],
    returnType: "string",
    slots: [{ name: "Time", type: "string" }],
  },
});

/** Converts a numeric timestamp (ms since epoch) to an ISO 8601 string. */
export const timeFromTimestamp = defineFullOpcode<[number], string>("time.from_timestamp", {
  handler: ([timestamp], _ctx) => new Date(timestamp).toISOString(),
  metadata: {
    category: "time",
    description: "Converts a numeric timestamp (ms since epoch) to an ISO 8601 string.",
    label: "From Timestamp",
    parameters: [
      {
        description: "The timestamp in milliseconds.",
        name: "timestamp",
        optional: false,
        type: "number",
      },
    ],
    returnType: "string",
    slots: [{ name: "Timestamp", type: "number" }],
  },
});

/** Converts an ISO 8601 string to a numeric timestamp (ms since epoch). */
export const timeToTimestamp = defineFullOpcode<[string], number>("time.to_timestamp", {
  handler: ([datetime], _ctx) => new Date(datetime).getTime(),
  metadata: {
    category: "time",
    description: "Converts an ISO 8601 string to a numeric timestamp (ms since epoch).",
    label: "Time Difference",
    parameters: [{ description: "The ISO 8601 string.", name: "time", type: "string" }],
    returnType: "number",
    slots: [{ name: "Time", type: "string" }],
  },
});

/** Adds an offset to a timestamp. */
export const timeOffset = defineFullOpcode<
  [
    number,
    (
      | "day"
      | "days"
      | "hour"
      | "hours"
      | "minute"
      | "minutes"
      | "month"
      | "months"
      | "second"
      | "seconds"
      | "year"
      | "years"
    ),
    string?,
  ],
  string
>("time.offset", {
  handler: ([amount, unit, baseExpr], _ctx) => {
    const base = baseExpr !== undefined ? baseExpr : new Date().toISOString();

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
        // This might still be needed if the type check is only "string" and not the specific enum
        throw new Error("time.offset: unknown unit");
      }
    }
    return date.toISOString();
  },
  metadata: {
    category: "time",
    description: "Adds an offset to a timestamp.",
    label: "Offset Time",
    parameters: [
      { description: "The amount to add.", name: "amount", type: "number" },
      {
        description: "The unit of time (e.g., 'days', 'hours').",
        name: "unit",
        optional: false,
        type: "string",
      },
      {
        description: "The base timestamp (defaults to now).",
        name: "base",
        optional: true,
        type: "string",
      },
    ],
    returnType: "string",
    slots: [
      { name: "Amount", type: "number" },
      { name: "Unit", type: "string" },
      { default: null, name: "Base", type: "string" },
    ],
  },
});
