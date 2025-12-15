import { BaseCapability, registerCapabilityClass } from "@viwo/core";
import { ScriptError } from "@viwo/scripting";

export class InpaintCapability extends BaseCapability {
  static override readonly type = "diffusers.inpaint";

  // oxlint-disable-next-line max-params
  async inpaint(
    image: string,
    mask: string,
    prompt: string,
    params: {
      model_id?: string;
      strength?: number;
      width?: number;
      height?: number;
      num_inference_steps?: number;
      guidance_scale?: number;
      negative_prompt?: string;
      prompt_2?: string;
      negative_prompt_2?: string;
      seed?: number;
      max_compute?: number;
    } = {},
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
      throw new ScriptError("diffusers.inpaint: image must be a base64 string");
    }
    if (typeof mask !== "string") {
      throw new ScriptError("diffusers.inpaint: mask must be a base64 string");
    }
    if (typeof prompt !== "string") {
      throw new ScriptError("diffusers.inpaint: prompt must be a string");
    }

    // Make HTTP request to server
    try {
      const response = await fetch(`${serverUrl}/inpaint`, {
        body: JSON.stringify({
          guidance_scale: params.guidance_scale ?? 7.5,
          height: params.height,
          image,
          mask,
          max_compute: params.max_compute,
          model_id: params.model_id ?? "runwayml/stable-diffusion-inpainting",
          negative_prompt: params.negative_prompt,
          negative_prompt_2: params.negative_prompt_2,
          num_inference_steps: params.num_inference_steps ?? 50,
          prompt,
          prompt_2: params.prompt_2,
          seed: params.seed,
          strength: params.strength ?? 0.8,
          width: params.width,
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

  // oxlint-disable-next-line max-params
  async outpaint(
    image: string,
    direction: "left" | "right" | "top" | "bottom",
    pixels: number,
    prompt: string,
    params: {
      model_id?: string;
      strength?: number;
      num_inference_steps?: number;
      guidance_scale?: number;
      negative_prompt?: string;
      prompt_2?: string;
      negative_prompt_2?: string;
      seed?: number;
      max_compute?: number;
    } = {},
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

    // Make HTTP request to server
    try {
      const response = await fetch(`${serverUrl}/outpaint`, {
        body: JSON.stringify({
          direction,
          guidance_scale: params.guidance_scale ?? 7.5,
          image,
          max_compute: params.max_compute,
          model_id: params.model_id ?? "runwayml/stable-diffusion-inpainting",
          negative_prompt: params.negative_prompt,
          negative_prompt_2: params.negative_prompt_2,
          num_inference_steps: params.num_inference_steps ?? 50,
          pixels,
          prompt,
          prompt_2: params.prompt_2,
          seed: params.seed,
          strength: params.strength ?? 0.8,
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
