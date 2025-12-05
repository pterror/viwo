import { generateText, generateObject } from "ai";
import { z } from "zod";
import { OpcodeDefinition } from "@viwo/scripting";
import { getModel } from "../index";

export const AiLib: Record<string, OpcodeDefinition> = {
  "ai.text": {
    metadata: {
      opcode: "ai.text",
      description: "Generate text using an LLM.",
      parameters: [
        { name: "prompt", type: "string" },
        { name: "system", type: "string", optional: true },
      ],
      returnType: "string",
    },
    handler: async (args: unknown[]) => {
      const [prompt, system] = args as [string, string | undefined];
      const model = await getModel();
      const { text } = await generateText({
        model,
        system,
        prompt,
      });
      return text;
    },
  },
  "ai.json": {
    metadata: {
      opcode: "ai.json",
      description: "Generate a JSON object using an LLM.",
      parameters: [
        { name: "prompt", type: "string" },
        { name: "schema", type: "object" }, // Schema definition is tricky to pass from script, we might need a simplified way or just accept a description and infer?
        // For now, let's assume the schema is passed as a JSON schema object or similar.
        // Actually, passing a Zod schema from script is hard.
        // Let's defer ai.json or make it return any and take a schema description string?
        // Or maybe just take a sample object?
        // Let's stick to ai.text for now as per plan, but I'll add a placeholder or simple version if needed.
        // User asked for ai.json in plan, but let's implement a simple version that takes a schema description string.
        { name: "schemaDescription", type: "string" },
      ],
      returnType: "object",
    },
    handler: async (args: unknown[]) => {
      // This is a bit hacky without a real schema parser from script.
      // We'll ask for a JSON string and parse it.
      const [prompt, schemaDesc] = args as [string, string];
      const model = await getModel();

      // We can't easily construct a Zod schema from a script object yet.
      // So we'll use generateText with json mode if available, or just prompt engineering.
      // ai sdk generateObject requires a schema.
      // We can use z.any() but that defeats the purpose.
      // Let's try to use z.object({}) and rely on the prompt to define structure? No.

      // Alternative: ai.extract(text, templateName) where templates are defined in plugin?
      // But we want script control.

      // Let's implement a dynamic schema generator if possible, or just use text and JSON.parse.
      const { text } = await generateText({
        model,
        system: `You are a JSON generator. Generate a valid JSON object matching this description: ${schemaDesc}. Return ONLY the JSON.`,
        prompt,
      });

      try {
        // Clean up markdown code blocks if present
        const cleanText = text.replace(/```json\n?|\n?```/g, "");
        return JSON.parse(cleanText);
      } catch (e) {
        throw new Error("Failed to parse generated JSON");
      }
    },
  },
};
