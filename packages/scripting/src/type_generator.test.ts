import { describe, expect, test } from "bun:test";
import type { OpcodeMetadata } from "./types";
import { generateTypeDefinitions } from "./type_generator";

describe("generateTypeDefinitions", () => {
  test("generates basic function definitions", () => {
    const opcodes: readonly OpcodeMetadata[] = [
      {
        category: "test",
        label: "Test Op",
        opcode: "test.op",
        parameters: [{ name: "a", type: "string" }],
        returnType: "number",
      },
    ];

    const defs = generateTypeDefinitions(opcodes);
    expect(defs).toContain("namespace test {");
    expect(defs).toContain("function op(a: string): number;");
  });

  test("generates function definitions with generics", () => {
    const opcodes: readonly OpcodeMetadata[] = [
      {
        category: "list",
        genericParameters: ["Type", "Result"],
        label: "Map",
        opcode: "list.map",
        parameters: [
          { name: "list", type: "Type[]" },
          { name: "fn", type: "(item: Type) => Result" },
        ],
        returnType: "Result[]",
      },
    ];

    const defs = generateTypeDefinitions(opcodes);
    expect(defs).toContain("namespace list {");
    expect(defs).toContain(
      "function map<Type, Result>(list: Type[], fn: (item: Type) => Result): Result[];",
    );
  });

  test("generates global function definitions with generics", () => {
    const opcodes: readonly OpcodeMetadata[] = [
      {
        category: "global",
        genericParameters: ["Type"],
        label: "Global Generic",
        opcode: "identity",
        parameters: [{ name: "val", type: "Type" }],
        returnType: "Type",
      },
    ];

    const defs = generateTypeDefinitions(opcodes);
    expect(defs).toContain("function identity<Type>(val: Type): Type;");
  });

  test("generates complex generic definitions", () => {
    const opcodes: readonly OpcodeMetadata[] = [
      {
        category: "data",
        genericParameters: [
          "Kvs extends [] | readonly (readonly [key: '' | (string & {}), value: unknown])[]",
        ],
        label: "New Object",
        opcode: "obj.new",
        parameters: [{ name: "...kvs", type: "Kvs" }],
        returnType:
          // This is an intentional template curly (part of TypeScript's type syntax)
          // oxlint-disable-next-line no-template-curly-in-string
          "{ [Key in keyof Kvs & `${number}` as (Kvs[Key] & [string, unknown])[0]]: (Kvs[Key] & [string, unknown])[1] }",
      },
    ];

    const defs = generateTypeDefinitions(opcodes);
    expect(defs).toContain(
      // This is an intentional template curly (part of TypeScript's type syntax)
      // oxlint-disable-next-line no-template-curly-in-string
      "function new_<Kvs extends [] | readonly (readonly [key: '' | (string & {}), value: unknown])[]>(...kvs: Kvs): { [Key in keyof Kvs & `${number}` as (Kvs[Key] & [string, unknown])[0]]: (Kvs[Key] & [string, unknown])[1] };",
    );
  });
});
