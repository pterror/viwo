import { createSignal, Show } from "solid-js";
import { gameStore } from "../store/game";

interface DigPanelProps {
  initialDirection?: string;
  isLocked?: boolean;
  hideDirection?: boolean;
  onClose?: () => void;
}

export default function DigPanel(props: DigPanelProps) {
  const [direction, setDirection] = createSignal(props.initialDirection || "");
  const [mode, setMode] = createSignal<"new" | "existing">("new");
  const [roomName, setRoomName] = createSignal("");
  const [targetRoom, setTargetRoom] = createSignal("");

  const handleDig = (e: Event) => {
    e.preventDefault();
    if (mode() === "new") {
      if (!roomName()) return;
      gameStore.send(["dig", direction(), roomName()]);
    } else {
      if (!targetRoom()) return;
      gameStore.send(["dig", direction(), targetRoom()]);
    }

    setRoomName("");
    setTargetRoom("");
    props.onClose?.();
  };

  return (
    <div class="builder__panel" style={{ padding: "10px" }}>
      <div class="builder__title">DIG ROOM</div>
      <form onSubmit={handleDig} class="builder__form">
        <Show when={!props.hideDirection}>
          <div class="builder__row">
            <input
              type="text"
              placeholder="Direction (e.g. north, up, portal)"
              value={direction()}
              onInput={(e) => setDirection(e.currentTarget.value)}
              class="builder__input"
              disabled={props.isLocked}
              autocomplete="off"
            />
          </div>
        </Show>

        <div
          class="builder__tabs"
          style={{ display: "flex", gap: "10px", "font-size": "0.9em" }}
        >
          <button
            type="button"
            onClick={() => setMode("new")}
            style={{
              "font-weight": mode() === "new" ? "bold" : "normal",
              "text-decoration": mode() === "new" ? "underline" : "none",
              background: "none",
              border: "none",
              color: "var(--text-primary)",
              cursor: "pointer",
              padding: "0",
            }}
          >
            New Room
          </button>
          <button
            type="button"
            onClick={() => setMode("existing")}
            style={{
              "font-weight": mode() === "existing" ? "bold" : "normal",
              "text-decoration": mode() === "existing" ? "underline" : "none",
              background: "none",
              border: "none",
              color: "var(--text-primary)",
              cursor: "pointer",
              padding: "0",
            }}
          >
            Existing Room
          </button>
        </div>

        <Show when={mode() === "new"}>
          <input
            type="text"
            placeholder="New Room Name"
            value={roomName()}
            onInput={(e) => setRoomName(e.currentTarget.value)}
            class="builder__input"
            autocomplete="off"
          />
        </Show>

        <Show when={mode() === "existing"}>
          <input
            type="text"
            placeholder="Target Room Name (exact match)"
            value={targetRoom()}
            onInput={(e) => setTargetRoom(e.currentTarget.value)}
            class="builder__input"
            autocomplete="off"
          />
        </Show>

        <div class="builder__actions">
          {props.onClose && (
            <button type="button" onClick={props.onClose} class="builder__btn">
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
  );
}
