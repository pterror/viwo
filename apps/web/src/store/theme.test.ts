import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";

// Mock alert
global.alert = mock(() => {});

// Mock localStorage
const mockStorage = new Map<string, string>();
const localStorageMock = {
  getItem: mock((key: string) => mockStorage.get(key) || null),
  setItem: mock((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: mock((key: string) => mockStorage.delete(key)),
  clear: mock(() => mockStorage.clear()),
  length: 0,
  key: mock(() => null),
};

if (!global.localStorage) {
  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

// Mock crypto.randomUUID
global.crypto = {
  randomUUID: mock(() => "test-uuid-" + Math.random()),
} as any;

// Mock confirm/alert
global.confirm = mock(() => true);
global.alert = mock(() => {});

import { themeStore, loadInitialState } from "./theme";

describe("Theme Store", () => {
  // themeStore is imported directly

  beforeEach(async () => {
    // Clear storage (whichever mock is used)
    if (global.localStorage) {
      global.localStorage.clear();
    }

    themeStore.reset();
    // Reset state to default if needed (though import usually caches, so we might need to rely on store actions to reset or use a fresh isolate if possible.
    // Since Bun caches modules, we might need to manually reset the store state if the module is reused.)
    // However, for unit tests, we often want to test the *initial load* logic which only runs once.
    // We might need to use `jest.resetModules()` equivalent or just test actions on the existing store.
    // For now, let's assume we can test actions. For initial load, we might need a separate test file or trickery.
    // Actually, we can just manually reset the store state using setState if it was exported, but it's not.
    // We'll test actions primarily.
  });

  test("Initial State", () => {
    expect(themeStore.state.activeThemeId).toBe("default");
    expect(themeStore.state.themes.length).toBeGreaterThan(0);
    expect(themeStore.activeTheme.id).toBe("default");
  });

  test("Create Theme", () => {
    themeStore.createTheme("New Theme");
    expect(themeStore.state.themes.length).toBe(2);
    expect(themeStore.state.activeThemeId).not.toBe("default");
    expect(themeStore.activeTheme.manifest.name).toBe("New Theme");
  });

  test("Update Color (Custom Theme)", () => {
    // Ensure we are on a custom theme
    if (themeStore.state.activeThemeId === "default") {
      themeStore.createTheme("Custom");
    }

    themeStore.updateColor("--bg-app", "red");
    expect(themeStore.activeTheme.colors["--bg-app"]).toBe("red");
  });

  test("Update Color (Builtin Theme - Auto Fork)", () => {
    themeStore.setActiveTheme("default");
    expect(themeStore.activeTheme.isBuiltin).toBe(true);

    // Should trigger confirm (mocked to true) and create copy
    themeStore.updateColor("--bg-app", "blue");

    expect(themeStore.state.activeThemeId).not.toBe("default");
    expect(themeStore.activeTheme.manifest.name).toContain("Copy of");
    expect(themeStore.activeTheme.colors["--bg-app"]).toBe("blue");
  });

  test("Delete Theme", () => {
    themeStore.createTheme("To Delete");
    const id = themeStore.state.activeThemeId;
    expect(themeStore.state.themes.find((t: any) => t.id === id)).toBeDefined();

    themeStore.deleteTheme(id);
    expect(
      themeStore.state.themes.find((t: any) => t.id === id),
    ).toBeUndefined();
    expect(themeStore.state.activeThemeId).toBe("default");
  });

  test("Delete Builtin Theme (Protected)", () => {
    themeStore.setActiveTheme("default");
    themeStore.deleteTheme("default");
    expect(
      themeStore.state.themes.find((t: any) => t.id === "default"),
    ).toBeDefined();
  });

  test("Import Theme", () => {
    const validTheme = {
      manifest: { kind: "viwo-theme", version: "1.0.0", name: "Imported" },
      colors: { "--bg-app": "green" },
    };
    themeStore.importTheme(validTheme);

    expect(themeStore.activeTheme.manifest.name).toBe("Imported");
    expect(themeStore.activeTheme.colors["--bg-app"]).toBe("green");
    expect(themeStore.activeTheme.isBuiltin).toBe(false);
  });

  test("Delete Active Theme", () => {
    themeStore.createTheme("To Delete");
    const newTheme =
      themeStore.state.themes[themeStore.state.themes.length - 1]!;
    themeStore.setActiveTheme(newTheme.id);
    expect(themeStore.state.activeThemeId).toBe(newTheme.id);

    themeStore.deleteTheme(newTheme.id);
    expect(
      themeStore.state.themes.find((t: any) => t.id === newTheme.id),
    ).toBeUndefined();
    expect(themeStore.state.activeThemeId).toBe("default");
  });

  test("Import Invalid Theme", () => {
    const alertSpy = spyOn(global, "alert").mockImplementation(() => {});
    themeStore.importTheme({}); // Empty object
    expect(alertSpy).toHaveBeenCalledWith(
      "Invalid theme format. Must be a valid Viwo Theme.",
    );
    alertSpy.mockRestore();
  });

  test("Import Theme Version Warning", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const theme = {
      manifest: { kind: "viwo-theme", version: "0.9.0", name: "Old" },
      colors: {},
    };
    themeStore.importTheme(theme);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("Toggle Custom CSS", () => {
    const initial = themeStore.state.allowCustomCss;
    themeStore.toggleCustomCss();
    expect(themeStore.state.allowCustomCss).toBe(!initial);
  });

  describe("Theme Migration", () => {
    beforeEach(() => {
      if (global.localStorage) {
        console.log(
          "theme.test.ts beforeEach: getItem('foo') =",
          global.localStorage.getItem("foo"),
        );
        global.localStorage.removeItem("viwo_theme");
        global.localStorage.removeItem("viwo_themes");
        global.localStorage.removeItem("viwo_active_theme_id");
        global.localStorage.removeItem("viwo_allow_custom_css");
      }
      themeStore.reset();
    });

    test("Migrate from old single theme", () => {
      global.localStorage.setItem(
        "viwo_theme",
        JSON.stringify({ "--bg-app": "red" }),
      );

      const state = loadInitialState();

      expect(state.themes.length).toBe(2); // Default + Migrated
      expect(state.activeThemeId).toBe("migrated_custom");
      expect(state.themes[1]!.colors["--bg-app"]).toBe("red");
    });

    test("Migrate from array with missing manifest", () => {
      const oldThemes = JSON.stringify([
        {
          id: "t1",
          colors: { "--bg-app": "blue" },
          manifest: { name: "Old Theme" }, // Missing kind/version
        },
      ]);
      global.localStorage.setItem("viwo_themes", oldThemes);

      const state = loadInitialState();

      expect(state.themes.length).toBe(2); // Default + Old
      const migrated = state.themes.find((t: any) => t.id === "t1");
      expect(migrated).toBeDefined();
      expect(migrated!.manifest.kind).toBe("viwo-theme");
      expect(migrated!.manifest.version).toBe("1.0.0");
    });
  });
});
