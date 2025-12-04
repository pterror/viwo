import { startServer, pluginManager, seed, scheduler } from "@viwo/core";
import { AiPlugin } from "@viwo/plugin-ai";
import { MemoryPlugin } from "@viwo/plugin-memory";

async function main() {
  console.log("Starting Viwo Server...");

  // Load plugins
  await pluginManager.loadPlugin(new AiPlugin());
  await pluginManager.loadPlugin(new MemoryPlugin());

  // Start scheduler
  scheduler.start(100);

  // Start server
  seed();
  startServer(8080);
}

main().catch(console.error);
