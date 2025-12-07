import { pluginManager, scheduler, seed, startServer } from "@viwo/core";
import { AiPlugin } from "@viwo/plugin-ai";
import { FsPlugin } from "@viwo/plugin-fs";
import { MemoryPlugin } from "@viwo/plugin-memory";
import { NetPlugin } from "@viwo/plugin-net";
import { ProcGenPlugin } from "@viwo/plugin-procgen";

async function main() {
  console.log("Starting Viwo Server...");

  // Load plugins
  await pluginManager.loadPlugin(new AiPlugin());
  await pluginManager.loadPlugin(new MemoryPlugin());
  await pluginManager.loadPlugin(new NetPlugin());
  await pluginManager.loadPlugin(new FsPlugin());
  await pluginManager.loadPlugin(new ProcGenPlugin());

  // Start scheduler
  scheduler.start(100);

  // Start server
  seed();
  startServer(8080);
}

try {
  await main();
} catch (error) {
  console.error(error);
}
