import { OpcodeHandler, OpcodeMetadata } from "./interpreter";

export type ScriptValue<T> = T | ScriptExpression<any[], T>;

// Phantom type for return type safety
export type ScriptExpression<
  Args extends (string | ScriptValue<unknown>)[],
  Ret,
> = [string, ...Args] & {
  __returnType: Ret;
};

export interface OpcodeBuilder<
  Args extends (string | ScriptValue<unknown>)[],
  Ret,
> {
  (...args: Args): ScriptExpression<Args, Ret>;
  opcode: string;
  handler: OpcodeHandler;
  metadata: OpcodeMetadata;
}

export function defineOpcode<
  Args extends (string | ScriptValue<unknown>)[] = never,
  Ret = never,
>(
  name: string,
  def: { metadata: OpcodeMetadata; handler: OpcodeHandler },
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
