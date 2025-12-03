import { createEntity, addVerb } from "../repo";
import {
  StdLib,
  StringLib,
  ObjectLib,
  ListLib,
  BooleanLib,
} from "@viwo/scripting";
import * as CoreLib from "../runtime/lib/core";

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
    StdLib.seq(
      StdLib.let("index", StdLib.arg(0)),
      StdLib.if(
        BooleanLib.not(StdLib.var("index")),
        StdLib.throw("Please specify a chapter index (0-based)."),
      ),
      StdLib.let("chapters", ObjectLib.objGet(StdLib.this(), "chapters")),
      StdLib.let(
        "chapter",
        ListLib.listGet(StdLib.var("chapters"), StdLib.var("index")),
      ),
      StdLib.if(
        BooleanLib.not(StdLib.var("chapter")),
        StdLib.throw("Chapter not found."),
      ),
      CoreLib.call(
        StdLib.caller(),
        "tell",
        StringLib.strConcat(
          "Reading: ",
          ObjectLib.objGet(StdLib.var("chapter"), "title"),
          "\n\n",
          ObjectLib.objGet(StdLib.var("chapter"), "content"),
        ),
      ),
    ),
  );

  addVerb(
    bookId,
    "list_chapters",
    StdLib.seq(
      StdLib.let("chapters", ObjectLib.objGet(StdLib.this(), "chapters")),
      CoreLib.call(
        StdLib.caller(),
        "tell",
        StringLib.strConcat(
          "Chapters:\n",
          StringLib.strJoin(
            ListLib.listMap(
              StdLib.var("chapters"),
              StdLib.lambda(["c"], ObjectLib.objGet(StdLib.var("c"), "title")),
            ),
            "\n",
          ),
        ),
      ),
    ),
  );

  addVerb(
    bookId,
    "add_chapter",
    StdLib.seq(
      StdLib.let("title", StdLib.arg(0)),
      StdLib.let("content", StdLib.arg(1)),
      StdLib.if(
        BooleanLib.not(
          BooleanLib.and(StdLib.var("title"), StdLib.var("content")),
        ),
        StdLib.throw("Usage: add_chapter <title> <content>"),
      ),
      StdLib.let("chapters", ObjectLib.objGet(StdLib.this(), "chapters")),

      // Construct new chapter object
      StdLib.let("newChapter", {}),
      ObjectLib.objSet(StdLib.var("newChapter"), "title", StdLib.var("title")),
      ObjectLib.objSet(
        StdLib.var("newChapter"),
        "content",
        StdLib.var("content"),
      ),

      ListLib.listPush(StdLib.var("chapters"), StdLib.var("newChapter")),
      ObjectLib.objSet(StdLib.this(), "chapters", StdLib.var("chapters")), // Save back to entity
      CoreLib.call(StdLib.caller(), "tell", "Chapter added."),
    ),
  );

  addVerb(
    bookId,
    "search_chapters",
    StdLib.seq(
      StdLib.let("query", StringLib.strLower(StdLib.arg(0))),
      StdLib.let("chapters", ObjectLib.objGet(StdLib.this(), "chapters")),
      StdLib.let(
        "results",
        ListLib.listFilter(
          StdLib.var("chapters"),
          StdLib.lambda(
            ["c"],
            BooleanLib.or(
              StringLib.strIncludes(
                StringLib.strLower(ObjectLib.objGet(StdLib.var("c"), "title")),
                StdLib.var("query"),
              ),
              StringLib.strIncludes(
                StringLib.strLower(ObjectLib.objGet(StdLib.var("c"), "title")),
                StdLib.var("query"),
              ),
              StringLib.strIncludes(
                StringLib.strLower(
                  ObjectLib.objGet(StdLib.var("c"), "content"),
                ),
                StdLib.var("query"),
              ),
            ),
          ),
        ),
      ),
      CoreLib.call(
        StdLib.caller(),
        "tell",
        StringLib.strConcat(
          "Found ",
          ListLib.listLen(StdLib.var("results")),
          " matches:\n",
          StringLib.strJoin(
            ListLib.listMap(
              StdLib.var("results"),
              StdLib.lambda(["c"], ObjectLib.objGet(StdLib.var("c"), "title")),
            ),
            "\n",
          ),
        ),
      ),
    ),
  );
}
