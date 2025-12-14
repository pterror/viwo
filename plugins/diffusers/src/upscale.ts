import { BaseCapability, registerCapabilityClass } from "@viwo/core";
import { ScriptError } from "@viwo/scripting";

export class UpscaleCapability extends BaseCapability {
  static override readonly type = "diffusers.upscale";

  async upscale(
    image: string,
    model: "esrgan" | "realesrgan" = "realesrgan",
    factor: 2 | 4 = 2,
    ctx?: any,
  ) {
    // Check capability ownership
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("diffusers.upscale: missing capability");
    }

    // Validate capability params
    const serverUrl = this.params["server_url"] as string;

    if (!serverUrl || typeof serverUrl !== "string") {
      throw new ScriptError("diffusers.upscale: invalid server_url in capability");
    }

    // Validate parameters
    if (typeof image !== "string") {
      throw new ScriptError("diffusers.upscale: image must be a base64 string");
    }
    if (!["esrgan", "realesrgan"].includes(model)) {
      throw new ScriptError("diffusers.upscale: model must be esrgan or realesrgan");
    }
    if (![2, 4].includes(factor)) {
      throw new ScriptError("diffusers.upscale: factor must be 2 or 4");
    }

    // Make HTTP request to server
    try {
      const response = await fetch(`${serverUrl}/upscale`, {
        body: JSON.stringify({
          factor,
          image,
          model,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ScriptError(`upscale server error: ${error}`);
      }

      const result = await response.json();
      return result; // { image: base64string, width, height, format }
    } catch (error: any) {
      throw new ScriptError(`diffusers.upscale failed: ${error.message}`);
    }
  }

  async faceRestore(image: string, strength = 1, ctx?: any) {
    // Check capability ownership
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("diffusers.upscale: missing capability");
    }

    // Validate capability params
    const serverUrl = this.params["server_url"] as string;

    if (!serverUrl || typeof serverUrl !== "string") {
      throw new ScriptError("diffusers.upscale: invalid server_url in capability");
    }

    // Validate parameters
    if (typeof image !== "string") {
      throw new ScriptError("diffusers.faceRestore: image must be a base64 string");
    }
    if (typeof strength !== "number" || strength < 0 || strength > 1) {
      throw new ScriptError("diffusers.faceRestore: strength must be between 0 and 1");
    }

    // Make HTTP request to server
    try {
      const response = await fetch(`${serverUrl}/face-restore`, {
        body: JSON.stringify({
          image,
          strength,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ScriptError(`face-restore server error: ${error}`);
      }

      const result = await response.json();
      return result; // { image: base64string, width, height, format }
    } catch (error: any) {
      throw new ScriptError(`diffusers.faceRestore failed: ${error.message}`);
    }
  }
}

declare module "@viwo/core" {
  interface CapabilityRegistry {
    [UpscaleCapability.type]: typeof UpscaleCapability;
  }
}

registerCapabilityClass(UpscaleCapability);
