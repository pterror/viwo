import { Plugin, PluginContext, CommandContext } from "@viwo/core";
import { generateText, generateObject, embed, streamText } from "ai";
import { z } from "zod";

import * as amazonBedrock from "@ai-sdk/amazon-bedrock";
import * as anthropic from "@ai-sdk/anthropic";
import * as assemblyai from "@ai-sdk/assemblyai";
import * as azure from "@ai-sdk/azure";
import * as baseten from "@ai-sdk/baseten";
import * as blackForestLabs from "@ai-sdk/black-forest-labs";
import * as cerebras from "@ai-sdk/cerebras";
import * as cohere from "@ai-sdk/cohere";
import * as deepgram from "@ai-sdk/deepgram";
import * as deepinfra from "@ai-sdk/deepinfra";
import * as deepseek from "@ai-sdk/deepseek";
import * as elevenlabs from "@ai-sdk/elevenlabs";
import * as fal from "@ai-sdk/fal";
import * as fireworks from "@ai-sdk/fireworks";
import * as gateway from "@ai-sdk/gateway";
import * as gladia from "@ai-sdk/gladia";
import * as google from "@ai-sdk/google";
import * as googleVertex from "@ai-sdk/google-vertex";
import * as groq from "@ai-sdk/groq";
import * as huggingface from "@ai-sdk/huggingface";
import * as hume from "@ai-sdk/hume";
import * as langchain from "@ai-sdk/langchain";
import * as llamaindex from "@ai-sdk/llamaindex";
import * as lmnt from "@ai-sdk/lmnt";
import * as luma from "@ai-sdk/luma";
import * as mistral from "@ai-sdk/mistral";
import * as openai from "@ai-sdk/openai";
import * as openaiCompatible from "@ai-sdk/openai-compatible";
import * as perplexity from "@ai-sdk/perplexity";
import * as replicate from "@ai-sdk/replicate";
import * as revai from "@ai-sdk/revai";
import * as togetherai from "@ai-sdk/togetherai";
import * as vercel from "@ai-sdk/vercel";
import * as xai from "@ai-sdk/xai";

export interface GenerationTemplate<T = any> {
  name: string;
  description: string;
  schema: z.ZodType<T>;
  prompt: (context: CommandContext, instruction?: string) => string;
}

const providerMap: Record<string, any> = {
  "amazon-bedrock": amazonBedrock,
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
  "google-vertex": googleVertex,
  groq: groq,
  huggingface: huggingface,
  hume: hume,
  langchain: langchain,
  llamaindex: llamaindex,
  lmnt: lmnt,
  luma: luma,
  mistral: mistral,
  openai: openai,
  "openai-compatible": openaiCompatible,
  perplexity: perplexity,
  replicate: replicate,
  revai: revai,
  togetherai: togetherai,
  vercel: vercel,
  xai: xai,
};

async function getModel(modelSpec?: string) {
  const defaultProvider = process.env["AI_PROVIDER"] ?? "openai";
  const defaultModel = process.env["AI_MODEL"] ?? "gpt-4o";

  let providerName = defaultProvider;
  let modelName = defaultModel;

  if (modelSpec) {
    const matches = modelSpec.match(/^([^:]+):(.+)$/);
    if (matches) {
      [providerName = "", modelName = ""] = matches.slice(1);
    } else {
      modelName = modelSpec;
    }
  }

  const mod = providerMap[providerName];
  if (!mod) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  try {
    // Try to find the provider function (default, named export, or camelCase fallback).

    // Special cases mapping
    let exportName = providerName;
    if (providerName === "amazon-bedrock") exportName = "bedrock";
    if (providerName === "google-vertex") exportName = "vertex";
    if (providerName === "openai-compatible") exportName = "openaiCompatible";
    if (providerName === "black-forest-labs") exportName = "bfl";

    let providerFn = mod[exportName] || mod[providerName] || mod.default;

    if (!providerFn) {
      // Try camelCase for hyphenated names
      const camel = providerName.replace(/-([a-z])/g, (g) => g[1]?.toUpperCase() ?? "");
      providerFn = mod[camel];
    }

    if (!providerFn) {
      throw new Error(`Could not find export for provider '${providerName}'`);
    }

    return providerFn(modelName);
  } catch (e: any) {
    throw new Error(`Failed to load provider '${providerName}': ${e.message}`);
  }
}

