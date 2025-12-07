import { type Component, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { type OpcodeMetadata, generateTypeDefinitions } from "@viwo/scripting";
import loader from "@monaco-editor/loader";

interface MonacoEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  opcodes?: OpcodeMetadata[];
  onAICompletion?: (
    code: string,
    position: { lineNumber: number; column: number },
  ) => Promise<string | null>;
}

export const MonacoEditor: Component<MonacoEditorProps> = (props) => {
  // oxlint-disable-next-line no-unassigned-vars
  let containerRef: HTMLDivElement | undefined;
  const [editorInstance, setEditorInstance] = createSignal<any>(); // monaco.editor.IStandaloneCodeEditor

  onMount(() => {
    loader.init().then((monaco) => {
      if (!containerRef) {
        return;
      }

      // Set up compiler options
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        allowNonTsExtensions: true,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        noEmit: true,
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        // typeRoots: ["node_modules/@types"],
      });

      // Generate and add types
      createEffect(() => {
        const { opcodes } = props;
        if (opcodes) {
          const typeDefs = generateTypeDefinitions(opcodes);
          monaco.languages.typescript.javascriptDefaults.addExtraLib(
            typeDefs,
            "ts:filename/viwo.d.ts",
          );
        }
      });

      // Register AI Completion Provider
      monaco.languages.registerCompletionItemProvider("javascript", {
        provideCompletionItems: async (model: any, position: any) => {
          if (!props.onAICompletion) {
            return { suggestions: [] };
          }

          const code = model.getValue();
          const { lineNumber, column } = position;

          try {
            // Call AI plugin via callback
            const completion = await props.onAICompletion(code, {
              column,
              lineNumber,
            });

            if (!completion || typeof completion !== "string") {
              return { suggestions: [] };
            }

            return {
              suggestions: [
                {
                  detail: "AI Generated Code",
                  documentation: "AI Generated Code",
                  insertText: completion,
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  label: "AI Completion",
                },
              ],
            };
          } catch (error) {
            console.error("AI Completion Failed:", error);
            return { suggestions: [] };
          }
        },
        triggerCharacters: [" "], // Trigger on space to help with arguments
      });

      const editorInstance = monaco.editor.create(containerRef, {
        automaticLayout: true,
        fontSize: 14,
        language: "javascript",
        minimap: { enabled: false },
        suggest: {
          showClasses: true,
          showColors: true,
          showConstants: true,
          showConstructors: true,
          showEnumMembers: true,
          showEnums: true,
          showEvents: true,
          showFields: true,
          showFiles: true,
          showFolders: true,
          showFunctions: true,
          showInterfaces: true,
          showKeywords: true,
          showMethods: true,
          showModules: true,
          showOperators: true,
          showProperties: true,
          showReferences: true,
          showSnippets: true,
          showStructs: true,
          showTypeParameters: true,
          showUnits: true,
          showValues: true,
          showVariables: true,
          showWords: true,
        },
        theme: "vs-dark",
        value: props.value ?? "// Start typing your script here...\n\n",
      });
      setEditorInstance(editorInstance);

      editorInstance.onDidChangeModelContent(() => {
        const newValue = editorInstance.getValue();
        if (props.onChange) {
          props.onChange(newValue);
        }
      });
    });
  });

  createEffect(() => {
    if (props.value !== undefined && props.value !== editorInstance()?.getValue()) {
      editorInstance()?.setValue(props.value);
    }
  });

  onCleanup(() => {
    editorInstance()?.dispose();
  });

  return (
    <div ref={containerRef} style={{ height: "100%", "min-height": "400px", width: "100%" }} />
  );
};
