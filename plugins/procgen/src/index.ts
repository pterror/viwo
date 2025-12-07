import * as ProcGenLib from "./lib";
import type { Plugin, PluginContext } from "@viwo/core";

export class ProcGenPlugin implements Plugin {
  name = "procgen";
  version = "0.1.0";

  onLoad(ctx: PluginContext) {
    ctx.core.registerLibrary(ProcGenLib);
  }
}
