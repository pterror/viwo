import { createSignal } from "solid-js";
import { gameStore } from "../store/game";

interface BuilderProps {
  initialDirection?: string;
  onClose?: () => void;
}

export default function Builder(props: BuilderProps) {
  const [direction, setDirection] = createSignal(
    props.initialDirection || "north",
  );
  const [roomName, setRoomName] = createSignal("");
  const [description, setDescription] = createSignal("");

  const handleDig = (e: Event) => {
    e.preventDefault();
    if (!roomName()) return;
    gameStore.send(["dig", direction(), roomName()]);
    setRoomName("");
    props.onClose?.();
  };

  const handleUpdateDesc = (e: Event) => {
    e.preventDefault();
    if (!description()) return;
    gameStore.send(["set", "here", "description", description()]);
    setDescription("");
  };

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "15px",
        "font-size": "12px",
      }}
    >
      {/* Dig Panel */}
      <div style={{ display: "flex", "flex-direction": "column", gap: "5px" }}>
        <div style={{ "font-weight": "bold", color: "#888" }}>DIG ROOM</div>
        <form
          onSubmit={handleDig}
          style={{ display: "flex", "flex-direction": "column", gap: "10px" }}
        >
          <div style={{ display: "flex", gap: "5px" }}>
            <input
              type="text"
              placeholder="Direction (e.g. north, up, portal)"
              value={direction()}
              onInput={(e) => setDirection(e.currentTarget.value)}
              style={{
                background: "#333",
                color: "#fff",
                border: "none",
                padding: "8px",
                flex: 1,
              }}
            />
          </div>
          <input
            type="text"
            placeholder="Room Name"
            value={roomName()}
            onInput={(e) => setRoomName(e.currentTarget.value)}
            style={{
              background: "#333",
              color: "#fff",
              border: "none",
              padding: "8px",
            }}
          />
          <div
            style={{
              display: "flex",
              gap: "10px",
              "justify-content": "flex-end",
            }}
          >
            {props.onClose && (
              <button
                type="button"
                onClick={props.onClose}
                style={{
                  cursor: "pointer",
                  background: "transparent",
                  border: "1px solid #444",
                  color: "#888",
                  padding: "6px 12px",
                  "border-radius": "4px",
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              style={{
                cursor: "pointer",
                background: "var(--accent-color)",
                border: "none",
                color: "#000",
                padding: "6px 12px",
                "border-radius": "4px",
                "font-weight": "bold",
              }}
            >
              Dig
            </button>
          </div>
        </form>
      </div>

      {/* Edit Panel (Only show if not in modal mode, or maybe separate?) */}
      {!props.onClose && (
        <div
          style={{
            display: "flex",
            "flex-direction": "column",
            gap: "5px",
            "border-top": "1px solid #333",
            "padding-top": "10px",
          }}
        >
          <div style={{ "font-weight": "bold", color: "#888" }}>
            EDIT DESCRIPTION
          </div>
          <form
            onSubmit={handleUpdateDesc}
            style={{ display: "flex", gap: "5px" }}
          >
            <input
              type="text"
              placeholder="New description for current room..."
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
              style={{
                background: "#333",
                color: "#fff",
                border: "none",
                padding: "8px",
                flex: 1,
              }}
            />
            <button
              type="submit"
              style={{
                cursor: "pointer",
                background: "#333",
                border: "1px solid #444",
                color: "#fff",
                padding: "6px 12px",
                "border-radius": "4px",
              }}
            >
              Set
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
