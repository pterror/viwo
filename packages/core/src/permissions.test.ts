// @ts-nocheck
// TODO: Re-implement permissions
import { describe, test, expect } from "bun:test";
import { checkPermission } from "./permissions";

describe("Permissions", () => {
  const owner = { id: 1 };
  const other = { id: 2 };
  const wizard = { id: 3, is_wizard: true };

  test("Wizard Override", () => {
    const target = { id: 10, owner: other.id };
    expect(checkPermission(wizard, target, "edit")).toBe(true);
    expect(checkPermission(wizard, target, "view")).toBe(true);
  });

  test("Ownership", () => {
    const target = { id: 10, owner };
    expect(checkPermission(owner, target, "edit")).toBe(true);
    expect(checkPermission(other, target, "edit")).toBe(false);
  });

  test("Explicit Permission", () => {
    const user = { id: 2, props: {} };
    const other = { id: 3, props: {} };

    const item = {
      id: 10,
      owner: 1,
      permissions: {
        edit: [2], // Only user 2
        view: "public",
      },
    };

    expect(checkPermission(user, item, "edit")).toBe(true);
    expect(checkPermission(other, item, "edit")).toBe(false); // Not in list
    expect(checkPermission(other, item, "view")).toBe(true);
  });

  test("Cascading Permissions", () => {
    // Room owned by owner
    const room = { id: 100, owner };
    // Item in room, owned by nobody (or other)
    const item = { id: 101, owner: null, location: room.id };

    // Mock resolver to find the room
    const resolver = (id: number) => (id === 100 ? room : null);

    // Owner of room should be able to edit item in room (cascading)
    expect(checkPermission(owner, item, "edit", resolver)).toBe(true);

    // Other cannot
    expect(checkPermission(other, item, "edit", resolver)).toBe(false);
  });
});
