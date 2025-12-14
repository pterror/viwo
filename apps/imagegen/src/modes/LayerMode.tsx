import { For, Show, createEffect, createSignal, onMount } from "solid-js";
import { exportAsViwoScript } from "../engine/canvas/actionRecorder";
import { useCanvas } from "../engine/canvas/useCanvas";
import { useGeneration } from "../utils/useGeneration";
import { useViwoConnection } from "../utils/viwo-connection";

function LayerMode() {
  const canvas = useCanvas(1024, 1024);
  const { sendRpc } = useViwoConnection();
  const generation = useGeneration(sendRpc);

  const [prompt, setPrompt] = createSignal("");
  const [negativePrompt, setNegativePrompt] = createSignal("");
  const [controlTypes, setControlTypes] = createSignal<
    { type: string; label: string; description: string }[]
  >([]);
  const [outpaintDir, setOutpaintDir] = createSignal<"left" | "right" | "top" | "bottom">("right");
  const [outpaintPixels, setOutpaintPixels] = createSignal(256);

  // oxlint-disable-next-line no-unassigned-vars
  let canvasRef: HTMLCanvasElement | undefined;
  // oxlint-disable-next-line no-unassigned-vars
  let overlayRef: HTMLCanvasElement | undefined;

  onMount(async () => {
    canvas.addLayer("Background");
    if (canvasRef) {
      canvas.setCompositeCanvas(canvasRef);
    }

    // Fetch available ControlNet types
    try {
      const capability = await sendRpc("get_capability", { type: "controlnet.generate" });
      const types = await sendRpc("std.call_method", {
        args: [],
        method: "getAvailableTypes",
        object: capability,
      });
      setControlTypes(types);
    } catch (error) {
      console.error("Failed to fetch ControlNet types:", error);
    }
  });

  createEffect(() => {
    canvas.composite();
  });

  createEffect(() => {
    if (!overlayRef) {
      return;
    }

    const ctx = overlayRef.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, 1024, 1024);

    const box = canvas.bboxDraft() ?? canvas.bbox();
    if (box && canvas.tool() === "bbox") {
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    }
  });

  let startPos = { x: 0, y: 0 };

  function handleMouseDown(e: MouseEvent) {
    const rect = canvasRef?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (canvas.tool() === "bbox") {
      startPos = { x, y };
      canvas.setBboxDraft({ height: 0, width: 0, x, y });
    } else {
      canvas.startDrawing(x, y);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvasRef?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (canvas.tool() === "bbox" && canvas.bboxDraft()) {
      canvas.setBboxDraft({
        height: Math.abs(y - startPos.y),
        width: Math.abs(x - startPos.x),
        x: Math.min(startPos.x, x),
        y: Math.min(startPos.y, y),
      });
    } else {
      canvas.draw(x, y);
    }
  }

  function handleMouseUp() {
    if (canvas.tool() === "bbox" && canvas.bboxDraft()) {
      canvas.setBbox(canvas.bboxDraft());
      canvas.setBboxDraft(null);
    }
    canvas.stopDrawing();
  }

  async function handleGenerate() {
    const box = canvas.bbox();
    if (!box || !prompt()) {
      return;
    }

    try {
      const imageUrl = await generation.generate({
        height: Math.max(64, Math.round(box.height / 8) * 8),
        negativePrompt: negativePrompt(),
        prompt: prompt(),
        width: Math.max(64, Math.round(box.width / 8) * 8),
        x: box.x,
        y: box.y,
      });

      const layerId = canvas.addLayer("Generated");
      canvas.loadImageToLayer(layerId, imageUrl, box.x, box.y);

      // Record generation action
      canvas.setActions([
        ...canvas.actions(),
        {
          bbox: box,
          layerId,
          negativePrompt: negativePrompt(),
          prompt: prompt(),
          type: "generate",
        },
      ]);
    } catch (error) {
      console.error("Generation error:", error);
      alert(`Generation failed: ${error}`);
    }
  }

  // Helper functions for blob/base64 conversion
  function canvasToBlob(canvasElement: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvasElement.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      });
    });
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("loadend", () => {
        const result = reader.result as string;
        // Remove data:image/png;base64, prefix
        const [, base64] = result.split(",");
        resolve(base64);
      });
      reader.addEventListener("error", () => {
        reject(reader.error);
      });
      reader.readAsDataURL(blob);
    });
  }

  function hasMaskLayer() {
    return canvas.layers().some((l) => l.type === "mask");
  }

  async function handleInpaint() {
    const maskLayer = canvas.layers().find((l) => l.type === "mask");
    const targetLayer = maskLayer?.maskFor
      ? canvas.layers().find((l) => l.id === maskLayer.maskFor)
      : canvas.layers().find((l) => l.type === "raster");

    if (!maskLayer || !targetLayer || !prompt()) {
      alert("Need a mask layer, target layer, and prompt to inpaint");
      return;
    }

    try {
      const imageBlob = await canvasToBlob(targetLayer.canvas);
      const maskBlob = await canvasToBlob(maskLayer.canvas);
      const imageB64 = await blobToBase64(imageBlob);
      const maskB64 = await blobToBase64(maskBlob);

      const capability = await sendRpc("get_capability", { type: "diffusers.inpaint" });
      const result = await sendRpc("std.call_method", {
        args: [imageB64, maskB64, prompt(), 0.8],
        method: "inpaint",
        object: capability,
      });

      // Load result back to target layer
      const resultImg = `data:image/png;base64,${result.image}`;
      canvas.loadImageToLayer(targetLayer.id, resultImg, 0, 0);
    } catch (error) {
      console.error("Inpaint error:", error);
      alert(`Inpaint failed: ${error}`);
    }
  }

  async function handleOutpaint() {
    const activeLayer = canvas.layers().find((l) => l.id === canvas.activeLayerId());
    if (!activeLayer || !prompt()) {
      alert("Need an active layer and prompt to outpaint");
      return;
    }

    try {
      const imageBlob = await canvasToBlob(activeLayer.canvas);
      const imageB64 = await blobToBase64(imageBlob);

      const capability = await sendRpc("get_capability", { type: "diffusers.inpaint" });
      const result = await sendRpc("std.call_method", {
        args: [imageB64, outpaintDir(), outpaintPixels(), prompt()],
        method: "outpaint",
        object: capability,
      });

      // Create new layer with outpainted result
      const newLayerId = canvas.addLayer(`Outpainted (${outpaintDir()})`);
      const resultImg = `data:image/png;base64,${result.image}`;
      canvas.loadImageToLayer(newLayerId, resultImg, 0, 0);
    } catch (error) {
      console.error("Outpaint error:", error);
      alert(`Outpaint failed: ${error}`);
    }
  }

  async function handleUpscale(layerId: string, factor: 2 | 4) {
    const layer = canvas.layers().find((l) => l.id === layerId);
    if (!layer) {
      return;
    }

    try {
      const imageBlob = await canvasToBlob(layer.canvas);
      const imageB64 = await blobToBase64(imageBlob);

      const capability = await sendRpc("get_capability", { type: "diffusers.upscale" });
      const result = await sendRpc("std.call_method", {
        args: [imageB64, "realesrgan", factor],
        method: "upscale",
        object: capability,
      });

      // Create new layer with upscaled result
      const newLayerId = canvas.addLayer(`${layer.name} (${factor}x)`);
      const resultImg = `data:image/png;base64,${result.image}`;
      canvas.loadImageToLayer(newLayerId, resultImg, 0, 0);
    } catch (error) {
      console.error("Upscale error:", error);
      alert(`Upscale failed: ${error}`);
    }
  }

  return (
    <div class="layer-mode">
      <div class="layer-mode__sidebar">
        <h3>Tools</h3>
        <div class="layer-mode__tools">
          <button
            class={`glass-button ${canvas.tool() === "brush" ? "glass-button--primary" : ""}`}
            onClick={() => canvas.setTool("brush")}
          >
            🖌️ Brush
          </button>
          <button
            class={`glass-button ${canvas.tool() === "eraser" ? "glass-button--primary" : ""}`}
            onClick={() => canvas.setTool("eraser")}
          >
            🧹 Eraser
          </button>
          <button
            class={`glass-button ${canvas.tool() === "bbox" ? "glass-button--primary" : ""}`}
            onClick={() => canvas.setTool("bbox")}
          >
            ⬜ Select
          </button>
          <button
            class="glass-button"
            onClick={() => {
              canvas.addMaskLayer("Mask", canvas.activeLayerId() ?? undefined);
            }}
          >
            🎭 Add Mask
          </button>
        </div>

        <Show when={canvas.tool() !== "bbox"}>
          <div class="layer-mode__tool-options">
            <label>
              Size: {canvas.brushSize()}
              <input
                type="range"
                min="1"
                max="50"
                value={canvas.brushSize()}
                onInput={(e) => canvas.setBrushSize(Number(e.currentTarget.value))}
              />
            </label>

            <Show when={canvas.tool() === "brush"}>
              <label>
                Color:
                <input
                  type="color"
                  value={canvas.color()}
                  onInput={(e) => canvas.setColor(e.currentTarget.value)}
                />
              </label>
            </Show>
          </div>
        </Show>

        <Show when={canvas.tool() === "bbox" && canvas.bbox()}>
          <div class="layer-mode__generation glass-panel">
            <h4>Generate</h4>
            <textarea
              class="layer-mode__prompt"
              placeholder="Enter your prompt..."
              value={prompt()}
              onInput={(e) => setPrompt(e.currentTarget.value)}
            />
            <textarea
              class="layer-mode__prompt"
              placeholder="Negative prompt (optional)..."
              value={negativePrompt()}
              onInput={(e) => setNegativePrompt(e.currentTarget.value)}
            />
            <button
              class="glass-button glass-button--primary"
              disabled={!prompt() || generation.generating()}
              onClick={handleGenerate}
            >
              {generation.generating() ? "Generating..." : "Generate"}
            </button>
          </div>
        </Show>

        <Show when={hasMaskLayer()}>
          <div class="layer-mode__generation glass-panel">
            <h4>Inpaint</h4>
            <textarea
              class="layer-mode__prompt"
              placeholder="Enter your prompt..."
              value={prompt()}
              onInput={(e) => setPrompt(e.currentTarget.value)}
            />
            <button
              class="glass-button glass-button--primary"
              disabled={!prompt() || generation.generating()}
              onClick={handleInpaint}
            >
              {generation.generating() ? "Inpainting..." : "Inpaint"}
            </button>
          </div>
        </Show>

        <div class="layer-mode__outpaint glass-panel">
          <h4>Outpaint</h4>
          <select
            class="glass-select"
            value={outpaintDir()}
            onChange={(e) => setOutpaintDir(e.currentTarget.value as any)}
          >
            <option value="left">← Extend Left</option>
            <option value="right">→ Extend Right</option>
            <option value="top">↑ Extend Top</option>
            <option value="bottom">↓ Extend Bottom</option>
          </select>
          <input
            type="number"
            value={outpaintPixels()}
            onInput={(e) => setOutpaintPixels(Number(e.currentTarget.value))}
            min="64"
            max="512"
            step="64"
            class="glass-input"
          />
          <button
            class="glass-button"
            onClick={handleOutpaint}
            disabled={generation.generating() || !prompt()}
          >
            Outpaint
          </button>
        </div>
      </div>

      <div class="layer-mode__canvas">
        <div class="layer-mode__canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={1024}
            height={1024}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            class={`layer-mode__canvas-main layer-mode__canvas-main--${canvas.tool()}`}
          />
          <canvas ref={overlayRef} width={1024} height={1024} class="layer-mode__canvas-overlay" />
        </div>
      </div>

      <div class="layer-mode__panels">
        <h3>Layers</h3>
        <button
          class="glass-button"
          onClick={() => canvas.addLayer(`Layer ${canvas.layers().length + 1}`)}
        >
          + Add Layer
        </button>

        <Show when={controlTypes().length > 0}>
          <select
            class="glass-select"
            onChange={(e) => {
              const type = e.currentTarget.value;
              if (type) {
                const typeInfo = controlTypes().find((ct) => ct.type === type);
                canvas.addControlLayer(typeInfo?.label ?? "Control", type);
                e.currentTarget.value = ""; // Reset selection
              }
            }}
          >
            <option value="">+ Add Control Layer</option>
            <For each={controlTypes()}>
              {(ct) => (
                <option value={ct.type} title={ct.description}>
                  {ct.label}
                </option>
              )}
            </For>
          </select>
        </Show>

        <button
          class="glass-button"
          onClick={() => exportAsViwoScript(canvas.actions())}
          disabled={canvas.actions().length === 0}
        >
          📥 Export Script
        </button>

        <div class="layer-mode__layer-list">
          <For each={canvas.layers()}>
            {(layer) => (
              <div
                class={`layer-mode__layer-item ${
                  canvas.activeLayerId() === layer.id ? "layer-mode__layer-item--active" : ""
                }`}
                onClick={() => canvas.setActiveLayerId(layer.id)}
              >
                <span>
                  {layer.type === "control" ? "🎛️ " : ""}
                  {layer.name}
                  {layer.controlType ? ` (${layer.controlType})` : ""}
                </span>
                <div class="layer-mode__layer-controls">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      canvas.updateLayer(layer.id, { visible: !layer.visible });
                    }}
                  >
                    {layer.visible ? "👁️" : "🚫"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpscale(layer.id, 2);
                    }}
                    title="Upscale 2x"
                  >
                    🔍
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      canvas.removeLayer(layer.id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

export default LayerMode;
