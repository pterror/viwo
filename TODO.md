# Viwo TODOs

## Documentation

- **Socket**: Verify and implement proper login logic in `apps/discord-bot/src/socket.ts`.
- **Web**: Document web frontend more comprehensively (layout, builder mode, etc).
- **Discord Bot**: Implement a way to route Core -> Discord messages more intelligently. Currently relies on socketManager, but might need reverse lookup for Entity -> (DiscordUser, Channel). (Ref: `apps/discord-bot/src/index.ts`)

## Long-term Vision

- **Editor**: Use `apps/web/src/utils/type_generator.ts` to generate types for a Monaco editor (+ LSP) for the script editor.
- **AI**: AI support for the Monaco editor using the above types, using live feedback from LSP. This should use the AI plugin.
- **Frontends**: Flesh out all frontends
  - TUI (should have the same layout as web frontend)
  - Discord bot
- **TUI**: Script editor support for TUI.
- **Security**: Capability based security
  - Does this/should this replace the current permissions system?
- **System Integration**: System integration as (optional) libraries
  - IO, FS, network etc. (these MUST use capability based security)
- **Compiler**: Compiler from ViwoScript to TypeScript - typechecking should be removed from the runtime for performance reasons. It may be desired to typecheck at the boundary (the very outermost call) for type safety. We should also consider typechecking for areas where TypeScript reports type errors.
- **Typing**: Add generics to type annotations for ViwoScript.
