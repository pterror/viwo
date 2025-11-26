export type BlockType = "container" | "statement" | "expression";

export interface BlockDefinition {
  type: BlockType;
  label: string;
  opcode: string; // The actual JSON op, e.g. "if", "set", "+"
  category: "logic" | "action" | "math" | "data";
  // For containers/statements, what slots do they have?
  slots?: {
    name: string;
    type: "block" | "string" | "number" | "boolean";
    default?: any;
  }[];
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // Logic
  {
    type: "container",
    label: "If",
    opcode: "if",
    category: "logic",
    slots: [
      { name: "Condition", type: "block" },
      { name: "Then", type: "block" },
      { name: "Else", type: "block" },
    ],
  },
  {
    type: "container",
    label: "Sequence",
    opcode: "seq",
    category: "logic",
    slots: [], // Special handling: infinite children
  },
  {
    type: "expression",
    label: "Equals",
    opcode: "==",
    category: "logic",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },
  {
    type: "expression",
    label: "Not",
    opcode: "not",
    category: "logic",
    slots: [{ name: "Val", type: "block" }],
  },

  // Actions
  {
    type: "statement",
    label: "Set",
    opcode: "set",
    category: "action",
    slots: [
      { name: "Target", type: "block", default: "this" },
      { name: "Key", type: "string" },
      { name: "Value", type: "block" },
    ],
  },
  {
    type: "statement",
    label: "Tell",
    opcode: "tell",
    category: "action",
    slots: [
      { name: "Target", type: "block", default: "caller" },
      { name: "Message", type: "string" },
    ],
  },

  // Math
  {
    type: "expression",
    label: "Add",
    opcode: "+",
    category: "math",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },
  {
    type: "expression",
    label: "Sub",
    opcode: "-",
    category: "math",
    slots: [
      { name: "A", type: "block" },
      { name: "B", type: "block" },
    ],
  },

  // Data
  {
    type: "expression",
    label: "Prop",
    opcode: "prop",
    category: "data",
    slots: [
      { name: "Target", type: "block" },
      { name: "Key", type: "string" },
    ],
  },
  {
    type: "expression",
    label: "String",
    opcode: "string",
    category: "data",
    slots: [{ name: "Val", type: "string" }],
  },
  {
    type: "expression",
    label: "Number",
    opcode: "number",
    category: "data",
    slots: [{ name: "Val", type: "number" }],
  },
  {
    type: "expression",
    label: "Boolean",
    opcode: "boolean",
    category: "data",
    slots: [{ name: "Val", type: "boolean" }],
  },
];
