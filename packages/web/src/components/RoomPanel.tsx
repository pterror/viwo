import { For, Show } from "solid-js";
import { gameStore, RichItem } from "../store/game";

const ItemView = (props: { item: RichItem }) => (
  <div style={{ "margin-left": "10px", "margin-top": "2px" }}>
    <span
      onClick={() => gameStore.send(["look", props.item.name])}
      style={{
        color: "#aaddff",
        cursor: "pointer",
        "text-decoration": "underline",
      }}
    >
      {props.item.name}
    </span>
    <Show when={props.item.location_detail}>
      <span
        style={{ color: "#666", "font-size": "0.8em", "margin-left": "5px" }}
      >
        ({props.item.location_detail})
      </span>
    </Show>
    <Show when={props.item.contents.length > 0}>
      <div style={{ "border-left": "1px solid #444", "padding-left": "5px" }}>
        <For each={props.item.contents}>{(sub) => <ItemView item={sub} />}</For>
      </div>
    </Show>
  </div>
);

export default function RoomPanel() {
  return (
    <div
      style={{
        padding: "10px",
        "background-color": "#1a1a1d",
        "border-bottom": "1px solid #333",
        height: "100%",
        overflow: "auto",
      }}
    >
      <Show
        when={gameStore.state.room}
        fallback={<div style={{ color: "#666" }}>Loading room...</div>}
      >
        <div
          style={{
            "font-size": "1.2em",
            "font-weight": "bold",
            color: "#fff",
            "margin-bottom": "5px",
          }}
        >
          {gameStore.state.room!.name}
        </div>
        <div
          style={{
            color: "#ccc",
            "margin-bottom": "15px",
            "line-height": "1.4",
          }}
        >
          {gameStore.state.room!.description}
        </div>

        {/* Exits */}
        <div style={{ "margin-bottom": "10px" }}>
          <div
            style={{
              "font-size": "0.8em",
              "text-transform": "uppercase",
              color: "#666",
              "margin-bottom": "5px",
            }}
          >
            Exits
          </div>
          <div style={{ display: "flex", gap: "10px", "flex-wrap": "wrap" }}>
            <For
              each={gameStore.state.room!.contents.filter(
                (i) => i.kind === "EXIT",
              )}
            >
              {(exit) => (
                <span
                  onClick={() => gameStore.send(["move", exit.name])}
                  style={{
                    color: "#aaddff",
                    cursor: "pointer",
                    background: "#333",
                    padding: "2px 6px",
                    "border-radius": "4px",
                    "font-size": "0.9em",
                  }}
                >
                  {exit.name}
                </span>
              )}
            </For>
          </div>
        </div>

        {/* Items */}
        <div>
          <div
            style={{
              "font-size": "0.8em",
              "text-transform": "uppercase",
              color: "#666",
              "margin-bottom": "5px",
            }}
          >
            Contents
          </div>
          <For
            each={gameStore.state.room!.contents.filter(
              (i) => i.kind !== "EXIT",
            )}
          >
            {(item) => <ItemView item={item} />}
          </For>
        </div>
      </Show>
    </div>
  );
}
