import { generateTypeDefinitions } from "../src/type_generator";
import * as MathLib from "../src/lib/math";
import * as BooleanLib from "../src/lib/boolean";
import * as ListLib from "../src/lib/list";
import * as ObjectLib from "../src/lib/object";
import * as StringLib from "../src/lib/string";
import * as TimeLib from "../src/lib/time";
import * as StdLib from "../src/lib/std";
import { OpcodeMetadata } from "../src/interpreter";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const libraries = [MathLib, BooleanLib, ListLib, ObjectLib, StringLib, TimeLib, StdLib];

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
const outputPath = join(import.meta.dir, "../src/generated_types.ts");

writeFileSync(outputPath, definitions);
console.log(`Generated type definitions at ${outputPath}`);
