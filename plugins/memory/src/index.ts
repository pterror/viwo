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

  async search(query: string, limit: number = 5) {
    // 1. Generate embedding for query
    const embedding = await this.aiPlugin.getEmbedding(query);

    // 2. Search vector db
    const results = this.vectorDb.search("memories_vec", embedding, limit);

    // 3. Retrieve content
    const memories = results.map((res) => {
      const row = this.db
        .query("SELECT * FROM memories_content WHERE id = ?")
        .get(res.rowid) as any;
      return {
        ...row,
        metadata: JSON.parse(row.metadata || "{}"),
        distance: res.distance,
      };
    });

    return memories;
  }
}

export class MemoryPlugin implements Plugin {
  name = "memory";
  version = "0.1.0";
  private db: Database;
  private memoryManager?: MemoryManager;

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
    const content = ctx.args.slice(1).join(" ");

    if (!this.memoryManager) {
      ctx.send("error", "Memory manager not initialized.");
      return;
    }

    if (subcommand === "add") {
      if (!content) {
        ctx.send("message", "Usage: memory add <content>");
        return;
      }
      try {
        const id = await this.memoryManager.add(content);
        ctx.send("message", `Memory added with ID: ${id}`);
      } catch (e: any) {
        ctx.send("error", `Failed to add memory: ${e.message}`);
      }
    } else if (subcommand === "search") {
      if (!content) {
        ctx.send("message", "Usage: memory search <query>");
        return;
      }
      try {
        const results = await this.memoryManager.search(content);
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
      ctx.send("message", "Usage: memory <add|search> <content>");
    }
  }
}
