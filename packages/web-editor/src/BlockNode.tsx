import { type Component, For, Show, createMemo } from "solid-js";
import type { BlockDefinition } from "./types";

interface BlockNodeProps {
  node: any;
  path: number[];
  opcodes: BlockDefinition[];
  onUpdate: (path: number[], newNode: any) => void;
  onDelete: (path: number[]) => void;
}

export const BlockNode: Component<BlockNodeProps> = (props) => {
  const isArray = createMemo(() => Array.isArray(props.node));

  // Handle null/placeholder
  const isNull = createMemo(() => props.node === null);

  const handleDrop = (event: DragEvent, path: number[]) => {
    event.preventDefault();
    event.stopPropagation();
    const data = event.dataTransfer?.getData("application/json");
    if (!data) {
      return;
    }

    try {
      const { opcode } = JSON.parse(data);
      const def = props.opcodes?.find((definition) => definition.opcode === opcode);
      if (!def) {
        return;
      }

      let newNode: any = [opcode];
      if (def.slots) {
        def.slots.forEach((slot) => {
          newNode.push(slot.default !== undefined ? slot.default : undefined);
        });
      }
      props.onUpdate(path, newNode);
    } catch (error) {
      console.error("Drop error", error);
    }
  };

  return (
    <Show
      when={!isNull()}
      fallback={
        <div
          class="block-node block-node--placeholder"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, props.path)}
        >
          Empty Slot
        </div>
      }
    >
      <Show
        when={isArray()}
        fallback={
          <div class="block-node block-node--literal">
            <input
              class="block-node__input"
              value={props.node}
              onInput={(event) => props.onUpdate(props.path, event.currentTarget.value)}
            />
          </div>
        }
      >
        {(() => {
          const opcode = createMemo(() => props.node[0]);
          const def = createMemo(() =>
            props.opcodes?.find((definition) => definition.opcode === opcode()),
          );
          const args = createMemo(() => props.node.slice(1));

          return (
            <Show
              when={def()}
              fallback={<div class="block-node block-node--unknown">Unknown: {opcode()}</div>}
            >
              <div
                class={`block-node block-node--${def()!.type} block-node--${def()!.category} ${
                  def()!.layout ? `block-node--${def()!.layout}` : ""
                }`}
              >
                {/* Header/Label - Hide for primitives and infix (unless we want it) */}
                <Show when={def()!.layout !== "primitive" && def()!.layout !== "infix"}>
                  <div class="block-node__header">
                    <Show when={def()!.opcode !== "seq"}>
                      <span class="block-node__label">{def()!.label}</span>
                    </Show>

                    {/* Control Flow: Render first slot (Condition) in header */}
                    <Show
                      when={
                        def()!.layout === "control-flow" && def()!.slots && def()!.slots!.length > 0
                      }
                    >
                      <div class="block-node__header-slot">
                        <Show
                          when={args()[0] !== undefined}
                          fallback={
                            <div
                              class="block-node__placeholder"
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => handleDrop(event, [...props.path, 1])}
                            >
                              Condition
                            </div>
                          }
                        >
                          <BlockNode
                            node={args()[0]}
                            path={[...props.path, 1]}
                            opcodes={props.opcodes}
                            onUpdate={props.onUpdate}
                            onDelete={props.onDelete}
                          />
                        </Show>
                      </div>
                    </Show>

                    <button
                      class="block-node__delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onDelete(props.path);
                      }}
                    >
                      &times;
                    </button>
                  </div>
                </Show>

                {/* Primitive Layout: Just input + delete */}
                <Show when={def()!.layout === "primitive"}>
                  <div class="block-node__primitive">
                    <Show
                      when={def()!.opcode === "boolean"}
                      fallback={
                        <input
                          type={def()!.opcode === "number" ? "number" : "text"}
                          class="block-node__input block-node__input--primitive"
                          value={args()[0]}
                          onInput={(event) =>
                            props.onUpdate(
                              [...props.path, 1],
                              def()!.opcode === "number"
                                ? Number(event.currentTarget.value)
                                : event.currentTarget.value,
                            )
                          }
                        />
                      }
                    >
                      <select
                        class="block-node__select"
                        value={String(args()[0])}
                        onChange={(event) =>
                          props.onUpdate([...props.path, 1], event.currentTarget.value === "true")
                        }
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    </Show>
                    <button
                      class="block-node__delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onDelete(props.path);
                      }}
                    >
                      &times;
                    </button>
                  </div>
                </Show>

                <div class="block-node__content">
                  <Show when={def()!.opcode === "seq"}>
                    <div class="block-node__sequence">
                      <For each={args()}>
                        {(arg, idx) => (
                          <BlockNode
                            node={arg}
                            path={[...props.path, idx() + 1]}
                            opcodes={props.opcodes}
                            onUpdate={props.onUpdate}
                            onDelete={props.onDelete}
                          />
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show
                    when={def()!.opcode !== "seq" && def()!.slots && def()!.layout !== "primitive"}
                  >
                    <For each={def()!.slots}>
                      {(slot, idx) => (
                        <Show
                          when={
                            // Skip first slot for control-flow as it's in header
                            !(def()!.layout === "control-flow" && idx() === 0)
                          }
                        >
                          <>
                            {/* Infix Operator between args */}
                            <Show when={def()!.layout === "infix" && idx() === 1}>
                              <div class="block-node__infix-op">{def()!.label}</div>
                            </Show>

                            <div
                              class={`block-node__slot ${
                                def()!.layout === "infix" ? "block-node__slot--infix" : ""
                              }`}
                            >
                              <Show when={def()!.layout !== "infix"}>
                                <span class="block-node__slot-label">{slot.name}:</span>
                              </Show>

                              <div class="block-node__slot-content">
                                <Show
                                  when={args()[idx()] !== undefined}
                                  fallback={
                                    <div
                                      class="block-node__placeholder"
                                      onDragOver={(event) => event.preventDefault()}
                                      onDrop={(event) =>
                                        handleDrop(event, [...props.path, idx() + 1])
                                      }
                                    >
                                      {def()!.layout === "infix" ? "?" : "Drop here"}
                                    </div>
                                  }
                                >
                                  <BlockNode
                                    node={args()[idx()]}
                                    path={[...props.path, idx() + 1]}
                                    opcodes={props.opcodes}
                                    onUpdate={props.onUpdate}
                                    onDelete={props.onDelete}
                                  />
                                </Show>
                              </div>
                            </div>
                          </>
                        </Show>
                      )}
                    </For>

                    {/* Delete button for infix at the end */}
                    <Show when={def()!.layout === "infix"}>
                      <button
                        class="block-node__delete block-node__delete--infix"
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onDelete(props.path);
                        }}
                      >
                        &times;
                      </button>
                    </Show>
                  </Show>
                </div>
              </div>
            </Show>
          );
        })()}
      </Show>
    </Show>
  );
};
