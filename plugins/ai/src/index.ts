import * as AiLib from "./lib";
import type { CommandContext, Plugin, PluginContext } from "@viwo/core";
import { embed, experimental_generateImage, generateObject, generateText, streamText } from "ai";
import { getImageModel, getLanguageModel, getTextEmbeddingModel } from "./models";
import { z } from "zod";

export interface GenerationTemplate<Type = any> {
  name: string;
  description: string;
  schema: z.ZodType<Type>;
  prompt: (context: CommandContext, instruction?: string) => string;
}

export class AiPlugin implements Plugin {
  name = "ai";
  version = "0.1.0";
  private modelSpec = "openai:gpt-4o";
  private imageModelSpec = "openai:dall-e-3";
  private textEmbeddingModelSpec = "openai:text-embedding-3-small";
  private templates = new Map<string, GenerationTemplate<any>>();
  private context!: PluginContext;

  onLoad(ctx: PluginContext) {
    this.context = ctx;
    this.context.core.registerLibrary(AiLib);
    ctx.registerCommand("talk", this.handleTalk.bind(this));
    ctx.registerCommand("gen", this.handleGen.bind(this));
    ctx.registerCommand("image", this.handleImage.bind(this));

    // Register default templates
    this.registerTemplate({
      description: "Generate an item",
      name: "item",
      prompt: (_ctx, instruction) => `
        You are a creative game master. Create an item based on the description: "${instruction}".
      `,
      schema: z.object({
        adjectives: z.array(z.string()),
        custom_css: z.string().optional(),
        description: z.string(),
        name: z.string(),
      }),
    });

    this.registerTemplate({
      description: "Generate a room",
      name: "room",
      prompt: (_ctx, instruction) => `
        You are a creative game master. Create a room based on the description: "${instruction}".
      `,
      schema: z.object({
        adjectives: z.array(z.string()),
        custom_css: z.string().optional(),
        description: z.string(),
        name: z.string(),
      }),
    });
    ctx.registerRpcMethod("ai_completion", this.handleCompletion.bind(this));
    ctx.registerRpcMethod("stream_talk", this.handleStreamTalk.bind(this));
  }

  registerTemplate(template: GenerationTemplate) {
    this.templates.set(template.name, template);
  }

  async handleCompletion(params: any) {
    const { code, position } = params; // position is { lineNumber, column }

    // Get opcode metadata to provide context about available functions
    const opcodes = this.context.core.getOpcodeMetadata();
    const functionSignatures = Object.values(opcodes)
      .map((op) => {
        const params = op.parameters
          ? op.parameters.map((parameter) => `${parameter.name}: ${parameter.type}`).join(", ")
          : "";
        return `${op.opcode}(${params}): ${op.returnType || "any"}`;
      })
      .join("\n");

    try {
      const model = getLanguageModel(this.modelSpec);

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
        prompt: prompt,
        schema: z.object({
          completion: z.string(),
        }),
      });

