import { useState, useEffect, useRef } from "react";
import { Box, Text, useApp, useStdout } from "ink";
import WebSocket from "ws";
import TextInput from "ink-text-input";

// Types
type Message = {
  type: string;
  text?: string;
  name?: string;
  description?: string;
  contents?: any[];
  items?: any[];
  id?: number;
};

type LogEntry = {
  id: string;
  message: Message;
};

const App = () => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [rows, setRows] = useState(stdout.rows || 24);
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [room, setRoom] = useState<Message | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const onResize = () => setRows(stdout.rows || 24);
    stdout.on?.("resize", onResize);
    return () => {
      stdout.off?.("resize", onResize);
    };
  }, [stdout]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");
    ws.current = socket;

    socket.on("open", () => {
      setConnected(true);
      addLog({ type: "message", text: "Connected to Viwo Core." });
    });

    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(message);
      } catch {
        addLog({ type: "error", text: "Error parsing message." });
      }
    });

    socket.on("close", () => {
      setConnected(false);
      addLog({ type: "error", text: "Disconnected from server." });
      // exit(); // Optional: exit on disconnect
    });

    socket.on("error", (err) => {
      addLog({ type: "error", text: `WebSocket error: ${err.message}` });
    });

    return () => {
      socket.close();
    };
  }, []);

  const addLog = (message: Message) => {
    setLogs((prev) => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), message },
    ]);
  };

  const handleMessage = (message: Message) => {
    if (message.type === "room") {
      setRoom(message);
      // Also add to log for history
      addLog(message);
    } else if (message.type === "inventory") {
      setInventory(message.items || []);
      addLog(message);
    } else {
      addLog(message);
    }
  };

  const handleSubmit = (input: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      addLog({ type: "error", text: "Not connected." });
      return;
    }

    if (input.trim() === "exit" || input.trim() === "quit") {
      exit();
      return;
    }

    // Echo command
    addLog({ type: "message", text: `> ${input}` });

    const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g);
    if (parts) {
      const command = parts[0];
      const args = parts.slice(1).map((arg) => arg.replace(/^"(.*)"$/, "$1"));
      ws.current.send(JSON.stringify([command, ...args]));
    }
    setQuery("");
  };

  return (
    <Box flexDirection="column" height={rows}>
      {/* Header */}
      <Box borderStyle="single" borderColor="green">
        <Text bold color="green">
          {" "}
          Viwo TUI{" "}
        </Text>
        <Text> | </Text>
        <Text color={connected ? "green" : "red"}>
          {" "}
          {connected ? "ONLINE" : "OFFLINE"}{" "}
        </Text>
      </Box>

      {/* Main Content Area */}
      <Box flexGrow={1}>
        {/* Left Column: Log */}
        <Box width="30%" borderStyle="single" flexDirection="column">
          <Text bold underline>
            Log
          </Text>
          <Box flexDirection="column" flexGrow={1} overflowY="hidden">
            {logs.slice(-20).map((log) => (
              <Box key={log.id}>
                <Text
                  color={
                    log.message.type === "error"
                      ? "red"
                      : log.message.type === "message"
                      ? "white"
                      : "blue"
                  }
                >
                  {log.message.text ||
                    log.message.name ||
                    JSON.stringify(log.message)}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Center Column: Room */}
        <Box width="40%" borderStyle="single" flexDirection="column">
          <Text bold underline>
            Current Room
          </Text>
          {room ? (
            <>
              <Text bold color="cyan">
                {room.name}
              </Text>
              <Text italic>{room.description}</Text>
              <Box marginTop={1}>
                <Text underline>Contents:</Text>
                {room.contents?.map((item, idx) => (
                  <Text key={idx}>
                    - {item.name} ({item.kind})
                  </Text>
                ))}
              </Box>
            </>
          ) : (
            <Text>No room data.</Text>
          )}
        </Box>

        {/* Right Column: Inventory */}
        <Box width="30%" borderStyle="single" flexDirection="column">
          <Text bold underline>
            Inventory
          </Text>
          {inventory.length > 0 ? (
            inventory.map((item, idx) => <Text key={idx}>- {item.name}</Text>)
          ) : (
            <Text color="gray">(empty)</Text>
          )}
        </Box>
      </Box>

      {/* Input Bar */}
      <Box borderStyle="single" borderColor="blue">
        <Text color="green">&gt; </Text>
        <TextInput value={query} onChange={setQuery} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
};

export default App;
