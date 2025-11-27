import { describe, test, expect } from "bun:test";
import { checkPermission } from "./permissions";
import { Entity } from "./repo";

// Mock Entity Helper
const mockEntity = (
  id: number,
  props: any = {},
  owner_id: number | null = null,
  location_id: number | null = null,
): Entity => ({
  id,
  name: "Mock",
  kind: "ITEM",
  location_id,
  location_detail: null,
  prototype_id: null,
  owner_id,
  created_at: "",
  updated_at: "",
  props,
  state: {},
  ai_context: {},
  slug: null,
});

describe("Permissions", () => {
  const owner = mockEntity(1);
  const other = mockEntity(2);
  const wizard = mockEntity(3, { is_wizard: true });

  test("Wizard Override", () => {
    const target = mockEntity(10, {}, other.id);
    expect(checkPermission(wizard, target, "edit")).toBe(true);
    expect(checkPermission(wizard, target, "view")).toBe(true);
  });

  test("Ownership", () => {
    const target = mockEntity(10, {}, owner.id);
    expect(checkPermission(owner, target, "edit")).toBe(true);
    expect(checkPermission(other, target, "edit")).toBe(false);
  });

  test("Explicit Permission", () => {
    const user = { id: 2, props: {} } as any;
    const other = { id: 3, props: {} } as any;

    const item = {
      id: 10,
      owner_id: 1,
      props: {
        permissions: {
          edit: [2], // Only user 2
          view: "public",
        },
      },
    } as any;

    expect(checkPermission(user, item, "edit")).toBe(true);
    expect(checkPermission(other, item, "edit")).toBe(false); // Not in list
    expect(checkPermission(other, item, "view")).toBe(true);
  });

  test("Cascading Permissions", () => {
    // Room owned by owner
    const room = mockEntity(100, {}, owner.id);
    // Item in room, owned by nobody (or other)
    const item = mockEntity(101, {}, null, room.id);

    // Mock resolver to find the room
    const resolver = (id: number) => (id === 100 ? room : null);

    // Owner of room should be able to edit item in room (cascading)
    expect(checkPermission(owner, item, "edit", resolver)).toBe(true);

    // Other cannot
    expect(checkPermission(other, item, "edit", resolver)).toBe(false);
  });
});
