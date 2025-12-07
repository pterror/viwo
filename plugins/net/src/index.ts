import * as NetLib from "./lib";
import type { Plugin, PluginContext } from "@viwo/core";

export class NetPlugin implements Plugin {
  name = "net";
  version = "0.1.0";

  onLoad(ctx: PluginContext) {
    ctx.core.registerLibrary(NetLib);
  }
}
