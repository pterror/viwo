import { createSignal, Show } from "solid-js";
import { gameStore } from "../store/game";
import Builder from "./Builder";

export default function Compass() {
  const [showDig, setShowDig] = createSignal<string | null>(null);

  const getExit = (dir: string) => {
    if (!gameStore.state.room) return null;
    return gameStore.state.room.contents.find(
      (c) => c.kind === "EXIT" && c.name.toLowerCase() === dir.toLowerCase(),
    );
  };

  const handleDir = (dir: string) => {
    const exit = getExit(dir);
    if (exit) {
      gameStore.send(["move", dir]);
    } else {
      setShowDig(dir);
    }
  };

  const Cell = (props: { dir: string; label: string }) => {
    const exit = () => getExit(props.dir);
    return (
      <button
        onClick={() => handleDir(props.dir)}
        classList={{
          compass__cell: true,
          "compass__cell--active": !!exit(),
        }}
      >
        <div class="compass__cell-label">{props.label}</div>
        <div
          classList={{
            "compass__cell-dest": true,
            "compass__cell-dest--active": !!exit(),
          }}
        >
          {exit() ? exit()?.destination_name ?? exit()?.name : "+"}
        </div>
      </button>
    );
  };

  return (
    <>
      <div class="compass">
        <Cell dir="northwest" label="NW" />
        <Cell dir="north" label="N" />
        <Cell dir="northeast" label="NE" />

        <Cell dir="west" label="W" />
        <div class="compass__center">Here</div>
        <Cell dir="east" label="E" />

        <Cell dir="southwest" label="SW" />
        <Cell dir="south" label="S" />
        <Cell dir="southeast" label="SE" />
      </div>

      <Show when={showDig()}>
        <div class="compass__modal">
          <div class="compass__modal-content">
            <div class="compass__modal-title">Dig {showDig()}</div>
            <Builder
              initialDirection={showDig()!}
              onClose={() => setShowDig(null)}
            />
          </div>
        </div>
      </Show>
    </>
  );
}
