import { Plugin, PluginContext } from "@viwo/core";
import * as ProcGenLib from "./lib";

export class ProcGenPlugin implements Plugin {
  name = "procgen";
  version = "0.1.0";

  onLoad(ctx: PluginContext) {
    ctx.core.registerLibrary(ProcGenLib);
  }
}
