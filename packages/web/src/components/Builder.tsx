import { createSignal } from "solid-js";
import { gameStore } from "../store/game";

export default function Builder() {
  const [description, setDescription] = createSignal("");

  const handleUpdateDesc = (e: Event) => {
    e.preventDefault();
    if (!description()) return;
    gameStore.send(["set", "here", "description", description()]);
    setDescription("");
  };

  return (
    <div class="builder">
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
    </div>
  );
}
