import { bot } from "./bot";
import { socketManager } from "./socket";

console.log("Starting Discord Bot...");

// Start Socket Manager
socketManager.connect();

// Start Discord Bot
bot.start();

// Listen for messages from Core via System Socket (for global broadcasts if any)
// Note: Future improvement: Implement a way to route Core -> Discord messages more intelligently. Tracked in TODO.md.
