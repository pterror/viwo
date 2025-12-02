const ws = new WebSocket("ws://localhost:8080");

ws.onopen = () => {
  console.log("Connected");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data.toString());
  console.log("Received:", data);

  if (data.type === "message" && data.text.includes("Welcome")) {
    // Logged in
    console.log("Sending talk command...");
    // Note: "guest" is the player name. We talk to ourselves for testing.
    ws.send(JSON.stringify(["talk", "guest", "hello"]));

    setTimeout(() => {
      console.log("Sending gen command...");
      ws.send(JSON.stringify(["gen", "item", "a magical sword"]));
    }, 2000);

    setTimeout(() => {
      process.exit(0);
    }, 5000);
  }
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
  process.exit(1);
};
