import {
  createOpcodeRegistry,
  StdLib,
  ListLib,
  ObjectLib,
  StringLib,
  TimeLib,
  MathLib,
  BooleanLib,
  ScriptOps,
} from "@viwo/scripting";
import * as CoreLib from "./lib/core";
import * as KernelLib from "./lib/kernel";

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
