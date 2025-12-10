import { describe, it } from "bun:test";
import { transpile } from "../packages/scripting/src/transpiler";

describe("Transpiler", () => {
  it("should support computed property names", () => {
    const source = `
        function test() {
            const key = "foo";
            return { [key]: "bar" };
        }
        `;
    const compiled = transpile(source);
    console.log("Compiled:", JSON.stringify(compiled, null, 2));

    // Expected: (obj ("foo" "bar")) or similar logic resolving variable
    // If it compiles to (obj ("[key]" "bar")), it is wrong.
  });
});
