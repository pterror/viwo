import { join, resolve } from "node:path";
import { readFile, readdir } from "node:fs/promises";

const VERBS_FILE = resolve(__dirname, "../src/seeds/verbs.ts");
const SEARCH_DIR = resolve(__dirname, "../src");

async function getExportedVerbs(filePath: string): Promise<string[]> {
  const content = await readFile(filePath, "utf8");
  const regex = /export\s+function\s+(\w+)/g;
  const verbs: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    verbs.push(match[1]!);
  }
  return verbs;
}

async function getFiles(dir: string): Promise<string[]> {
  const dirents = await readdir(dir, { withFileTypes: true });
  const tasks = dirents.map(async (dirent) => {
    const res = join(dir, dirent.name);
    return dirent.isDirectory() ? await getFiles(res) : [res];
  });
  const results = await Promise.all(tasks);
  return results.flat();
}

async function main() {
  console.log("Checking for unused verbs...");

  const verbs = await getExportedVerbs(VERBS_FILE);
  console.log(`Found ${verbs.length} exported verbs.`);

  const allFiles = await getFiles(SEARCH_DIR);
  // Exclude the verbs definition file itself and test files if desired,
  // though usage in tests count as usage.
  // Excluding verbs.ts is critical to avoid self-match.
  const searchFiles = allFiles.filter((file) => file !== VERBS_FILE && !file.endsWith(".d.ts"));

  console.log(`Scanning ${searchFiles.length} files for usages...`);

  const fileContents = await Promise.all(searchFiles.map((file) => readFile(file, "utf8")));
  const combinedContent = fileContents.join("\n");

  const unusedVerbs: string[] = [];

  for (const verb of verbs) {
    // Simple heuristic: check if the verb name (quoted or not) appears in the combined content.
    // We strictly look for the name.
    // Since inside verbs.ts they are defined, they appear there.
    // We search in filenames excluding verbs.ts.

    // We need to be careful about not matching substrings of other words if possible,
    // but the user asked for "basic regex heuristics".
    // A reasonably safe check is looking for the exact string.

    // However, since we concat all files, a simple includes might hit false positives easily
    // if a verb name is a common word like "create" or "get".
    // But `extractVerb(..., "verb_name")` is the usage pattern.
    // So looking for the string "verb_name" involves the quotes?
    // Or sometimes it might be used as `verbs.verb_name` if imported directly?
    // Let's rely on finding the Exact Name.

    // To reduce false positives with common words, we could look for boundary characters?
    // /\bverbName\b/

    const regex = new RegExp(`\\b${verb}\\b`);
    if (!regex.test(combinedContent)) {
      unusedVerbs.push(verb);
    }
  }

  if (unusedVerbs.length > 0) {
    console.error(`Found ${unusedVerbs.length} unused verbs:`);
    for (const verb of unusedVerbs) {
      console.error(`- ${verb}`);
    }
    process.exit(1);
  } else {
    console.log("All verbs are used!");
  }
}

await main().catch((error) => {
  console.error(error);
  process.exit(1);
});
