/// <reference types="bun" />
import { describe, test, expect, beforeEach, mock } from "bun:test";

// Mock localStorage BEFORE import
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: mock((key: string) => store[key] || null),
    setItem: mock((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: mock(() => {
      store = {};
    }),
    removeItem: mock((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

// Import after mock
// import { keybindsStore } from "./keybinds";

let keybindsStore: any;

describe("Keybinds Store", () => {
  beforeEach(async () => {
    localStorageMock.clear();
    // Re-import or ensure it's loaded
    const module = await import("./keybinds");
    keybindsStore = module.keybindsStore;
    keybindsStore.resetDefaults();
  });

  test("Default bindings", () => {
    expect(keybindsStore.getKey("north")).toBe("w");
    expect(keybindsStore.getKey("look")).toBe("l");
  });

  test("Set key", () => {
    keybindsStore.setKey("north", "ArrowUp");
    expect(keybindsStore.getKey("north")).toBe("ArrowUp");
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  test("Get action for key", () => {
    expect(keybindsStore.getActionForKey("l")).toBe("look");
    expect(keybindsStore.getActionForKey("z")).toBeUndefined();
  });

  test("loadBindings with existing data", () => {
    const { loadBindings } = require("./keybinds");
    const mockGetItem = mock(() => JSON.stringify({ north: "up" }));
    global.localStorage.getItem = mockGetItem;

    const bindings = loadBindings();
    expect(bindings.north).toBe("up");
    expect(bindings.south).toBe("s"); // Default preserved
  });

  test("Reset defaults", () => {
    keybindsStore.setKey("north", "ArrowUp");
    keybindsStore.resetDefaults();
    expect(keybindsStore.getKey("north")).toBe("w");
  });
});
