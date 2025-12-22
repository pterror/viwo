import { ScriptError, createScriptContext, defineFullOpcode, evaluate } from "@viwo/scripting";
import { type Verb, getEntity, getPrototypeId, getVerb, getVerbs } from "../../repo";
import { type Entity } from "@viwo/shared/jsonrpc";
import { hydrate } from "../hydration";
import { resolveProps } from "../utils";
import { scheduler } from "../../scheduler";

// Entity Interaction

/** Calls a verb on an entity. */
export const call = defineFullOpcode<[Entity, string, ...unknown[]], any>("call", {
  handler: ([target, verb, ...callArgs], ctx) => {
    const targetVerb = getVerb(target.id, verb);
    if (!targetVerb) {
      throw new ScriptError(`call: verb '${verb}' not found on ${target.id}`);
    }
    const hydratedArgs = callArgs.map(hydrate);
    return evaluate(
      targetVerb.code,
      createScriptContext({
        args: hydratedArgs,
        caller: ctx.caller,
        gas: ctx.gas, // Inherit gas from parent context
        ops: ctx.ops,
        stack: [...(ctx.stack ?? []), { args: hydratedArgs, name: verb }],
        this: target,
        warnings: ctx.warnings,
        ...(ctx.send ? { send: ctx.send } : {}),
      }),
    );
  },
  metadata: {
    category: "action",
    description: "Call a verb on an entity",
    label: "Call",
    parameters: [
      { description: "The entity to call.", name: "target", type: "Entity" },
      { description: "The verb to call.", name: "verb", type: "string" },
      { description: "Arguments to pass to the verb.", name: "...args", type: "any[]" },
    ],
    returnType: "any",
    slots: [
      { name: "Target", type: "block" },
      { name: "Verb", type: "string" },
      { name: "Args...", type: "block" },
    ],
  },
});

export const schedule = defineFullOpcode<[string, unknown[], number], null>("schedule", {
  handler: ([verb, callArgs, delay], ctx) => {
    scheduler.schedule(ctx.this.id, verb, callArgs, delay);
    return null;
  },
  metadata: {
    category: "action",
    description: "Schedule a verb call",
    label: "Schedule",
    parameters: [
      { description: "The verb to schedule.", name: "verb", type: "string" },
      { description: "Arguments to pass to the verb.", name: "args", type: "any[]" },
      { description: "Delay in milliseconds.", name: "delay", type: "number" },
    ],
    returnType: "null",
    slots: [
      { name: "Verb", type: "string" },
      { name: "Args", type: "block" },
      { name: "Delay", type: "number" },
    ],
  },
});

// Entity Introspection
/** Returns a list of verbs available on an entity. */
export const verbs = defineFullOpcode<[Entity], readonly Verb[]>("verbs", {
  handler: ([target], _ctx) => {
    if (!target || !("id" in target)) {
      return [];
    }
    return getVerbs(target.id);
  },
  metadata: {
    category: "world",
    description: "Get available verbs",
    label: "Verbs",
    parameters: [{ description: "The entity to get verbs from.", name: "target", type: "Entity" }],
    returnType: "Verb[]",
    slots: [{ name: "Target", type: "block" }],
  },
});

/** Returns a specific verb from an entity. */
export const get_verb = defineFullOpcode<[Entity, string], Verb | null>("get_verb", {
  handler: ([target, name], _ctx) => {
    if (!target || !("id" in target)) {
      return null;
    }
    return getVerb(target.id, name);
  },
  metadata: {
    category: "world",
    description: "Get specific verb",
    label: "Get Verb",
    parameters: [
      { description: "The entity to get the verb from.", name: "target", type: "Entity" },
      { description: "The name of the verb.", name: "name", type: "string" },
    ],
    returnType: "Verb | null",
    slots: [
      { name: "Target", type: "block" },
      { name: "Name", type: "string" },
    ],
  },
});

/** Retrieves an entity by ID. */
export const entity = defineFullOpcode<[number], Entity>("entity", {
  handler: ([id], _ctx) => {
    const entity = getEntity(id);
    if (!entity) {
      throw new ScriptError(`entity: entity ${id} not found`);
    }
    return entity;
  },
  metadata: {
    category: "world",
    description: "Get entity by ID",
    label: "Entity",
    parameters: [{ description: "The ID of the entity.", name: "id", type: "number" }],
    returnType: "Entity",
    slots: [{ name: "ID", type: "number" }],
  },
});

/** Gets the prototype ID of an entity. */
export const getPrototype = defineFullOpcode<[Entity], number | null>("get_prototype", {
  handler: ([entity], _ctx) => {
    if (!entity || typeof entity.id !== "number") {
      throw new ScriptError(`get_prototype: expected entity, got ${JSON.stringify(entity)}`);
    }
    return getPrototypeId(entity.id);
  },
  metadata: {
    category: "world",
    description: "Get entity prototype ID",
    label: "Get Prototype",
    parameters: [
      { description: "The entity to get the prototype of.", name: "target", type: "Entity" },
    ],
    returnType: "number | null",
    slots: [{ name: "Entity", type: "block" }],
  },
});

/** Resolves all properties of an entity, including dynamic ones. */
export const resolve_props = defineFullOpcode<[Entity], Entity>("resolve_props", {
  handler: ([entity], ctx) => resolveProps(entity, ctx),

  metadata: {
    category: "data",
    description: "Resolve entity properties",
    label: "Resolve Props",
    parameters: [
      { description: "The entity to resolve properties for.", name: "target", type: "Entity" },
    ],
    returnType: "Entity",
    slots: [{ name: "Entity", type: "block" }],
  },
});
