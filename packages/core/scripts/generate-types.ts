// oxlint-disable first
// Use in-memory DB
process.env.NODE_ENV = "test";
import {
  MathLib,
  BooleanLib,
  ListLib,
  ObjectLib,
  type OpcodeMetadata,
  StringLib,
  TimeLib,
  StdLib,
  generateTypeDefinitions,
} from "@viwo/scripting";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as CoreLib from "../src/runtime/lib/core";
import * as KernelLib from "../src/runtime/lib/kernel";

const libraries = [
  CoreLib,
  KernelLib,
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
  for (const value of Object.values(lib)) {
    opcodes.push(value.metadata);
  }
}

const definitions = generateTypeDefinitions(opcodes);
const outputPath = join(import.meta.dir, "../src/generated_types.ts");

writeFileSync(outputPath, definitions);
console.log(`Generated type definitions at ${outputPath}`);
