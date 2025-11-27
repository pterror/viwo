import { ScriptContext, evaluateTarget } from "../interpreter";
import { getEntity, getContents } from "../../repo";
import { checkPermission } from "../../permissions";

export const WorldLibrary = {
  "world.entities": async (_args: any[], ctx: ScriptContext) => {
    // This might be expensive, so we should be careful.
    // Ideally we should have a way to get all entities from the repo.
    // For now, let's assume we can get them via a system call or we need to add a repo function.
    // Since we don't have a direct getAllEntities in repo.ts yet, we might need to add it.
    // But for now, let's check if we can access the DB directly or if we should add a helper.
    // Let's assume we will add `getAllEntities` to repo.ts.
    if (ctx.sys?.getAllEntities) {
      return ctx.sys.getAllEntities();
    }
    return [];
  },
  "entity.contents": async (args: any[], ctx: ScriptContext) => {
    const [targetExpr] = args;
    const target = await evaluateTarget(targetExpr, ctx);
    if (!target) return [];

    // Check permission
    if (!checkPermission(ctx.caller, target, "view")) {
      // Return empty list if cannot view container
      return [];
    }

    const contents = getContents(target.id);
    return contents.map((e) => e.id);
  },
  "entity.descendants": async (args: any[], ctx: ScriptContext) => {
    const [targetExpr] = args;
    const target = await evaluateTarget(targetExpr, ctx);
    if (!target) return [];

    // Check permission on root
    if (!checkPermission(ctx.caller, target, "view")) {
      return [];
    }

    const descendants: number[] = [];
    const queue = [target.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      // We might want to check permission for each container in the hierarchy?
      // For now, let's assume if you can view the root, you can view descendants?
      // Or maybe check view on each container as we traverse.
      // Let's check view on currentId before getting contents.

      // We need to fetch entity to check permission if it's not target
      let currentEntity = target;
      if (currentId !== target.id) {
        const { getEntity } = await import("../../repo");
        const e = getEntity(currentId);
        if (!e) continue;
        currentEntity = e;
        if (!checkPermission(ctx.caller, currentEntity, "view")) {
          continue; // Skip this branch
        }
      }

      const contents = getContents(currentId);
      for (const item of contents) {
        descendants.push(item.id);
        queue.push(item.id);
      }
    }
    return descendants;
  },
  "entity.ancestors": async (args: any[], ctx: ScriptContext) => {
    const [targetExpr] = args;
    let target = await evaluateTarget(targetExpr, ctx);
    if (!target) return [];

    const ancestors: number[] = [];
    while (target && target.location_id) {
      ancestors.push(target.location_id);
      target = getEntity(target.location_id);
    }
    return ancestors;
  },
};
