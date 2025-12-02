import { describe, expect, test } from "bun:test";
import { generateTypeDefinitions } from "./type_generator";
import { OpcodeMetadata } from "./interpreter";

describe("generateTypeDefinitions", () => {
  test("generates basic function definitions", () => {
    const opcodes: OpcodeMetadata[] = [
      {
        label: "Test Op",
        opcode: "test.op",
        category: "test",
        parameters: [{ name: "a", type: "string" }],
        returnType: "number",
      },
    ];

    const defs = generateTypeDefinitions(opcodes);
    expect(defs).toContain("declare namespace test {");
    expect(defs).toContain("function op(a: string): number;");
  });

  test("generates function definitions with generics", () => {
    const opcodes: OpcodeMetadata[] = [
      {
        label: "Map",
        opcode: "list.map",
        category: "list",
        parameters: [
          { name: "list", type: "T[]" },
          { name: "fn", type: "(item: T) => U" },
        ],
        genericParameters: ["T", "U"],
        returnType: "U[]",
      },
    ];

    const defs = generateTypeDefinitions(opcodes);
    expect(defs).toContain("declare namespace list {");
    expect(defs).toContain(
      "function map<T, U>(list: T[], fn: (item: T) => U): U[];",
    );
  });

  test("generates global function definitions with generics", () => {
    const opcodes: OpcodeMetadata[] = [
      {
        label: "Global Generic",
        opcode: "identity",
        category: "global",
        parameters: [{ name: "val", type: "T" }],
        genericParameters: ["T"],
        returnType: "T",
      },
    ];

    const defs = generateTypeDefinitions(opcodes);
    expect(defs).toContain("declare function identity<T>(val: T): T;");
  });
});
