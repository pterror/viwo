import { getVerbs } from "../repo";
import { ScriptValue } from "./def";
import { Entity } from "@viwo/shared/jsonrpc";

/**
 * Execution context for a script.
 * Contains the current state, variables, and environment.
 */
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
  /** Local variables in the current scope. */
  vars: Record<string, unknown>;
};

export type ScriptLibraryDefinition = Record<
  string,
  (args: readonly unknown[], ctx: ScriptContext) => Promise<unknown>
>;

/**
 * Error thrown when script execution fails.
 */
export class ScriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScriptError";
  }
}

/**
 * Metadata describing an opcode for documentation and UI generation.
 */
export interface OpcodeMetadata {
  /** Human-readable label. */
  label: string;
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
  parameters?: { name: string; type: string }[];
  returnType?: string;
}

export type OpcodeHandler<Ret> = (
  args: any[],
  ctx: ScriptContext,
) => Promise<Ret>;

export interface OpcodeDefinition {
  handler: OpcodeHandler<unknown>;
  metadata: OpcodeMetadata;
}

export const OPS: Record<string, OpcodeDefinition> = {};

/**
 * Registers a library of opcodes.
 *
 * @param library - A record of opcode definitions.
 */
export function registerLibrary(library: Record<string, OpcodeDefinition>) {
  for (const [name, def] of Object.entries(library)) {
    OPS[name] = def;
  }
}

export function getOpcode(name: string) {
  return OPS[name]?.handler;
}

/**
 * Retrieves metadata for all registered opcodes.
 *
 * @returns An array of opcode metadata objects.
 */
export function getOpcodeMetadata() {
  return Object.entries(OPS).map(([opcode, def]) => ({
    opcode,
    ...def.metadata,
  }));
}

export async function executeLambda(
  lambda: any,
  args: unknown[],
  ctx: ScriptContext,
): Promise<any> {
  if (!lambda || lambda.type !== "lambda") return null;

  // Create new context
  const newVars = { ...lambda.closure };
  // Bind arguments
  for (let i = 0; i < lambda.args.length; i++) {
    newVars[lambda.args[i]] = args[i];
  }

  return await evaluate(lambda.body, {
    ...ctx,
    vars: newVars,
  });
}

/**
 * Evaluates a script expression.
 *
 * @param ast - The script AST (S-expression) to evaluate.
 * @param ctx - The execution context.
 * @returns The result of the evaluation.
 * @throws ScriptError if execution fails or gas runs out.
 */
export async function evaluate<T>(
  ast: ScriptValue<T>,
  ctx: ScriptContext,
): Promise<T> {
  if (ctx.gas !== undefined) {
    ctx.gas -= 1;
    if (ctx.gas < 0) {
      throw new ScriptError("Script ran out of gas!");
    }
  }
  if (Array.isArray(ast)) {
    const [op, ...args] = ast;
    if (typeof op === "string" && OPS[op]) {
      return OPS[op].handler(args, ctx) as T;
    } else {
      throw new ScriptError(`Unknown opcode: ${op}`);
    }
  }
  return ast as never;
}

/**
 * Creates a new script context with default values.
 *
 * @param ctx - Partial context to override defaults.
 * @returns A complete ScriptContext.
 */
export function createScriptContext(
  ctx: Pick<ScriptContext, "caller" | "this"> & Partial<ScriptContext>,
): ScriptContext {
  return {
    args: [],
    gas: 1000,
    warnings: [],
    vars: {},
    ...ctx,
  };
}

/**
 * Resolves dynamic properties on an entity by executing 'get_*' verbs.
 *
 * @param entity - The entity to resolve.
 * @param ctx - The script context.
 * @returns A new entity object with resolved properties.
 */
export async function resolveProps(
  entity: Entity,
  ctx: ScriptContext,
): Promise<Entity> {
  if (!ctx.send) {
    return entity;
  }

  // We need to clone the props so we don't mutate the actual entity in the repo
  // entity is already a bag of props, so we clone it entirely
  const resolved = { ...entity };

  const verbs = getVerbs(entity.id);
  for (const verb of verbs) {
    const match = verb.name.match(/^get_(.+)/);
    if (!match?.[1]) continue;
    const propName = match[1];
    try {
      const result = await evaluate(verb.code, {
        caller: entity, // The entity itself is the caller for its own getter?
        this: entity,
        args: [],
        get gas() {
          return ctx.gas ?? 1000;
        },
        set gas(value) {
          ctx.gas = value;
        },
        send: ctx.send,
        warnings: ctx.warnings,
        vars: {},
      });

      if (result !== undefined) {
        resolved[propName] = result;
      }
    } catch (error) {
      // Ignore errors in getters for now, or warn
      ctx.warnings.push(
        `Error resolving property ${propName} for ${entity.id}: ${error}`,
      );
    }
  }

  return resolved;
}
