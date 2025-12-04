import { readFileSync } from "fs";

export function extractVerb(filePath: string, verbName: string): string {
  const content = readFileSync(filePath, "utf-8");
  const startMarker = `// @verb ${verbName}`;
  const endMarker = `// @endverb`;

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker, startIndex + startMarker.length);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`Verb ${verbName} not found in ${filePath}`);
  }

  const body = content.substring(startIndex + startMarker.length, endIndex).trim();

  // Extract the function body (content between the first { and last })
  const openBrace = body.indexOf("{");
  const closeBrace = body.lastIndexOf("}");

  if (openBrace === -1) {
    throw new Error(`Could not find start of function body for verb ${verbName}`);
  }

  if (closeBrace === -1) {
    throw new Error(`Could not find end of function body for verb ${verbName}`);
  }

  return body.substring(openBrace + 1, closeBrace).trim();
}
