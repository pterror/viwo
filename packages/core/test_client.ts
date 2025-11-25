import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8080");

ws.on("message", (data) => {
  try {
    const json = JSON.parse(data.toString());
    console.log("Received JSON:", JSON.stringify(json, null, 2));
    if (json.type === "room") {
      console.log("PASS: Received Room object");
    } else if (json.type === "inventory") {
      console.log("PASS: Received Inventory object");
    }
  } catch {
    console.log("Received raw text:", data.toString());
  }
});

ws.on("open", () => {
  console.log("Connected to server");
  setTimeout(() => {
    console.log("Sending ['look']...");
    ws.send(JSON.stringify(["look"]));
  }, 500);

  setTimeout(() => {
    console.log("Sending ['inventory']...");
    ws.send(JSON.stringify(["inventory"]));
  }, 1000);

  setTimeout(() => {
    ws.close();
  }, 1500);
});

ws.on("close", () => {
  console.log("Disconnected");
});
