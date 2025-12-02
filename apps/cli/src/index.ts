import minimist from "minimist";
import chalk from "chalk";
import readline from "readline";
import { ViwoClient, GameState, GameMessage } from "@viwo/client";
import { parseCommand } from "./parser";

const args = minimist(process.argv.slice(2));

// Determine color mode
let useColor = true; // Default to on

if (args.color === "off" || args.color === false) {
  useColor = false;
}

// If useColor is false, disable chalk
if (!useColor) {
  chalk.level = 0;
}

const client = new ViwoClient("ws://localhost:8080");

client.subscribe((state: GameState) => {
  if (state.isConnected) {
    // We could log connection status, but maybe only once?
    // The original code logged "Connected to Viwo Core." on open.
    // ViwoClient doesn't expose an event for "just connected", but state change.
    // We can track it locally if needed, or just rely on messages.
  }
});

client.onMessage((msg: GameMessage) => {
  if (msg.type === "error") {
    console.log(chalk.red(msg.text));
  } else {
    console.log(chalk.blue(msg.text));
  }
  rl.prompt();
});

// We need to hook into the socket open event to log "Connected" if we want exact parity,
// but ViwoClient hides the socket.
// We can check state.isConnected transition.
let wasConnected = false;
client.subscribe((state: GameState) => {
  if (state.isConnected && !wasConnected) {
    console.log(chalk.green("Connected to Viwo Core."));
    wasConnected = true;
  } else if (!state.isConnected && wasConnected) {
    console.log(chalk.yellow("Disconnected from server."));
    process.exit(0);
  }
});

client.connect();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

rl.prompt();

rl.on("line", (line) => {
  const result = parseCommand(line);
  if (result) {
    // client.execute expects readonly string[]
    // result.args is any[], we need to convert to string[]
    const stringArgs = result.args.map((arg) => String(arg));
    if (result.command === "execute") {
      // If command is execute, params are [cmd, ...args]
      // But parseCommand returns { command: "look", args: [] }
      // So we just pass [command, ...args]
      client.execute([result.command, ...stringArgs]);
    } else {
      // If it's a direct method like get_opcodes, we might need sendRequest.
      // But parseCommand usually handles game commands.
      // If the user types "look", result.command is "look".
      client.execute([result.command, ...stringArgs]);
    }
  }
  rl.prompt();
});

rl.on("close", () => {
  console.log("Exiting...");
  process.exit(0);
});
