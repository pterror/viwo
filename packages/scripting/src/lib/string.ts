import { defineFullOpcode } from "../types";

/** Returns the length of a string. */
export const strLen = defineFullOpcode<[string], number>("str.len", {
  handler: ([str], _ctx) => str.length,
  metadata: {
    category: "string",
    description: "Returns the length of a string.",
    label: "Length",
    parameters: [
      {
        description: "The string to measure.",
        name: "string",
        type: "string",
      },
    ],
    returnType: "number",
    slots: [{ name: "String", type: "string" }],
  },
});

/** Concatenates multiple strings into one. */
export const strConcat = defineFullOpcode<(string | number | boolean | null)[], string>(
  "str.concat",
  {
    handler: (args, _ctx) => {
      const strings: string[] = [];
      for (const arg of args) {
        strings.push(String(arg));
      }
      return strings.join("");
    },
    metadata: {
      category: "string",
      description: "Concatenates multiple strings into one.",
      label: "Concat",
      parameters: [
        { description: "The strings to concatenate.", name: "...strings", type: "any[]" },
      ],
      returnType: "string",
      slots: [{ name: "Strings", type: "block" }], // Variadic?
    },
  },
);

/** Splits a string into an array of substrings using a separator. */
export const strSplit = defineFullOpcode<[string, string], string[]>("str.split", {
  handler: ([str, sep], _ctx) => str.split(sep),
  metadata: {
    category: "string",
    description: "Splits a string into an array of substrings using a separator.",
    label: "Split",
    parameters: [
      { description: "The string to split.", name: "string", type: "string" },
      {
        description: "The separator to split by.",
        name: "separator",
        optional: false,
        type: "string",
      },
    ],
    returnType: "string[]",
    slots: [
      { name: "String", type: "string" },
      { name: "Separator", type: "string" },
    ],
  },
});

/** Extracts a section of a string and returns it as a new string. */
export const strSlice = defineFullOpcode<[string, number, number?], string>("str.slice", {
  handler: ([str, start, endExpr], _ctx) => {
    const end = endExpr !== undefined ? endExpr : str.length;
    return str.slice(start, end);
  },
  metadata: {
    category: "string",
    description: "Extracts a section of a string and returns it as a new string.",
    label: "Slice",
    parameters: [
      { description: "The string to slice.", name: "string", type: "string" },
      { description: "The start index.", name: "start", type: "number" },
      { description: "The end index (exclusive).", name: "end", optional: true, type: "number" },
    ],
    returnType: "string",
    slots: [
      { name: "String", type: "string" },
      { name: "Start", type: "number" },
      { default: null, name: "End", type: "number" },
    ],
  },
});

/** Converts a string to uppercase. */
export const strUpper = defineFullOpcode<[string], string>("str.upper", {
  handler: ([str], _ctx) => str.toUpperCase(),
  metadata: {
    category: "string",
    description: "Converts a string to uppercase.",
    label: "To Upper Case",
    parameters: [{ description: "The string to convert.", name: "string", type: "string" }],
    returnType: "string",
    slots: [{ name: "String", type: "string" }],
  },
});

/** Converts a string to lowercase. */
export const strLower = defineFullOpcode<[string], string>("str.lower", {
  handler: ([str], _ctx) => str.toLowerCase(),
  metadata: {
    category: "string",
    description: "Converts a string to lowercase.",
    label: "To Lower Case",
    parameters: [{ description: "The string to convert.", name: "string", type: "string" }],
    returnType: "string",
    slots: [{ name: "String", type: "string" }],
  },
});

/** Removes whitespace from both ends of a string. */
export const strTrim = defineFullOpcode<[string], string>("str.trim", {
  handler: ([str], _ctx) => str.trim(),
  metadata: {
    category: "string",
    description: "Removes whitespace from both ends of a string.",
    label: "Trim",
    parameters: [{ description: "The string to trim.", name: "string", type: "string" }],
    returnType: "string",
    slots: [{ name: "String", type: "string" }],
  },
});

/** Replaces occurrences of a substring with another string. */
export const strReplace = defineFullOpcode<[string, string, string], string>("str.replace", {
  handler: ([str, search, replace], _ctx) => str.replace(search, replace),
  metadata: {
    category: "string",
    description: "Replaces occurrences of a substring with another string.",
    label: "Replace All",
    parameters: [
      { description: "The string to search in.", name: "string", type: "string" },
      { description: "The string to search for.", name: "search", type: "string" },
      {
        description: "The string to replace with.",
        name: "replace",
        optional: true,
        type: "string",
      },
    ],
    returnType: "string",
    slots: [
      { name: "String", type: "string" },
      { name: "Search", type: "string" },
      { name: "Replace", type: "string" },
    ],
  },
});

/** Checks if a string contains another string. */
export const strIncludes = defineFullOpcode<[string, string], boolean>("str.includes", {
  handler: ([str, search], _ctx) => str.includes(search),
  metadata: {
    category: "string",
    description: "Checks if a string contains another string.",
    label: "Index Of",
    parameters: [
      { description: "The string to check.", name: "string", type: "string" },
      { description: "The substring to search for.", name: "search", type: "string" },
    ],
    returnType: "boolean",
    slots: [
      { name: "String", type: "string" },
      { name: "Search", type: "string" },
    ],
  },
});

/** Joins elements of a list into a string using a separator. */
export const strJoin = defineFullOpcode<[any[], string], string>("str.join", {
  handler: ([list, separator], _ctx) => list.join(separator),
  metadata: {
    category: "string",
    description: "Joins elements of a list into a string using a separator.",
    label: "Join",
    parameters: [
      { description: "The list to join.", name: "list", type: "any[]" },
      { description: "The separator to use.", name: "separator", type: "string" },
    ],
    returnType: "string",
    slots: [
      { name: "List", type: "block" },
      { name: "Separator", type: "string" },
    ],
  },
});
