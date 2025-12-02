import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Viwo Docs",
  description: "Documentation for the Viwo project",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Architecture", link: "/core/architecture" },
      { text: "Scripting", link: "/scripting/spec" },
    ],

    sidebar: [
      {
        text: "Core",
        items: [
          { text: "Architecture", link: "/core/architecture" },
          { text: "Codebase Map", link: "/core/codebase_map" },
          { text: "Scheduler", link: "/core/scheduler" },
        ],
      },
      {
        text: "Components",
        items: [
          { text: "Web Frontend", link: "/components/web_frontend" },
          { text: "TUI", link: "/components/tui" },
          { text: "Discord Bot", link: "/components/discord_bot" },
        ],
      },
      {
        text: "Scripting",
        items: [
          { text: "Specification", link: "/scripting/spec" },
          { text: "Compiler", link: "/scripting/compiler" },
          { text: "Decompiler", link: "/scripting/decompiler" },
          { text: "Transpiler", link: "/scripting/transpiler" },
        ],
      },
      {
        text: "Reference",
        items: [{ text: "API", link: "/reference/api" }],
      },
      {
        text: "Plugins",
        items: [{ text: "AI Integration", link: "/plugins/ai" }],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/pterror/viwo" }],
  },
});
