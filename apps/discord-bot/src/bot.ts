import { ChannelType, Client, Events, GatewayIntentBits, type TextChannel } from "discord.js";
import { CONFIG } from "./config";
import { db } from "./instances";
import { sessionManager } from "./session";
import { socketManager } from "./socket";

class DiscordBot {
  private client: Client;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.setupListeners();
  }

  start() {
    this.client.login(CONFIG.DISCORD_TOKEN);
  }

  private setupListeners() {
    this.client.once(Events.ClientReady, (client) => {
      console.log(`Ready! Logged in as ${client.user.tag}`);
    });

    // Listen for messages from Core (via SocketManager)
    socketManager.on("message", (entityId: number, data: any) => {
      this.handleCoreMessage(entityId, data);
    });

    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) {
        return;
      }

      // Handle Slash Commands (mocked for now via !cmd)
      if (message.content.startsWith("!")) {
        await this.handleCommand(message);
        return;
      }

      try {
        // 1. Resolve Channel -> Room (DMs rely on player location)
        let roomId;
        if (message.channel.type !== ChannelType.DM) {
          roomId = db.getRoomForChannel(message.channelId);
          if (!roomId) {
            // Channel not linked
            return;
          }
        }

        // 2. Resolve Session
        const entityId = await sessionManager.ensureSession(
          message.author.id,
          message.channelId,
          message.author.displayName,
        );

        // 3. Get Socket (Single Bot Socket)
        const socket = socketManager.getSocket();

        // 4. Send Message to Core via sudo
        const parts = message.content.split(" ");
        if (parts[0]) {
          // execute("sudo", [targetId, verb, ...args])
          socket.execute("sudo", [
            entityId, // Target ID
            parts[0], // Verb
            parts.slice(1), // Args
          ]);
        }
      } catch (error) {
        console.error("Error handling message:", error);
        // message.reply("Something went wrong.");
      }
    });
  }

  private handleCommand(message: any) {
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "link") {
      // !link <room_id>
      if (!args[0]) {
        message.reply("Usage: !link <room_id>");
        return;
      }
      const roomId = parseInt(args[0], 10);
      if (isNaN(roomId)) {
        message.reply("Invalid Room ID.");
        return;
      }
      db.setRoomForChannel(message.channelId, roomId);
      message.reply(`Channel linked to Room ${roomId}.`);
    } else if (command === "ping") {
      message.reply("Pong!");
    }
  }

  private async handleCoreMessage(entityId: number, data: any) {
    // Find all active sessions for this entity
    const sessions = db.getSessionsForEntity(entityId);

    await Promise.all(
      sessions.map((session) => async () => {
        try {
          const channel = await this.client.channels.fetch(session.channel_id);
          if (channel && channel.isTextBased()) {
            // Format message
            let content = "";
            if (data.type === "message") {
              content = data.text;
            } else if (data.type === "room") {
              content = `**${data.name}**\n${data.description}\n\n*Exits*: ${data.exits
                ?.map((exit: any) => exit.name)
                .join(", ")}\n*Items*: ${data.contents?.map((item: any) => item.name).join(", ")}`;
            } else if (data.type === "error") {
              content = `🔴 ${data.text}`;
            } else {
              content = `\`\`\`json\n${JSON.stringify(data, undefined, 2)}\n\`\`\``;
            }

            if (content) {
              (channel as TextChannel).send(content);
            }
          }
        } catch (error) {
          console.error(`Failed to send to channel ${session.channel_id}`, error);
        }
      }),
    );
  }
}

export const bot = new DiscordBot();
