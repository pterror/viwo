import { createSignal } from "solid-js";
import { type ScriptValue, StdLib } from "@viwo/scripting";
import BlocksMode from "./modes/BlocksMode";
import LayerMode from "./modes/LayerMode";

type Mode = "layer" | "blocks";

function App() {
  const [mode, setMode] = createSignal<Mode>("layer");

  // Shared script state between modes
  const [sharedScript, setSharedScript] = createSignal<ScriptValue<unknown>>(StdLib.seq());

  return (
    <div class="imagegen">
      <header class="imagegen__header">
        <div class="imagegen__title">Viwo Image Generation</div>
        <div class="imagegen__mode-toggle">
          <button
            class={`imagegen__mode-btn ${mode() === "layer" ? "imagegen__mode-btn--active" : ""}`}
            onClick={() => setMode("layer")}
          >
            Layer Mode
          </button>
          <button
            class={`imagegen__mode-btn ${mode() === "blocks" ? "imagegen__mode-btn--active" : ""}`}
            onClick={() => setMode("blocks")}
          >
            Blocks Mode
          </button>
        </div>
      </header>

      <main class="imagegen__main">
        {mode() === "layer" ? (
          <LayerMode initialScript={sharedScript()} onScriptChange={setSharedScript} />
        ) : (
          <BlocksMode
            script={sharedScript()}
            onScriptChange={setSharedScript}
            onVisualize={() => setMode("layer")}
          />
        )}
      </main>
    </div>
  );
}

export default App;
