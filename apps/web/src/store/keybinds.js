import { createStore } from "solid-js/store";
export const ACTION_LABELS = {
    north: "Move North",
    south: "Move South",
    east: "Move East",
    west: "Move West",
    look: "Look",
    inventory: "Toggle Inventory",
};
const DEFAULT_BINDINGS = {
    north: "w",
    south: "s",
    east: "d",
    west: "a",
    look: "l",
    inventory: "i",
};
const STORAGE_KEY = "viwo_keybinds";
const loadBindings = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...DEFAULT_BINDINGS, ...JSON.parse(stored) };
        }
    }
    catch (e) {
        console.error("Failed to load keybinds", e);
    }
    return { ...DEFAULT_BINDINGS };
};
const [state, setState] = createStore({
    bindings: loadBindings(),
});
export const keybindsStore = {
    state,
    getKey: (action) => state.bindings[action],
    setKey: (action, key) => {
        setState("bindings", action, key);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bindings));
    },
    resetDefaults: () => {
        setState("bindings", { ...DEFAULT_BINDINGS });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BINDINGS));
    },
    getActionForKey: (key) => {
        const lowerKey = key.toLowerCase();
        return Object.keys(state.bindings).find((action) => state.bindings[action].toLowerCase() === lowerKey);
    },
};
