import { Database } from "bun:sqlite";

const db = new Database(":memory:");

db.query("CREATE TABLE entities (id INTEGER PRIMARY KEY, props TEXT)").run();

const insert = (id: number, props: any) => {
  db.query("INSERT INTO entities (id, props) VALUES (?, ?)").run(id, JSON.stringify(props));
};

insert(1, { name: "Root" });
insert(2, { name: "Child1", location: 1 });
insert(3, { name: "Child2", location: 1, other_ref: 2 });
insert(4, { name: "Grandchild", location: 2 });

console.log("--- Children of 1 (Location = 1) ---");
const children = db
  .query("SELECT * FROM entities WHERE json_extract(props, '$.location') = 1")
  .all();
console.log(children);

console.log("--- Backlinks to 2 (Any prop = 2) ---");
// Note: json_tree recursively walks the JSON
const backlinks = db
  .query(
    `
  SELECT DISTINCT entities.* 
  FROM entities, json_tree(entities.props) 
  WHERE json_tree.value = 2
`,
  )
  .all();
console.log(backlinks);

console.log("--- Parents of 4 (Location of 4) ---");
const entity4 = db.query("SELECT props FROM entities WHERE id = 4").get() as any;
const props4 = JSON.parse(entity4.props);
console.log("Location:", props4.location);
