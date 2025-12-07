import { anthropic } from "@ai-sdk/anthropic";
import { assemblyai } from "@ai-sdk/assemblyai";
import { azure } from "@ai-sdk/azure";
import { baseten } from "@ai-sdk/baseten";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { blackForestLabs } from "@ai-sdk/black-forest-labs";
import { cerebras } from "@ai-sdk/cerebras";
import { cohere } from "@ai-sdk/cohere";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { deepgram } from "@ai-sdk/deepgram";
import { deepinfra } from "@ai-sdk/deepinfra";
import { deepseek } from "@ai-sdk/deepseek";
import { elevenlabs } from "@ai-sdk/elevenlabs";
import { fal } from "@ai-sdk/fal";
import { fireworks } from "@ai-sdk/fireworks";
import { gateway } from "@ai-sdk/gateway";
import { gladia } from "@ai-sdk/gladia";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { huggingface } from "@ai-sdk/huggingface";
import { hume } from "@ai-sdk/hume";
import { lmnt } from "@ai-sdk/lmnt";
import { luma } from "@ai-sdk/luma";
import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";
import { perplexity } from "@ai-sdk/perplexity";
import { replicate } from "@ai-sdk/replicate";
import { revai } from "@ai-sdk/revai";
import { togetherai } from "@ai-sdk/togetherai";
import { vercel } from "@ai-sdk/vercel";
import { vertex } from "@ai-sdk/google-vertex";
import { xai } from "@ai-sdk/xai";

const providerMap = {
  "amazon-bedrock": bedrock,
  anthropic: anthropic,
  assemblyai: assemblyai,
  azure: azure,
  baseten: baseten,
  "black-forest-labs": blackForestLabs,
  cerebras: cerebras,
  cohere: cohere,
  deepgram: deepgram,
  deepinfra: deepinfra,
  deepseek: deepseek,
  elevenlabs: elevenlabs,
  fal: fal,
  fireworks: fireworks,
  gateway: gateway,
  gladia: gladia,
  google: google,
  "google-vertex": vertex,
  groq: groq,
  huggingface: huggingface,
  hume: hume,
  lmnt: lmnt,
  luma: luma,
  mistral: mistral,
  openai: openai,
  perplexity: perplexity,
  replicate: replicate,
  revai: revai,
  togetherai: togetherai,
  vercel: vercel,
  xai: xai,
};
const providerName = new Set(Object.keys(providerMap) as (keyof typeof providerMap)[]);
function isProviderName(name: string): name is keyof typeof providerMap {
  return providerName.has(name as keyof typeof providerMap);
}

function getProvider(providerName: string | undefined) {
  if (!providerName || !isProviderName(providerName)) {
    throw new Error(`Unknown provider: ${providerName}`);
  }
  const provider = providerMap[providerName];
  if (!provider) {
    try {
      const url = new URL(providerName);
      createOpenAICompatible({ baseURL: providerName, name: url.host });
    } catch {
      throw new Error(`Unknown provider '${providerName}'`);
    }
    throw new Error(`Unknown provider '${providerName}'`);
  }
  return provider;
}

function parseModelSpec(modelSpec: string) {
  let providerName: string | undefined;
  let modelName: string | undefined;

  if (modelSpec) {
    const matches = modelSpec.match(/^([^:]+):(.+)$/);
    if (matches) {
      [providerName, modelName] = matches.slice(1);
    } else {
      modelName = modelSpec;
    }
  }
  if (!providerName || !modelName) {
    throw new Error(`Invalid model spec: ${modelSpec}`);
  }
  return { modelName, providerName };
}

export function getLanguageModel(modelSpec: string) {
  const { providerName, modelName } = parseModelSpec(modelSpec);
  const provider = getProvider(providerName);
  if (!("languageModel" in provider)) {
    throw new Error(`Provider '${providerName}' does not support language models`);
  }
  return provider.languageModel(modelName);
}

export function getTextEmbeddingModel(modelSpec: string) {
  const { providerName, modelName } = parseModelSpec(modelSpec);
  const provider = getProvider(providerName);
  if (!("textEmbeddingModel" in provider)) {
    throw new Error(`Provider '${providerName}' does not support embedding models`);
  }
  return provider.textEmbeddingModel(modelName);
}

export function getImageModel(modelSpec: string) {
  const { providerName, modelName } = parseModelSpec(modelSpec);
  const provider = getProvider(providerName);
  if (!("imageModel" in provider)) {
    throw new Error(`Provider '${providerName}' does not support image models`);
  }
  return provider.imageModel(modelName);
}

export function getSpeechModel(modelSpec: string) {
  const { providerName, modelName } = parseModelSpec(modelSpec);
  const provider = getProvider(providerName);
  if (!("speechModel" in provider)) {
    throw new Error(`Provider '${providerName}' does not support speech models`);
  }
  return provider.speechModel(modelName);
}

export function getTranscriptionModel(modelSpec: string) {
  const { providerName, modelName } = parseModelSpec(modelSpec);
  const provider = getProvider(providerName);
  if (!("transcriptionModel" in provider)) {
    throw new Error(`Provider '${providerName}' does not support transcription models`);
  }
  return provider.transcriptionModel(modelName);
}
