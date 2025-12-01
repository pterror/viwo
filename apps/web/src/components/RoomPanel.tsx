import { For, Show } from "solid-js";
import { gameStore, Entity } from "../store/game";

const ItemView = (props: { item: Entity }) => (
  <div class="room-panel__item">
    <span
      onClick={() => gameStore.execute(["look", props.item["name"] as string])}
      class={`room-panel__item-link ${
        (props.item["adjectives"] as readonly string[])
          ?.map((a) => `attribute-${a.replace(/:/g, "-").replace(/ /g, "-")}`)
          .join(" ") || ""
      }`}
    >
      {props.item["name"] as string}
    </span>
    <Show when={props.item["location_detail"] as string | undefined}>
      <span class="room-panel__item-detail">
        ({props.item["location_detail"] as string})
      </span>
    </Show>
    <Show
      when={props.item["verbs"] && (props.item["verbs"] as string[]).length > 0}
    >
      <span class="room-panel__item-verbs">
        <For each={(props.item["verbs"] as string[]) ?? []}>
          {(verb) => (
            <button
              class="room-panel__verb-btn"
              onClick={() =>
                gameStore.execute([verb, props.item["name"] as string])
              }
            >
              {verb}
            </button>
          )}
        </For>
      </span>
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
        <Show when={gameStore.state.room!.custom_css}>
          <style>{gameStore.state.room!.custom_css}</style>
        </Show>
        <Show when={gameStore.state.room!.image}>
          <img
            src={gameStore.state.room!.image}
            class="room-panel__image"
            alt={gameStore.state.room!.name}
          />
        </Show>
        <div class="room-panel__desc">{gameStore.state.room!.description}</div>

        {/* Exits */}
        <div class="room-panel__section">
          <div class="room-panel__section-title">Exits</div>
          <div class="room-panel__exits">
            <For
              each={gameStore.state.room?.contents.filter(
                // TODO: kind has been removed from Entity. We need a better way to filter for exits.
                (i) => i["kind"] === "EXIT",
              )}
            >
              {(exit) => (
                <span
                  onClick={() =>
                    gameStore.execute(["move", exit["name"] as string])
                  }
                  class="room-panel__exit-tag"
                >
                  {exit["name"] as string}
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
              // TODO: kind has been removed from Entity. We need a better way to filter out exits.
              (i) => i["kind"] !== "EXIT",
            )}
          >
            {(item) => <ItemView item={item} />}
          </For>
        </div>
      </Show>
    </div>
  );
}
