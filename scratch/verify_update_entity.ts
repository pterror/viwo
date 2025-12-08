import { describe, expect, it } from "bun:test";
import { createEntity, getEntity, updateEntity } from "../packages/core/src/repo";
import { db } from "../packages/core/src/db";

describe("Repo Updates", () => {
  it("should update entity properties persistently", () => {
    // Cleanup
    db.query("DELETE FROM entities").run();

    const id = createEntity({ name: "Test", weight: 10 });
    const initial = getEntity(id)!;
    expect(initial["weight"]).toBe(10);

    console.log("Initial:", initial);

    updateEntity({ id, weight: 20 });

    const updated = getEntity(id)!;
    console.log("Updated:", updated);

    expect(updated["weight"]).toBe(20);
  });
});
