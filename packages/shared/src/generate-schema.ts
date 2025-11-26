import { toJSONSchema, z } from "zod";
import { CommandSchemas } from "./commands";
import * as fs from "fs";
import * as path from "path";

// Create a schema for each command: [ "commandName", ...args ]
const protocolSchemas = Object.entries(CommandSchemas).map(([name, schema]) => {
  // schema is a ZodTuple or ZodArray
  // We want to prepend the command literal to it.

  // If it's a tuple, we can reconstruct it.
  if (schema instanceof z.ZodTuple) {
    // Access items safely (Zod 4 internal structure might vary)
    const items = (schema as any).items || (schema as any)._def.items;
    const rest = (schema as any)._def.rest || z.unknown();
    return z.tuple([z.literal(name), ...items]).rest(rest);
  }
  // If it's an array (like DigArgsSchema), it's variable length.
  // [ "dig", ...string[] ]
  if (schema instanceof z.ZodArray) {
    // Zod 4 might handle this differently, but conceptually:
    return z.tuple([z.literal(name)]).rest(schema.element);
  }

  // Fallback
  return z.tuple([z.literal(name)]).rest(z.unknown());
});

const fullProtocolSchema = z.union(protocolSchemas as any);

const jsonSchema = toJSONSchema(fullProtocolSchema);

const outputPath = path.join(process.cwd(), "commands.schema.json");
fs.writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2));
console.log(`JSON Schema written to ${outputPath}`);
