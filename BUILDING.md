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

## Versioning & Changesets

We mandate the use of [Changesets](https://github.com/changesets/changesets) for managing package versioning, changelog entries, and releases across this monorepo.

### 1. Adding a Changeset

Whenever you make changes to packages in `packages/`:

```bash
npm run changeset
```

Follow the prompts to select the affected packages, choose the bump level (`major`, `minor`, `patch`), and write a concise description of the changes. Commit the generated markdown file in `.changeset/` along with your PR.

> **Note:** Pull request CI runs `npx changeset status --since=origin/main` and will fail if changes were made to publishable packages without an accompanying changeset.

### 2. Versioning and Releases

Releases are automated via GitHub Actions:
- When a PR with changesets is merged into `main`, GitHub Actions creates or updates a **Version Packages** release PR.
- When the release PR is merged into `main`, GitHub Actions builds and publishes the updated packages to npm.

#### Manual Release (if needed)

If you need to cut a release manually:

```bash
# 1. Consume changesets and bump versions (also runs scripts/sync-version.mjs)
npm run version-packages

# 2. Build packages and publish to npm
npm run release
```
