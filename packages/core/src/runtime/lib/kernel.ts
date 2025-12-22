import { type Capability, ScriptError, defineFullOpcode } from "@viwo/scripting";
import {
  createCapability,
  getCapabilities,
  getCapability as originalGetCapability,
  updateCapabilityOwner,
} from "../../repo";
import type { Entity } from "@viwo/shared/jsonrpc";
import { hydrateCapability } from "../capabilities";

export const getCapability = defineFullOpcode<[type: string, filter?: object], Capability | null>(
  "get_capability",
  {
    handler: ([type, filter = {}], ctx) => {
      const capabilities = getCapabilities(ctx.this.id);
      const match = capabilities.find((capability) => {
        if (capability.type !== type) {
          return false;
        }
        // UNDOCUMENTED: Wildcard capability bypasses all filter checks.
        // A capability with { "*": true } matches ANY filter, acting as a super-capability.
        // This should either be documented or removed - see TODO.md
        if (capability.params["*"] === true) {
          return true;
        }
        // Check filter params
        for (const [key, value] of Object.entries(filter as Record<string, unknown>)) {
          if (JSON.stringify(capability.params[key]) !== JSON.stringify(value)) {
            return false;
          }
        }
        return true;
      });
      if (!match) {
        return null;
      }
      return hydrateCapability({
        id: match.id,
        ownerId: match.owner_id,
        params: match.params,
        type: match.type,
      });
    },
    metadata: {
      category: "kernel",
      description: "Retrieve a capability owned by the current entity",
      genericParameters: ["Type extends keyof CapabilityRegistry"],
      label: "Get Capability",
      parameters: [
        { description: "The capability type.", name: "type", type: "Type" },
        { description: "Filter parameters.", name: "filter", optional: true, type: "object" },
      ],
      returnType: "CapabilityRegistry[Type] | null",
      slots: [
        { name: "Type", type: "string" },
        { name: "Filter", type: "block" },
      ],
    },
  },
);

export const mint = defineFullOpcode<
  [authority: Capability | null, type: string, params: object],
  Capability
>("mint", {
  handler: ([auth, type, params], ctx) => {
    if (!auth || (auth as any).__brand !== "Capability") {
      throw new ScriptError("mint: expected capability for authority");
    }

    // Verify authority
    const authCap = originalGetCapability((auth as Capability).id);
    if (!authCap || authCap["owner_id"] !== ctx.this.id) {
      throw new ScriptError("mint: invalid authority capability");
    }

    if (authCap.type !== "sys.mint") {
      throw new ScriptError("mint: authority must be sys.mint");
    }

    // Check namespace
    // authCap.params.namespace should match type
    // e.g. namespace "user.123" allows "user.123.foo"
    // namespace "*" allows everything
    const allowedNs = authCap.params["namespace"];
    if (typeof allowedNs !== "string") {
      throw new ScriptError("mint: authority namespace must be string");
    }
    if (allowedNs !== "*" && !type.startsWith(allowedNs)) {
      throw new ScriptError(`mint: authority namespace '${allowedNs}' does not cover '${type}'`);
    }
    const newId = createCapability(ctx.this.id, type, params as never);
    return hydrateCapability({ id: newId, ownerId: ctx.this.id, params, type });
  },
  metadata: {
    category: "kernel",
    description: "Mint a new capability (requires sys.mint)",
    label: "Mint Capability",
    parameters: [
      { description: "The authority capability.", name: "authority", type: "object" },
      { description: "The capability type to mint.", name: "type", type: "string" },
      { description: "The capability parameters.", name: "params", type: "object" },
    ],
    returnType: "Capability",
    slots: [
      { name: "Authority", type: "block" },
      { name: "Type", type: "string" },
      { name: "Params", type: "block" },
    ],
  },
});

