# Slop Machine SDK

## Getting Started

To run the demo apps or work on this monorepo locally, you must first install dependencies and build the core packages. Building the packages is required after any changes, when running the apps.

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

## Documentation (VitePress)

To preview the VitePress documentation locally, you can run the development server or compile the production build:

### 1. Development Mode (Hot Reloading)

This starts the VitePress development server with active file-watching and hot-reloading:

```bash
npm run docs:dev
```

Once started, open your browser and navigate to `http://localhost:5173`.

### 2. Production Build & Local Preview

To build the static production bundle and preview it locally as it would render in production:

```bash
# Build the documentation static assets
npm run docs:build

# Preview the built site locally
npm run serve --workspace=apps/docs
```

## Publishing to npm

To publish the packages in this monorepo to npm, follow these steps:

1. `npm login` to authenticate.
2. Manually updating the versions in `packages/core/package.json`, `packages/react/package.json`, and `packages/svelte/package.json`.
3. Running `npm run build:packages` to build the projects.
4. Using the workspace command to publish them simultaneously: `npm publish --workspace=packages/core --workspace=packages/react --workspace=packages/svelte --access public`
