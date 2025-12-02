# Viwo TODOs

## Long-term Vision

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
- **Editor Sync**: Sync content between Block Editor and Code Editor.
- **Transpiler**: Implement a TS -> ViwoScript transpiler (subset of TS) to allow saving from the Code Editor.
