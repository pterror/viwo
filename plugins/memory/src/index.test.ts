import { describe, it, expect, beforeEach, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { MemoryManager } from "./index";
import { AiPlugin } from "@viwo/plugin-ai";

// Mock AiPlugin
const mockAiPlugin = {
  getEmbedding: mock(async (text: string) => {
    // Simple deterministic embedding for testing
    // Just map characters to numbers and pad/truncate to 1536
    const embedding = Array.from({ length: 1536 }, () => 0);
    for (let i = 0; i < Math.min(text.length, 1536); i++) {
      embedding[i] = text.charCodeAt(i) / 255;
    }
    return embedding;
  }),
} as unknown as AiPlugin;

describe("MemoryManager", () => {
  let db: Database;
  let memoryManager: MemoryManager;

  beforeEach(() => {
    db = new Database(":memory:");
    memoryManager = new MemoryManager(db, mockAiPlugin);
  });

  it("should add a memory", async () => {
    const id = await memoryManager.add("Test memory");
    expect(id).toBe(1);

    const row = db.query("SELECT * FROM memories_content WHERE id = ?").get(id) as any;
    expect(row.content).toBe("Test memory");
  });

  it("should search memories", async () => {
    await memoryManager.add("Apple");
    await memoryManager.add("Banana");
    await memoryManager.add("Cherry");

    const results = await memoryManager.search("Apple", 1);
    expect(results.length).toBe(1);
    expect(results[0].content).toBe("Apple");
  });
});
