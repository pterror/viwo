import { db } from "./db";
import { getEntity, getVerb } from "./repo";
import { evaluate } from "./scripting/interpreter";

/**
 * Manages scheduled tasks (delayed verb executions).
 * Tasks are persisted in the database until execution.
 */
export class TaskScheduler {
  constructor() {}

  /**
   * Schedules a verb to be executed on an entity after a delay.
   *
   * @param entityId - The ID of the entity to execute the verb on.
   * @param verb - The name of the verb.
   * @param args - Arguments to pass to the verb.
   * @param delayMs - Delay in milliseconds.
   */
  schedule(
    entityId: number,
    verb: string,
    args: readonly unknown[],
    delayMs: number,
  ) {
    const executeAt = Date.now() + delayMs;
    db.query(
      "INSERT INTO scheduled_tasks (entity_id, verb, args, execute_at) VALUES (?, ?, ?, ?)",
    ).run(entityId, verb, JSON.stringify(args), executeAt);
  }

  private sendFactory: (() => (msg: unknown) => void) | null = null;
  /**
   * Sets the factory function for creating the 'send' function used in scheduled tasks.
   * This allows the scheduler to send messages to clients even when triggered asynchronously.
   *
   * @param factory - A function that returns a send function.
   */
  setSendFactory(factory: () => (msg: unknown) => void) {
    this.sendFactory = factory;
  }

  /**
   * Processes all due tasks.
   * Should be called periodically (e.g., every tick).
   */
  async process() {
    const now = Date.now();
    const tasks = db
      .query("SELECT * FROM scheduled_tasks WHERE execute_at <= ?")
      .all(now) as any[];

    if (tasks.length === 0) return;

    // Delete tasks immediately
    const ids = tasks.map((t) => t.id);
    db.query(
      `DELETE FROM scheduled_tasks WHERE id IN (${ids.join(",")})`,
    ).run();

    if (!this.sendFactory) {
      throw new Error("[Scheduler] No send factory set.");
    }

    const send = this.sendFactory();

    for (const task of tasks) {
      try {
        const entity = getEntity(task.entity_id);
        const verb = getVerb(task.entity_id, task.verb);
        const args = JSON.parse(task.args);

        if (entity && verb) {
          await evaluate(verb.code, {
            caller: entity,
            this: entity,
            args: args,
            gas: 1000,
            send,
            warnings: [],
            vars: {},
          });
        }
      } catch (e) {
        console.error(`[Scheduler] Error executing task ${task.id}:`, e);
      }
    }
  }
}

export const scheduler = new TaskScheduler();
