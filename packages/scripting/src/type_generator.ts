import type { OpcodeMetadata } from "./types";

export const RESERVED_TYPESCRIPT_KEYWORDS = new Set([
  "if",
  "else",
  "while",
  "for",
  "return",
  "break",
  "continue",
  "switch",
  "case",
  "default",
  "var",
  "let",
  "const",
  "function",
  "class",
  "new",
  "this",
  "super",
  "return",
  "throw",
  "try",
  "catch",
  "finally",
  "import",
  "export",
  "default",
  "from",
  "as",
  "type",
  "interface",
  "enum",
  "namespace",
  "typeof",
]);

const OPERATOR_MAP: Record<string, string> = {
  "!=": "neq",
  "%": "mod",
  "*": "mul",
  "+": "add",
  "-": "sub",
  "/": "div",
  "<": "lt",
  "<=": "lte",
  "==": "eq",
  ">": "gt",
  ">=": "gte",
  "^": "pow",
};

function generateJSDoc(op: OpcodeMetadata): string {
  if (
    !op.description &&
    (!op.parameters || op.parameters.every((parameter) => !parameter.description))
  ) {
    return "";
  }
  let jsdoc = "/**\n";
  if (op.description) {
    jsdoc += ` * ${op.description}\n`;
  }
  if (op.parameters && op.parameters.some((parameter) => parameter.description)) {
    if (op.description) {
      jsdoc += " *\n";
    }
    for (const parameter of op.parameters) {
      if (parameter.description) {
        jsdoc += ` * @param ${parameter.name.replace(/^[.][.][.]/, "")} ${parameter.description}\n`;
      }
    }
  }
  jsdoc += " */\n";
  return jsdoc;
}

function renderNamespaceContent(name: string, content: any, indent: string): string {
  let output = `${indent}namespace ${name} {\n`;
  const innerIndent = `${indent}  `;
  if (content._funcs) {
    for (const func of content._funcs) {
      output += `${(func as string).replaceAll(/^/gm, innerIndent)}\n`;
    }
  }
  for (const key of Object.keys(content)) {
    if (key === "_funcs") {
      continue;
    }
    output += renderNamespaceContent(key, content[key], innerIndent);
  }
  output += `${indent}}\n`;
  return output;
}

function renderNamespace(name: string, content: any, indent: string): string {
  let output = `${indent}namespace ${name} {\n`;
  const innerIndent = `${indent}  `;
  if (content._funcs) {
    for (const func of content._funcs) {
      output += `${(func as string).replaceAll(/^/gm, innerIndent)}\n`;
    }
  }
  for (const key of Object.keys(content)) {
    if (key === "_funcs") {
      continue;
    }
    // Recursive render for sub-namespaces, but we don't need 'declare' inside
    output += renderNamespaceContent(key, content[key], innerIndent);
  }
  output += `${indent}}\n`;
  return output;
}

export function generateTypeDefinitions(opcodes: readonly OpcodeMetadata[]): string {
  let definitions = `\
interface Entity {
  /** Unique ID of the entity */
  id: number;
  /**
   * Resolved properties (merged from prototype and instance).
   * Contains arbitrary game data like description, adjectives, custom_css.
   */
  [key: string]: unknown;
}

/** Represents a scriptable action (verb) attached to an entity. */
interface Verb {
  id: number;
  entity_id: number;
  /** The name of the verb (command) */
  name: string;
  /** The compiled S-expression code for the verb */
  code: ScriptValue<unknown>;
}

interface Capability {
  readonly __brand: "Capability";
  readonly id: string;
}

type UnionToIntersection<Type> = (Type extends Type ? (type: Type) => 0 : never) extends (
  intersection: infer Intersection,
) => 0
  ? Extract<Intersection, Type>
  : never;

type UnknownUnion =
  | string
  | number
  | boolean
  | null
  | undefined
  | Capability
  | (Record<string, unknown> & { readonly length?: never })
  | (Record<string, unknown> & { readonly slice?: never });

type ScriptValue_<Type> = Exclude<Type, readonly unknown[]>;

/**
 * Represents a value in the scripting language.
 * Can be a primitive, an object, or a nested S-expression (array).
 */
type ScriptValue<Type> =
  | (unknown extends Type
      ? ScriptValue_<UnknownUnion>
      : object extends Type
      ? Extract<ScriptValue_<UnknownUnion>, object>
      : ScriptValue_<Type>)
  | ScriptExpression<any[], Type>;

// Phantom type for return type safety
type ScriptExpression<Args extends (string | ScriptValue_<unknown>)[], Result> = [
  string,
  ...Args,
] & {
  __returnType: Result;
};

// Standard library functions
`;

  const rootNamespace: Record<string, any> = {};

  for (const op of opcodes) {
    const parts = op.opcode.split(".");
    if (parts.length > 1) {
      let current = rootNamespace;
      for (let idx = 0; idx < parts.length - 1; idx += 1) {
        const part = parts[idx];
        if (!part) {
          continue;
        }
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      const name = parts.at(-1);
      current["_funcs"] ??= [];

      const params =
        op.parameters
          ?.map((parameter) => {
            const paramName = RESERVED_TYPESCRIPT_KEYWORDS.has(parameter.name)
              ? `${parameter.name}_`
              : parameter.name;
            const question = parameter.optional ? "?" : "";
            return `${paramName}${question}: ${parameter.type}`;
          })
          .join(", ") ?? "";
      const ret = op.returnType ?? "any";
      const sanitizedName = RESERVED_TYPESCRIPT_KEYWORDS.has(name!) ? `${name}_` : name;
      const generics = op.genericParameters?.length ? `<${op.genericParameters.join(", ")}>` : "";

      const jsdoc = generateJSDoc(op);
      current["_funcs"].push(`${jsdoc}function ${sanitizedName}${generics}(${params}): ${ret};`);
    } else {
      // Global function
      const params =
        op.parameters
          ?.map((parameter) => {
            const paramName = RESERVED_TYPESCRIPT_KEYWORDS.has(parameter.name)
              ? `${parameter.name}_`
              : parameter.name;
            const question = parameter.optional ? "?" : "";
            return `${paramName}${question}: ${parameter.type}`;
          })
          .join(", ") ?? "";
      const ret = op.returnType ?? "any";
      let sanitizedOpcode = op.opcode;
      const mapped = OPERATOR_MAP[sanitizedOpcode];
      if (mapped) {
        sanitizedOpcode = mapped;
      } else if (RESERVED_TYPESCRIPT_KEYWORDS.has(op.opcode)) {
        sanitizedOpcode = `${op.opcode}_`;
      }
      const generics = op.genericParameters?.length ? `<${op.genericParameters.join(", ")}>` : "";
      const jsdoc = generateJSDoc(op);
      definitions += `${jsdoc}function ${sanitizedOpcode}${generics}(${params}): ${ret};\n`;
    }
  }
  for (const key of Object.keys(rootNamespace)) {
    definitions += renderNamespace(key, rootNamespace[key], "");
  }
  return `\
// oxlint-disable max-params, ban-types
declare global {
${definitions.replaceAll(/^(.)/gm, "  $1")}
}

// oxlint-disable-next-line require-module-specifiers
export {};`;
}
