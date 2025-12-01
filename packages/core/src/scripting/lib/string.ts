import { evaluate, ScriptError } from "../interpreter";
import { defineOpcode, ScriptValue } from "../def";

/**
 * Returns the length of a string.
 */
const strLen = defineOpcode<[ScriptValue<string>], number>(
  "str.len",
  {
    metadata: {
      label: "Length",
      category: "string",
      description: "Get string length",
      slots: [{ name: "String", type: "string" }],
      parameters: [{ name: "string", type: "string" }],
      returnType: "number",
    },
    handler: async (args, ctx) => {
      if (args.length !== 1) {
        throw new ScriptError("str.len: expected 1 argument");
      }
      const [strExpr] = args;
      const str = await evaluate(strExpr, ctx);
      if (typeof str !== "string") {
        throw new ScriptError("str.len: expected string for str");
      }
      return str.length;
    },
  }
);
export { strLen as "str.len" };

/**
 * Concatenates multiple strings into one.
 */
const strConcat = defineOpcode<[...ScriptValue<string | number | boolean | null>[]], string>(
  "str.concat",
  {
    metadata: {
      label: "Concat",
      category: "string",
      description: "Concatenate strings",
      slots: [{ name: "Strings", type: "block" }], // Variadic?
      parameters: [{ name: "...strings", type: "string[]" }],
      returnType: "string",
    },
    handler: async (args, ctx) => {
      const strings: string[] = [];
      for (const arg of args) {
        const str = await evaluate(arg, ctx);
        if (typeof str === "object" || typeof str === "function") {
          throw new ScriptError("str.concat: expected primitive for arg");
        }
        strings.push(String(str));
      }
      return strings.join("");
    },
  }
);
export { strConcat as "str.concat" };

/**
 * Splits a string into an array of substrings using a separator.
 */
const strSplit = defineOpcode<[ScriptValue<string>, ScriptValue<string>], string[]>(
  "str.split",
  {
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
    handler: async (args, ctx) => {
      if (args.length !== 2) {
        throw new ScriptError("str.split: expected 2 arguments");
      }
      const [strExpr, sepExpr] = args;
      const str = await evaluate(strExpr, ctx);
      if (typeof str !== "string") {
        throw new ScriptError("str.split: expected string for str");
      }
      const sep = await evaluate(sepExpr, ctx);
      if (typeof sep !== "string") {
        throw new ScriptError("str.split: expected string for sep");
      }
      return str.split(sep);
    },
  }
);
export { strSplit as "str.split" };

/**
 * Extracts a section of a string and returns it as a new string.
 */
const strSlice = defineOpcode<[ScriptValue<string>, ScriptValue<number>, ScriptValue<number>?], string>(
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
        { name: "end", type: "number" },
      ],
      returnType: "string",
    },
    handler: async (args, ctx) => {
      if (args.length < 2 || args.length > 3) {
        throw new ScriptError("str.slice: expected 2 or 3 arguments");
      }
      const [strExpr, startExpr, endExpr] = args;
      const str = await evaluate(strExpr, ctx);
      if (typeof str !== "string") {
        throw new ScriptError("str.slice: expected string for str");
      }
      const start = await evaluate(startExpr, ctx);
      if (typeof start !== "number") {
        throw new ScriptError("str.slice: expected number for start");
      }
      const end = endExpr ? await evaluate(endExpr, ctx) : str.length;
      if (typeof end !== "number") {
        throw new ScriptError("str.slice: expected number for end");
      }
      return str.slice(start, end);
    },
  }
);
export { strSlice as "str.slice" };

/**
 * Converts a string to uppercase.
 */
const strUpper = defineOpcode<[ScriptValue<string>], string>(
  "str.upper",
  {
    metadata: {
      label: "To Upper",
      category: "string",
      description: "Convert to uppercase",
      slots: [{ name: "String", type: "string" }],
      parameters: [{ name: "string", type: "string" }],
      returnType: "string",
    },
    handler: async (args, ctx) => {
      if (args.length !== 1) {
        throw new ScriptError("str.upper: expected 1 argument");
      }
      const [strExpr] = args;
      const str = await evaluate(strExpr, ctx);
      if (typeof str !== "string") {
        throw new ScriptError("str.upper: expected string for str");
      }
      return str.toUpperCase();
    },
  }
);
export { strUpper as "str.upper" };

