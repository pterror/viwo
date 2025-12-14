import { BaseCapability, registerCapabilityClass } from "@viwo/core";
import { ScriptError } from "@viwo/scripting";

export class InpaintCapability extends BaseCapability {
  static override readonly type = "diffusers.inpaint";

  async inpaint(image: string, mask: string, prompt: string, strength = 0.8, ctx?: any) {
    // Check capability ownership
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("diffusers.inpaint: missing capability");
    }

    // Validate capability params
    const serverUrl = this.params["server_url"] as string;

    if (!serverUrl || typeof serverUrl !== "string") {
      throw new ScriptError("diffusers.inpaint: invalid server_url in capability");
    }

    // Validate parameters
    if (typeof image !== "string") {
      throw new ScriptError("diffusers.inpaint: image must be a base64 string");
    }
    if (typeof mask !== "string") {
      throw new ScriptError("diffusers.inpaint: mask must be a base64 string");
    }
    if (typeof prompt !== "string") {
      throw new ScriptError("diffusers.inpaint: prompt must be a string");
    }

    // Get options from params
    const modelId = this.params["model_id"] ?? "runwayml/stable-diffusion-inpainting";
    const width = this.params["width"] as number | undefined;
    const height = this.params["height"] as number | undefined;
    const numInferenceSteps = this.params["num_inference_steps"] ?? 50;
    const guidanceScale = this.params["guidance_scale"] ?? 7.5;
    const negativePrompt = this.params["negative_prompt"] as string | undefined;
    const seed = this.params["seed"] as number | undefined;

    // Make HTTP request to server
    try {
      const response = await fetch(`${serverUrl}/inpaint`, {
        body: JSON.stringify({
          guidance_scale: guidanceScale,
          height,
          image,
          mask,
          model_id: modelId,
          negative_prompt: negativePrompt,
          num_inference_steps: numInferenceSteps,
          prompt,
          seed,
          strength,
          width,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ScriptError(`inpaint server error: ${error}`);
      }

      const result = await response.json();
      return result; // { image: base64string, width, height, format }
    } catch (error: any) {
      throw new ScriptError(`diffusers.inpaint failed: ${error.message}`);
    }
  }

  async outpaint(
    image: string,
    direction: "left" | "right" | "top" | "bottom",
    pixels: number,
    prompt: string,
    ctx?: any,
  ) {
    // Check capability ownership
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("diffusers.inpaint: missing capability");
    }

    // Validate capability params
    const serverUrl = this.params["server_url"] as string;

    if (!serverUrl || typeof serverUrl !== "string") {
      throw new ScriptError("diffusers.inpaint: invalid server_url in capability");
    }

    // Validate parameters
    if (typeof image !== "string") {
      throw new ScriptError("diffusers.outpaint: image must be a base64 string");
    }
    if (!["left", "right", "top", "bottom"].includes(direction)) {
      throw new ScriptError("diffusers.outpaint: direction must be left, right, top, or bottom");
    }
    if (typeof pixels !== "number" || pixels <= 0) {
      throw new ScriptError("diffusers.outpaint: pixels must be a positive number");
    }
    if (typeof prompt !== "string") {
      throw new ScriptError("diffusers.outpaint: prompt must be a string");
    }

    // Get options from params
    const modelId = this.params["model_id"] ?? "runwayml/stable-diffusion-inpainting";
    const strength = this.params["strength"] ?? 0.8;
    const numInferenceSteps = this.params["num_inference_steps"] ?? 50;
    const guidanceScale = this.params["guidance_scale"] ?? 7.5;
    const negativePrompt = this.params["negative_prompt"] as string | undefined;
    const seed = this.params["seed"] as number | undefined;

    // Make HTTP request to server
    try {
      const response = await fetch(`${serverUrl}/outpaint`, {
        body: JSON.stringify({
          direction,
          guidance_scale: guidanceScale,
          image,
          model_id: modelId,
          negative_prompt: negativePrompt,
          num_inference_steps: numInferenceSteps,
          pixels,
          prompt,
          seed,
          strength,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ScriptError(`outpaint server error: ${error}`);
      }

      const result = await response.json();
      return result; // { image: base64string, width, height, format }
    } catch (error: any) {
      throw new ScriptError(`diffusers.outpaint failed: ${error.message}`);
    }
  }
}

declare module "@viwo/core" {
  interface CapabilityRegistry {
    [InpaintCapability.type]: typeof InpaintCapability;
  }
}

registerCapabilityClass(InpaintCapability);
