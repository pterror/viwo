import { addVerb, createEntity } from "../repo";
import { extractVerb } from "../verb_loader";
import { resolve } from "path";
import { transpile } from "@viwo/scripting";

const verbsPath = resolve(__dirname, "verbs.ts");

export function seedItems(locationId: number) {
  // 6. Book Item
  const bookId = createEntity({
    chapters: [
      { content: "Welcome to the world of Viwo.", title: "Introduction" },
      { content: "The beginning of the journey.", title: "Chapter 1" },
    ],
    description: "A dusty old book. It seems to have many chapters.",
    location: locationId,
    name: "Dusty Book",
  });

  addVerb(bookId, "read", transpile(extractVerb(verbsPath, "book_read")));

  addVerb(bookId, "list_chapters", transpile(extractVerb(verbsPath, "book_list_chapters")));

  addVerb(bookId, "add_chapter", transpile(extractVerb(verbsPath, "book_add_chapter")));

  addVerb(bookId, "search_chapters", transpile(extractVerb(verbsPath, "book_search_chapters")));
}
