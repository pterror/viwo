import { Component, For, Show } from "solid-js";
import { BLOCK_DEFINITIONS } from "./types";

interface BlockNodeProps {
  node: any;
  path: number[];
  onUpdate: (path: number[], newNode: any) => void;
  onDelete: (path: number[]) => void;
}

export const BlockNode: Component<BlockNodeProps> = (props) => {
  const isArray = Array.isArray(props.node);

  // If it's not an array, it's a literal or variable
  if (!isArray) {
    return (
      <div class="block-node block-node--literal">
        <input
          class="block-node__input"
          value={props.node}
          onInput={(e) => props.onUpdate(props.path, e.currentTarget.value)}
        />
      </div>
    );
  }

  const opcode = props.node[0];
  const def = BLOCK_DEFINITIONS.find((d) => d.opcode === opcode);

  if (!def) {
    return <div class="block-node block-node--unknown">Unknown: {opcode}</div>;
  }

  const args = props.node.slice(1);

  return (
    <div
      class={`block-node block-node--${def.type} block-node--${def.category}`}
    >
      <div class="block-node__header">
        <span class="block-node__label">{def.label}</span>
        <button
          class="block-node__delete"
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete(props.path);
          }}
        >
          &times;
        </button>
      </div>

      <div class="block-node__content">
        <Show when={def.opcode === "seq"}>
          <div class="block-node__sequence">
            <For each={args}>
              {(arg, i) => (
                <BlockNode
                  node={arg}
                  path={[...props.path, i() + 1]}
                  onUpdate={props.onUpdate}
                  onDelete={props.onDelete}
                />
              )}
            </For>
            {/* Drop zone for new steps would go here */}
          </div>
        </Show>

        <Show when={def.opcode !== "seq" && def.slots}>
          <For each={def.slots}>
            {(slot, i) => (
              <div class="block-node__slot">
                <span class="block-node__slot-label">{slot.name}:</span>
                <div class="block-node__slot-content">
                  {/* If the slot expects a block, render the child node if present, or a placeholder */}
                  <Show
                    when={args[i()] !== undefined}
                    fallback={
                      <div class="block-node__placeholder">Drop here</div>
                    }
                  >
                    <BlockNode
                      node={args[i()]}
                      path={[...props.path, i() + 1]}
                      onUpdate={props.onUpdate}
                      onDelete={props.onDelete}
                    />
                  </Show>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
};
