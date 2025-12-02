import { Component, createEffect, onCleanup, onMount } from "solid-js";
import loader from "@monaco-editor/loader";
import { gameStore } from "../../store/game";
import { generateTypeDefinitions, OpcodeMetadata } from "@viwo/scripting";

interface MonacoEditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export const MonacoEditor: Component<MonacoEditorProps> = (props) => {
  // oxlint-disable-next-line no-unassigned-vars
  let containerRef: HTMLDivElement | undefined;
  let editorInstance: any; // monaco.editor.IStandaloneCodeEditor

  onMount(() => {
    loader.init().then((monaco) => {
      if (!containerRef) return;

      // Set up compiler options
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution:
          monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        // typeRoots: ["node_modules/@types"],
      });

      // Generate and add types
      createEffect(() => {
        const opcodes = gameStore.state.opcodes as OpcodeMetadata[] | null;
        if (opcodes) {
          const typeDefs = generateTypeDefinitions(opcodes);
          monaco.languages.typescript.javascriptDefaults.addExtraLib(
            typeDefs,
            "ts:filename/viwo.d.ts",
          );
        }
      });

      editorInstance = monaco.editor.create(containerRef, {
        value: props.value || "// Start typing your script here...\n\n",
        language: "javascript",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
      });

      editorInstance.onDidChangeModelContent(() => {
        const newValue = editorInstance.getValue();
        if (props.onChange) {
          props.onChange(newValue);
        }
      });
    });
  });

  createEffect(() => {
    if (
      editorInstance &&
      props.value !== undefined &&
      props.value !== editorInstance.getValue()
    ) {
      editorInstance.setValue(props.value);
    }
  });

  onCleanup(() => {
    if (editorInstance) {
      editorInstance.dispose();
    }
  });

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", "min-height": "400px" }}
    />
  );
};
