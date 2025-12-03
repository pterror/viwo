import { describe, it, expect, beforeEach } from "bun:test";
import {
  createScriptContext,
  evaluate,
  registerLibrary,
  StdLib,
  ListLib,
  StringLib,
  ObjectLib,
  BooleanLib,
} from "@viwo/scripting";
import { Entity } from "@viwo/shared/jsonrpc";
import { addVerb, createEntity, getEntity } from "../repo";
import * as CoreLib from "../runtime/lib/core";

describe("Book Item Scripting", () => {
  registerLibrary(StdLib);
  registerLibrary(ListLib);
  registerLibrary(StringLib);
  registerLibrary(ObjectLib);
  registerLibrary(CoreLib);
  registerLibrary(BooleanLib);

  let book: Entity;
  let caller: Entity;
  let messages: string[] = [];

  beforeEach(() => {
    // Mock system context
    messages = [];

    // Setup entities
    const bookId = createEntity({
      name: "Test Book",
      chapters: [
        { title: "Chapter 1", content: "Content 1" },
        { title: "Chapter 2", content: "Content 2" },
      ],
    });
    book = getEntity(bookId)!;

    const callerId = createEntity({
      name: "Reader",
      is_wizard: true,
    });
    caller = getEntity(callerId)!;

    // Add tell verb
    addVerb(callerId, "tell", StdLib.send("message", StdLib.arg(0)));
  });

  it("should list chapters", async () => {
    const script = StdLib.seq(
      StdLib.let("chapters", ObjectLib.objGet(StdLib.this(), "chapters")),
      CoreLib.call(
        StdLib.caller(),
        "tell",
        StringLib.strJoin(
          ListLib.listMap(
            StdLib.var("chapters"),
            StdLib.lambda(["c"], ObjectLib.objGet(StdLib.var("c"), "title")),
          ),
          "\n",
        ),
      ),
    );

    await evaluate(
      script,
      createScriptContext({
        caller,
        this: book,
        send: (_type, payload) => messages.push(payload as string),
      }),
    );
    expect(messages[0]).toBe("Chapter 1\nChapter 2");
  });

  it("should read a chapter", async () => {
    const script = StdLib.seq(
      StdLib.let("index", StdLib.arg(0)),
      StdLib.let("chapters", ObjectLib.objGet(StdLib.this(), "chapters")),
      StdLib.let(
        "chapter",
        ListLib.listGet(StdLib.var("chapters"), StdLib.var("index")),
      ),
      StdLib.if(
        StdLib.var("chapter"),
        CoreLib.call(
          StdLib.caller(),
          "tell",
          StringLib.strConcat(
            "Chapter: ",
            ObjectLib.objGet(StdLib.var("chapter"), "title"),
            "\n\n",
            ObjectLib.objGet(StdLib.var("chapter"), "content"),
          ),
        ),
        CoreLib.call(StdLib.caller(), "tell", "Chapter not found."),
      ),
    );

    // Read Chapter 1 (index 0)
    await evaluate(
      script,
      createScriptContext({
        caller,
        this: book,
        args: [0],
        send: (_type, payload) => messages.push(payload as string),
      }),
    );
    expect(messages[0]).toContain("Chapter: Chapter 1");
    expect(messages[0]).toContain("Content 1");

    // Read invalid chapter
    messages = [];
    await evaluate(
      script,
      createScriptContext({
        caller,
        this: book,
        args: [99],
        send: (_type, payload) => messages.push(payload as string),
      }),
    );
    expect(messages[0]).toBe("Chapter not found.");
  });

  it("should add a chapter", async () => {
    const script = StdLib.seq(
      StdLib.let("title", StdLib.arg(0)),
      StdLib.let("content", StdLib.arg(1)),
      StdLib.let("chapters", ObjectLib.objGet(StdLib.this(), "chapters")),
      StdLib.let("newChapter", {}),
      ObjectLib.objSet(StdLib.var("newChapter"), "title", StdLib.var("title")),
      ObjectLib.objSet(
        StdLib.var("newChapter"),
        "content",
        StdLib.var("content"),
      ),
      ListLib.listPush(StdLib.var("chapters"), StdLib.var("newChapter")),
      CoreLib.set_entity(
        ObjectLib.objSet(StdLib.this(), "chapters", StdLib.var("chapters")),
      ),
      CoreLib.call(StdLib.caller(), "tell", "Chapter added."),
    );

    await evaluate(
      script,
      createScriptContext({
        caller,
        this: book,
        args: ["Chapter 3", "Content 3"],
        send: (_type, payload) => messages.push(payload as string),
      }),
    );
    expect(messages[0]).toBe("Chapter added.");
    expect((book["chapters"] as any).length).toBe(3);
    expect((book["chapters"] as any)[2].title).toBe("Chapter 3");
  });

  it("should search chapters", async () => {
    const script = StdLib.seq(
      StdLib.let("query", StdLib.arg(0)),
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
                StringLib.strLower(StdLib.var("query")),
              ),
              StringLib.strIncludes(
                StringLib.strLower(
                  ObjectLib.objGet(StdLib.var("c"), "content"),
                ),
                StringLib.strLower(StdLib.var("query")),
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
    );

    // Search for "Content" (should match all)
    await evaluate(
      script,
      createScriptContext({
        caller,
        this: book,
        args: ["Content"],
        send: (_type, payload) => messages.push(payload as string),
      }),
    );
    expect(messages[0]).toContain("Found 2 matches");

    // Search for "2" (should match Chapter 2)
    messages = [];
    await evaluate(
      script,
      createScriptContext({
        caller,
        this: book,
        args: ["2"],
        send: (_type, payload) => messages.push(payload as string),
      }),
    );
    expect(messages[0]).toContain("Found 1 matches");
    expect(messages[0]).toContain("Chapter 2");
  });
});