export class AiPlugin implements Plugin {
  name = "ai";
  version = "0.1.0";
  private templates: Map<string, GenerationTemplate<any>> = new Map();

  private context?: PluginContext;

  onLoad(ctx: PluginContext) {
    this.context = ctx;
    ctx.registerCommand("talk", this.handleTalk.bind(this));
    ctx.registerCommand("gen", this.handleGen.bind(this));
    ctx.registerCommand("image", this.handleImage.bind(this));

    // Register default templates
    this.registerTemplate({
      name: "item",
      description: "Generate an item",
      schema: z.object({
        name: z.string(),
        description: z.string(),
        adjectives: z.array(z.string()),
        custom_css: z.string().optional(),
      }),
      prompt: (_ctx, instruction) => `
        You are a creative game master. Create an item based on the description: "${instruction}".
      `,
    });

    this.registerTemplate({
      name: "room",
      description: "Generate a room",
      schema: z.object({
        name: z.string(),
        description: z.string(),
        adjectives: z.array(z.string()),
        custom_css: z.string().optional(),
      }),
      prompt: (_ctx, instruction) => `
        You are a creative game master. Create a room based on the description: "${instruction}".
      `,
    });
    ctx.registerRpcMethod("ai_completion", this.handleCompletion.bind(this));
    ctx.registerRpcMethod("stream_talk", this.handleStreamTalk.bind(this));
  }

  registerTemplate(template: GenerationTemplate) {
    this.templates.set(template.name, template);
  }

  async handleCompletion(params: any, ctx: CommandContext) {
    const { code, position } = params; // position is { lineNumber, column }

    // Get opcode metadata to provide context about available functions
    const opcodes = ctx.core.getOpcodeMetadata();
    const functionSignatures = opcodes
      .map((op) => {
        const params = op.parameters
          ? op.parameters.map((p) => `${p.name}: ${p.type}`).join(", ")
          : "";
        return `${op.opcode}(${params}): ${op.returnType || "any"}`;
      })
      .join("\n");

    try {
      const model = await getModel();

      // Construct a prompt that asks for completion
      const prompt = `
        You are an expert ViwoScript developer. ViwoScript is a TypeScript-like scripting language.
        Provide code completion suggestions for the following code at the cursor position.
        
        Available Functions:
        ${functionSignatures}
        
        Code:
        ${code}
        
        Cursor Position: Line ${position.lineNumber}, Column ${position.column}
        
        Return a single string containing the code to complete at the cursor.
        Do NOT use placeholders like $0 or $1.
        Do NOT include markdown formatting or backticks.
        Just return the raw code to insert.
      `;

      const { object: data } = await generateObject({
        model,
        schema: z.object({
          completion: z.string(),
        }),
        prompt: prompt,
      });

      return (data as any).completion;
    } catch (error: any) {
      console.error("AI Completion Error:", error);
      return null;
    }
  }

  async handleTalk(ctx: CommandContext) {
    const targetName = ctx.args[0];
    const message = ctx.args.slice(1).join(" ");

    if (!targetName || !message) {
      ctx.send("message", "Usage: talk <npc> <message>");
      return;
    }

    // Check room contents.
    const playerEntity = ctx.core.getEntity(ctx.player.id);
    if (!playerEntity || !playerEntity["location"]) {
      ctx.send("message", "You are nowhere.");
      return;
    }

    const roomItems = this.getResolvedRoom(ctx, playerEntity["location"] as number)?.contents;
    const target = roomItems?.find((e: any) => e.name.toLowerCase() === targetName.toLowerCase());

    if (!target) {
      ctx.send("message", `You don't see '${targetName}' here.`);
      return;
    }

    try {
      const systemPrompt = await this.buildSystemPrompt(target, message);

      const model = await getModel();
      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: message,
      });

