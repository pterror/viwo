import { createEntity, addVerb } from "../repo";
import { transpile } from "@viwo/scripting";

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

  addVerb(
    bookId,
    "read",
    transpile(`
      const index = arg(0);
      if (!index) throw "Please specify a chapter index (0-based).";
      const chapters = obj.get(this_(), "chapters");
      const chapter = list.get(chapters, index);
      if (!chapter) throw "Chapter not found.";
      call(caller(), "tell", str.concat(
        "Reading: ",
        obj.get(chapter, "title"),
        "\\n\\n",
        obj.get(chapter, "content")
      ));
    `),
  );

  addVerb(
    bookId,
    "list_chapters",
    transpile(`
      const chapters = obj.get(this_(), "chapters");
      call(caller(), "tell", str.concat(
        "Chapters:\\n",
        str.join(
          list.map(chapters, (c) => obj.get(c, "title")),
          "\\n"
        )
      ));
    `),
  );

  addVerb(
    bookId,
    "add_chapter",
    transpile(`
      const title = arg(0);
      const content = arg(1);
      if (!title || !content) throw "Usage: add_chapter <title> <content>";
      const chapters = obj.get(this_(), "chapters");
      const newChapter = {};
      obj.set(newChapter, "title", title);
      obj.set(newChapter, "content", content);
      list.push(chapters, newChapter);
      obj.set(this_(), "chapters", chapters);
      call(caller(), "tell", "Chapter added.");
    `),
  );

  addVerb(
    bookId,
    "search_chapters",
    transpile(`
      const query = str.lower(arg(0));
      const chapters = obj.get(this_(), "chapters");
      const results = list.filter(chapters, (c) => {
        return str.includes(str.lower(obj.get(c, "title")), query) ||
               str.includes(str.lower(obj.get(c, "content")), query);
      });
      call(caller(), "tell", str.concat(
        "Found ",
        list.len(results),
        " matches:\\n",
        str.join(
          list.map(results, (c) => obj.get(c, "title")),
          "\\n"
        )
      ));
    `),
  );
}
