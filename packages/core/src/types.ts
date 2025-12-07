import type { Entity } from "@viwo/shared/jsonrpc";
import type { OpcodeMetadata } from "@viwo/scripting";

export interface CoreInterface {
  getEntity: (id: number) => Entity | null;
  createEntity: (data: Record<string, unknown>) => number;
  updateEntity: (entity: Entity) => void;
  deleteEntity: (id: number) => void;
  resolveProps: (entity: Entity) => Entity;
  getOpcodeMetadata: () => Record<string, OpcodeMetadata>;
  getOnlinePlayers: () => number[];
  registerLibrary: (library: Record<string, any>) => void;
}
