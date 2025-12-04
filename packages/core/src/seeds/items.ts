import { createEntity, addVerb } from "../repo";
import { transpile } from "@viwo/scripting";
import { extractVerb } from "../verb_loader";
import { resolve } from "path";

const verbsPath = resolve(__dirname, "verbs.ts");

export function seedItems(locationId: number) {
  // 6. Book Item
  const bookId = createEntity({
    name: "Dusty Book",
    location: locationId,
    description: "A dusty old book. It seems to have many chapters.",
    chapters: [
      { title: "Introduction", content: "Welcome to the world of Viwo." },
      { title: "Chapter 1", content: "The beginning of the journey." },
    ],
  });

  addVerb(bookId, "read", transpile(extractVerb(verbsPath, "book_read")));

  addVerb(bookId, "list_chapters", transpile(extractVerb(verbsPath, "book_list_chapters")));

  addVerb(bookId, "add_chapter", transpile(extractVerb(verbsPath, "book_add_chapter")));

  addVerb(bookId, "search_chapters", transpile(extractVerb(verbsPath, "book_search_chapters")));
}
