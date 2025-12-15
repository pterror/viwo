import { createSignal, onMount } from "solid-js";
import { ScriptEditor } from "@viwo/web-editor";
import type { ScriptValue } from "@viwo/scripting";
import { useViwoConnection } from "../utils/viwo-connection";

interface BlocksModeProps {
  script: ScriptValue<unknown>;
  onScriptChange: (script: ScriptValue<unknown>) => void;
  onVisualize: () => void;
}

function BlocksMode(props: BlocksModeProps) {
  const [script, setScript] = createSignal(props.script);
  const { capabilities, connected, sendRpc } = useViwoConnection();
  const [coreOpcodes, setCoreOpcodes] = createSignal<any[]>([]);

  onMount(async () => {
    // Fetch core opcodes from server
    if (connected()) {
      try {
        const opcodeMetadata = await sendRpc("get_opcodes", {});
        setCoreOpcodes(opcodeMetadata);
      } catch (error) {
        console.error("Failed to fetch core opcodes:", error);
      }
    }
  });

  // Merge core opcodes with capability-based blocks
  const opcodes = () => {
    const blocks: any[] = [...coreOpcodes()];

    // Add capability-based blocks
    for (const cap of capabilities()) {
      for (const method of cap.methods) {
        blocks.push({
          category: cap.label,
          label: method.label,
          opcode: `${cap.type}.${method.name}`,
          slots: method.parameters.map((parameter: any) => ({
            default: parameter.default,
            name: parameter.name,
            type: parameter.type === "object" ? "block" : parameter.type,
          })),
        });
      }
    }

    return blocks;
  };

  function handleScriptChange(newScript: ScriptValue<unknown>) {
    setScript(newScript);
    props.onScriptChange(newScript);
  }

  return (
    <div class="blocks-mode">
      {!connected() ? (
        <div class="blocks-mode__connecting">Connecting to viwo server...</div>
      ) : (
        <>
          <div class="blocks-mode__toolbar">
            <button
              class="glass-button glass-button--primary"
              onClick={props.onVisualize}
              title="Visualize this script as layers in Layer Mode"
            >
              🎨 Visualize as Layers
            </button>
          </div>
          <ScriptEditor opcodes={opcodes()} value={script()} onChange={handleScriptChange} />
        </>
      )}
    </div>
  );
}

export default BlocksMode;
