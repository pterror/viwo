import { For, Show } from "solid-js";
import { gameStore, RichItem } from "../store/game";

const ItemView = (props: { item: RichItem }) => (
  <div class="inventory-panel__item">
    <span
      onClick={() => gameStore.send(["look", props.item.name])}
      class="inventory-panel__item-link"
    >
      {props.item.name}
    </span>
    <Show when={props.item.location_detail}>
      <span class="inventory-panel__item-detail">
        ({props.item.location_detail})
      </span>
    </Show>
  </div>
);

export default function InventoryPanel() {
  return (
    <div class="inventory-panel">
      <div class="inventory-panel__title">Inventory</div>
      <Show when={gameStore.state.inventory}>
        <For each={gameStore.state.inventory!.items}>
          {(item) => <ItemView item={item} />}
        </For>
      </Show>
    </div>
  );
}
