import { db } from "./db";
import { getEntity, getVerb } from "./repo";
import { evaluate } from "./scripting/interpreter";

export class TaskScheduler {
  constructor() {}

  schedule(entityId: number, verb: string, args: any[], delayMs: number) {
    const executeAt = Date.now() + delayMs;
    db.query(
      "INSERT INTO scheduled_tasks (entity_id, verb, args, execute_at) VALUES (?, ?, ?, ?)",
    ).run(entityId, verb, JSON.stringify(args), executeAt);
  }

  async process() {
    const now = Date.now();
    const tasks = db
      .query("SELECT * FROM scheduled_tasks WHERE execute_at <= ?")
      .all(now) as any[];

    if (tasks.length === 0) return;

    // Delete tasks immediately to prevent double execution if processing takes time
    // In a more robust system we might use a status flag or transaction
    const ids = tasks.map((t) => t.id);
    db.query(
      `DELETE FROM scheduled_tasks WHERE id IN (${ids.join(",")})`,
    ).run();

    for (const task of tasks) {
      try {
        const entity = getEntity(task.entity_id);
        const verb = getVerb(task.entity_id, task.verb);
        const args = JSON.parse(task.args);

        if (entity && verb) {
          // We need a way to access the system context here.
          // Since this is running outside of a websocket request, we need a "system" context.
          // We might need to pass the system context or create a fresh one.
          // For now, let's create a minimal context.
          // We'll need to import the system functions or pass them in.
          // To avoid circular dependencies, we might need to inject dependencies into TaskScheduler.
          // But for now, let's try to dynamic import or use what we have.

          // We can reuse the same sys object structure as in index.ts, but without the ws.send part (or log to console).

          const { updateEntity, createEntity, deleteEntity } = await import(
            "./repo"
          );

          await evaluate(verb.code, {
            caller: entity, // The entity calls itself? Or system? Let's say entity calls itself.
            this: entity,
            args: args,
            gas: 1000,
            sys: {
              move: (id, dest) => updateEntity(id, { location_id: dest }),
              create: (data) => createEntity(data),
              destroy: (id) => deleteEntity(id),
              send: (msg) =>
                console.log(`[Scheduler] Message to ${entity.name}:`, msg),
              // We need to support scheduling from within scheduled tasks too!
              // But we don't have access to the scheduler instance here easily unless we make it a singleton or pass it.
              // Let's make the scheduler a singleton export in index.ts or here.
              // If we export an instance here, index.ts can use it.
            },
            warnings: [],
          });
        }
      } catch (e) {
        console.error(`[Scheduler] Error executing task ${task.id}:`, e);
      }
    }
  }
}

export const scheduler = new TaskScheduler();
