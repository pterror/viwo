import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const args = process.argv.slice(2);
const [command] = args;

const CORE_PATH = join(process.cwd(), "../../packages/core");
const DB_PATH = join(CORE_PATH, "world.sqlite");
const BACKUP_DIR = join(process.cwd(), "../../backups");

if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

function main() {
  switch (command) {
    case "backup": {
      if (!existsSync(DB_PATH)) {
        console.error("Database not found at", DB_PATH);
        process.exit(1);
      }
      const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
      const backupPath = join(BACKUP_DIR, `world-${timestamp}.sqlite`);
      copyFileSync(DB_PATH, backupPath);
      console.log(`Backup created at ${backupPath}`);
      break;
    }
    case "restore": {
      const [, backupFile] = args;
      if (!backupFile) {
        console.error("Usage: restore <backup_file_name_or_path>");
        process.exit(1);
      }

      let sourcePath = backupFile;
      // If just a filename is provided, look in backups dir
      if (!backupFile.includes("/")) {
        sourcePath = join(BACKUP_DIR, backupFile);
      }

      if (!existsSync(sourcePath)) {
        console.error("Backup file not found at", sourcePath);
        process.exit(1);
      }

      copyFileSync(sourcePath, DB_PATH);
      console.log(`Database restored from ${sourcePath}`);
      break;
    }
    default: {
      console.log("Usage: viwo-cli <command>");
      console.log("Commands:");
      console.log("  backup   - Create a backup of the world database");
      console.log("  restore  - Restore the world database from a backup");
      break;
    }
  }
}

main();
