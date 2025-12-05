import { defineOpcode } from "@viwo/scripting";
import {
  generateText,
  generateObject,
  jsonSchema,
  experimental_generateImage,
  embed,
  experimental_generateSpeech,
  experimental_transcribe,
} from "ai";
import {
  getImageModel,
  getLanguageModel,
  getSpeechModel,
  getTextEmbeddingModel,
  getTranscriptionModel,
} from "../models";

export const aiText = defineOpcode<[string, string, string?], string>("ai.text", {
  metadata: {
    label: "Generate Text Response",
    category: "AI",
    parameters: [
      { name: "model", type: "string" },
      { name: "prompt", type: "string" },
      { name: "system", type: "string", optional: true },
    ],
    returnType: "string",
    description: "Generates text.",
  },
  handler: async ([modelName, prompt, systemPrompt]) => {
    const model = getLanguageModel(modelName);
    const { text } = await generateText({
      model,
      prompt,
      ...(systemPrompt ? { system: systemPrompt } : {}),
    });
    return text;
  },
});

export const aiJson = defineOpcode<[string, string, object?], any>("ai.json", {
  metadata: {
    label: "Generate JSON Response",
    category: "AI",
    parameters: [
      { name: "model", type: "string" },
      { name: "prompt", type: "string" },
      // TODO: Opcodes to construct JSON schemas.
      { name: "schema", type: "object", optional: true },
    ],
    returnType: "object",
    description: "Generates a JSON object.",
  },
  handler: async ([modelName, prompt, schema]) => {
    const model = getLanguageModel(modelName);
    const { object } = schema
      ? await generateObject({ model, schema: jsonSchema(schema), prompt })
      : await generateObject<never, "no-schema">({ model, prompt });
    return object;
  },
});

export const aiEmbeddingText = defineOpcode<[string, string], number[]>("ai.embedding.text", {
  metadata: {
    label: "Generate Text Embedding",
    category: "AI",
    parameters: [
      { name: "model", type: "string" },
      { name: "text", type: "string" },
    ],
    returnType: "number[]",
    description: "Generates an embedding for the given text.",
  },
  handler: async ([modelName, text]) => {
    const model = getTextEmbeddingModel(modelName);
    const { embedding } = await embed({ model, value: text });
    return embedding;
  },
});

export const aiImage = defineOpcode<[string, string], object>("ai.image", {
  metadata: {
    label: "Generate Image",
    category: "AI",
    parameters: [
      { name: "model", type: "string" },
      { name: "prompt", type: "string" },
    ],
    returnType: "object",
    description: "Generates an image.",
  },
  handler: async ([modelName, prompt]) => {
    const model = getImageModel(modelName);
    const { image } = await experimental_generateImage({ model, prompt });
    // TODO: Support specifying width and height
    // TODO: Return in an actually usable format
    return image;
  },
});

export const aiGenerateSpeech = defineOpcode<[string, string], object>("ai.generate_speech", {
  metadata: {
    label: "Generate Speech",
    category: "AI",
    parameters: [
      { name: "model", type: "string" },
      { name: "text", type: "string" },
    ],
    returnType: "object",
    description: "Generates speech from text.",
  },
  handler: async ([modelName, text]) => {
    const model = getSpeechModel(modelName);
    const { audio } = await experimental_generateSpeech({ model, text });
    // TODO: Return in an actually usable format
    return audio;
  },
});

export const aiTranscribe = defineOpcode<[string, string], object>("ai.transcribe", {
  metadata: {
    label: "Transcribe Audio",
    category: "AI",
    parameters: [
      { name: "model", type: "string" },
      { name: "audio", type: "object" },
    ],
    returnType: "string",
    description: "Transcribes audio to text.",
  },
  handler: async ([modelName, audio]) => {
    const model = getTranscriptionModel(modelName);
    const { text } = await experimental_transcribe({ model, audio });
    return text;
  },
});
