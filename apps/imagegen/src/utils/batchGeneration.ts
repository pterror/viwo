import { createSignal } from "solid-js";

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  seed?: number;
  steps?: number;
  cfg?: number;
  [key: string]: unknown;
}

export interface GenerationResult {
  image_url: string;
  seed?: number;
  request: GenerationRequest;
}

export interface BatchOptions {
  onProgress?: (current: number, total: number) => void;
  onComplete?: (results: GenerationResult[]) => void;
  onError?: (error: Error, request: GenerationRequest, idx: number) => void;
  continueOnError?: boolean;
  cancelSignal?: { cancelled: boolean };
}

/**
 * Batch generation hook for generating multiple images with progress tracking
 */
export function useBatch(sendRpc: (method: string, params: any) => Promise<any>) {
  const [isRunning, setIsRunning] = createSignal(false);
  const [progress, setProgress] = createSignal({ current: 0, total: 0 });
  const [results, setResults] = createSignal<GenerationResult[]>([]);
  const [errors, setErrors] = createSignal<
    Array<{ error: Error; request: GenerationRequest; idx: number }>
  >([]);

  /**
   * Generate multiple images in sequence
   */
  async function generateBatch(
    requests: GenerationRequest[],
    options: BatchOptions = {},
  ): Promise<GenerationResult[]> {
    setIsRunning(true);
    setProgress({ current: 0, total: requests.length });
    setResults([]);
    setErrors([]);

    const batchResults: GenerationResult[] = [];
    const batchErrors: Array<{ error: Error; request: GenerationRequest; idx: number }> = [];

    for (let idx = 0; idx < requests.length; idx += 1) {
      // Check cancellation
      if (options.cancelSignal?.cancelled) {
        break;
      }

      const request = requests[idx];

      try {
        // Call the diffusers.generate capability
        const capability = await sendRpc("get_capability", { type: "diffusers.generate" });
        const result = await sendRpc("std.call_method", {
          args: [
            request.prompt,
            {
              height: request.height,
              model_id: "runwayml/stable-diffusion-v1-5",
              negative_prompt: request.negativePrompt,
              num_inference_steps: request.steps ?? 50,
              seed: request.seed,
              width: request.width,
            },
          ],
          method: "generate",
          object: capability,
        });

        const generationResult: GenerationResult = {
          image_url: `data:image/png;base64,${result.image}`,
          request,
          seed: result.seed,
        };

        batchResults.push(generationResult);
        setResults([...batchResults]);

        setProgress({ current: idx + 1, total: requests.length });
        options.onProgress?.(idx + 1, requests.length);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        batchErrors.push({ error: err, idx, request });
        setErrors([...batchErrors]);

        options.onError?.(err, request, idx);

        if (!options.continueOnError) {
          break;
        }
      }
    }

    setIsRunning(false);
    options.onComplete?.(batchResults);

    return batchResults;
  }

  /**
   * Cancel the current batch operation
   */
  function cancel() {
    // Note: This requires the caller to pass a cancelSignal object
    // and check it in their loop
  }

  /**
   * Create seed variations of a base request
   */
  function createSeedVariations(
    baseRequest: GenerationRequest,
    count: number,
    startSeed = 1,
  ): GenerationRequest[] {
    const requests: GenerationRequest[] = [];

    for (let idx = 0; idx < count; idx += 1) {
      requests.push({
        ...baseRequest,
        seed: startSeed + idx,
      });
    }

    return requests;
  }

  /**
   * Create prompt variations from an array of prompts
   */
  function createPromptVariations(
    prompts: string[],
    baseParams: Partial<GenerationRequest>,
  ): GenerationRequest[] {
    return prompts.map((prompt) => ({
      height: 512,
      prompt,
      width: 512,
      ...baseParams,
    }));
  }

  return {
    cancel,
    createPromptVariations,
    createSeedVariations,
    errors,
    generateBatch,
    isRunning,
    progress,
    results,
  };
}
