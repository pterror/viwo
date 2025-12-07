export const ADJECTIVE_REGISTRY = {
  colors: [
    "pink",
    "cyan",
    "lilac",
    "lavender",
    "green",
    "red",
    "blue",
    "yellow",
    "orange",
    "purple",
    "teal",
    "grey",
    "white",
  ],
  effects: ["glowing", "transparent", "ethereal"],
  materials: ["stone", "obsidian", "metal", "glass", "silver", "gold", "platinum"],
  modifiers: ["light", "dark", "pastel", "neon"],
};

export const ALL_ADJECTIVES = [
  ...ADJECTIVE_REGISTRY.colors.map((color) => `color:${color}`),
  ...ADJECTIVE_REGISTRY.modifiers.map((modifier) => `color:${modifier}`),
  ...ADJECTIVE_REGISTRY.effects.map((effect) => `effect:${effect}`),
  ...ADJECTIVE_REGISTRY.materials.map((material) => `material:${material}`),
];