      return (data as any).completion;
    } catch (error: any) {
      console.error("AI Completion Error:", error);
      return;
    }
  }

  async handleTalk(ctx: CommandContext) {
    const [targetName, ...args] = ctx.args;
    const message = args.join(" ");

    if (!targetName || !message) {
      ctx.send("message", "Usage: talk <npc> <message>");
      return;
    }

    // Check room contents.
    const playerEntity = this.context.core.getEntity(ctx.player.id);
    if (!playerEntity || !playerEntity["location"]) {
      ctx.send("message", "You are nowhere.");
      return;
    }

    const roomItems = this.getResolvedRoom(playerEntity["location"] as number)?.contents;
    const target = roomItems?.find(
      (item) => (item["name"] as string)?.toLowerCase() === targetName.toLowerCase(),
    );

    if (!target) {
      ctx.send("message", `You don't see '${targetName}' here.`);
      return;
    }

    try {
      const systemPrompt = await this.buildSystemPrompt(target, message);

      const model = getLanguageModel(this.modelSpec);
      const { text } = await generateText({
        model,
        prompt: message,
        system: systemPrompt,
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

    const playerEntity = this.context.core.getEntity(ctx.player.id);
    if (!playerEntity || !playerEntity["location"]) {
      throw new Error("You are nowhere.");
    }

    const roomItems = this.getResolvedRoom(playerEntity["location"] as number)?.contents;
    const target = roomItems?.find(
      (item) => (item["name"] as string)?.toLowerCase() === targetName.toLowerCase(),
    );

    if (!target) {
      throw new Error(`You don't see '${targetName}' here.`);
    }

    try {
      const systemPrompt = await this.buildSystemPrompt(target, message);

      const model = getLanguageModel(this.modelSpec);
      const { textStream } = await streamText({
        model,
        prompt: message,
        system: systemPrompt,
      });

      const streamId = `stream-${Date.now()}`;
      ctx.send("stream_start", { streamId });
      ctx.send("stream_chunk", {
        chunk: `${target["name"]} says: "`,
        streamId,
      });

      for await (const textPart of textStream) {
        ctx.send("stream_chunk", { chunk: textPart, streamId });
      }

      ctx.send("stream_chunk", { chunk: `"`, streamId });
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
              .map((memory: any) => `- ${memory.content}`)
              .join("\n")}`;
          }
        } catch (error) {
          console.warn("Failed to fetch memories:", error);
        }
      }
    }
    return systemPrompt;
  }

  async handleGen(ctx: CommandContext) {
    const [templateName] = ctx.args;
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
      const model = getLanguageModel(this.modelSpec);

      const { object: data } = await generateObject({
        model,
        prompt: prompt,
        schema: template.schema,
      });

      const playerEntity = this.context.core.getEntity(ctx.player.id);
      if (!playerEntity || !playerEntity["location"]) {
        return;
      }

      if (templateName === "room") {
        // Create room and exit
        const newRoomId = this.context.core.createEntity({
          adjectives: data.adjectives,
          custom_css: data.custom_css,
          description: data.description,
          name: data.name,
        });
        const room = this.getResolvedRoom(newRoomId);
        if (room) {
          ctx.send("room_id", { roomId: room.id });
          ctx.send("message", `You are transported to ${data.name}.`);
        }
      } else {
        // Default: Create item in current room
        this.context.core.createEntity({
          adjectives: data.adjectives,
          custom_css: data.custom_css,
          description: data.description,
          location: playerEntity["location"],
          name: data.name,
        });
        const room = this.getResolvedRoom(playerEntity["location"] as number);
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
      const currentPlayer = this.context.core.getEntity(ctx.player.id);
      if (currentPlayer && currentPlayer["location"]) {
        const roomItems = this.getResolvedRoom(currentPlayer["location"] as number)?.contents;
        // Check if instruction starts with a target name
        // This is a bit fuzzy. The command is `image <args>`.
        // If args[0] is a target, we might want to use its prompt.

        const [possibleTargetName] = ctx.args;
        const target = roomItems?.find(
          (item) => (item["name"] as string)?.toLowerCase() === possibleTargetName?.toLowerCase(),
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

      const model = getImageModel(this.imageModelSpec);
      // oxlint-disable-next-line id-length
      const { image } = await experimental_generateImage({ model, n: 1, prompt: imagePrompt });

      const base64Data = image.base64;
      const buffer = Buffer.from(base64Data, "base64");
      const filename = `${Date.now()}-${Math.random().toString(36).slice(7)}.png`;
      const filepath = `apps/web/public/images/${filename}`;
      const publicUrl = `/images/${filename}`;

      await Bun.write(filepath, buffer);

      // Update current room or item

      // Re-parsing args for target
      const [targetName, ...args] = ctx.args;
      const prompt = args.slice(1).join(" ");

      if (!targetName || !prompt) {
        ctx.send("message", "Usage: image <target> <prompt>");
        return;
      }

      const playerEntity = this.context.core.getEntity(ctx.player.id);
      if (!playerEntity) {
        ctx.send("message", "You are nowhere.");
        return;
      }
      let targetId: number | null = null;
      if (targetName === "room" || targetName === "here") {
        targetId = playerEntity["location"] as number;
      } else {
        // Find item
        const roomItems = this.getResolvedRoom(playerEntity["location"] as number)?.contents;
        const item = roomItems?.find(
          (item) => (item["name"] as string).toLowerCase() === targetName.toLowerCase(),
        );
        if (item) {
          targetId = item.id;
        }
      }

      if (targetId) {
        const entity = this.context.core.getEntity(targetId);
        if (entity) {
          this.context.core.updateEntity({ ...entity, image: publicUrl });
          const room = {
            ...this.context.core.getEntity(playerEntity["location"] as number),
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

  getResolvedRoom(roomId: number) {
    const room = this.context.core.getEntity(roomId);
    if (!room) {
      return;
    }
    const resolved = this.context.core.resolveProps(room);
    const withContents = {
      ...resolved,
      contents: ((room["contents"] as number[]) ?? []).map((id) =>
        this.context.core.resolveProps(this.context.core.getEntity(id)!),
      ),
    };
    return withContents;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const model = getTextEmbeddingModel(this.textEmbeddingModelSpec);
    const { embedding } = await embed({ model, value: text });
    return embedding;
  }
}
