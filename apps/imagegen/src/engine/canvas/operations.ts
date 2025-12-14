import type { ScriptValue } from "@viwo/scripting";

/**
 * Type-safe constructors for canvas operations.
 * These build S-expressions that represent canvas actions.
 *
 * Canvas operations are frontend-only and not executed on the server.
 * They are recorded for replay/undo and exported as ViwoScript.
 */

export interface Point {
  x: number;
  y: number;
}

export const CanvasOps = {
  /**
   * Create a new layer
   */
  layerCreate: (
    id: string,
    name: string,
    type: "raster" | "control" | "mask" = "raster",
  ): ScriptValue<void> => ["canvas.layer.create", id, name, type] as ScriptValue<void>,

  /**
   * Remove a layer
   */
  layerRemove: (id: string): ScriptValue<void> => ["canvas.layer.remove", id] as ScriptValue<void>,

  /**
   * Update layer properties
   */
  layerUpdate: (id: string, props: Record<string, unknown>): ScriptValue<void> =>
    ["canvas.layer.update", id, props] as ScriptValue<void>,

  /**
   * Set the active layer
   */
  layerSetActive: (id: string): ScriptValue<void> =>
    ["canvas.layer.set_active", id] as ScriptValue<void>,

  /**
   * Load an image onto a layer
   */
  layerLoadImage: (layerId: string, imageUrl: string, x = 0, y = 0): ScriptValue<void> =>
    ["canvas.layer.load_image", layerId, imageUrl, x, y] as ScriptValue<void>,

  /**
   * Record a drawing stroke on a layer
   * Points array contains the stroke path
   */
  drawStroke: (
    layerId: string,
    points: Point[],
    color: string,
    size: number,
    tool: "brush" | "eraser" = "brush",
  ): ScriptValue<void> =>
    ["canvas.draw_stroke", layerId, points, color, size, tool] as ScriptValue<void>,

  /**
   * Clear a layer
   */
  layerClear: (id: string): ScriptValue<void> => ["canvas.layer.clear", id] as ScriptValue<void>,
} as const;
