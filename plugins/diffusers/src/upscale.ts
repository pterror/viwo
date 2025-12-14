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

  async upscaleTraditional(
    image: string,
    params: {
      method?: "nearest" | "bilinear" | "bicubic" | "lanczos" | "area";
      factor?: 2 | 4;
    } = {},
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
      throw new ScriptError("diffusers.upscaleTraditional: image must be a base64 string");
    }

    const method = params.method ?? "lanczos";
    const factor = params.factor ?? 2;

    const validMethods = ["nearest", "bilinear", "bicubic", "lanczos", "area"];
    if (!validMethods.includes(method)) {
      throw new ScriptError(
        "diffusers.upscaleTraditional: method must be nearest, bilinear, bicubic, lanczos, or area",
      );
    }
    if (![2, 4].includes(factor)) {
      throw new ScriptError("diffusers.upscaleTraditional: factor must be 2 or 4");
    }

    // Make HTTP request to server
    try {
      const response = await fetch(`${serverUrl}/upscale/traditional`, {
        body: JSON.stringify({
          factor,
          image,
          method,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ScriptError(`upscaleTraditional server error: ${error}`);
      }

      const result = await response.json();
      return result; // { image: base64string, width, height, format }
    } catch (error: any) {
      throw new ScriptError(`diffusers.upscaleTraditional failed: ${error.message}`);
    }
  }

  async upscaleImg2Img(
    image: string,
    prompt: string,
    params: {
      model_id?: string;
      factor?: 2 | 4;
      denoise_strength?: number;
      upscale_method?: "nearest" | "bilinear" | "bicubic" | "lanczos" | "area";
      num_inference_steps?: number;
      guidance_scale?: number;
      negative_prompt?: string;
      seed?: number;
    } = {},
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
      throw new ScriptError("diffusers.upscaleImg2Img: image must be a base64 string");
    }
    if (typeof prompt !== "string") {
      throw new ScriptError("diffusers.upscaleImg2Img: prompt must be a string");
    }

    // Make HTTP request to server
    try {
      const response = await fetch(`${serverUrl}/upscale/img2img`, {
        body: JSON.stringify({
          denoise_strength: params.denoise_strength ?? 0.3,
          factor: params.factor ?? 2,
          guidance_scale: params.guidance_scale ?? 7.5,
          image,
          model_id: params.model_id ?? "runwayml/stable-diffusion-v1-5",
          negative_prompt: params.negative_prompt,
          num_inference_steps: params.num_inference_steps ?? 20,
          prompt,
          seed: params.seed,
          upscale_method: params.upscale_method ?? "lanczos",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ScriptError(`upscaleImg2Img server error: ${error}`);
      }

      const result = await response.json();
      return result; // { image: base64string, width, height, format }
    } catch (error: any) {
      throw new ScriptError(`diffusers.upscaleImg2Img failed: ${error.message}`);
    }
  }
}

declare module "@viwo/core" {
  interface CapabilityRegistry {
    [UpscaleCapability.type]: typeof UpscaleCapability;
  }
}

registerCapabilityClass(UpscaleCapability);
