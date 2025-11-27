import { describe, test, expect } from "bun:test";
import { CommandSchemas } from "./commands";

describe("Command Schemas", () => {
  test("look", () => {
    const schema = CommandSchemas.look;
    expect(schema.safeParse([]).success).toBe(true);
    expect(schema.safeParse(["something"]).success).toBe(true);
    // Should fail if too many args? Zod tuple allows extras by default? No, tuple is strict length usually unless .rest()
    // Let's check Zod tuple behavior.
    // z.tuple([z.string().optional()]) expects array of length 1.
    expect(schema.safeParse(["a", "b"]).success).toBe(false);
  });

  test("move", () => {
    const schema = CommandSchemas.move;
    expect(schema.safeParse(["north"]).success).toBe(true);
    expect(schema.safeParse([]).success).toBe(false);
  });

  test("dig", () => {
    const schema = CommandSchemas.dig;
    expect(schema.safeParse(["north", "New Room"]).success).toBe(true);
    expect(schema.safeParse(["north"]).success).toBe(false);
  });

  test("create", () => {
    const schema = CommandSchemas.create;
    expect(schema.safeParse(["sword"]).success).toBe(true);
    expect(schema.safeParse(["sword", "{}"]).success).toBe(true);
    expect(schema.safeParse([]).success).toBe(false);
  });

  test("set", () => {
    const schema = CommandSchemas.set;
    expect(schema.safeParse(["me", "foo", "bar"]).success).toBe(true);
    expect(schema.safeParse(["me", "foo"]).success).toBe(false);
  });
});
