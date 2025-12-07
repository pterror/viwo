import {
  embed,
  experimental_generateImage,
  experimental_generateSpeech,
  experimental_transcribe,
  generateObject,
  generateText,
  jsonSchema,
} from "ai";
import {
  getImageModel,
  getLanguageModel,
  getSpeechModel,
  getTextEmbeddingModel,
  getTranscriptionModel,
} from "./models";
import { defineFullOpcode } from "@viwo/scripting";

export const aiText = defineFullOpcode<[string, string, string?], string>("ai.text", {
  handler: async ([modelName, prompt, systemPrompt]) => {
    const model = getLanguageModel(modelName);
    const { text } = await generateText({
      model,
      prompt,
      ...(systemPrompt ? { system: systemPrompt } : {}),
    });
    return text;
  },
  metadata: {
    category: "AI",
    description: "Generates text.",
    label: "Generate Text Response",
    parameters: [
      { description: "The model to use.", name: "model", type: "string" },
      { description: "The prompt to generate text from.", name: "prompt", type: "string" },
      { description: "The system prompt.", name: "system", optional: true, type: "string" },
    ],
    returnType: "string",
    slots: [
      { name: "Model", type: "string" },
      { name: "Prompt", type: "string" },
      { name: "System", type: "string" },
    ],
  },
});

export const aiJson = defineFullOpcode<[string, string, object?], any>("ai.json", {
  handler: async ([modelName, prompt, schema]) => {
    const model = getLanguageModel(modelName);
    const { object } = schema
      ? await generateObject({ model, prompt, schema: jsonSchema(schema) })
      : await generateObject<never, "no-schema">({ model, prompt });
    return object;
  },
  metadata: {
    category: "AI",
    description: "Generates a JSON object.",
    label: "Generate JSON Response",
    parameters: [
      { description: "The model to use.", name: "model", type: "string" },
      { description: "The prompt to generate JSON from.", name: "prompt", type: "string" },
      { description: "The JSON schema.", name: "schema", optional: true, type: "object" },
    ],
    returnType: "object",
    slots: [
      { name: "Model", type: "string" },
      { name: "Prompt", type: "string" },
      { name: "Schema", type: "block" },
    ],
  },
});

export const aiEmbeddingText = defineFullOpcode<[string, string], number[]>("ai.embedding.text", {
  handler: async ([modelName, text]) => {
    const model = getTextEmbeddingModel(modelName);
    const { embedding } = await embed({ model, value: text });
    return embedding;
  },
  metadata: {
    category: "AI",
    description: "Generates an embedding for the given text.",
    label: "Generate Text Embedding",
    parameters: [
      { description: "The model to use.", name: "model", type: "string" },
      { description: "The text to embed.", name: "text", type: "string" },
    ],
    returnType: "number[]",
    slots: [
      { name: "Model", type: "string" },
      { name: "Text", type: "string" },
    ],
  },
});

export const aiImage = defineFullOpcode<[string, string], object>("ai.image", {
  handler: async ([modelName, prompt]) => {
    const model = getImageModel(modelName);
    const { image } = await experimental_generateImage({ model, prompt });
    return image;
  },
  metadata: {
    category: "AI",
    description: "Generates an image.",
    label: "Generate Image",
    parameters: [
      { description: "The model to use.", name: "model", type: "string" },
      { description: "The prompt to generate image from.", name: "prompt", type: "string" },
    ],
    returnType: "object",
    slots: [
      { name: "Model", type: "string" },
      { name: "Prompt", type: "string" },
    ],
  },
});

export const aiGenerateSpeech = defineFullOpcode<[string, string], object>("ai.generate_speech", {
  handler: async ([modelName, text]) => {
    const model = getSpeechModel(modelName);
    const { audio } = await experimental_generateSpeech({ model, text });
    return audio;
  },
  metadata: {
    category: "AI",
    description: "Generates speech from text.",
    label: "Generate Speech",
    parameters: [
      { description: "The model to use.", name: "model", type: "string" },
      { description: "The text to generate speech from.", name: "text", type: "string" },
    ],
    returnType: "object",
    slots: [
      { name: "Model", type: "string" },
      { name: "Text", type: "string" },
    ],
  },
});

export const aiTranscribe = defineFullOpcode<[string, string], object>("ai.transcribe", {
  handler: async ([modelName, audio]) => {
    const model = getTranscriptionModel(modelName);
    const { text } = await experimental_transcribe({ audio, model });
    return text;
  },
  metadata: {
    category: "AI",
    description: "Transcribes audio to text.",
    label: "Transcribe Audio",
    parameters: [
      { description: "The model to use.", name: "model", type: "string" },
      { description: "The audio to transcribe.", name: "audio", type: "object" },
    ],
    returnType: "string",
    slots: [
      { name: "Model", type: "string" },
      { name: "Audio", type: "block" },
    ],
  },
});
