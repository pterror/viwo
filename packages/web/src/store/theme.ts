import { createStore } from "solid-js/store";
import { createEffect } from "solid-js";

export interface ThemeColors {
  "--bg-app": string;
  "--bg-panel": string;
  "--bg-element": string;
  "--bg-element-hover": string;
  "--bg-element-active": string;
  "--bg-input": string;
  "--border-color": string;
  "--text-primary": string;
  "--text-secondary": string;
  "--text-muted": string;
  "--text-inverse": string;
  "--accent-base": string;
  "--accent-color": string;
  "--accent-hover": string;
  "--accent-fg": string;
  "--status-online": string;
  "--status-offline": string;
  "--link-color": string;
  "--error-color": string;
  "--overlay-bg": string;
}

const defaultTheme: ThemeColors = {
  "--bg-app": "oklch(100% 0 0 / 0.03)",
  "--bg-panel": "oklch(100% 0 0 / 0.03)",
  "--bg-element": "oklch(100% 0 0 / 0.08)",
  "--bg-element-hover": "oklch(100% 0 0 / 0.12)",
  "--bg-element-active": "oklch(100% 0 0 / 0.16)",
  "--bg-input": "oklch(100% 0 0 / 0.1)",
  "--border-color": "oklch(100% 0 0 / 0.15)",
  "--text-primary": "#e0e0e0",
  "--text-secondary": "#aaaaaa",
  "--text-muted": "#666666",
  "--text-inverse": "#000000",
  "--accent-base": "oklch(100% 0 0)",
  "--accent-color": "oklch(100% 0 0 / 0.15)",
  "--accent-hover": "oklch(100% 0 0 / 0.25)",
  "--accent-fg": "#e0e0e0",
  "--status-online": "#4f4",
  "--status-offline": "#f44",
  "--link-color": "#aaddff",
  "--error-color": "#ff6b6b",
  "--overlay-bg": "rgba(0, 0, 0, 0.5)",
};

interface ThemeState {
  colors: ThemeColors;
  allowCustomCss: boolean;
}

const savedTheme = localStorage.getItem("viwo_theme");
const savedCustomCssPref = localStorage.getItem("viwo_allow_custom_css");

const initialState: ThemeState = {
  colors: savedTheme ? JSON.parse(savedTheme) : defaultTheme,
  allowCustomCss: savedCustomCssPref ? JSON.parse(savedCustomCssPref) : true,
};

const [state, setState] = createStore<ThemeState>(initialState);

export const themeStore = {
  state,

  updateColor: (key: keyof ThemeColors, value: string) => {
    setState("colors", key, value);
  },

  resetTheme: () => {
    setState("colors", defaultTheme);
  },

  toggleCustomCss: () => {
    setState("allowCustomCss", (prev) => !prev);
  },

  save: () => {
    localStorage.setItem("viwo_theme", JSON.stringify(state.colors));
    localStorage.setItem(
      "viwo_allow_custom_css",
      JSON.stringify(state.allowCustomCss),
    );
  },
};

// Auto-save on change
createEffect(() => {
  localStorage.setItem("viwo_theme", JSON.stringify(state.colors));
  localStorage.setItem(
    "viwo_allow_custom_css",
    JSON.stringify(state.allowCustomCss),
  );
});

// Apply theme to document root
createEffect(() => {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(state.colors)) {
    root.style.setProperty(key, value);
  }
});
