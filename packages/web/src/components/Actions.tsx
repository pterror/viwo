import { gameStore } from "../store/game";

export default function Actions() {
  const actions = [
    { label: "Look", payload: ["look"] },
    { label: "Inventory", payload: ["inventory"] },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        padding: "10px",
        "background-color": "#1a1a1d",
        "border-bottom": "1px solid #333",
      }}
    >
      {actions.map((action) => (
        <button
          onClick={() => gameStore.send(action.payload)}
          style={{
            background: "#333",
            color: "#fff",
            border: "none",
            padding: "5px 10px",
            "border-radius": "4px",
            cursor: "pointer",
            "font-family": "var(--font-mono)",
            "font-size": "12px",
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
