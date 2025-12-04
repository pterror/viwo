export interface Entity {
  /** Unique ID of the entity */
  id: number;
  /**
   * Resolved properties (merged from prototype and instance).
   * Contains arbitrary game data like description, adjectives, custom_css.
   */
  [key: string]: unknown;
};

/**
 * Represents a scriptable action (verb) attached to an entity.
 */
export interface Verb {
  id: number;
  entity_id: number;
  /** The name of the verb (command) */
  name: string;
  /** The compiled S-expression code for the verb */
  code: ScriptValue<unknown>;
  /** Permission settings for the verb */
  permissions: Record<string, unknown>;
}

export interface Capability {
  readonly __brand: "Capability";
  readonly id: string;
}

type UnknownUnion =
  | string
  | number
  | boolean
  | null
  | undefined
  | Capability
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
export type ScriptExpression<Args extends (string | ScriptValue_<unknown>)[], Ret> = [
  string,
  ...Args,
] & {
  __returnType: Ret;
};

// Standard library functions
export declare function add(a: number, b: number, ...args: number[]): number;
export declare function div(a: number, b: number, ...args: number[]): number;
export declare function mod(a: number, b: number): number;
export declare function mul(a: number, b: number, ...args: number[]): number;
export declare function pow(base: number, exp: number, ...args: number[]): number;
export declare function random(min: number, max: number): number;
export declare function sub(a: number, b: number, ...args: number[]): number;
export declare function and(a: boolean, b: boolean, ...args: boolean[]): boolean;
export declare function eq(a: unknown, b: unknown, ...args: unknown[]): boolean;
export declare function gt(a: number, b: number, ...args: number[]): boolean;
export declare function gte(a: number, b: number, ...args: number[]): boolean;
export declare function lt(a: number, b: number, ...args: number[]): boolean;
export declare function lte(a: number, b: number, ...args: number[]): boolean;
export declare function neq(a: unknown, b: unknown, ...args: unknown[]): boolean;
export declare function not(val: any): boolean;
export declare function or(a: boolean, b: boolean, ...args: boolean[]): boolean;
export declare function apply(func: unknown, ...args: any[]): any;
export declare function arg(index: number): any;
export declare function args(): readonly any[];
export declare function caller(): Entity;
export declare function for_(variableName: string, list: any, body: any): any;
export declare function if_<T>(condition: any, then: any, else_: any): T;
export declare function lambda(args: string[], body: any): any;
export declare function let_(name: string, value: unknown): any;
export declare function log(message: unknown, ...args: unknown[]): null;
export declare function quote(value: any): any;
export declare function send(type_: string, payload: unknown): null;
export declare function seq(...args: any[]): any;
export declare function set(name: string, value: unknown): any;
export declare function this_(): Entity;
export declare function throw_(message: unknown): never;
export declare function try_(try_: any, errorVar: string, catch_: any): any;
export declare function typeof_(value: unknown): string;
export declare function var_(name: string): any;
export declare function warn(message: unknown): void;
export declare function while_(condition: any, body: any): any;
export declare namespace list {
  function concat(list1: readonly unknown[], list2: readonly unknown[]): readonly unknown[];
  function empty(list: readonly unknown[]): boolean;
  function filter(list: readonly unknown[], lambda: object): readonly unknown[];
  function find(list: readonly unknown[], lambda: object): any;
  function flatMap(list: readonly unknown[], lambda: object): readonly unknown[];
  function get(list: readonly unknown[], index: number): any;
  function includes(list: readonly unknown[], value: any): boolean;
  function len(list: readonly unknown[]): number;
  function map(list: readonly unknown[], lambda: object): readonly unknown[];
  function new_<T>(...args: any[]): T[];
  function pop(list: readonly unknown[]): any;
  function push(list: readonly unknown[], value: any): number;
  function reduce(list: readonly unknown[], lambda: object, init: any): any;
  function reverse(list: readonly unknown[]): readonly unknown[];
  function set(list: readonly unknown[], index: number, value: any): any;
  function shift(list: readonly unknown[]): any;
  function slice(list: readonly unknown[], start: number, end: number): readonly unknown[];
  function sort(list: readonly unknown[]): readonly unknown[];
  function splice(list: readonly unknown[], start: number, deleteCount: number, ...items: any[]): readonly unknown[];
  function unshift(list: readonly unknown[], value: any): number;
}
export declare namespace obj {
  function del(object: object, key: string): boolean;
  function entries(object: object): [string, any][];
  function filter(object: object, lambda: object): any;
  function flatMap(object: object, lambda: object): any;
  function get(object: object, key: string, default_: any): any;
  function has(object: object, key: string): boolean;
  function keys(object: object): string[];
  function map(object: object, lambda: object): any;
  function merge(...objects: object[]): any;
  function new_<Kvs extends [] | readonly (readonly [key: '' | (string & {}), value: unknown])[]>(...kvs: any[]): { [K in keyof Kvs & `${number}` as (Kvs[K] & [string, unknown])[0]]: (Kvs[K] & [string, unknown])[1] };
  function reduce(object: object, lambda: object, init: any): any;
  function set(object: object, key: string, value: any): any;
  function values(object: object): any[];
}
export declare namespace str {
  function concat(...strings: any[]): string;
  function includes(string: string, search: string): boolean;
  function join(list: any[], separator: string): string;
  function len(string: string): number;
  function lower(string: string): string;
  function replace(string: string, search: string, replace: string): string;
  function slice(string: string, start: number, end: number): string;
  function split(string: string, separator: string): string[];
  function trim(string: string): string;
  function upper(string: string): string;
}
export declare namespace time {
  function format(time: string, format: string): string;
  function from_timestamp(timestamp: number): string;
  function now(): string;
  function offset(amount: number, unit: string, base: string): string;
  function parse(time: string): string;
  function to_timestamp(time: string): number;
}
export declare namespace json {
  function parse(string: string): unknown;
  function stringify(value: unknown): string;
}

// End of generated types
