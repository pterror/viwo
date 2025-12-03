import { describe, it, expect, beforeAll } from "bun:test";
import { scheduler } from "./scheduler";
import { createEntity, addVerb, getEntity, createCapability } from "./repo";
import { registerLibrary, StdLib, ObjectLib, MathLib } from "@viwo/scripting";
import { CoreLib, db } from ".";
import * as KernelLib from "./runtime/lib/kernel";

describe("Scheduler Verification", () => {
  registerLibrary(StdLib);
  registerLibrary(ObjectLib);
  registerLibrary(CoreLib);
  registerLibrary(KernelLib);

  // Start Scheduler
  // Start Scheduler
  scheduler.setSendFactory(
    () => (msg) => console.log("[Scheduler System Message]:", msg),
  );

  setInterval(() => {
    scheduler.process();
  }, 1000);

  let entityId: number;

  beforeAll(() => {
    // Create a test entity
    entityId = createEntity({ name: "SchedulerTestEntity", count: 0 });
    createCapability(entityId, "entity.control", { target_id: entityId });

    // Add a verb that increments the count
    addVerb(
      entityId,
      "increment",
      StdLib.seq(
        StdLib.let(
          "cap",
          KernelLib.getCapability(
            "entity.control",
            ObjectLib.objNew([
              "target_id",
              ObjectLib.objGet(StdLib.this(), "id"),
            ]),
          ),
        ),
        CoreLib.set_entity(
          StdLib.var("cap"),
          ObjectLib.objSet(
            StdLib.this(),
            "count",
            MathLib.add(ObjectLib.objGet(StdLib.this(), "count"), 1),
          ),
        ),
      ),
    );
  });

  it("should schedule a task", () => {
    scheduler.schedule(entityId, "increment", [], 100);

    const task = db
      .query("SELECT * FROM scheduled_tasks WHERE entity_id = ?")
      .get(entityId) as any;
    expect(task).toBeDefined();
    expect(task.verb).toBe("increment");
  });

  it("should process due tasks", async () => {
    // Wait for task to be due
    await new Promise((resolve) => setTimeout(resolve, 150));

    await scheduler.process();

    // Task should be gone
    const task = db
      .query("SELECT * FROM scheduled_tasks WHERE entity_id = ?")
      .get(entityId);
    expect(task).toBeNull();

    // Let's check the entity state.
    const entity = getEntity(entityId);
    expect(entity?.["count"]).toBe(1);
  });
});
