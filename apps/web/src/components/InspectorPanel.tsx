import { Show, For } from "solid-js";
import { gameStore, Entity } from "../store/game";

const ItemView = (props: { item: Entity }) => (
  <div class="inspector-panel__item">
    <span
      onClick={() => gameStore.execute(["look", props.item["name"] as string])}
      class={`inspector-panel__item-link ${
        (props.item["adjectives"] as readonly string[])
          ?.map((a) => `attribute-${a.replace(/[: ]/g, "-")}`)
          .join(" ") || ""
      }`}
    >
      {props.item["name"] as string}
    </span>
    <Show when={(props.item["contents"] as readonly number[]).length > 0}>
      <div class="inspector-panel__item-contents">
        <For each={props.item["contents"] as readonly number[]}>
          {(sub) => (
            // TODO: batch retrieve items
            // @ts-expect-error
            <ItemView item={sub} />
          )}
        </For>
      </div>
    </Show>
  </div>
);

export default function InspectorPanel() {
  return (
    <div class="inspector-panel">
      <Show
        when={gameStore.state.inspectedItem}
        fallback={
          <div class="inspector-panel__empty">Select an item to inspect</div>
        }
      >
        <div class="inspector-panel__name">
          {gameStore.state.inspectedItem!.name}
        </div>
        <div class="inspector-panel__desc">
          {gameStore.state.inspectedItem!.description}
        </div>

        <Show when={gameStore.state.inspectedItem!.contents.length > 0}>
          <div class="inspector-panel__contents-label">Contains:</div>
          <For each={gameStore.state.inspectedItem!.contents}>
            {(item) => <ItemView item={item} />}
          </For>
        </Show>
      </Show>
    </div>
  );
}
