import { Plugin, PluginContext, CommandContext } from "@viwo/core";
import { VectorDatabase } from "@viwo/plugin-vector";
import type { AiPlugin } from "@viwo/plugin-ai";
import { Database } from "bun:sqlite";

export class MemoryManager {
  private vectorDb: VectorDatabase;
  private aiPlugin: AiPlugin;
  private db: Database;

  constructor(db: Database, aiPlugin: AiPlugin) {
    this.db = db;
    this.vectorDb = new VectorDatabase(db);
    this.aiPlugin = aiPlugin;

    // Create tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS memories_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);

    this.vectorDb.createTable("memories_vec", 1536); // openai:text-embedding-3-small dimension
  }

  async add(content: string, metadata: any = {}) {
    // 1. Generate embedding
    const embedding = await this.aiPlugin.getEmbedding(content);

    // 2. Insert content
    const stmt = this.db.prepare("INSERT INTO memories_content (content, metadata) VALUES (?, ?)");
    const result = stmt.run(content, JSON.stringify(metadata));
    const rowId = result.lastInsertRowid as number;

    // 3. Insert vector
    this.vectorDb.insert("memories_vec", rowId, embedding);

    return rowId;
  }

  async search(query: string, options: { limit?: number; filter?: Record<string, any> } = {}) {
    const limit = options.limit || 5;
    const filter = options.filter || {};

    // 1. Generate embedding for query
    const embedding = await this.aiPlugin.getEmbedding(query);

    // 2. Search vector db
    // We fetch more candidates to allow for filtering
    const candidateLimit = limit * 10;
    const results = this.vectorDb.search("memories_vec", embedding, candidateLimit);

    // 3. Retrieve content and filter
    const memories = [];
    for (const res of results) {
      if (memories.length >= limit) break;

      const row = this.db
        .query("SELECT * FROM memories_content WHERE id = ?")
        .get(res.rowid) as any;

      if (!row) continue;

      const metadata = JSON.parse(row.metadata ?? "{}");

      // Check filter
      let match = true;
      for (const [key, value] of Object.entries(filter)) {
        if (metadata[key] !== value) {
          match = false;
          break;
        }
      }

      if (match) {
        memories.push({ ...row, metadata, distance: res.distance });
      }
    }

    return memories;
  }
}

export class MemoryPlugin implements Plugin {
  name = "memory";
  version = "0.1.0";
  private db: Database;
  public memoryManager?: MemoryManager;

  constructor() {
    this.db = new Database("memory.sqlite");
  }

  onLoad(ctx: PluginContext) {
    const aiPlugin = ctx.getPlugin("ai") as AiPlugin | undefined;
    if (!aiPlugin) {
      console.error("MemoryPlugin requires AiPlugin to be loaded.");
      return;
    }

    this.memoryManager = new MemoryManager(this.db, aiPlugin);

    ctx.registerCommand("memory", this.handleMemoryCommand.bind(this));
  }

  async handleMemoryCommand(ctx: CommandContext) {
    const subcommand = ctx.args[0];
    let content = "";
    let metadata: Record<string, any> = {};

    // Parse args:
    // memory add "content" { metadata }
    // memory search "query" { filter }

    // Check if last arg is an object (metadata/filter)
    const lastArg = ctx.args[ctx.args.length - 1];
    const hasMetadata = typeof lastArg === "object" && lastArg !== null && !Array.isArray(lastArg);

    if (hasMetadata) {
      metadata = lastArg;
      // Content is everything between subcommand and metadata
      content = ctx.args.slice(1, -1).join(" ");
    } else {
      content = ctx.args.slice(1).join(" ");
    }

    if (!this.memoryManager) {
      ctx.send("error", "Memory manager not initialized.");
      return;
    }

    if (subcommand === "add") {
      if (!content) {
        ctx.send("message", "Usage: memory add <content> [metadata]");
        return;
      }
      try {
        const id = await this.memoryManager.add(content, metadata);
        ctx.send("message", `Memory added with ID: ${id}`);
      } catch (e: any) {
        ctx.send("error", `Failed to add memory: ${e.message}`);
      }
    } else if (subcommand === "search") {
      if (!content) {
        ctx.send("message", "Usage: memory search <query> [filter]");
        return;
      }
      try {
        const results = await this.memoryManager.search(content, {
          filter: metadata,
        });
        if (results.length === 0) {
          ctx.send("message", "No memories found.");
        } else {
          const response = results
            .map((m: any) => `[${m.id}] (${m.distance.toFixed(4)}) ${m.content}`)
            .join("\n");
          ctx.send("message", `Found memories:\n${response}`);
        }
      } catch (e: any) {
        ctx.send("error", `Failed to search memories: ${e.message}`);
      }
    } else {
      ctx.send("message", "Usage: memory <add|search> <content> [metadata]");
    }
  }
}
