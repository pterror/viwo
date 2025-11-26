import { createSignal } from "solid-js";
import { gameStore } from "../store/game";

interface BuilderProps {
  initialDirection?: string;
  onClose?: () => void;
}

export default function Builder(props: BuilderProps) {
  const [direction, setDirection] = createSignal(
    props.initialDirection || "north",
  );
  const [roomName, setRoomName] = createSignal("");
  const [description, setDescription] = createSignal("");

  const handleDig = (e: Event) => {
    e.preventDefault();
    if (!roomName()) return;
    gameStore.send(["dig", direction(), roomName()]);
    setRoomName("");
    props.onClose?.();
  };

  const handleUpdateDesc = (e: Event) => {
    e.preventDefault();
    if (!description()) return;
    gameStore.send(["set", "here", "description", description()]);
    setDescription("");
  };

  return (
    <div class="builder">
      {/* Dig Panel */}
      <div class="builder__panel">
        <div class="builder__title">DIG ROOM</div>
        <form onSubmit={handleDig} class="builder__form">
          <div class="builder__row">
            <input
              type="text"
              placeholder="Direction (e.g. north, up, portal)"
              value={direction()}
              onInput={(e) => setDirection(e.currentTarget.value)}
              class="builder__input"
            />
          </div>
          <input
            type="text"
            placeholder="Room Name"
            value={roomName()}
            onInput={(e) => setRoomName(e.currentTarget.value)}
            class="builder__input"
          />
          <div class="builder__actions">
            {props.onClose && (
              <button
                type="button"
                onClick={props.onClose}
                class="builder__btn"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              classList={{
                builder__btn: true,
                "builder__btn--primary": true,
              }}
            >
              Dig
            </button>
          </div>
        </form>
      </div>

      {/* Edit Panel (Only show if not in modal mode, or maybe separate?) */}
      {!props.onClose && (
        <div
          classList={{
            builder__panel: true,
            "builder__panel--edit": true,
          }}
        >
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
      )}
    </div>
  );
}
