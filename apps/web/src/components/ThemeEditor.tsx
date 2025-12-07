import { type Component, For } from "solid-js";
import { type ThemeColors, themeStore } from "../store/theme";

interface Props {
  onClose: () => void;
}

export const ThemeEditor: Component<Props> = (props) => {
  const colorKeys = Object.keys(themeStore.activeTheme.colors) as (keyof ThemeColors)[];

  const handleExport = () => {
    const theme = themeStore.activeTheme;
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(theme, undefined, 2),
    )}`;
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `${theme.manifest.name.replaceAll(/\s+/g, "_").toLowerCase()}.json`,
    );
    document.body.append(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    const content = await file.text();
    try {
      const theme = JSON.parse(content);
      themeStore.importTheme(theme);
      alert("Theme imported successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to import theme. Invalid JSON.");
    }
  };

  return (
    <div
      style={{
        "align-items": "center",
        background: "rgba(0,0,0,0.8)",
        bottom: 0,
        display: "flex",
        "justify-content": "center",
        left: 0,
        position: "fixed",
        right: 0,
        top: 0,
        "z-index": 1000,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          props.onClose();
        }
      }}
    >
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-color)",
          "border-radius": "8px",
          display: "flex",
          "flex-direction": "column",
          gap: "15px",
          "max-height": "85vh",
          "overflow-y": "auto",
          padding: "20px",
          width: "600px",
        }}
      >
        <div
          style={{
            "align-items": "center",
            display: "flex",
            "justify-content": "space-between",
          }}
        >
          <h2 style={{ color: "var(--text-primary)", margin: 0 }}>Theme Editor</h2>
          <button
            onClick={props.onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              "font-size": "1.2em",
            }}
          >
            ✕
          </button>
        </div>

        {/* Theme Selector & Actions */}
        <div style={{ "align-items": "center", display: "flex", gap: "10px" }}>
          <select
            value={themeStore.state.activeThemeId}
            onChange={(event) => themeStore.setActiveTheme(event.currentTarget.value)}
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              "border-radius": "4px",
              color: "var(--text-primary)",
              flex: 1,
              padding: "8px",
            }}
          >
            <For each={themeStore.state.themes}>
              {(theme) => (
                <option value={theme.id}>
                  {theme.manifest.name} {theme.isBuiltin ? "(Built-in)" : ""}
                </option>
              )}
            </For>
          </select>
          <button
            onClick={() => {
              const name = prompt("Enter new theme name:");
              if (name) {
                themeStore.createTheme(name);
              }
            }}
            style={{
              background: "var(--bg-element)",
              border: "1px solid var(--border-color)",
              "border-radius": "4px",
              color: "var(--text-primary)",
              cursor: "pointer",
              padding: "8px",
            }}
            title="New Theme"
          >
            +
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this theme?")) {
                themeStore.deleteTheme(themeStore.state.activeThemeId);
              }
            }}
            disabled={themeStore.activeTheme.isBuiltin}
            style={{
              background: "var(--bg-element)",
              border: "1px solid var(--border-color)",
              "border-radius": "4px",
              color: themeStore.activeTheme.isBuiltin ? "var(--text-muted)" : "var(--error-color)",
              cursor: themeStore.activeTheme.isBuiltin ? "not-allowed" : "pointer",
              padding: "8px",
            }}
            title="Delete Theme"
          >
            🗑️
          </button>
          <button
            onClick={handleExport}
            style={{
              background: "var(--bg-element)",
              border: "1px solid var(--border-color)",
              "border-radius": "4px",
              color: "var(--text-primary)",
              cursor: "pointer",
              padding: "8px",
            }}
            title="Export Theme"
          >
            ⬇️
          </button>
          <label
            style={{
              background: "var(--bg-element)",
              border: "1px solid var(--border-color)",
              "border-radius": "4px",
              color: "var(--text-primary)",
              cursor: "pointer",
              display: "inline-block",
              padding: "8px",
            }}
            title="Import Theme"
          >
            ⬆️
            <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
          </label>
        </div>

        {/* Metadata Editor */}
        <div
          style={{
            background: "var(--bg-element)",
            "border-radius": "4px",
            display: "grid",
            gap: "10px",
            "grid-template-columns": "1fr 1fr",
            padding: "10px",
          }}
        >
          <div style={{ display: "flex", "flex-direction": "column", gap: "5px" }}>
            <label style={{ color: "var(--text-secondary)", "font-size": "0.8em" }}>Name</label>
            <input
              type="text"
              value={themeStore.activeTheme.manifest.name}
              disabled={themeStore.activeTheme.isBuiltin}
              onChange={(event) => themeStore.updateManifest({ name: event.currentTarget.value })}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                "border-radius": "4px",
                color: "var(--text-primary)",
                padding: "5px",
              }}
            />
          </div>
          <div style={{ display: "flex", "flex-direction": "column", gap: "5px" }}>
            <label style={{ color: "var(--text-secondary)", "font-size": "0.8em" }}>Author</label>
            <input
              type="text"
              value={themeStore.activeTheme.manifest.author}
              disabled={themeStore.activeTheme.isBuiltin}
              onChange={(event) => themeStore.updateManifest({ author: event.currentTarget.value })}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                "border-radius": "4px",
                color: "var(--text-primary)",
                padding: "5px",
              }}
            />
          </div>
        </div>

        <div
          style={{
            "align-items": "center",
            background: "var(--bg-element)",
            "border-radius": "4px",
            display: "flex",
            gap: "10px",
            padding: "10px",
          }}
        >
          <input
            type="checkbox"
            id="allowCustomCss"
            checked={themeStore.state.allowCustomCss}
            onChange={() => themeStore.toggleCustomCss()}
          />
          <label for="allowCustomCss" style={{ color: "var(--text-primary)" }}>
            Allow Custom CSS from Areas/Rooms
          </label>
        </div>

        <div
          style={{
            display: "grid",
            gap: "10px",
            "grid-template-columns": "1fr 1fr",
          }}
        >
          <For each={colorKeys}>
            {(key) => (
              <div
                style={{
                  display: "flex",
                  "flex-direction": "column",
                  gap: "5px",
                }}
              >
                <label
                  style={{
                    color: "var(--text-secondary)",
                    "font-size": "0.8em",
                  }}
                >
                  {key}
                </label>
                <div style={{ display: "flex", gap: "5px" }}>
                  <input
                    type="color"
                    value={
                      themeStore.activeTheme.colors[key].startsWith("#")
                        ? themeStore.activeTheme.colors[key]
                        : "#000000"
                    }
                    onChange={(event) => themeStore.updateColor(key, event.currentTarget.value)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      height: "30px",
                      padding: 0,
                      width: "30px",
                    }}
                  />
                  <input
                    type="text"
                    value={themeStore.activeTheme.colors[key]}
                    onChange={(event) => themeStore.updateColor(key, event.currentTarget.value)}
                    style={{
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-color)",
                      "border-radius": "4px",
                      color: "var(--text-primary)",
                      flex: 1,
                      "font-family": "monospace",
                      "font-size": "0.9em",
                      padding: "4px 8px",
                    }}
                  />
                </div>
              </div>
            )}
          </For>
        </div>

        <div
          style={{
            "border-top": "1px solid var(--border-color)",
            display: "flex",
            gap: "10px",
            "justify-content": "flex-end",
            "margin-top": "10px",
            "padding-top": "10px",
          }}
        >
          <button
            onClick={props.onClose}
            style={{
              background: "var(--accent-color)",
              border: "none",
              "border-radius": "4px",
              color: "var(--accent-fg)",
              cursor: "pointer",
              "font-weight": "bold",
              padding: "8px 16px",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
