import { OpcodeHandler, OpcodeMetadata } from "./interpreter";

type UnknownUnion =
  | string
  | number
  | boolean
  | null
  | undefined
  | (Record<string, unknown> & { readonly length?: never })
  | (Record<string, unknown> & { readonly slice?: never });

export type ScriptValue_<T> = Exclude<T, readonly unknown[]>;

/**
 * Represents a value in the scripting language.
 * Can be a primitive, an object, or a nested S-expression (array).
 */
export type ScriptValue<T> =
  | (unknown extends T
      ? ScriptValue_<UnknownUnion>
      : object extends T
      ? Extract<ScriptValue_<UnknownUnion>, object>
      : ScriptValue_<T>)
  | ScriptExpression<any[], T>;

// Phantom type for return type safety
export type ScriptExpression<
  Args extends (string | ScriptValue_<unknown>)[],
  Ret,
> = [string, ...Args] & {
  __returnType: Ret;
};

export interface OpcodeBuilder<
  Args extends (string | ScriptValue_<unknown>)[],
  Ret,
> {
  (...args: Args): ScriptExpression<Args, Ret>;
  opcode: string;
  handler: OpcodeHandler<Ret>;
  metadata: OpcodeMetadata;
}

/**
 * Defines a new opcode.
 *
 * @param name - The opcode name (e.g., "log", "+").
 * @param def - The opcode definition (metadata and handler).
 * @returns A builder function that can be used to construct S-expressions for this opcode in TypeScript.
 */
export function defineOpcode<
  Args extends (string | ScriptValue_<unknown>)[] = never,
  Ret = never,
>(
  name: string,
  def: { metadata: OpcodeMetadata; handler: OpcodeHandler<Ret> },
): OpcodeBuilder<Args, Ret> {
  const builder = ((...args: Args) => {
    const expr = [name, ...args] as unknown as ScriptExpression<Args, Ret>;
    return expr;
  }) as OpcodeBuilder<Args, Ret>;

  builder.opcode = name;
  builder.handler = def.handler;
  builder.metadata = def.metadata;

  return builder;
}
