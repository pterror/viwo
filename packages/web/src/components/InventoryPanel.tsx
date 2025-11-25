import { For, Show } from "solid-js";
import { gameStore, RichItem } from "../store/game";

const ItemView = (props: { item: RichItem }) => (
  <div style={{ "margin-bottom": "5px" }}>
    <span
      onClick={() => gameStore.send(["look", props.item.name])}
      style={{ color: "#aaddff", cursor: "pointer" }}
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
  </div>
);

export default function InventoryPanel() {
  return (
    <div
      style={{
        padding: "10px",
        "background-color": "#151518",
        "border-left": "1px solid #333",
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
        Inventory
      </div>
      <Show when={gameStore.state.inventory}>
        <For each={gameStore.state.inventory!.items}>
          {(item) => <ItemView item={item} />}
        </For>
      </Show>
    </div>
  );
}
