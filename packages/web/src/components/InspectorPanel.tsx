import { Show, For } from "solid-js";
import { gameStore, RichItem } from "../store/game";

const ItemView = (props: { item: RichItem }) => (
  <div style={{ "margin-left": "10px", "margin-top": "2px" }}>
    <span
      onClick={() => gameStore.send(["look", props.item.name])}
      style={{ color: "#aaddff", cursor: "pointer" }}
    >
      {props.item.name}
    </span>
    <Show when={props.item.contents.length > 0}>
      <div style={{ "border-left": "1px solid #444", "padding-left": "5px" }}>
        <For each={props.item.contents}>{(sub) => <ItemView item={sub} />}</For>
      </div>
    </Show>
  </div>
);

export default function InspectorPanel() {
  return (
    <div
      style={{
        padding: "10px",
        "background-color": "#1a1a1d",
        "border-top": "1px solid #333",
        height: "100%",
        overflow: "auto",
      }}
    >
      <div
        style={{
          "font-size": "0.9em",
          "text-transform": "uppercase",
          color: "#666",
          "margin-bottom": "10px",
        }}
      >
        Inspector
      </div>
      <Show
        when={gameStore.state.inspectedItem}
        fallback={
          <div style={{ color: "#444", "font-style": "italic" }}>
            Select an item to inspect
          </div>
        }
      >
        <div style={{ "font-weight": "bold", "margin-bottom": "5px" }}>
          {gameStore.state.inspectedItem!.name}
        </div>
        <div
          style={{
            color: "#ccc",
            "margin-bottom": "10px",
            "font-size": "0.9em",
          }}
        >
          {gameStore.state.inspectedItem!.description}
        </div>

        <Show when={gameStore.state.inspectedItem!.contents.length > 0}>
          <div
            style={{
              "font-size": "0.8em",
              color: "#666",
              "margin-bottom": "5px",
            }}
          >
            Contains:
          </div>
          <For each={gameStore.state.inspectedItem!.contents}>
            {(item) => <ItemView item={item} />}
          </For>
        </Show>
      </Show>
    </div>
  );
}
