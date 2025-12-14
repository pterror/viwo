// oxlint-disable-next-line no-unassigned-import
import "../../generated types";
import { compositeImages, filterImage, transformImage } from "@viwo/image-io";
import { EntityBase } from "./EntityBase";

/**
 * ImageEntity - Represents a generated or imported image stored as a viwo entity
 *
 * Properties:
 * - name: Display name of the image
 * - image: Base64-encoded image data (data URL format)
 * - metadata: JSON string containing generation parameters
 * - image_type: Type of image ("generated", "edited", "upscaled", etc.)
 */
export class ImageEntity extends EntityBase {
  /**
   * View image information
   * Displays the image name, type, and metadata
   */
  view() {
    const imageType = (this.image_type as string) ?? "unknown";
    send("message", `Image: ${this.name} (${imageType})`);

    if (this.metadata) {
      const metadataStr = this.metadata as string;
      send("message", `Metadata: ${metadataStr}`);
    }
  }

  /**
   * Get the base64 image data
   * Returns the image data URL for display or download
   */
  get_data() {
    return this.image;
  }

  /**
   * Get parsed metadata object
   * Returns the metadata as a parsed object
   */
  get_metadata() {
    if (!this.metadata) {
      return {};
    }

    try {
      const metadataStr = this.metadata as string;
      return JSON.parse(metadataStr);
    } catch {
      return {};
    }
  }

  /**
   * Update image data
   * Allows updating the image with new base64 data
   */
  update_image(newImageData: string) {
    const cap = get_capability("entity.control", { target_id: this.id });
    if (!cap) {
      send("message", "No permission to update image");
      return;
    }

    std.call_method(cap, "update", this.id, { image: newImageData });
    send("message", "Image updated successfully");
  }

  /**
   * Update metadata
   * Allows updating the metadata JSON
   */
  update_metadata(newMetadata: Record<string, unknown>) {
    const cap = get_capability("entity.control", { target_id: this.id });
    if (!cap) {
      send("message", "No permission to update metadata");
      return;
    }

    std.call_method(cap, "update", this.id, {
      metadata: JSON.stringify(newMetadata),
    });
    send("message", "Metadata updated successfully");
  }

  /**
   * Transform the image (rotate, scale)
   * Runs server-side for security
   */
  async transform(rotation: number, scale: number) {
    const imageData = this.image as string;
    if (!imageData?.includes("base64,")) {
      send("message", "Invalid image data");
      return;
    }

    const imageBuffer = Buffer.from(imageData.split(",")[1], "base64");

    const transformed = await transformImage(imageBuffer, rotation, scale);
    const newDataUrl = `data:image/png;base64,${transformed.toString("base64")}`;

    this.update_image(newDataUrl);
    send("message", `Image transformed (rotation: ${rotation}°, scale: ${scale}x)`);
  }

  /**
   * Apply filter to the image
   * Runs server-side for security
   */
  async filter(type: "blur" | "sharpen" | "grayscale") {
    const imageData = this.image as string;
    if (!imageData?.includes("base64,")) {
      send("message", "Invalid image data");
      return;
    }

    const imageBuffer = Buffer.from(imageData.split(",")[1], "base64");

    const filtered = await filterImage(imageBuffer, type);
    const newDataUrl = `data:image/png;base64,${filtered.toString("base64")}`;

    this.update_image(newDataUrl);
    send("message", `Filter applied: ${type}`);
  }

  /**
   * Composite another image on top of this one
   * Runs server-side for security
   */
  async composite(overlayEntityId: string, x: number, y: number) {
    const overlayEntity = kernel.repo.getEntity(overlayEntityId);
    if (!overlayEntity?.image) {
      send("message", "Overlay image not found");
      return;
    }

    const baseData = this.image as string;
    const overlayData = overlayEntity.image as string;

    if (!baseData?.includes("base64,") || !overlayData?.includes("base64,")) {
      send("message", "Invalid image data");
      return;
    }

    const baseBuffer = Buffer.from(baseData.split(",")[1], "base64");
    const overlayBuffer = Buffer.from(overlayData.split(",")[1], "base64");

    const composited = await compositeImages(baseBuffer, overlayBuffer, x, y);
    const newDataUrl = `data:image/png;base64,${composited.toString("base64")}`;

    this.update_image(newDataUrl);
    send("message", `Composited with ${overlayEntity.name} at (${x}, ${y})`);
  }
}
