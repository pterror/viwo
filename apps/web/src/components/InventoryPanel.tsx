import { type Entity, gameStore } from "../store/game";
import { For, Show, createSignal } from "solid-js";

const ItemView = (props: { item: Entity }) => {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const hasContents = () =>
    props.item["contents"] && (props.item["contents"] as readonly number[]).length > 0;

  const children = () => {
    if (!hasContents()) {
      return [];
    }
    return (props.item["contents"] as number[]).flatMap((id) => {
      const entity = gameStore.state.entities.get(id);
      return entity ? [entity] : [];
    });
  };

  return (
    <div class="inventory-panel__item-container">
      <div class="inventory-panel__item">
        <Show when={hasContents()}>
          <button class="inventory-panel__expand-btn" onClick={() => setIsExpanded(!isExpanded())}>
            {isExpanded() ? "▼" : "▶"}
          </button>
        </Show>
        <span
          onClick={() => gameStore.execute("look", [props.item.id])}
          class={`inventory-panel__item-link ${
            (props.item["adjectives"] as readonly string[])
              ?.map(
                (adjective) => `attribute-${adjective.replaceAll(":", "-").replaceAll(" ", "-")}`,
              )
              .join(" ") || ""
          }`}
          style={{ "margin-left": hasContents() ? "0" : "20px" }}
        >
          {props.item["name"] as string}
        </span>
        <Show when={props.item["location_detail"]}>
          <span class="inventory-panel__item-detail">
            ({props.item["location_detail"] as string})
          </span>
        </Show>
        <Show when={props.item["verbs"] && (props.item["verbs"] as readonly string[]).length > 0}>
          <span class="inventory-panel__item-verbs">
            <For each={props.item["verbs"] as readonly string[]}>
              {(verb) => (
                <button
                  class="inventory-panel__verb-btn"
                  onClick={() => gameStore.execute(verb, [props.item["name"] as string])}
                >
                  {verb}
                </button>
              )}
            </For>
          </span>
        </Show>
      </div>
      <Show when={isExpanded() && hasContents()}>
        <div class="inventory-panel__nested">
          <For each={children()}>{(child) => <ItemView item={child} />}</For>
        </div>
      </Show>
    </div>
  );
};

export default function InventoryPanel() {
  const player = () => {
    const id = gameStore.state.playerId;
    return id ? gameStore.state.entities.get(id) : undefined;
  };

  const items = () => {
    const playerValue = player();
    if (!playerValue || !Array.isArray(playerValue["contents"])) {
      return [];
    }
    return (playerValue["contents"] as number[]).flatMap((id) => {
      const entity = gameStore.state.entities.get(id);
      return entity ? [entity] : [];
    });
  };

  return (
    <div class="inventory-panel">
      <Show when={player()}>
        <For each={items()}>{(item) => <ItemView item={item} />}</For>
      </Show>
    </div>
  );
}
