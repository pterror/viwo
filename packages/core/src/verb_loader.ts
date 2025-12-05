import { readFileSync } from "fs";

export function extractVerb(filePath: string, verbName: string): string {
  const content = readFileSync(filePath, "utf-8");

  // Find start of function: export function verbName(...) {
  const startRegex = new RegExp(`^export function ${verbName}\\s*\\(.*\\)\\s*\\{`, "m");
  const startMatch = content.match(startRegex);

  if (!startMatch) {
    throw new Error(`Verb ${verbName} not found in ${filePath}`);
  }

  const startIndex = startMatch.index! + startMatch[0].length;

  // Find end of function: } on its own line
  // We search starting from the end of the start match
  const endRegex = new RegExp(`^\\}$`, "m");
  // We need to slice the content to search from startIndex
  const remainingContent = content.slice(startIndex);
  const endMatch = remainingContent.match(endRegex);

  if (!endMatch) {
    throw new Error(`Could not find end of function body for verb ${verbName}`);
  }

  // The body is between startIndex and (startIndex + endMatch.index)
  return remainingContent.slice(0, endMatch.index).trim();
}
