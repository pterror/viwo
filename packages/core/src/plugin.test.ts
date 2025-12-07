import { type CommandContext, type Plugin, PluginManager } from "./plugin";
import { describe, expect, mock, test } from "bun:test";

describe("PluginManager", () => {
  test("Load Plugin and Register Command", async () => {
    const manager = new PluginManager({} as never);
    const handler = mock(() => {});

    const testPlugin: Plugin = {
      name: "TestPlugin",
      onLoad: (ctx) => {
        ctx.registerCommand("test", handler);
      },
      version: "1.0.0",
    };

    await manager.loadPlugin(testPlugin);

    const cmdCtx: CommandContext = {
      args: [],
      command: "test",
      player: { id: 1, ws: {} as any },
      send: () => {},
    };

    const handled = await manager.handleCommand(cmdCtx);
    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalledWith(cmdCtx);
  });

  test("Handle Unknown Command", async () => {
    const manager = new PluginManager({} as never);
    const cmdCtx: CommandContext = {
      args: [],
      command: "unknown",
      player: { id: 1, ws: {} as any },
      send: () => {},
    };

    const handled = await manager.handleCommand(cmdCtx);
    expect(handled).toBe(false);
  });

  test("Register and Handle RPC Method", async () => {
    const manager = new PluginManager({} as never);
    const handler = mock((params: any) => Promise.resolve({ result: params.value * 2 }));

    const testPlugin: Plugin = {
      name: "RpcPlugin",
      onLoad: (ctx) => {
        ctx.registerRpcMethod("double", handler);
      },
      version: "1.0.0",
    };

    await manager.loadPlugin(testPlugin);

    const cmdCtx: CommandContext = {
      args: [],
      command: "rpc",
      player: { id: 1, ws: {} as any },
      send: () => {},
    };

    const result = await manager.handleRpcMethod("double", { value: 21 }, cmdCtx);
    expect(result).toEqual({ result: 42 });
    expect(handler).toHaveBeenCalledWith({ value: 21 }, cmdCtx);
  });
});