      ctx.send("message", `${target["name"]} says: "${text}"`);
    } catch (error: any) {
      console.error("AI Error:", error);
      ctx.send("error", `AI Error: ${error.message}`);
    }
  }

  async handleStreamTalk(params: any, ctx: CommandContext) {
    const { targetName, message } = params;

    if (!targetName || !message) {
      throw new Error("Usage: stream_talk { targetName, message }");
    }

    const playerEntity = ctx.core.getEntity(ctx.player.id);
    if (!playerEntity || !playerEntity["location"]) {
      throw new Error("You are nowhere.");
    }

    const roomItems = this.getResolvedRoom(ctx, playerEntity["location"] as number)?.contents;
    const target = roomItems?.find((e: any) => e.name.toLowerCase() === targetName.toLowerCase());

    if (!target) {
      throw new Error(`You don't see '${targetName}' here.`);
    }

    try {
      const systemPrompt = await this.buildSystemPrompt(target, message);

      const model = await getModel();
      const { textStream } = await streamText({
        model,
        system: systemPrompt,
        prompt: message,
      });

      const streamId = `stream-${Date.now()}`;
      ctx.send("stream_start", { streamId });
      ctx.send("stream_chunk", {
        streamId,
        chunk: `${target["name"]} says: "`,
      });

      for await (const textPart of textStream) {
        ctx.send("stream_chunk", { streamId, chunk: textPart });
      }

      ctx.send("stream_chunk", { streamId, chunk: `"` });
      ctx.send("stream_end", { streamId });
    } catch (error: any) {
      console.error("AI Stream Error:", error);
      ctx.send("error", `AI Stream Error: ${error.message}`);
    }
  }

  private async buildSystemPrompt(target: any, message: string): Promise<string> {
    // Target is already resolved by getResolvedRoom, but let's be sure we have the latest props if we re-fetched
    // Actually getResolvedRoom calls resolveProps.

    // Check for dynamic prompt
    if (target["llm_prompt"]) {
      return target["llm_prompt"] as string;
    }

    let systemPrompt = `You are roleplaying as ${target["name"]}.\
${target["description"] ? `\nDescription: ${target["description"]}` : ""}
${target["adjectives"] ? `\nAdjectives: ${(target["adjectives"] as string[]).join(", ")}` : ""}
Keep your response short and in character.`;

    // RAG: Fetch memories
    if (this.context) {
      const memoryPlugin = this.context.getPlugin("memory") as any;
      if (memoryPlugin && memoryPlugin.memoryManager) {
        try {
          const memories = await memoryPlugin.memoryManager.search(message, {
            limit: 3,
          });
          if (memories.length > 0) {
            systemPrompt += `\n\nRelevant Memories:\n${memories
              .map((m: any) => `- ${m.content}`)
              .join("\n")}`;
          }
        } catch (e) {
          console.warn("Failed to fetch memories:", e);
        }
      }
    }
    return systemPrompt;
  }

  async handleGen(ctx: CommandContext) {
    const templateName = ctx.args[0];
    const instruction = ctx.args.slice(1).join(" ");

    if (!templateName) {
      ctx.send(
        "message",
        `Usage: gen <template> [instruction]. Available templates: ${Array.from(
          this.templates.keys(),
        ).join(", ")}`,
      );
      return;
    }

    const template = this.templates.get(templateName);
    if (!template) {
      ctx.send("error", `Template '${templateName}' not found.`);
      return;
    }

    ctx.send("message", "Generating...");

    try {
      const prompt = template.prompt(ctx, instruction);
      const model = await getModel();

      const { object: data } = await generateObject({
        model,
        schema: template.schema,
        prompt: prompt,
      });

      const playerEntity = ctx.core.getEntity(ctx.player.id);
      if (!playerEntity || !playerEntity["location"]) return;

      if (templateName === "room") {
        // Create room and exit
        const newRoomId = ctx.core.createEntity({
          name: data.name,
          description: data.description,
          adjectives: data.adjectives,
          custom_css: data.custom_css,
        });
        const room = this.getResolvedRoom(ctx, newRoomId);
        if (room) {
          ctx.send("room_id", { roomId: room.id });
          ctx.send("message", `You are transported to ${data.name}.`);
        }
      } else {
        // Default: Create item in current room
        ctx.core.createEntity({
          name: data.name,
          location: playerEntity["location"],
          description: data.description,
          adjectives: data.adjectives,
          custom_css: data.custom_css,
        });
        const room = this.getResolvedRoom(ctx, playerEntity["location"] as number);
        if (room) {
          ctx.send("room_id", { roomId: room.id });
          ctx.send("message", `Created ${data.name}.`);
        }
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      ctx.send("error", `AI Error: ${error.message}`);
    }
  }

  async handleImage(ctx: CommandContext) {
    const instruction = ctx.args.join(" ");

    if (!instruction) {
      ctx.send("message", "Usage: image <description>");
      return;
    }

    ctx.send("message", "Generating image...");

    try {
      // Resolve target to check for image_gen_prompt
      let imagePrompt = instruction;

      // If the instruction is just "image <target>", we might want to use the target's prompt
      // But handleImage logic parses args weirdly.
      // "image <description>" -> instruction = description.
      // "image <target> <prompt>" -> targetName = args[0], prompt = args[1..]

      // Let's check if the instruction matches a target in the room
      const currentPlayer = ctx.core.getEntity(ctx.player.id);
      if (currentPlayer && currentPlayer["location"]) {
        const roomItems = this.getResolvedRoom(ctx, currentPlayer["location"] as number)?.contents;
        // Check if instruction starts with a target name
        // This is a bit fuzzy. The command is `image <args>`.
        // If args[0] is a target, we might want to use its prompt.

        const possibleTargetName = ctx.args[0];
        const target = roomItems?.find(
          (e: any) => e.name.toLowerCase() === possibleTargetName?.toLowerCase(),
        );

        if (target) {
          // If the user provided more args, append them? Or replace?
          // User said: "It should have a configurable prefix"
          // If target has image_gen_prompt, use it.
          if (target["image_gen_prompt"]) {
            imagePrompt = target["image_gen_prompt"] as string;
            // If user provided extra details, append them
            if (ctx.args.length > 1) {
              imagePrompt += `, ${ctx.args.slice(1).join(" ")}`;
            }
          }
        }
      }

      const model = await getModel("openai:dall-e-3");
      const { image } = await import("ai").then((m) =>
        m.experimental_generateImage({
          model,
          prompt: imagePrompt,
          n: 1,
        }),
      );

      const base64Data = image.base64;
      const buffer = Buffer.from(base64Data, "base64");
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      const filepath = `apps/web/public/images/${filename}`;
      const publicUrl = `/images/${filename}`;

      await Bun.write(filepath, buffer);

      // Update current room or item

      // Re-parsing args for target
      const targetName = ctx.args[0];
      const prompt = ctx.args.slice(1).join(" ");

      if (!targetName || !prompt) {
        ctx.send("message", "Usage: image <target> <prompt>");
        return;
      }

      const playerEntity = ctx.core.getEntity(ctx.player.id);
      if (!playerEntity) {
        ctx.send("message", "You are nowhere.");
        return;
      }
      let targetId: number | null = null;
      if (targetName === "room" || targetName === "here") {
        targetId = playerEntity["location"] as number;
      } else {
        // Find item
        const roomItems = this.getResolvedRoom(ctx, playerEntity["location"] as number)?.contents;
        const item = roomItems?.find(
          (item) => (item["name"] as string).toLowerCase() === targetName.toLowerCase(),
        );
        if (item) {
          targetId = item.id;
        }
      }

      if (targetId) {
        const entity = ctx.core.getEntity(targetId);
        if (entity) {
          ctx.core.updateEntity({ ...entity, image: publicUrl });
          const room = {
            ...ctx.core.getEntity(playerEntity["location"] as number),
          };
          if (room) {
            ctx.send("room_id", { roomId: room.id });
            ctx.send("message", `Image generated for ${entity["name"]}.`);
          }
          return;
        }
      }

      ctx.send("message", `Could not find target '${targetName}'.`);
    } catch (error: any) {
      console.error("AI Image Error:", error);
      ctx.send("error", `AI Image Error: ${error.message}`);
    }
  }

  getResolvedRoom(ctx: CommandContext, roomId: number) {
    const room = ctx.core.getEntity(roomId);
    if (!room) {
      return;
    }
    const resolved = ctx.core.resolveProps(room);
    const withContents = {
      ...resolved,
      contents: ((room["contents"] as number[]) ?? []).map((id) =>
        ctx.core.resolveProps(ctx.core.getEntity(id)!),
      ),
    };
    return withContents;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const model = await getModel("openai:text-embedding-3-small");
    const { embedding } = await embed({
      model,
      value: text,
    });
    return embedding;
  }
}
