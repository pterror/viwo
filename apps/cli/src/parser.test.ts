import { describe, expect, test } from "bun:test";
import { parseCommand } from "./parser";

describe("CLI Parser", () => {
  test("Basic command", () => {
    expect(parseCommand("look")).toEqual({ args: [], command: "look" });
    expect(parseCommand("go north")).toEqual({
      args: ["north"],
      command: "go",
    });
  });

  test("Quoted arguments", () => {
    expect(parseCommand('say "hello world"')).toEqual({
      args: ["hello world"],
      command: "say",
    });
    expect(parseCommand('create "iron sword" weapon')).toEqual({
      args: ["iron sword", "weapon"],
      command: "create",
    });
  });

  test("Empty input", () => {
    expect(parseCommand("")).toBeNull();
    expect(parseCommand("   ")).toBeNull();
  });
});
