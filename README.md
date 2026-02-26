# Slop Machine SDK

## Getting Started

To run the demo apps or work on this monorepo locally, you must first install dependencies and build the core packages. Building the packages is required to avoid module resolution errors like `Cannot find module '@slopmachine/core'` when running the apps.

```bash
npm install
npm run build
```

## React Demo

```bash
npm run dev:react
```

## Svelte Demo

```bash
npm run dev:svelte
```

## Publishing to npm

To publish the packages in this monorepo to npm, follow these steps:

1. `npm login` to authenticate.
2. Manually updating the versions in `packages/core/package.json`, `packages/react/package.json`, and `packages/svelte/package.json`.
3. Running `npm run build:packages` to build the projects.
4. Using the workspace command to publish them simultaneously: `npm publish --workspace=packages/core --workspace=packages/react --workspace=packages/svelte --access public`
