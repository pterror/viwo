import { type ActionType, keybindsStore } from "../store/keybinds";
import { createSignal, onCleanup, onMount } from "solid-js";

interface Props {
  action: ActionType;
}

export const KeybindRecorder = (props: Props) => {
  const [isRecording, setIsRecording] = createSignal(false);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isRecording()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Ignore modifier keys alone
    if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) {
      return;
    }

    keybindsStore.setKey(props.action, event.key);
    setIsRecording(false);
  };

  const startRecording = () => {
    setIsRecording(true);
  };

  // Click outside to cancel
  const handleClickOutside = (event: MouseEvent) => {
    if (isRecording() && !(event.target as HTMLElement).closest(".keybind-recorder")) {
      setIsRecording(false);
    }
  };

  onMount(() => {
    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("click", handleClickOutside);
  });

  onCleanup(() => {
    globalThis.removeEventListener("keydown", handleKeyDown);
    globalThis.removeEventListener("click", handleClickOutside);
  });

  return (
    <button
      class={`keybind-recorder ${isRecording() ? "keybind-recorder--recording" : ""}`}
      onClick={startRecording}
      title="Click to rebind"
    >
      {isRecording() ? "Press any key..." : keybindsStore.getKey(props.action)}
    </button>
  );
};
