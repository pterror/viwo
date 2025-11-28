import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8080");

ws.on("open", () => {
  console.log("Connected");

  // Create Player
  ws.send(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "create_player",
      params: ["Tester"],
      id: 1,
    }),
  );
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  console.log("Received:", JSON.stringify(msg, null, 2));

  if (msg.id === 1 && msg.result) {
    console.log("Player created. Logging in...");
    const playerId = msg.result.player.id;
    ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "login",
        params: [playerId],
        id: 2,
      }),
    );
  } else if (msg.id === 2 && msg.result) {
    console.log("Login successful. Sending 'look'...");
    ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "execute",
        params: ["look"],
        id: 3,
      }),
    );
  } else if (msg.id === 3 && msg.result) {
    console.log("Look successful. Result type:", msg.result.result?.type);
    if (msg.result.result?.type === "room") {
      console.log("Room Name:", msg.result.result.name);
      process.exit(0);
    } else {
      console.error("Unexpected result type for look");
      process.exit(1);
    }
  }
});

ws.on("error", (err) => {
  console.error("Socket error:", err);
  process.exit(1);
});
