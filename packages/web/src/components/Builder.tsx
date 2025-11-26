import { createSignal, Show } from "solid-js";
import { gameStore } from "../store/game";
import ItemCreator from "./ItemCreator";
import ItemEditor from "./ItemEditor";

export default function Builder() {
  const [activeTab, setActiveTab] = createSignal<"room" | "create" | "edit">(
    "room",
  );
  const [description, setDescription] = createSignal("");

  const handleUpdateDesc = (e: Event) => {
    e.preventDefault();
    if (!description()) return;
    gameStore.send(["set", "here", "description", description()]);
    setDescription("");
  };

  return (
    <div class="builder">
      <div
        class="builder__tabs"
        style={{ display: "flex", gap: "10px", "margin-bottom": "10px" }}
      >
        <button
          onClick={() => setActiveTab("room")}
          style={{
            "font-weight": activeTab() === "room" ? "bold" : "normal",
            "text-decoration": activeTab() === "room" ? "underline" : "none",
            background: "none",
            border: "none",
            color: "var(--text-primary)",
            cursor: "pointer",
            padding: "0",
          }}
        >
          Room
        </button>
        <button
          onClick={() => setActiveTab("create")}
          style={{
            "font-weight": activeTab() === "create" ? "bold" : "normal",
            "text-decoration": activeTab() === "create" ? "underline" : "none",
            background: "none",
            border: "none",
            color: "var(--text-primary)",
            cursor: "pointer",
            padding: "0",
          }}
        >
          Create Item
        </button>
        <button
          onClick={() => setActiveTab("edit")}
          style={{
            "font-weight": activeTab() === "edit" ? "bold" : "normal",
            "text-decoration": activeTab() === "edit" ? "underline" : "none",
            background: "none",
            border: "none",
            color: "var(--text-primary)",
            cursor: "pointer",
            padding: "0",
          }}
        >
          Edit Item
        </button>
      </div>

      <Show when={activeTab() === "room"}>
        <div class="builder__panel">
          <div class="builder__title">EDIT DESCRIPTION</div>
          <form onSubmit={handleUpdateDesc} class="builder__row">
            <input
              type="text"
              placeholder="New description for current room..."
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
              class="builder__input"
            />
            <button type="submit" class="builder__btn">
              Set
            </button>
          </form>
        </div>
      </Show>

      <Show when={activeTab() === "create"}>
        <ItemCreator />
      </Show>

      <Show when={activeTab() === "edit"}>
        <ItemEditor />
      </Show>
    </div>
  );
}
