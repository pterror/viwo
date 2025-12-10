import {
  type Capability,
  type ScriptContext,
  ScriptError,
  createScriptContext,
  evaluate,
} from "@viwo/scripting";
import { checkCapability, deepFreeze } from "./utils";
import {
  createCapability,
  deleteEntity,
  getEntity,
  getVerb,
  setPrototypeId,
  updateCapabilityOwner,
  updateEntity,
} from "../repo";
import { createEntityLogic } from "./logic";

export abstract class BaseCapability implements Capability {
  static readonly type: string;
  readonly type: string;
  readonly __brand = "Capability" as const;
  constructor(
    public readonly id: string,
    public readonly ownerId: number,
    public readonly params: any,
  ) {
    this.type = (this.constructor as typeof BaseCapability).type;
    deepFreeze(this);
  }

  // Helper to check ownership or validity if needed
}

export class EntityControl extends BaseCapability {
  static override readonly type = "entity.control";

  // Example Method 1: Destroy
  // Logic refactored from sys.destroy opcode
  destroy(targetId: number | null, _ctx: ScriptContext) {
    // If targetId is null, assume we are destroying the target of this capability?
    // The capability has a target_id param.
    // Core logic checks if params["target_id"] === targetId.
    // So if targetId is provided, we use it.
    // If NOT provided, we might want to infer it?
    // For now, let's require targetId as per method signature.
    if (targetId === null) {
      throw new ScriptError("EntityControl.destroy: targetId is required");
    }

    if (!this.params["*"] && this.params["target_id"] !== targetId) {
      throw new ScriptError("Capability parameters do not match requirements");
    }

    deleteEntity(targetId);
    return true;
  }

  update(targetId: number, updates: object, _ctx: ScriptContext) {
    if (!targetId && targetId !== 0) {
      throw new ScriptError("EntityControl.update: targetId is required");
    }
    const entity = getEntity(targetId);
    if (!entity) {
      throw new ScriptError(`EntityControl.update: entity ${targetId} not found`);
    }

    if ("id" in updates) {
      throw new ScriptError("set_entity: cannot update 'id'");
    }
    if ("prototype_id" in updates) {
      throw new ScriptError("set_entity: cannot update 'prototype_id'");
    }

    if (!this.params["*"] && this.params["target_id"] !== targetId) {
      throw new ScriptError("Capability parameters do not match requirements");
    }

    updateEntity({ id: targetId, ...updates });
    return { ...entity, ...updates };
  }

  setPrototype(targetId: number, protoId: number | null, _ctx: ScriptContext) {
    if (!targetId && targetId !== 0) {
      throw new ScriptError("EntityControl.setPrototype: targetId is required");
    }
    const entity = getEntity(targetId);
    if (!entity) {
      throw new ScriptError(`EntityControl.setPrototype: entity ${targetId} not found`);
    }

    if (!this.params["*"] && this.params["target_id"] !== targetId) {
      throw new ScriptError("Capability parameters do not match requirements");
    }

    if (protoId !== null && typeof protoId !== "number") {
      throw new ScriptError(
        `set_prototype: expected number or null for prototype ID, got ${JSON.stringify(protoId)}`,
      );
    }
    setPrototypeId(targetId, protoId);
    return true;
  }
}

export class SysMint extends BaseCapability {
  static override readonly type = "sys.mint";

  mint(type: string, params: object, ctx: ScriptContext) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("mint: invalid authority capability");
    }

    const allowedNs = this.params["namespace"];
    if (typeof allowedNs !== "string") {
      throw new ScriptError("mint: authority namespace must be string");
    }
    if (allowedNs !== "*" && !type.startsWith(allowedNs)) {
      throw new ScriptError(`mint: authority namespace '${allowedNs}' does not cover '${type}'`);
    }

    const newId = createCapability(ctx.this.id, type, params as never);
    return hydrateCapability({ id: newId, ownerId: ctx.this.id, params, type });
  }

  delegate(restrictions: object, ctx: ScriptContext) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("delegate: invalid parent capability");
    }
    const newParams = { ...this.params, ...(restrictions as object) };
    const newId = createCapability(ctx.this.id, this.type, newParams);

    return hydrateCapability({
      id: newId,
      ownerId: ctx.this.id,
      params: newParams,
      type: this.type,
    });
  }

  give(targetId: number, ctx: ScriptContext) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("give: invalid capability");
    }
    updateCapabilityOwner(this.id, targetId);
    return null;
  }
}

