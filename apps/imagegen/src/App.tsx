import { createSignal, For, Show } from "solid-js";
import { type ScriptValue, StdLib } from "@viwo/scripting";
import BlocksMode from "./modes/BlocksMode";
import LayerMode from "./modes/LayerMode";
import { useTemplates } from "./utils/templates";

type Mode = "layer" | "blocks";

function App() {
  const [mode, setMode] = createSignal<Mode>("layer");

  // Shared script state between modes
  const [sharedScript, setSharedScript] = createSignal<ScriptValue<unknown>>(StdLib.seq());

  // Templates
  const templates = useTemplates();
  const [showTemplates, setShowTemplates] = createSignal(false);

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
          <button class="imagegen__mode-btn" onClick={() => setShowTemplates(!showTemplates())}>
            📚 Templates
          </button>
        </div>
      </header>

      {/* Templates Sidebar */}
      <aside class={`imagegen__templates ${showTemplates() ? "imagegen__templates--visible" : ""}`}>
        <header class="imagegen__templates-header">
          <h2>Templates</h2>
          <button onClick={() => setShowTemplates(false)}>✕</button>
        </header>

        <div class="imagegen__templates-actions">
          <button
            class="glass-button glass-button--primary"
            onClick={() => {
              const name = prompt("Template name:");
              const description = prompt("Description:");
              if (name) {
                templates.saveTemplate(name, description || "", sharedScript());
              }
            }}
          >
            💾 Save Current
          </button>
          <button
            class="glass-button"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".json";
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  try {
                    await templates.importTemplate(file);
                    alert("Template imported successfully!");
                  } catch (error) {
                    alert(`Import failed: ${error}`);
                  }
                }
              };
              input.click();
            }}
          >
            📥 Import
          </button>
        </div>

        <div class="imagegen__templates-list">
          <For each={templates.templates()}>
            {(template) => (
              <div class="imagegen__template-card">
                <Show when={template.metadata.thumbnail}>
                  <img src={template.metadata.thumbnail!} alt={template.name} />
                </Show>
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <div class="imagegen__template-meta">
                  <small>{new Date(template.created).toLocaleDateString()}</small>
                </div>
                <div class="imagegen__template-actions">
                  <button
                    class="glass-button"
                    onClick={() => {
                      setSharedScript(template.script);
                      setShowTemplates(false);
                    }}
                  >
                    Load
                  </button>
                  <button
                    class="glass-button"
                    onClick={() => templates.exportTemplate(template.id)}
                  >
                    Export
                  </button>
                  <button
                    class="glass-button"
                    onClick={() => {
                      if (confirm(`Delete template "${template.name}"?`)) {
                        templates.deleteTemplate(template.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </For>
          <Show when={templates.templates().length === 0}>
            <p class="imagegen__templates-empty">No templates yet</p>
          </Show>
        </div>
      </aside>

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
