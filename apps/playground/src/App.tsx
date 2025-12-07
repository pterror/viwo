import { type Component, For, createSignal } from "solid-js";
import { clearOutput, getOutput, opcodes, ops } from "./runtime";
import { createScriptContext, evaluate } from "@viwo/scripting";
import { ScriptEditor } from "@viwo/web-editor";
import { examples } from "./examples";

const App: Component = () => {
  const [output, setOutput] = createSignal("");
  const [selectedExample, setSelectedExample] = createSignal("HelloWorld");

  // Initialize with Hello World
  const [script, setScript] = createSignal<any>(examples["Hello World"] ?? ["seq"]);

  const runScript = async () => {
    clearOutput();
    setOutput("");
    try {
      const ctx = createScriptContext({ caller: { id: 0 }, ops, this: { id: 0 } });
      await evaluate(script(), ctx);
      setOutput(getOutput());
    } catch (error: any) {
      console.error(error);
      setOutput(
        `Error: ${error.message}\n${
          error.stackTrace ? JSON.stringify(error.stackTrace, undefined, 2) : ""
        }`,
      );
    }
  };

  const loadExample = (name: string) => {
    setSelectedExample(name);
    setScript(examples[name] ?? ["seq"]);
  };

  return (
    <div class="playground">
      <header class="playground__header">
        <h1>Viwo Scripting Playground</h1>
        <div class="playground__controls">
          <select
            value={selectedExample()}
            onChange={(event) => loadExample(event.currentTarget.value)}
          >
            <For each={Object.keys(examples)}>{(name) => <option value={name}>{name}</option>}</For>
          </select>
          <button onClick={runScript}>Run</button>
        </div>
      </header>
      <div class="playground__main">
        <ScriptEditor value={script()} onChange={setScript} opcodes={opcodes} />
      </div>
      <div class="playground__output">
        <h3>Output</h3>
        <pre>{output()}</pre>
      </div>
    </div>
  );
};

export default App;
