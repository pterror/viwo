import {
  BooleanLib,
  ListLib,
  MathLib,
  ObjectLib,
  StdLib,
  StringLib,
  TimeLib,
  createOpcodeRegistry,
  defineOpcode,
  getOpcodeMetadata,
} from "@viwo/scripting";
import type { BlockDefinition } from "@viwo/web-editor";

// Simple output buffer
const outputBuffer: string[] = [];
export const clearOutput = () => {
  outputBuffer.length = 0;
};
export const getOutput = () => outputBuffer.join("\n");

const log = (msg: string) => {
  outputBuffer.push(msg);
  console.log("[Playground]", msg);
};

// Register all standard libraries
export const ops = createOpcodeRegistry(
  StdLib,
  MathLib,
  BooleanLib,
  ListLib,
  ObjectLib,
  StringLib,
  TimeLib,
  // Register custom log (overwrites StdLib.log)
  {
    log: defineOpcode("log", {
      ...StdLib.log,
      handler: (args: any[]) => {
        // Join args with space
        const msg = args.map(String).join(" ");
        log(msg);
        return;
      },
    }),
  },
);

// Export opcodes for the editor
export const opcodes: BlockDefinition[] = Object.values(getOpcodeMetadata(ops)).map((meta) => ({
  ...meta,
  category: meta.category as any,
  // Ensure type is compatible with BlockDefinition
  type: (meta.returnType as any) || "statement",
}));
