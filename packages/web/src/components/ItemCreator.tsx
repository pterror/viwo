import { createSignal, For } from "solid-js";
import { gameStore } from "../store/game";
import { ALL_ADJECTIVES } from "../constants/adjectives";

export default function ItemCreator(props: { onClose?: () => void }) {
  const [name, setName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [selectedAdjectives, setSelectedAdjectives] = createSignal<string[]>(
    [],
  );
  const [adjInput, setAdjInput] = createSignal("");

  const filteredAdjectives = () => {
    const input = adjInput().toLowerCase();
    if (!input) return [];
    return ALL_ADJECTIVES.filter(
      (adj) => adj.includes(input) && !selectedAdjectives().includes(adj),
    ).slice(0, 5);
  };

  const addAdjective = (adj: string) => {
    setSelectedAdjectives([...selectedAdjectives(), adj]);
    setAdjInput("");
  };

  const removeAdjective = (adj: string) => {
    setSelectedAdjectives(selectedAdjectives().filter((a) => a !== adj));
  };

  const handleCreate = (e: Event) => {
    e.preventDefault();
    if (!name()) return;

    const itemProps = {
      description: description(),
      adjectives: selectedAdjectives(),
    };

    gameStore.send(["create", name(), JSON.stringify(itemProps)]);

    setName("");
    setDescription("");
    setSelectedAdjectives([]);
    props.onClose?.();
  };

  return (
    <div class="builder__panel">
      <div class="builder__title">CREATE ITEM</div>
      <form onSubmit={handleCreate} class="builder__form">
        <input
          type="text"
          placeholder="Item Name"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          class="builder__input"
          required
        />
        <input
          type="text"
          placeholder="Description"
          value={description()}
          onInput={(e) => setDescription(e.currentTarget.value)}
          class="builder__input"
        />

        <div class="builder__row" style={{ "flex-direction": "column" }}>
          <div style={{ display: "flex", gap: "5px", "flex-wrap": "wrap" }}>
            <For each={selectedAdjectives()}>
              {(adj) => (
                <span
                  style={{
                    background: "var(--bg-element)",
                    padding: "2px 6px",
                    "border-radius": "4px",
                    "font-size": "0.9em",
                    cursor: "pointer",
                    border: "1px solid var(--border-color)",
                  }}
                  onClick={() => removeAdjective(adj)}
                  title="Click to remove"
                >
                  {adj} ×
                </span>
              )}
            </For>
          </div>
          <div style={{ position: "relative", display: "flex", flex: 1 }}>
            <input
              type="text"
              placeholder="Add Adjective (e.g. color:red)"
              value={adjInput()}
              onInput={(e) => setAdjInput(e.currentTarget.value)}
              class="builder__input"
            />
            {filteredAdjectives().length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-color)",
                  "border-radius": "4px",
                  "z-index": 10,
                  "max-height": "150px",
                  overflow: "auto",
                }}
              >
                <For each={filteredAdjectives()}>
                  {(adj) => (
                    <div
                      style={{
                        padding: "5px 10px",
                        cursor: "pointer",
                        "border-bottom": "1px solid var(--border-color)",
                      }}
                      onClick={() => addAdjective(adj)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--bg-element-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {adj}
                    </div>
                  )}
                </For>
              </div>
            )}
          </div>
        </div>

        <div class="builder__actions">
          <button type="submit" class="builder__btn builder__btn--primary">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
