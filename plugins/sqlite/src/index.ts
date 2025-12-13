import * as SqliteLib from "./lib";
import type { Plugin, PluginContext } from "@viwo/core";

export class SqlitePlugin implements Plugin {
  name = "sqlite";
  version = "0.1.0";

  onLoad(ctx: PluginContext) {
    ctx.core.registerLibrary(SqliteLib);
  }
}
