import { bot } from "./bot";
import { socketManager } from "./socket";

console.log("Starting Discord Bot...");

// Start Socket Manager
socketManager.connect();

// Start Discord Bot
bot.start();

// Listen for messages from Core via System Socket (for global broadcasts if any)
// TODO: Implement a way to route Core -> Discord messages more intelligently.
// Currently, we rely on the socketManager to handle messages, but we might need
// a reverse lookup for Entity -> (DiscordUser, Channel) to support DMs and specific channels.
