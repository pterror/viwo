import * as DiffusersLib from "./lib";
import type { Plugin, PluginContext } from "@viwo/core";

export class DiffusersPlugin implements Plugin {
  name = "diffusers";
  version = "0.1.0";

  onLoad(ctx: PluginContext) {
    ctx.core.registerLibrary(DiffusersLib);
  }
}