/**
 * Validates that a child value is a valid restriction of a parent value.
 * Returns true if child is equal to or more restrictive than parent.
 *
 * LIMITATION: String restriction semantics are determined by key name conventions:
 * - "path": child must be a subpath of parent (e.g., "/home/user" -> "/home/user/docs")
 * - "domain": child must be subdomain or equal (e.g., "example.com" -> "api.example.com")
 * - "namespace": child must be more specific prefix (e.g., "user" -> "user.123")
 * - Other strings: require exact match
 *
 * Future improvement: Capability types could define their own restriction schemas.
 */
function isValidRestriction(parentValue: unknown, childValue: unknown, key: string): boolean {
  // Same value is always valid
  if (JSON.stringify(parentValue) === JSON.stringify(childValue)) {
    return true;
  }

  // Wildcard: parent "*" allows anything, but child can't add "*" if parent lacks it
  if (key === "*") {
    // Parent has wildcard - child can remove it (more restrictive) or keep it
    if (parentValue === true) {
      return childValue === true || childValue === false;
    }
    // Parent lacks wildcard - child cannot add it
    return false;
  }

  // Arrays: child must be subset of parent (e.g., method: ["GET", "POST"] -> ["GET"])
  if (Array.isArray(parentValue) && Array.isArray(childValue)) {
    return childValue.every((item) => parentValue.includes(item));
  }

  // Path-like strings: child path must be under parent path
  if (key === "path" && typeof parentValue === "string" && typeof childValue === "string") {
    // Normalize paths: ensure they end consistently for prefix comparison
    const normalizedParent = parentValue.endsWith("/") ? parentValue : parentValue + "/";
    const normalizedChild = childValue.endsWith("/") ? childValue : childValue + "/";
    return normalizedChild.startsWith(normalizedParent) || childValue === parentValue;
  }

  // Domain strings: child must be subdomain or equal
  if (key === "domain" && typeof parentValue === "string" && typeof childValue === "string") {
    return childValue === parentValue || childValue.endsWith("." + parentValue);
  }

  // Namespace strings: child namespace must be equal or more specific prefix
  if (key === "namespace" && typeof parentValue === "string" && typeof childValue === "string") {
    if (parentValue === "*") {
      return true; // Parent allows all namespaces
    }
    return childValue.startsWith(parentValue);
  }

  // Numbers (like target_id): must match exactly, cannot change target
  if (typeof parentValue === "number" && typeof childValue === "number") {
    return parentValue === childValue;
  }

  // Booleans: for restrictive flags, can only make MORE restrictive
  // e.g., readonly: false -> readonly: true is OK, but true -> false is NOT
  if (typeof parentValue === "boolean" && typeof childValue === "boolean") {
    // If parent is restrictive (true), child cannot be less restrictive (false)
    // If parent is permissive (false), child can be either
    return parentValue === false || childValue === true;
  }

  // Unknown types: require exact match for safety
  return false;
}

export const delegate = defineFullOpcode<
  [parent: Capability | null, restrictions: object],
  Capability
