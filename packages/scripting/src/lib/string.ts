import { defineOpcode as StringLib } from "../def";

/** Returns the length of a string. */
export const strLen = StringLib<[string], number>("str.len", {
  metadata: {
    label: "Length",
    category: "string",
    description: "Get string length",
    slots: [{ name: "String", type: "string" }],
    parameters: [{ name: "string", type: "string" }],
    returnType: "number",
  },
  handler: ([str], _ctx) => {
    return str.length;
  },
});

/** Concatenates multiple strings into one. */
export const strConcat = StringLib<
  (string | number | boolean | null)[],
  string
>("str.concat", {
  metadata: {
    label: "Concat",
    category: "string",
    description: "Concatenate strings",
    slots: [{ name: "Strings", type: "block" }], // Variadic?
    parameters: [{ name: "...strings", type: "any[]" }],
    returnType: "string",
  },
  handler: (args, _ctx) => {
    const strings: string[] = [];
    for (const arg of args) {
      strings.push(String(arg));
    }
    return strings.join("");
  },
});

/** Splits a string into an array of substrings using a separator. */
export const strSplit = StringLib<[string, string], string[]>("str.split", {
  metadata: {
    label: "Split",
    category: "string",
    description: "Split string by separator",
    slots: [
      { name: "String", type: "string" },
      { name: "Separator", type: "string" },
    ],
    parameters: [
      { name: "string", type: "string" },
      { name: "separator", type: "string" },
    ],
    returnType: "string[]",
  },
  handler: ([str, sep], _ctx) => {
    return str.split(sep);
  },
});

/** Extracts a section of a string and returns it as a new string. */
export const strSlice = StringLib<[string, number, number?], string>(
  "str.slice",
  {
    metadata: {
      label: "Slice",
      category: "string",
      description: "Extract part of string",
      slots: [
        { name: "String", type: "string" },
        { name: "Start", type: "number" },
        { name: "End", type: "number", default: null },
      ],
      parameters: [
        { name: "string", type: "string" },
        { name: "start", type: "number" },
        { name: "end", type: "number", optional: true },
      ],
      returnType: "string",
    },
    handler: ([str, start, endExpr], _ctx) => {
      const end = endExpr !== undefined ? endExpr : str.length;
      return str.slice(start, end);
    },
  },
);

/** Converts a string to uppercase. */
export const strUpper = StringLib<[string], string>("str.upper", {
  metadata: {
    label: "To Upper",
    category: "string",
    description: "Convert to uppercase",
    slots: [{ name: "String", type: "string" }],
    parameters: [{ name: "string", type: "string" }],
    returnType: "string",
  },
  handler: ([str], _ctx) => {
    return str.toUpperCase();
  },
});

/** Converts a string to lowercase. */
export const strLower = StringLib<[string], string>("str.lower", {
  metadata: {
    label: "To Lower",
    category: "string",
    description: "Convert to lowercase",
    slots: [{ name: "String", type: "string" }],
    parameters: [{ name: "string", type: "string" }],
    returnType: "string",
  },
  handler: ([str], _ctx) => {
    return str.toLowerCase();
  },
});

/** Removes whitespace from both ends of a string. */
export const strTrim = StringLib<[string], string>("str.trim", {
  metadata: {
    label: "Trim",
    category: "string",
    description: "Trim whitespace",
    slots: [{ name: "String", type: "string" }],
    parameters: [{ name: "string", type: "string" }],
    returnType: "string",
  },
  handler: ([str], _ctx) => {
    return str.trim();
  },
});

/** Replaces occurrences of a substring with another string. */
export const strReplace = StringLib<[string, string, string], string>(
  "str.replace",
  {
    metadata: {
      label: "Replace",
      category: "string",
      description: "Replace substring",
      slots: [
        { name: "String", type: "string" },
        { name: "Search", type: "string" },
        { name: "Replace", type: "string" },
      ],
      parameters: [
        { name: "string", type: "string" },
        { name: "search", type: "string" },
        { name: "replace", type: "string" },
      ],
      returnType: "string",
    },
    handler: ([str, search, replace], _ctx) => {
      return str.replace(search, replace);
    },
  },
);

/** Checks if a string contains another string. */
export const strIncludes = StringLib<[string, string], boolean>(
  "str.includes",
  {
    metadata: {
      label: "Includes",
      category: "string",
      description: "Check if string includes substring",
      slots: [
        { name: "String", type: "string" },
        { name: "Search", type: "string" },
      ],
      parameters: [
        { name: "string", type: "string" },
        { name: "search", type: "string" },
      ],
      returnType: "boolean",
    },
    handler: ([str, search], _ctx) => {
      return str.includes(search);
    },
  },
);

/** Joins elements of a list into a string using a separator. */
export const strJoin = StringLib<[any[], string], string>("str.join", {
  metadata: {
    label: "Join",
    category: "string",
    description: "Join list elements with separator",
    slots: [
      { name: "List", type: "block" },
      { name: "Separator", type: "string" },
    ],
    parameters: [
      { name: "list", type: "any[]" },
      { name: "separator", type: "string" },
    ],
    returnType: "string",
  },
  handler: ([list, separator], _ctx) => {
    return list.join(separator);
  },
});
