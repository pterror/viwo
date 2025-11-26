import { Component, For } from "solid-js";
import { themeStore, ThemeColors } from "../store/theme";

interface Props {
  onClose: () => void;
}

export const ThemeEditor: Component<Props> = (props) => {
  const colorKeys = Object.keys(themeStore.state.colors) as Array<
    keyof ThemeColors
  >;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        "z-index": 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-panel)",
          padding: "20px",
          "border-radius": "8px",
          border: "1px solid var(--border-color)",
          width: "500px",
          "max-height": "80vh",
          "overflow-y": "auto",
          display: "flex",
          "flex-direction": "column",
          gap: "15px",
        }}
      >
        <div
          style={{
            display: "flex",
            "justify-content": "space-between",
            "align-items": "center",
          }}
        >
          <h2 style={{ margin: 0, color: "var(--text-primary)" }}>
            Theme Editor
          </h2>
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

        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "10px",
            padding: "10px",
            background: "var(--bg-element)",
            "border-radius": "4px",
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
            "grid-template-columns": "1fr 1fr",
            gap: "10px",
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
                    "font-size": "0.8em",
                    color: "var(--text-secondary)",
                  }}
                >
                  {key}
                </label>
                <div style={{ display: "flex", gap: "5px" }}>
                  <input
                    type="color"
                    value={
                      themeStore.state.colors[key].startsWith("#")
                        ? themeStore.state.colors[key]
                        : "#000000"
                    }
                    onChange={(e) =>
                      themeStore.updateColor(key, e.currentTarget.value)
                    }
                    style={{
                      border: "none",
                      padding: 0,
                      width: "30px",
                      height: "30px",
                      cursor: "pointer",
                      background: "none",
                    }}
                  />
                  <input
                    type="text"
                    value={themeStore.state.colors[key]}
                    onChange={(e) =>
                      themeStore.updateColor(key, e.currentTarget.value)
                    }
                    style={{
                      flex: 1,
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      padding: "4px 8px",
                      "border-radius": "4px",
                      "font-family": "monospace",
                      "font-size": "0.9em",
                    }}
                  />
                </div>
              </div>
            )}
          </For>
        </div>

        <div
          style={{
            display: "flex",
            "justify-content": "flex-end",
            gap: "10px",
            "margin-top": "10px",
            "border-top": "1px solid var(--border-color)",
            "padding-top": "10px",
          }}
        >
          <button
            onClick={() => {
              if (confirm("Reset theme to defaults?")) {
                themeStore.resetTheme();
              }
            }}
            style={{
              background: "var(--bg-element)",
              color: "var(--error-color)",
              border: "1px solid var(--border-color)",
              padding: "8px 16px",
              "border-radius": "4px",
              cursor: "pointer",
            }}
          >
            Reset Defaults
          </button>
          <button
            onClick={props.onClose}
            style={{
              background: "var(--accent-color)",
              color: "var(--accent-fg)",
              border: "none",
              padding: "8px 16px",
              "border-radius": "4px",
              cursor: "pointer",
              "font-weight": "bold",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
