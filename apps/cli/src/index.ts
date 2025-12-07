import { type GameMessage, type GameState, ViwoClient } from "@viwo/client";
import chalk from "chalk";
import minimist from "minimist";
import { parseCommand } from "./parser";
import readline from "readline";

const args = minimist(process.argv.slice(2));

// Determine color mode
let useColor = true; // Default to on

if (args["color"] === "off" || args["color"] === false) {
  useColor = false;
}

// If useColor is false, disable chalk
if (!useColor) {
  chalk.level = 0;
}

const client = new ViwoClient("ws://localhost:8080");

client.subscribe((state: GameState) => {
  if (state.isConnected) {
    // Connection status is tracked via state change below.
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
    client.execute(result.command, result.args);
  } else {
    console.log(chalk.red("Invalid command."));
  }
  rl.prompt();
});

rl.on("close", () => {
  console.log("Exiting...");
  process.exit(0);
});
