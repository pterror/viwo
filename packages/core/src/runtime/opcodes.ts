import * as CoreLib from "./lib/core";
import * as KernelLib from "./lib/kernel";
import {
  BooleanLib,
  ListLib,
  MathLib,
  ObjectLib,
  type ScriptOps,
  StdLib,
  StringLib,
  TimeLib,
  createOpcodeRegistry,
} from "@viwo/scripting";

export const GameOpcodes = createOpcodeRegistry(
  StdLib,
  CoreLib,
  KernelLib,
  ListLib,
  ObjectLib,
  StringLib,
  TimeLib,
  MathLib,
  BooleanLib,
);

export function registerGameLibrary(lib: ScriptOps) {
  Object.assign(GameOpcodes, lib);
}
