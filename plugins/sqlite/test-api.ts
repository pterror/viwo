import { Database } from "bun:sqlite";

const db = new Database(":memory:");
db.run("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)");

const stmt = db.prepare("INSERT INTO test (name) VALUES (?)");
const result = stmt.run("Alice");

console.log("Statement.run() result:", result);
console.log("Type:", typeof result);
console.log("Keys:", Object.keys(result || {}));

// Try with direct run
const result2 = db.run("INSERT INTO test (name) VALUES ('Bob')");
console.log("\ndb.run() result:", result2);
console.log("Type:", typeof result2);

db.close();
