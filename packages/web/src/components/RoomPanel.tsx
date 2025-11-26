import { For, Show } from "solid-js";
import { gameStore, RichItem } from "../store/game";

const ItemView = (props: { item: RichItem }) => (
  <div class="room-panel__item">
    <span
      onClick={() => gameStore.send(["look", props.item.name])}
      class="room-panel__item-link"
    >
      {props.item.name}
    </span>
    <Show when={props.item.location_detail}>
      <span class="room-panel__item-detail">
        ({props.item.location_detail})
      </span>
    </Show>
    <Show when={props.item.contents.length > 0}>
      <div class="room-panel__item-contents">
        <For each={props.item.contents}>{(sub) => <ItemView item={sub} />}</For>
      </div>
    </Show>
  </div>
);

export default function RoomPanel() {
  return (
    <div class="room-panel">
      <Show
        when={gameStore.state.room}
        fallback={<div class="room-panel__loading">Loading room...</div>}
      >
        <div class="room-panel__name">{gameStore.state.room!.name}</div>
        <div class="room-panel__desc">{gameStore.state.room!.description}</div>

        {/* Exits */}
        <div class="room-panel__section">
          <div class="room-panel__section-title">Exits</div>
          <div class="room-panel__exits">
            <For
              each={gameStore.state.room?.contents.filter(
                (i) => i.kind === "EXIT",
              )}
            >
              {(exit) => (
                <span
                  onClick={() => gameStore.send(["move", exit.name])}
                  class="room-panel__exit-tag"
                >
                  {exit.name}
                  {exit.destination_name
                    ? ` (to ${exit.destination_name})`
                    : ""}
                </span>
              )}
            </For>
          </div>
        </div>

        {/* Items */}
        <div>
          <div class="room-panel__section-title">Contents</div>
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
