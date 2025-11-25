import { createEffect, For } from "solid-js";
import { gameStore } from "../store/game";

export default function GameLog() {
  let containerRef: HTMLDivElement | undefined;

  // Auto-scroll to bottom
  createEffect(() => {
    // oxlint-disable-next-line no-unused-expressions
    gameStore.state.messages.length; // dependency
    if (containerRef) {
      containerRef.scrollTop = containerRef.scrollHeight;
    }
  });

  return (
    <div
      ref={(el) => (containerRef = el)}
      style={{
        flex: 1,
        overflow: "auto",
        padding: "20px",
        "font-family": "var(--font-mono)",
        "white-space": "pre-wrap",
        "font-size": "14px",
        "line-height": "1.6",
      }}
    >
      <For each={gameStore.state.messages}>
        {(msg) => <div style={{ "margin-bottom": "8px" }}>{msg}</div>}
      </For>
    </div>
  );
}
