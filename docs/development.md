# Development Guide

## Building the Documentation

The documentation site is built using [VitePress](https://vitepress.dev/).

### Local Development

To start the documentation server locally with hot reload:

```bash
cd docs
npm run dev
# or
bun run dev
```

This will start the VitePress dev server at `http://localhost:5173`.

### Building for Production

To build the documentation for production, you should use the root workspace script. This script ensures that the **Playground** application is also built and integrated into the documentation site.

From the root directory:

```bash
npm run build:docs
# or
bun run build:docs
```

This command performs the following steps:

1. Builds the `@viwo/docs` package (VitePress site).
2. Builds the `@viwo/playground` package.
3. Copies the playground build output to `docs/.vitepress/dist/playground`.

### Previewing the Build

To preview the production build locally:

```bash
npm run preview:docs
# or
bun run preview:docs
```

## Build Commands

The following packages and applications have specific build steps. All other packages are designed to be run directly with Bun or imported as source.

| Package               | Command         | Description                                   |
| :-------------------- | :-------------- | :-------------------------------------------- |
| `apps/web`            | `npm run build` | Builds the main web application using Vite.   |
| `apps/playground`     | `npm run build` | Builds the playground application using Vite. |
| `packages/web-editor` | `npm run build` | Builds the web editor package.                |
| `docs`                | `npm run build` | Builds the documentation site.                |

### Root Build Scripts

- `npm run build:docs`: Builds the documentation and the playground, then copies the playground build to the docs distribution.
