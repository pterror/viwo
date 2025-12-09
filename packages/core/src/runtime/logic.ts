import { type Capability, type ScriptContext, ScriptError } from "@viwo/scripting";
import {
  createCapability,
  createEntity,
  deleteEntity,
  setPrototypeId,
  updateEntity,
} from "../repo";
import { type Entity } from "@viwo/shared/jsonrpc";
import { checkCapability } from "./utils";

export function destroyEntityLogic(
  capability: Capability | null,
  targetId: number,
  ctx: ScriptContext,
) {
  if (!capability) {
    throw new ScriptError("destroy: expected capability");
  }
  checkCapability(
    capability,
    ctx.this.id,
    "entity.control",
    (params) => params["target_id"] === targetId,
  );
  deleteEntity(targetId);
}

export function createEntityLogic(
  capability: Capability | null,
  data: object,
  ctx: ScriptContext,
): number {
  if (!capability) {
    throw new ScriptError("create: expected capability");
  }

  checkCapability(capability, ctx.this.id, "sys.create");

  const newId = createEntity(data as never);
  // Mint entity.control for the new entity and give to creator
  createCapability(ctx.this.id, "entity.control", { target_id: newId });
  return newId;
}

export function updateEntityLogic(
  capability: Capability | null,
  entity: Entity,
  updates: object,
  ctx: ScriptContext,
): Entity {
  if (!capability) {
    throw new ScriptError("set_entity: expected capability");
  }
  if (!entity || typeof entity.id !== "number") {
    throw new ScriptError(`set_entity: expected entity object, got ${JSON.stringify(entity)}`);
  }
  if ("id" in updates) {
    throw new ScriptError("set_entity: cannot update 'id'");
  }
  const allowedOwners = [ctx.this.id];
  if (ctx.caller) {
    allowedOwners.push(ctx.caller.id);
  }
  checkCapability(
    capability,
    allowedOwners,
    "entity.control",
    (params) => params["target_id"] === entity.id,
  );
  updateEntity({ id: entity.id, ...updates });
  // updateEntity({ id: entity.id, ...updates }); // Warning: Duplicate call in original code, removing one.
  return { ...entity, ...updates };
}

export function setPrototypeLogic(
  capability: Capability | null,
  entity: Entity,
  protoId: number | null,
  ctx: ScriptContext,
) {
  if (!capability) {
    throw new ScriptError("set_prototype: expected capability");
  }
  if (!entity || typeof entity.id !== "number") {
    throw new ScriptError(`set_prototype: expected entity, got ${JSON.stringify(entity)}`);
  }
  checkCapability(
    capability,
    ctx.this.id,
    "entity.control",
    (params) => params["target_id"] === entity.id,
  );
  if (protoId !== null && typeof protoId !== "number") {
    throw new ScriptError(
      `set_prototype: expected number or null for prototype ID, got ${JSON.stringify(protoId)}`,
    );
  }
  setPrototypeId(entity.id, protoId);
}
