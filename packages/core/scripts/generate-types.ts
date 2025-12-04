// Use in-memory DB
process.env.NODE_ENV = "test";
import { generateTypeDefinitions } from "@viwo/scripting";
import * as CoreLib from "../src/runtime/lib/core";
import * as KernelLib from "../src/runtime/lib/kernel";
import * as FsLib from "../src/runtime/lib/fs";
import * as NetLib from "../src/runtime/lib/net";
import {
  MathLib,
  BooleanLib,
  ListLib,
  ObjectLib,
  StringLib,
  TimeLib,
  StdLib,
  OpcodeMetadata,
} from "@viwo/scripting";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const libraries = [
  CoreLib,
  KernelLib,
  FsLib,
  NetLib,
  MathLib,
  BooleanLib,
  ListLib,
  ObjectLib,
  StringLib,
  TimeLib,
  StdLib,
];

const opcodes: OpcodeMetadata[] = [];

for (const lib of libraries) {
  for (const key in lib) {
    const value = (lib as any)[key];
    if (value && typeof value === "function" && "metadata" in value) {
      opcodes.push(value.metadata);
    }
  }
}

const definitions = generateTypeDefinitions(opcodes);
const outputPath = join(import.meta.dir, "../src/types.ts");

writeFileSync(outputPath, definitions);
console.log(`Generated type definitions at ${outputPath}`);
