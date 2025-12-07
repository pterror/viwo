import * as FsLib from "./lib";
import type { Plugin, PluginContext } from "@viwo/core";

export class FsPlugin implements Plugin {
  name = "fs";
  version = "0.1.0";

  onLoad(ctx: PluginContext) {
    ctx.core.registerLibrary(FsLib);
  }
}
