import { BaseCapability, registerCapabilityClass } from "@viwo/core";
import { ScriptError } from "@viwo/scripting";

export class DiffusersGenerate extends BaseCapability {
  static override readonly type = "diffusers.generate";

  async textToImage(
    prompt: string,
    options?: {
      modelId?: string;
      width?: number;
      height?: number;
      numInferenceSteps?: number;
      guidanceScale?: number;
      negativePrompt?: string;
      seed?: number;
    },
    ctx?: any,
  ) {
    // Check capability ownership
    if (this.ownerId !== ctx.this.id) {
      throw new ScriptError("diffusers.generate: missing capability");
    }

    // Validate capability params
    const serverUrl = this.params["server_url"] as string;
    const allowedModels = this.params["allowed_models"] as string[] | undefined;

    if (!serverUrl || typeof serverUrl !== "string") {
      throw new ScriptError("diffusers.generate: invalid server_url in capability");
    }

    const modelId = options?.modelId ?? this.params["default_model"];
    if (!modelId) {
      throw new ScriptError("diffusers.generate: model_id required");
    }

    // Check model allowlist
    if (allowedModels && !allowedModels.includes(modelId)) {
      throw new ScriptError(`diffusers.generate: model '${modelId}' not allowed`);
    }

    // Make HTTP request to server
    try {
      const response = await fetch(`${serverUrl}/text-to-image`, {
        body: JSON.stringify({
          guidance_scale: options?.guidanceScale ?? undefined,
          height: options?.height ?? undefined,
          model_id: modelId,
          negative_prompt: options?.negativePrompt ?? undefined,
          num_inference_steps: options?.numInferenceSteps ?? undefined,
          prompt,
          seed: options?.seed ?? undefined,
          width: options?.width ?? undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ScriptError(`diffusers server error: ${error}`);
      }

      const result = await response.json();
      return result; // { image: base64string, width, height, format }
    } catch (error: any) {
      throw new ScriptError(`diffusers.generate failed: ${error.message}`);
    }
  }
}

declare module "@viwo/core" {
  interface CapabilityRegistry {
    [DiffusersGenerate.type]: typeof DiffusersGenerate;
  }
}

registerCapabilityClass(DiffusersGenerate);
