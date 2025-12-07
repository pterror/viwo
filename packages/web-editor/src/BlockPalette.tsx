import { type Component, For, createSignal } from "solid-js";
import type { BlockDefinition } from "./types";

interface BlockPaletteProps {
  opcodes: BlockDefinition[];
}

const onDragStart = (event: DragEvent, opcode: string) => {
  event.dataTransfer?.setData("application/json", JSON.stringify({ opcode }));
  event.dataTransfer!.effectAllowed = "copy";
};

export const BlockPalette: Component<BlockPaletteProps> = (props) => {
  const [search, setSearch] = createSignal("");

  const filteredBlocks = () => {
    const query = search().toLowerCase();
    const opcodes = props.opcodes || [];
    return opcodes.filter(
      (def) =>
        def.label.toLowerCase().includes(query) ||
        def.opcode.toLowerCase().includes(query) ||
        def.category.toLowerCase().includes(query),
    );
  };

  return (
    <div class="block-palette">
      <div class="block-palette__search">
        <input
          type="text"
          placeholder="Search blocks..."
          value={search()}
          onInput={(event) => setSearch(event.currentTarget.value)}
          class="block-palette__search-input"
        />
      </div>
      <div class="block-palette__list">
        <For each={filteredBlocks()}>
          {(def) => (
            <div
              class={`block-palette__item block-palette__item--${def.category}`}
              draggable={true}
              onDragStart={(event) => onDragStart(event, def.opcode)}
            >
              {def.label}
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
