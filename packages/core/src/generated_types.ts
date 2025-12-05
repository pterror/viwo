declare global {
  interface Entity {
    /** Unique ID of the entity */
    id: number;
    /**
     * Resolved properties (merged from prototype and instance).
     * Contains arbitrary game data like description, adjectives, custom_css.
     */
    [key: string]: unknown;
  }

  /**
   * Represents a scriptable action (verb) attached to an entity.
   */
  interface Verb {
    id: number;
    entity_id: number;
    /** The name of the verb (command) */
    name: string;
    /** The compiled S-expression code for the verb */
    code: ScriptValue<unknown>;
  }

  interface Capability {
    readonly __brand: "Capability";
    readonly id: string;
  }

  type UnionToIntersection<T> = (T extends T ? (t: T) => 0 : never) extends (i: infer I) => 0
    ? Extract<I, T>
    : never;

  type UnknownUnion =
    | string
    | number
    | boolean
    | null
    | undefined
    | Capability
    | (Record<string, unknown> & { readonly length?: never })
    | (Record<string, unknown> & { readonly slice?: never });

  type ScriptValue_<T> = Exclude<T, readonly unknown[]>;

  /**
   * Represents a value in the scripting language.
   * Can be a primitive, an object, or a nested S-expression (array).
   */
  type ScriptValue<T> =
    | (unknown extends T
        ? ScriptValue_<UnknownUnion>
        : object extends T
          ? Extract<ScriptValue_<UnknownUnion>, object>
          : ScriptValue_<T>)
    | ScriptExpression<any[], T>;

  // Phantom type for return type safety
  type ScriptExpression<Args extends (string | ScriptValue_<unknown>)[], Ret> = [
    string,
    ...Args,
  ] & {
    __returnType: Ret;
  };

  // Standard library functions
  /**
   * Call a verb on an entity
   */
  function call(target: Entity, verb: string, ...args: any[]): any;
  /**
   * Create a new entity (requires sys.create)
   *
   * @param cap - Capability to use for creation
   * @param data - Initial data for the entity
   */
  function create(cap: Capability | null, data: object): number;
  /**
   * Destroy an entity (requires entity.control)
   */
  function destroy(cap: Capability | null, target: Entity): null;
  /**
   * Get entity by ID
   */
  function entity(id: number): Entity;
  /**
   * Get entity prototype ID
   */
  function get_prototype(target: Entity): number | null;
  /**
   * Get specific verb
   */
  function get_verb(target: Entity, name: string): Verb | null;
  /**
   * Resolve entity properties
   */
  function resolve_props(target: Entity): Entity;
  /**
   * Schedule a verb call
   */
  function schedule(verb: string, args: any[], delay: number): null;
  /**
   * Update entity properties (requires entity.control)
   */
  function set_entity(cap: Capability | null, ...entities: object[]): void;
  /**
   * Set entity prototype (requires entity.control)
   */
  function set_prototype(cap: Capability | null, target: Entity, prototypeId: number): null;
  /**
   * Execute verb as another entity (requires sys.sudo)
   */
  function sudo(cap: Capability | null, target: Entity, verb: string, args: any[]): any;
  /**
   * Get available verbs
   */
  function verbs(target: Entity): Verb[];
  /**
   * Create a restricted version of a capability
   */
  function delegate(parent: object, restrictions: object): Capability;
  /**
   * Retrieve a capability owned by the current entity
   */
  function get_capability(type_: string, filter?: object): Capability | null;
  /**
   * Transfer a capability to another entity
   */
  function give_capability(cap: object, target: object): null;
  /**
   * Check if an entity has a capability
   */
  function has_capability(target: object, type_: string, filter?: object): boolean;
  /**
   * Mint a new capability (requires sys.mint)
   */
  function mint(authority: object, type_: string, params: object): Capability;
  /**
   * Addition
   */
  function add(a: number, b: number, ...args: number[]): number;
  /**
   * Division
   */
  function div(a: number, b: number, ...args: number[]): number;
  /**
   * Modulo
   */
  function mod(a: number, b: number): number;
  /**
   * Multiplication
   */
  function mul(a: number, b: number, ...args: number[]): number;
  /**
   * Exponentiation
   */
  function pow(base: number, exp: number, ...args: number[]): number;
  /**
   * Generate random number
   */
  function random(min?: number, max?: number): number;
  /**
   * Subtraction
   */
  function sub(a: number, b: number, ...args: number[]): number;
  /**
   * Logical AND
   */
  function and(a: unknown, b: unknown, ...args: unknown[]): boolean;
  /**
   * Equality check
   */
  function eq(a: unknown, b: unknown, ...args: unknown[]): boolean;
  /**
   * Greater than
   */
  function gt(a: number, b: number, ...args: number[]): boolean;
  /**
   * Greater than or equal
   */
  function gte(a: number, b: number, ...args: number[]): boolean;
  /**
   * Less than
   */
  function lt(a: number, b: number, ...args: number[]): boolean;
  /**
   * Less than or equal
   */
  function lte(a: number, b: number, ...args: number[]): boolean;
  /**
   * Inequality check
   */
  function neq(a: unknown, b: unknown, ...args: unknown[]): boolean;
  /**
   * Logical NOT
   */
  function not(val: any): boolean;
  /**
   * Logical OR
   */
  function or(a: unknown, b: unknown, ...args: unknown[]): boolean;
  /**
   * Apply a lambda function
   */
  function apply(func: unknown, ...args: any[]): any;
  /**
   * Get argument by index
   */
  function arg<T>(index: number): T;
  /**
   * Get all arguments
   */
  function args(): readonly any[];
  /**
   * Break out of loop
   */
  function break_(value?: any): never;
  /**
   * Current caller
   */
  function caller(): Entity;
  /**
   * Iterate over a list
   */
  function for_(variableName: string, list: any, body: any): any;
  /**
   * Conditional execution
   */
  function if_<T>(condition: unknown, then: T, else_?: T): T;
  /**
   * Create a lambda function
   */
  function lambda(args: string[], body: any): any;
  /**
   * Define a local variable
   */
  function let_(name: string, value: unknown): any;
  /**
   * Log to server console
   */
  function log(message: unknown, ...args: unknown[]): null;
  /**
   * Return value unevaluated
   */
  function quote(value: any): any;
  /**
   * Send a system message
   */
  function send(type_: string, payload: unknown): null;
  /**
   * Execute a sequence of steps
   */
  function seq(...args: any[]): any;
  /**
   * Set variable value
   */
  function set(name: string, value: unknown): any;
  /**
   * Current entity
   */
  function this_(): Entity;
  /**
   * Throw an error
   */
  function throw_(message: unknown): never;
  /**
   * Try/Catch block
   */
  function try_(try_: any, errorVar: string, catch_: any): any;
  /**
   * Get value type
   */
  function typeof_(value: unknown): string;
  /**
   * Get local variable
   */
  function var_(name: string): any;
  /**
   * Send warning to client
   */
  function warn(message: unknown): void;
  /**
   * Loop while condition is true
   */
  function while_(condition: any, body: any): any;
  namespace list {
    /**
     * Concatenate lists
     */
    function concat(...lists: readonly unknown[][]): any[];
    /**
     * Check if list is empty
     */
    function empty(list: readonly unknown[]): boolean;
    /**
     * Filter list items
     */
    function filter(list: readonly unknown[], lambda: object): any[];
    /**
     * Find item in list
     */
    function find(list: readonly unknown[], lambda: object): any;
    /**
     * FlatMap list items
     */
    function flatMap(list: readonly unknown[], lambda: object): any[];
    /**
     * Get item at index
     */
    function get(list: readonly unknown[], index: number): any;
    /**
     * Check if list includes item
     */
    function includes(list: readonly unknown[], value: any): boolean;
    /**
     * Get list length
     */
    function len(list: readonly unknown[]): number;
    /**
     * Map list items
     */
    function map(list: readonly unknown[], lambda: object): any[];
    /**
     * Create a list
     */
    function new_<T>(...args: any[]): T[];
    /**
     * Remove item from end
     */
    function pop(list: unknown[]): any;
    /**
     * Add item to end
     */
    function push(list: unknown[], value: any): number;
    /**
     * Reduce list items
     */
    function reduce(list: readonly unknown[], lambda: object, init: any): any;
    /**
     * Reverse list order
     */
    function reverse(list: unknown[]): any[];
    /**
     * Set item at index
     */
    function set(list: unknown[], index: number, value: any): any;
    /**
     * Remove item from start
     */
    function shift(list: unknown[]): any;
    /**
     * Extract part of list
     */
    function slice(list: readonly unknown[], start: number, end?: number): any[];
    /**
     * Sort list
     */
    function sort(list: unknown[]): any[];
    /**
     * Remove/Replace items
     */
    function splice(list: unknown[], start: number, deleteCount: number, ...items: any[]): any[];
    /**
     * Add item to start
     */
    function unshift(list: unknown[], value: any): number;
  }
  namespace obj {
    /**
     * Delete object property
     */
    function del<T, K extends keyof T = keyof T>(object: T, key: K): boolean;
    /**
     * Get object entries
     */
    function entries<T>(object: T): readonly [keyof T, T[keyof T]][];
    /**
     * Filter object entries
     */
    function filter<T>(object: T, lambda: object): Partial<T>;
    /**
     * FlatMap object entries
     */
    function flatMap(object: object, lambda: object): any;
    /**
     * Get object property
     */
    function get<T, K extends keyof T = keyof T>(object: T, key: K, default_?: T[K]): T[K];
    /**
     * Check if object has key
     */
    function has<T, K extends keyof T = keyof T>(object: T, key: K): boolean;
    /**
     * Get object keys
     */
    function keys<T>(object: T): readonly (keyof T)[];
    /**
     * Map object values
     */
    function map(object: object, lambda: object): any;
    /**
     * Merge objects
     */
    function merge<Ts extends object[]>(...objects: Ts): UnionToIntersection<Ts[number]>;
    /**
     * Create a new object
     */
    function new_<Kvs extends [] | readonly (readonly [key: "" | (string & {}), value: unknown])[]>(
      ...kvs: any[]
    ): {
      [K in keyof Kvs & `${number}` as (Kvs[K] & [string, unknown])[0]]: (Kvs[K] &
        [string, unknown])[1];
    };
    /**
     * Reduce object entries
     */
    function reduce<Acc>(object: object, lambda: unknown, init: Acc): Acc;
    /**
     * Set object property
     */
    function set<T, K extends keyof T = keyof T>(object: T, key: K, value: T[K]): T;
    /**
     * Get object values
     */
    function values<T>(object: T): readonly T[keyof T][];
  }
  namespace str {
    /**
     * Concatenate strings
     */
    function concat(...strings: any[]): string;
    /**
     * Check if string includes substring
     */
    function includes(string: string, search: string): boolean;
    /**
     * Join list elements with separator
     */
    function join(list: any[], separator: string): string;
    /**
     * Get string length
     */
    function len(string: string): number;
    /**
     * Convert to lowercase
     */
    function lower(string: string): string;
    /**
     * Replace substring
     */
    function replace(string: string, search: string, replace: string): string;
    /**
     * Extract part of string
     */
    function slice(string: string, start: number, end?: number): string;
    /**
     * Split string by separator
     */
    function split(string: string, separator: string): string[];
    /**
     * Trim whitespace
     */
    function trim(string: string): string;
    /**
     * Convert to uppercase
     */
    function upper(string: string): string;
  }
  namespace time {
    /**
     * Format timestamp
     */
    function format(time: string, format?: string): string;
    /**
     * Convert number to ISO
     */
    function from_timestamp(timestamp: number): string;
    /**
     * Get current time (ISO)
     */
    function now(): string;
    /**
     * Add offset to time
     */
    function offset(amount: number, unit: string, base?: string): string;
    /**
     * Parse datetime string
     */
    function parse(time: string): string;
    /**
     * Convert ISO to number
     */
    function to_timestamp(time: string): number;
  }
  namespace json {
    /**
     * Parse JSON string
     */
    function parse(string: string): unknown;
    /**
     * Convert to JSON string
     */
    function stringify(value: unknown): string;
  }
}

export {};
