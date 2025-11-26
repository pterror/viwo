import { Entity, getEntity } from "./repo";

export type PermissionType = "edit" | "enter" | "view";

/**
 * Checks if an actor has permission to perform an action on a target entity.
 *
 * Logic:
 * 1. Wizard Override: If actor is a wizard, allow everything.
 * 2. Ownership: If actor owns the target, allow everything.
 * 3. Explicit Permission: Check target.props.permissions[permission] for actor.id or 'public'.
 * 4. Cascading/Area: If target has a location, recurse up the chain.
 */
export function checkPermission(
  actor: Entity,
  target: Entity,
  permission: PermissionType,
  resolver: (id: number) => Entity | null = getEntity,
): boolean {
  // 1. Wizard Override
  if (actor.props["is_wizard"]) {
    return true;
  }

  // 2. Ownership
  if (target.owner_id === actor.id) {
    return true;
  }

  // 3. Explicit Permission
  const perms = target.props["permissions"] || {};
  const allowedUsers = perms[permission];

  if (Array.isArray(allowedUsers)) {
    if (allowedUsers.includes(actor.id) || allowedUsers.includes("public")) {
      return true;
    }
  } else if (allowedUsers === "public") {
    return true;
  }

  // 4. Cascading/Area (Recursive check on parent)
  if (target.location_id) {
    const parent = resolver(target.location_id);
    if (parent) {
      // We check if the actor has the SAME permission on the parent
      // This implies that if you own the Room, you own the Items in it (unless they have explicit denies? - keeping it simple for now)
      // Actually, standard MOO logic:
      // If I own the room, I can edit things in it? Usually yes for 'edit'.
      // But if I drop my item in your room, do you own it?
      // Let's stick to the plan: "Cascading permissions through all children"
      return checkPermission(actor, parent, permission, resolver);
    }
  }

  return false;
}
