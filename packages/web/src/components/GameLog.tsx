import { createEffect, For, Show } from "solid-js";
import { gameStore, RichItem } from "../store/game";

const ItemView = (props: { item: RichItem }) => (
  <div style={{ "margin-left": "15px" }}>
    <span style={{ color: "#aaddff" }}>{props.item.name}</span>
    <Show when={props.item.location_detail}>
      <span style={{ color: "#888", "font-size": "0.9em" }}>
        {" "}
        (on {props.item.location_detail})
      </span>
    </Show>
    <Show when={props.item.contents.length > 0}>
      <div
        style={{
          "margin-left": "10px",
          "border-left": "1px solid #444",
          "padding-left": "5px",
        }}
      >
        <For each={props.item.contents}>{(sub) => <ItemView item={sub} />}</For>
      </div>
    </Show>
  </div>
);

const RoomView = (props: {
  name: string;
  description: string;
  contents: RichItem[];
}) => (
  <div
    style={{
      "margin-bottom": "15px",
      "border-left": "2px solid var(--accent-color)",
      "padding-left": "10px",
    }}
  >
    <div
      style={{
        "font-weight": "bold",
        "font-size": "1.1em",
        "margin-bottom": "5px",
      }}
    >
      {props.name}
    </div>
    <div style={{ "margin-bottom": "10px", color: "#ccc" }}>
      {props.description}
    </div>
    <Show when={props.contents.length > 0}>
      <div
        style={{ "font-size": "0.9em", color: "#888", "margin-bottom": "5px" }}
      >
        You see:
      </div>
      <For each={props.contents}>{(item) => <ItemView item={item} />}</For>
    </Show>
  </div>
);

const InventoryView = (props: { items: RichItem[] }) => (
  <div
    style={{
      "margin-bottom": "15px",
      background: "#1a1a1d",
      padding: "10px",
      "border-radius": "4px",
    }}
  >
    <div
      style={{ "font-weight": "bold", "margin-bottom": "5px", color: "#aaa" }}
    >
      Inventory
    </div>
    <Show when={props.items.length === 0}>
      <div style={{ color: "#666", "font-style": "italic" }}>Empty</div>
    </Show>
    <For each={props.items}>{(item) => <ItemView item={item} />}</For>
  </div>
);

const MessageView = (props: { text: string; type: "message" | "error" }) => (
  <div
    style={{
      "margin-bottom": "8px",
      color: props.type === "error" ? "#ff6b6b" : "inherit",
    }}
  >
    {props.text}
  </div>
);

export default function GameLog() {
  let containerRef: HTMLDivElement | undefined;

  // Auto-scroll to bottom
  createEffect(() => {
    // oxlint-disable-next-line no-unused-expressions
    gameStore.state.messages.length; // dependency
    if (containerRef) {
      containerRef.scrollTop = containerRef.scrollHeight;
    }
  });

  return (
    <div
      ref={(el) => (containerRef = el)}
      style={{
        flex: 1,
        overflow: "auto",
        padding: "20px",
        "font-size": "14px",
        "line-height": "1.6",
      }}
    >
      <For each={gameStore.state.messages}>
        {(msg) => {
          if (msg.type === "room") return <RoomView {...(msg as any)} />;
          if (msg.type === "inventory")
            return <InventoryView {...(msg as any)} />;
          return (
            <MessageView text={(msg as any).text} type={(msg as any).type} />
          );
        }}
      </For>
    </div>
  );
}
