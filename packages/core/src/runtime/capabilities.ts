import { type Capability, type ScriptContext, ScriptError } from "@viwo/scripting";
import { deepFreeze } from "./utils";
import { destroyEntityLogic } from "./logic";

export abstract class BaseCapability implements Capability {
  readonly __brand = "Capability" as const;
  constructor(
    public readonly id: string,
    public readonly ownerId: number,
  ) {
    deepFreeze(this);
  }

  // Helper to check ownership or validity if needed
  protected check(_ctx: ScriptContext) {
    // Basic check: is the capability still valid?
    // In strict mode, we might check DB.
    // For now, identity is enough.
  }
}

export class EntityControl extends BaseCapability {
  static readonly type = "viwo.capability.entity_control";

  // Example Method 1: Destroy
  // Logic refactored from sys.destroy opcode
  destroy(targetId: number | null, ctx: ScriptContext) {
    // If targetId is null, assume we are destroying the target of this capability?
    // The capability has a target_id param.
    // Core logic checks if params["target_id"] === targetId.
    // So if targetId is provided, we use it.
    // If NOT provided, we might want to infer it?
    // For now, let's require targetId as per method signature.
    if (targetId === null) {
      throw new ScriptError("EntityControl.destroy: targetId is required");
    }
    destroyEntityLogic(this, targetId, ctx);
    return true;
  }
}

// Registry for Hydration
export const CAPABILITY_CLASSES: Record<
  string,
  new (id: string, ownerId: number) => BaseCapability
> = {
  [EntityControl.type]: EntityControl,
};

export function hydrateCapability(data: {
  id: string;
  owner_id: number;
  type: string;
}): BaseCapability {
  const Class = CAPABILITY_CLASSES[data.type];
  if (Class) {
    return new Class(data.id, data.owner_id);
  }
  // Fallback for unknown types? Return raw object?
  // Or generic BaseCapability?
  // For now, raw object implies it has no methods, which fits "unknown".
  return data as any;
}
