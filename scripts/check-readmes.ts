import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const rootDir = process.cwd();

const mappings = [
  { docs: "docs/apps", source: "apps" },
  { docs: "docs/packages", source: "packages" },
  { docs: "docs/plugins", source: "plugins" },
];

const missingFiles: string[] = [];

function checkReadme(dir: string) {
  const readmePath = join(dir, "README.md");
  if (!existsSync(readmePath)) {
    missingFiles.push(relative(rootDir, readmePath));
  }
}

function checkDoc(docDir: string, name: string) {
  const docPath = join(docDir, `${name}.md`);
  if (!existsSync(docPath)) {
    missingFiles.push(relative(rootDir, docPath));
  }
}

console.log("Checking READMEs and Docs...");

for (const { source, docs } of mappings) {
  const sourceDir = join(rootDir, source);
  const docsDir = join(rootDir, docs);

  if (!existsSync(sourceDir)) {
    continue;
  }

  const items = readdirSync(sourceDir);

  for (const item of items) {
    const itemPath = join(sourceDir, item);
    // Skip hidden files/dirs
    if (item.startsWith(".")) {
      continue;
    }

    if (statSync(itemPath).isDirectory()) {
      // Check source README
      checkReadme(itemPath);

      // Check doc file
      checkDoc(docsDir, item);
    }
  }
}

if (missingFiles.length > 0) {
  console.error("\u001B[31mError: The following files are missing:\u001B[0m");
  missingFiles.forEach((file) => console.error(` - ${file}`));
  process.exit(1);
}

console.log("\u001B[32mAll checks passed.\u001B[0m");
