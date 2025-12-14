import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  base: "/viwo/imagegen/",
  build: {
    target: "esnext",
  },
  plugins: [solidPlugin()],
  publicDir: "public",
  server: {
    port: 3002,
  },
});