>("delegate", {
  handler: ([parent, restrictions], ctx) => {
    if (!parent || (parent as any).__brand !== "Capability") {
      throw new ScriptError("delegate: expected capability");
    }

    const parentCap = originalGetCapability((parent as Capability).id);
    if (!parentCap || parentCap["owner_id"] !== ctx.this.id) {
      throw new ScriptError("delegate: invalid parent capability");
    }

    const restrictionsObj = restrictions as Record<string, unknown>;
    const parentParams = parentCap.params as Record<string, unknown>;
    const parentHasWildcard = parentParams["*"] === true;

    // Validate that each restriction is actually MORE restrictive (subset validation)
    for (const [key, childValue] of Object.entries(restrictionsObj)) {
      const parentValue = parentParams[key];

      // Check if child is adding a new key that parent doesn't have
      if (!(key in parentParams)) {
        // Special case: never allow adding wildcard (it's expansive, not restrictive)
        if (key === "*") {
          throw new ScriptError("delegate: cannot add wildcard '*' - would expand permissions");
        }
        // If parent has wildcard, adding new restrictive params is allowed
        // (we're narrowing from "everything" to "specific things")
        if (parentHasWildcard) {
          continue;
        }
        // Adding restrictive boolean flags is always OK (e.g., readonly: true)
        if (typeof childValue === "boolean" && childValue === true) {
          continue;
        }
        throw new ScriptError(
          `delegate: cannot add new parameter '${key}' - parent capability lacks this parameter`,
        );
      }

      // Validate the restriction is actually more restrictive
      if (!isValidRestriction(parentValue, childValue, key)) {
        throw new ScriptError(
          `delegate: restriction '${key}' would expand permissions (parent: ${JSON.stringify(parentValue)}, child: ${JSON.stringify(childValue)})`,
        );
      }
    }

    const newParams = { ...parentParams, ...restrictionsObj };
    const newId = createCapability(ctx.this.id, parentCap.type, newParams);

    return hydrateCapability({
      id: newId,
      ownerId: ctx.this.id,
      params: newParams,
      type: parentCap.type,
    });
  },
  metadata: {
    category: "kernel",
    description: "Create a restricted version of a capability",
    label: "Delegate Capability",
    parameters: [
      { description: "The parent capability.", name: "parent", type: "object" },
      { description: "The restrictions to apply.", name: "restrictions", type: "object" },
    ],
    returnType: "Capability",
    slots: [
      { name: "Parent", type: "block" },
      { name: "Restrictions", type: "block" },
    ],
  },
});

export const giveCapability = defineFullOpcode<[cap: Capability | null, target: Entity], null>(
  "give_capability",
  {
    handler: ([cap, target], ctx) => {
      if (!cap || (cap as any).__brand !== "Capability") {
        throw new ScriptError("give_capability: expected capability");
      }

      if (!target || typeof target.id !== "number") {
        throw new ScriptError("give_capability: expected target entity");
      }

      const dbCap = originalGetCapability((cap as Capability).id);
      if (!dbCap || dbCap["owner_id"] !== ctx.this.id) {
        throw new ScriptError("give_capability: invalid capability");
      }

      updateCapabilityOwner((cap as Capability).id, target.id);
      return null;
    },
    metadata: {
      category: "kernel",
      description: "Transfer a capability to another entity",
      label: "Give Capability",
      parameters: [
        { description: "The capability to give.", name: "cap", type: "object" },
        { description: "The target entity.", name: "target", type: "object" },
      ],
      returnType: "null",
      slots: [
        { name: "Cap", type: "block" },
        { name: "Target", type: "block" },
      ],
    },
  },
);

export const hasCapability = defineFullOpcode<
  [target: Entity, type: string, filter?: object],
  boolean
>("has_capability", {
  handler: ([target, type, filter = {}], _ctx) => {
    if (!target || typeof target.id !== "number") {
      throw new ScriptError("has_capability: expected target entity");
    }
    const capabilities = getCapabilities(target.id);
    const match = capabilities.find((capability) => {
      if (capability.type !== type) {
        return false;
      }
      // Wildcard capability - see comment in getCapability
      if (capability.params["*"] === true) {
        return true;
      }
      // Check filter params
      for (const [key, value] of Object.entries(filter as Record<string, unknown>)) {
        if (JSON.stringify(capability.params[key]) !== JSON.stringify(value)) {
          return false;
        }
      }
      return true;
    });

    return !!match;
  },
  metadata: {
    category: "kernel",
    description: "Check if an entity has a capability",
    label: "Has Capability",
    parameters: [
      { description: "The target entity.", name: "target", type: "object" },
      { description: "The capability type.", name: "type", type: "string" },
      { description: "Filter parameters.", name: "filter", optional: true, type: "object" },
    ],
    returnType: "boolean",
    slots: [
      { name: "Target", type: "block" },
      { name: "Type", type: "string" },
      { name: "Filter", type: "block" },
    ],
  },
});
