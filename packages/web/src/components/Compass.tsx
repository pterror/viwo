import { createSignal, Show } from "solid-js";
import { gameStore } from "../store/game";
import Builder from "./Builder";

export default function Compass() {
  const [showDig, setShowDig] = createSignal<string | null>(null);

  const getExit = (dir: string) => {
    if (!gameStore.state.room) return null;
    return gameStore.state.room.contents.find(
      (c) => c.kind === "EXIT" && c.name.toLowerCase() === dir.toLowerCase(),
    );
  };

  const handleDir = (dir: string) => {
    const exit = getExit(dir);
    if (exit) {
      gameStore.send(["move", dir]);
    } else {
      setShowDig(dir);
    }
  };

  const Cell = (props: { dir: string; label: string }) => {
    const exit = getExit(props.dir);
    return (
      <button
        onClick={() => handleDir(props.dir)}
        style={{
          background: exit ? "#2a2a2d" : "#111",
          color: exit ? "#fff" : "#444",
          border: "1px solid #333",
          "border-radius": "4px",
          cursor: "pointer",
          "font-size": "10px",
          display: "flex",
          "flex-direction": "column",
          "align-items": "center",
          "justify-content": "center",
          padding: "2px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ "font-weight": "bold", "margin-bottom": "2px" }}>
          {props.label}
        </div>
        <div
          style={{
            "font-size": "8px",
            "white-space": "nowrap",
            overflow: "hidden",
            "text-overflow": "ellipsis",
            "max-width": "100%",
            color: exit ? "#aaddff" : "#333",
          }}
        >
          {exit ? exit.name : "+"}
        </div>
      </button>
    );
  };

  return (
    <>
      <div
        style={{
          display: "grid",
          "grid-template-columns": "repeat(3, 1fr)",
          "grid-template-rows": "repeat(3, 1fr)",
          gap: "4px",
          width: "140px",
          height: "140px",
        }}
      >
        <Cell dir="northwest" label="NW" />
        <Cell dir="north" label="N" />
        <Cell dir="northeast" label="NE" />

        <Cell dir="west" label="W" />
        <div
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "font-size": "10px",
            color: "#666",
            background: "#151518",
            "border-radius": "50%",
          }}
        >
          Here
        </div>
        <Cell dir="east" label="E" />

        <Cell dir="southwest" label="SW" />
        <Cell dir="south" label="S" />
        <Cell dir="southeast" label="SE" />
      </div>

      <Show when={showDig()}>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "z-index": 100,
          }}
        >
          <div
            style={{
              background: "#1a1a1d",
              padding: "20px",
              border: "1px solid #444",
              "border-radius": "8px",
              width: "300px",
            }}
          >
            <div style={{ "margin-bottom": "10px", "font-weight": "bold" }}>
              Dig {showDig()}
            </div>
            <Builder
              initialDirection={showDig()!}
              onClose={() => setShowDig(null)}
            />
          </div>
        </div>
      </Show>
    </>
  );
}
