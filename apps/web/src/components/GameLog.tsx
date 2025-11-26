import { createEffect, For, Show } from "solid-js";
import { gameStore, RichItem } from "../store/game";

const ItemView = (props: { item: RichItem }) => (
  <div class="game-log__item">
    <span
      onClick={() => gameStore.send(["look", props.item.name])}
      class="game-log__link"
      title="Inspect"
    >
      {props.item.name}
    </span>
    <Show when={props.item.location_detail}>
      <span class="game-log__detail"> (on {props.item.location_detail})</span>
    </Show>
    <Show when={props.item.contents.length > 0}>
      <div class="game-log__sub-items">
        <For each={props.item.contents}>{(sub) => <ItemView item={sub} />}</For>
      </div>
    </Show>
  </div>
);

const RoomView = (props: {
  name: string;
  description: string;
  contents: RichItem[];
}) => {
  const exits = props.contents.filter((i) => i.kind === "EXIT");
  const items = props.contents.filter((i) => i.kind !== "EXIT");

  return (
    <div class="game-log__room">
      <div class="game-log__room-name">{props.name}</div>
      <div class="game-log__room-desc">{props.description}</div>

      <Show when={exits.length > 0}>
        <div class="game-log__exits">
          <span class="game-log__exits-label">Exits: </span>
          <For each={exits}>
            {(exit, i) => (
              <span>
                {i() > 0 ? ", " : ""}
                <span
                  onClick={() => gameStore.send(["move", exit.name])}
                  class="game-log__exit-link"
                >
                  {exit.name}
                  {exit.destination_name
                    ? ` (to ${exit.destination_name})`
                    : ""}
                </span>
              </span>
            )}
          </For>
        </div>
      </Show>

      <Show when={items.length > 0}>
        <div class="game-log__items-label">You see:</div>
        <For each={items}>{(item) => <ItemView item={item} />}</For>
      </Show>
    </div>
  );
};

const InventoryView = (props: { items: RichItem[] }) => (
  <div class="game-log__inventory">
    <div class="game-log__inventory-title">Inventory</div>
    <Show when={props.items.length === 0}>
      <div class="game-log__inventory-empty">Empty</div>
    </Show>
    <For each={props.items}>{(item) => <ItemView item={item} />}</For>
  </div>
);

const MessageView = (props: { text: string; type: "message" | "error" }) => (
  <div
    classList={{
      "game-log__message": true,
      "game-log__message--error": props.type === "error",
    }}
  >
    {props.text}
  </div>
);

const ItemInspectView = (props: {
  name: string;
  description: string;
  contents: RichItem[];
}) => (
  <div class="game-log__inspect">
    <div class="game-log__inspect-name">{props.name}</div>
    <div class="game-log__inspect-desc">{props.description}</div>
    <Show when={props.contents.length > 0}>
      <div class="game-log__items-label">Contains:</div>
      <For each={props.contents}>{(item) => <ItemView item={item} />}</For>
    </Show>
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
    <div ref={(el) => (containerRef = el)} class="game-log">
      <For each={gameStore.state.messages}>
        {(msg) => {
          switch (msg.type) {
            case "room":
              return <RoomView {...msg} />;
            case "inventory":
              return <InventoryView {...msg} />;
            case "item":
              return <ItemInspectView {...msg} />;
            case "message":
              return <MessageView text={msg.text} type={msg.type} />;
            default:
              return null;
          }
        }}
      </For>
    </div>
  );
}
