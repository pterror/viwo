import type { CommandContext, PluginContext } from "@viwo/core";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { AiPlugin } from "./index";

// Mock dependencies

const mockMemoryManager = {
  search: mock(() =>
    Promise.resolve([
      { content: "Memory 1", distance: 0.1 },
      { content: "Memory 2", distance: 0.2 },
    ]),
  ),
};

const mockMemoryPlugin = {
  memoryManager: mockMemoryManager,
  name: "memory",
};

const mockContext = {
  core: {
    getEntity: () => ({ id: 1, location: 2 }),
    registerLibrary: () => {},
  } as never,
  getPlugin: (name: string) => {
    if (name === "memory") {
      return mockMemoryPlugin;
    }
    return;
  },
  registerCommand: () => {},
  registerRpcMethod: () => {},
} as PluginContext;

// Mock 'ai' module
mock.module("ai", () => ({
  embed: mock(() => Promise.resolve({ embedding: [] })),
  generateObject: mock(() => Promise.resolve({ object: { completion: "mock" } })),
  generateText: mock(({ system, prompt }: any) =>
    Promise.resolve({ text: `Response to: ${prompt} with system: ${system}` }),
  ),
}));

describe("AiPlugin", () => {
  let aiPlugin: AiPlugin;

  beforeEach(() => {
    aiPlugin = new AiPlugin();
    aiPlugin.onLoad(mockContext);
  });

  it("should inject memories into system prompt", async () => {
    const ctx: CommandContext = {
      args: ["NPC", "Hello"],
      command: "talk",
      player: { id: 1, ws: null! },
      send: () => {},
    };

    // Mock room resolution
    spyOn(aiPlugin, "getResolvedRoom").mockReturnValue({
      contents: [
        {
          adjectives: ["friendly"],
          description: "A friendly NPC",
          id: 3,
          name: "NPC",
        },
      ],
      id: 2,
    } as any);

    await aiPlugin.handleTalk(ctx);

    // Verify memory search was called
    expect(mockMemoryManager.search).toHaveBeenCalledWith("Hello", {
      limit: 3,
    });

    // Verify generateText was called with memories in system prompt
    const { generateText } = await import("ai");
    expect(generateText).toHaveBeenCalled();
    const [[callArgs]] = (generateText as any).mock.calls;
    expect(callArgs.system).toContain("Relevant Memories:");
    expect(callArgs.system).toContain("- Memory 1");
    expect(callArgs.system).toContain("- Memory 2");
  });

  it("should stream response using stream_talk", async () => {
    const send = mock(() => {});
    const ctx: CommandContext = {
      args: [],
      command: "talk",
      player: { id: 1, ws: null! },
      send,
    };

    // Mock room resolution
    spyOn(aiPlugin, "getResolvedRoom").mockReturnValue({
      contents: [
        {
          adjectives: ["friendly"],
          description: "A friendly NPC",
          id: 3,
          name: "NPC",
        },
      ],
      id: 2,
    } as any);

    // Mock streamText
    const mockStreamText = mock(() =>
      Promise.resolve({
        // oxlint-disable-next-line consistent-function-scoping
        textStream: (async function* textStream() {
          yield "Hello";
          yield " world";
        })(),
      }),
    );
    mock.module("ai", () => ({
      embed: mock(() => Promise.resolve({ embedding: [] })),
      generateObject: mock(() => Promise.resolve({ object: { completion: "mock" } })),
      generateText: mock(() => Promise.resolve({ text: "mock" })),
      streamText: mockStreamText,
    }));

    await aiPlugin.handleStreamTalk({ message: "Hi", targetName: "NPC" }, ctx);

    // Verify streamText was called
    expect(mockStreamText).toHaveBeenCalled();

    // Verify notifications
    expect(send).toHaveBeenCalledWith("stream_start", expect.any(Object));
    expect(send).toHaveBeenCalledWith(
      "stream_chunk",
      expect.objectContaining({ chunk: 'NPC says: "' }),
    );
    expect(send).toHaveBeenCalledWith("stream_chunk", expect.objectContaining({ chunk: "Hello" }));
    expect(send).toHaveBeenCalledWith("stream_chunk", expect.objectContaining({ chunk: " world" }));
    expect(send).toHaveBeenCalledWith("stream_chunk", expect.objectContaining({ chunk: '"' }));
    expect(send).toHaveBeenCalledWith("stream_end", expect.any(Object));
  });
});