/**
 * Converts a string to lowercase.
 */
const strLower = defineOpcode<[ScriptValue<string>], string>(
  "str.lower",
  {
    metadata: {
      label: "To Lower",
      category: "string",
      description: "Convert to lowercase",
      slots: [{ name: "String", type: "string" }],
      parameters: [{ name: "string", type: "string" }],
      returnType: "string",
    },
    handler: async (args, ctx) => {
      if (args.length !== 1) {
        throw new ScriptError("str.lower: expected 1 argument");
      }
      const [strExpr] = args;
      const str = await evaluate(strExpr, ctx);
      if (typeof str !== "string") {
        throw new ScriptError("str.lower: expected string for str");
      }
      return str.toLowerCase();
    },
  }
);
export { strLower as "str.lower" };

/**
 * Removes whitespace from both ends of a string.
 */
const strTrim = defineOpcode<[ScriptValue<string>], string>(
  "str.trim",
  {
    metadata: {
      label: "Trim",
      category: "string",
      description: "Trim whitespace",
      slots: [{ name: "String", type: "string" }],
      parameters: [{ name: "string", type: "string" }],
      returnType: "string",
    },
    handler: async (args, ctx) => {
      if (args.length !== 1) {
        throw new ScriptError("str.trim: expected 1 argument");
      }
      const [strExpr] = args;
      const str = await evaluate(strExpr, ctx);
      if (typeof str !== "string") {
        throw new ScriptError("str.trim: expected string for str");
      }
      return str.trim();
    },
  }
);
export { strTrim as "str.trim" };

/**
 * Replaces occurrences of a substring with another string.
 */
const strReplace = defineOpcode<[ScriptValue<string>, ScriptValue<string>, ScriptValue<string>], string>(
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
    handler: async (args, ctx) => {
      if (args.length !== 3) {
        throw new ScriptError("str.replace: expected 3 arguments");
      }
      const [strExpr, searchExpr, replaceExpr] = args;
      const str = await evaluate(strExpr, ctx);
      if (typeof str !== "string") {
        throw new ScriptError("str.replace: expected string for str");
      }
      const search = await evaluate(searchExpr, ctx);
      if (typeof search !== "string") {
        throw new ScriptError("str.replace: expected string for search");
      }
      const replace = await evaluate(replaceExpr, ctx);
      if (typeof replace !== "string") {
        throw new ScriptError("str.replace: expected string for replace");
      }
      return str.replace(search, replace);
    },
  }
);
export { strReplace as "str.replace" };

/**
 * Checks if a string contains another string.
 */
const strIncludes = defineOpcode<[ScriptValue<string>, ScriptValue<string>], boolean>(
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
    handler: async (args, ctx) => {
      if (args.length !== 2) {
        throw new ScriptError("str.includes: expected 2 arguments");
      }
      const [strExpr, searchExpr] = args;
      const str = await evaluate(strExpr, ctx);
      if (typeof str !== "string") {
        throw new ScriptError("str.includes: expected string for str");
      }
      const search = await evaluate(searchExpr, ctx);
      if (typeof search !== "string") {
        throw new ScriptError("str.includes: expected string for search");
      }
      return str.includes(search);
    },
  }
);
export { strIncludes as "str.includes" };

/**
 * Joins elements of a list into a string using a separator.
 */
const strJoin = defineOpcode<[ScriptValue<any[]>, ScriptValue<string>], string>(
  "str.join",
  {
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
    handler: async (args, ctx) => {
      if (args.length !== 2) {
        throw new ScriptError("str.join: expected 2 arguments");
      }
      const [listExpr, sepExpr] = args;
      const list = await evaluate(listExpr, ctx);
      if (!Array.isArray(list)) {
        throw new ScriptError("str.join: expected array for list");
      }
      for (let i = 0; i < list.length; i++) {
        if (typeof list[i] === "object" || typeof list[i] === "function") {
          throw new ScriptError(
            `str.join: expected primitive for list element ${i}`,
          );
        }
      }
      const separator = await evaluate(sepExpr, ctx);
      if (typeof separator !== "string") {
        throw new ScriptError("str.join: expected string for separator");
      }
      return list.join(separator);
    },
  }
);
export { strJoin as "str.join" };
