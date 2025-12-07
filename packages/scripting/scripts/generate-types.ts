import * as BooleanLib from "../src/lib/boolean";
import * as ListLib from "../src/lib/list";
import * as MathLib from "../src/lib/math";
import * as ObjectLib from "../src/lib/object";
import * as StdLib from "../src/lib/std";
import * as StringLib from "../src/lib/string";
import * as TimeLib from "../src/lib/time";
import type { OpcodeMetadata } from "../src/types";
import { generateTypeDefinitions } from "../src/type_generator";
import { join } from "node:path";
import { writeFileSync } from "node:fs";

const libraries = [MathLib, BooleanLib, ListLib, ObjectLib, StringLib, TimeLib, StdLib];

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