export class SysCreate extends BaseCapability {
  static override readonly type = "sys.create";

  create(data: object, ctx: ScriptContext) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("sys.create: capability not owned by caller");
    }
    return createEntityLogic(this, data, ctx);
  }
}

export class SysSudo extends BaseCapability {
  static override readonly type = "sys.sudo";

  exec(target: any, verb: string, args: any[], ctx: ScriptContext) {
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("sys.sudo: capability not owned by caller");
    }

    if (!target || !("id" in target) || typeof target.id !== "number") {
      throw new ScriptError(`sys.sudo.exec: target must be an entity`);
    }

    const targetVerb = getVerb(target.id, verb);
    if (!targetVerb) {
      throw new ScriptError(`sys.sudo.exec: verb '${verb}' not found on ${target.id}`);
    }

    const callerId = ctx.caller.id;
    const originalSend = ctx.send;

    return evaluate(
      targetVerb.code,
      createScriptContext({
        args,
        caller: target, // Impersonation
        ops: ctx.ops,
        stack: [...(ctx.stack ?? []), { args, name: `sudo:${verb}` }],
        this: target,
        warnings: ctx.warnings,
        ...(originalSend
          ? {
              send: (type: string, payload: unknown) => {
                if (callerId === 4) {
                  originalSend("forward", {
                    payload,
                    target: target.id,
                    type,
                  });
                } else {
                  originalSend(type, payload);
                }
              },
            }
          : {}),
      }),
    );
  }
}

// Registry for Hydration
export interface CapabilityRegistry {
  [EntityControl.type]: typeof EntityControl;
  [SysMint.type]: typeof SysMint;
  [SysCreate.type]: typeof SysCreate;
  [SysSudo.type]: typeof SysSudo;
}

export const CAPABILITY_CLASSES: CapabilityRegistry = {} as CapabilityRegistry;

function getKey<Type, Key extends keyof Type>(type: Type, key: Key) {
  return type[key];
}

function setKey<Type, Key extends keyof Type>(type: Type, key: Key, value: Type[Key]) {
  type[key] = value;
}

export function registerCapabilityClass<Key extends keyof CapabilityRegistry>(
  Class: CapabilityRegistry[Key] & { type: Key },
) {
  if (getKey(CAPABILITY_CLASSES, Class.type)) {
    throw new Error(`Capability class for type '${Class.type}' is already registered.`);
  }
  setKey(CAPABILITY_CLASSES, Class.type as Key, Class);
}

function createCapabilityProxy(capability: BaseCapability): BaseCapability {
  return new Proxy(capability, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function" && prop !== "constructor") {
        return function proxy(this: BaseCapability, ...args: any[]) {
          const ctx = args.at(-1);
          if (ctx && typeof ctx === "object" && "this" in ctx) {
            checkCapability(
              target,
              // Check if caller OR execution context owns the capability
              [ctx.caller.id, ctx.this.id],
              (target.constructor as typeof BaseCapability).type,
            );
          }
          return value.apply(this, args);
        };
      }
      return value;
    },
  });
}

export function hydrateCapability(data: {
  id: string;
  ownerId: number;
  type: string;
  params: any;
}): BaseCapability {
  const Class = (CAPABILITY_CLASSES as any)[data.type];
  if (Class) {
    const instance = new Class(data.id, data.ownerId, data.params);
    return createCapabilityProxy(instance);
  }
  // Fallback for unknown types (e.g. user capabilities)
  // We still need to return a valid Capability object (with __brand)
  return { ...data, __brand: "Capability" } as any;
}

registerCapabilityClass(EntityControl);
registerCapabilityClass(SysMint);
registerCapabilityClass(SysCreate);
registerCapabilityClass(SysSudo);
