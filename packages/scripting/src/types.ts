import { Entity } from "@viwo/shared/jsonrpc";
import { ScriptRaw, ScriptValue } from "./def";

/**
 * Execution context for a script.
 * Contains the current state, variables, and environment.
 */
export interface StackFrame {
  name: string;
  args: unknown[];
}

export type ScriptContext = {
  /** The entity that initiated the script execution. */
  caller: Entity;
  /** The entity the script is currently attached to/executing on. */
  this: Entity;
  /** Arguments passed to the script. */
  args: readonly unknown[];
  /** Gas limit to prevent infinite loops. */
  gas: number;
  /** Function to send messages back to the caller. */
  send?: (type: string, payload: unknown) => void;
  /** List of warnings generated during execution. */
  warnings: string[];
  /** Copy-On-Write flag for scope forking. */
  cow: boolean;
  /** Local variables in the current scope. */
  vars: Record<string, unknown>;
  /** Call stack for error reporting. */
  stack: StackFrame[];
};

export type ScriptLibraryDefinition = Record<
  string,
  (args: readonly unknown[], ctx: ScriptContext) => unknown
>;

/** Error thrown when script execution fails. */
export class ScriptError extends Error {
  public stackTrace: StackFrame[] = [];
  public context?: { op: string; args: unknown[] };

  constructor(message: string, stack: StackFrame[] = []) {
    super(message);
    this.name = "ScriptError";
    this.stackTrace = stack;
  }

  override toString() {
    let str = `ScriptError: ${this.message}`;
    if (this.context) {
      str += `\nAt: (${this.context.op} ...)\n`;
    }
    if (this.stackTrace.length > 0) {
      str += "\nStack trace:\n";
      for (let i = this.stackTrace.length - 1; i >= 0; i--) {
        const frame = this.stackTrace[i];
        if (!frame) {
          continue;
        }
        str += `  at ${frame.name} (${frame.args.map((a) => JSON.stringify(a)).join(", ")})\n`;
      }
    }
    return str;
  }
}

/** Metadata describing an opcode for documentation and UI generation. */
export interface OpcodeMetadata<Lazy = boolean> {
  /** Human-readable label. */
  label: string;
  /** The opcode name. */
  opcode: string;
  /** Category for grouping. */
  category: string;
  /** Description of what the opcode does. */
  description?: string;
  // For Node Editor
  layout?: "infix" | "standard" | "primitive" | "control-flow";
  slots?: {
    name: string;
    type: "block" | "string" | "number" | "boolean";
    default?: any;
  }[];
  // For Monaco/TS
  parameters?: { name: string; type: string; optional?: boolean; description?: string }[];
  genericParameters?: string[];
  returnType?: string;
  /** If true, arguments are NOT evaluated before being passed to the handler. Default: false (Strict). */
  lazy?: Lazy;
}

export type OpcodeHandler<Args extends readonly unknown[], Ret, Lazy = boolean> = (
  args: {
    [K in keyof Args]: Args[K] extends ScriptRaw<infer T>
      ? T
      : Lazy extends true
        ? ScriptValue<Args[K]>
        : Args[K];
  },
  ctx: ScriptContext,
) => Ret | Promise<Ret>;

export interface OpcodeDefinition<Lazy = boolean> {
  handler: OpcodeHandler<any, unknown, Lazy>;
  metadata: OpcodeMetadata<Lazy>;
}
