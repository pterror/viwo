// import { type Entity } from "@viwo/shared/jsonrpc";
// import { WrappedEntity } from "./wrappers";

import { hydrateCapability } from "./capabilities";

export function hydrate(value: unknown): unknown {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  // Hydrate Capability
  // Check for signature { id, type, owner_id } or { id, __brand: "Capability" }
  // The DB capability has { id, owner_id, type }
  if ("id" in value && "type" in value && "owner_id" in value) {
    // Provide defaults for missing fields if coming from partial source?
    // Assuming strict hydration for now based on what we see in `repo.ts` getCapability.
    const cap = value as any;
    return hydrateCapability({
      id: cap.id,
      owner_id: cap.owner_id,
      type: cap.type,
    });
  }

  // Hydrate Entity
  // Check signature { id: number, props: ... }
  if ("id" in value && typeof (value as any).id === "number") {
    return value;
  }

  return value;
}
