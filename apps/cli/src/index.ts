import WebSocket from "ws";
import minimist from "minimist";
import chalk from "chalk";
import readline from "readline";

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

const ws = new WebSocket("ws://localhost:8080");

ws.on("open", () => {
  console.log(chalk.green("Connected to Viwo Core."));
});

ws.on("message", (data) => {
  try {
    const message = JSON.parse(data.toString());
    handleMessage(message);
  } catch {
    console.log(
      chalk.red("Error parsing message from server:"),
      data.toString(),
    );
  }
});

ws.on("close", () => {
  console.log(chalk.yellow("Disconnected from server."));
  process.exit(0);
});

ws.on("error", (err) => {
  console.error(chalk.red("WebSocket error:"), err.message);
  process.exit(1);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

rl.prompt();

import { parseCommand } from "./parser";

rl.on("line", (line) => {
  const result = parseCommand(line);
  if (result) {
    ws.send(JSON.stringify([result.command, ...result.args]));
  }
  rl.prompt();
});

rl.on("close", () => {
  console.log("Exiting...");
  process.exit(0);
});

// TODO: We are using JSON-RPC now.
// We need type definitions for messages, and then change the below code to avoid
// the removed `room`, `item` and `inventory` message types.
function handleMessage(message: any) {
  switch (message.type) {
    case "message":
      console.log(chalk.blue(message.text));
      break;
    case "error":
      console.log(chalk.red(message.text));
      break;
    case "room":
      console.log(chalk.bold.cyan(`\n${message.name}`));
      console.log(chalk.gray(message.description));
      if (message.contents && message.contents.length > 0) {
        console.log(chalk.yellow("Contents:"));
        message.contents.forEach((item: any) => {
          let itemStr = `  - ${item.name} (${item.kind})`;
          if (item.kind === "EXIT" && item.props.destination_name) {
            itemStr += ` -> ${item.props.destination_name}`;
          }
          console.log(itemStr);
        });
      }
      break;
    case "item":
      console.log(chalk.bold.magenta(`\n${message.name}`));
      console.log(chalk.gray(message.description));
      if (message.contents && message.contents.length > 0) {
        console.log(chalk.yellow("Contains:"));
        message.contents.forEach((item: any) => {
          console.log(`  - ${item.name}`);
        });
      }
      break;
    case "inventory":
      console.log(chalk.bold.yellow("\nInventory:"));
      if (message.items.length === 0) {
        console.log("  (empty)");
      } else {
        message.items.forEach((item: any) => {
          console.log(`  - ${item.name}`);
        });
      }
      break;
    case "player_created":
      console.log(
        chalk.green(`Player created: ${message.name} (ID: ${message.id})`),
      );
      break;
    default:
      console.log("Unknown message type:", message);
  }
  rl.prompt();
}
