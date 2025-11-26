import { z } from "zod";

// Helper for JSON Schema generation (if built-in, otherwise we might need to look for it)
// For now, let's define the schemas.

export const LookSchema = z.tuple([z.string().optional()]);
export const InventorySchema = z.tuple([]);
export const MoveSchema = z.tuple([z.string({ message: "Move where?" })]);

// For Dig, we want at least 2 arguments.
export const DigArgsSchema = z
  .array(z.string())
  .min(2, { message: "Usage: dig <direction> <room name>" });

export const CreateSchema = z.tuple([
  z.string({ message: "Usage: create <name> [props_json]" }),
  z.string().optional(), // props_json
]);

// For Set, we want at least 3 arguments.
export const SetArgsSchema = z
  .array(z.string())
  .min(3, { message: "Usage: set <target> <prop> <value>" });

export const LoginSchema = z.tuple([
  z.coerce.number({ message: "Invalid player ID." }),
]);

export const CreatePlayerSchema = z.tuple([
  z.string({ message: "Usage: create_player <name>" }),
]);

/**
 * Zod schemas for validating command arguments.
 * Keys are the command names.
 */
export const CommandSchemas = {
  look: LookSchema,
  inventory: InventorySchema,
  move: MoveSchema,
  go: MoveSchema,
  dig: DigArgsSchema,
  create: CreateSchema,
  set: SetArgsSchema,
  login: LoginSchema,
  create_player: CreatePlayerSchema,
};

export type CommandName = keyof typeof CommandSchemas;
