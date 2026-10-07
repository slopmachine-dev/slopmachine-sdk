# Slop Machine SDK

## Getting Started

To run the demo apps or work on this monorepo locally, you must first install dependencies and build the core packages. Building the packages is required after any changes, when running the apps.

```bash
npm install
npm run build
```

## Tests & Type Checks

Unit tests (Vitest) live in `packages/core/test`. Type checks cover all three packages (`tsc` for core and React, `svelte-check` for Svelte). CI runs both after the build:

```bash
npm run build:packages   # React/Svelte type-check against core's built .d.ts
npm run typecheck
npm test
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

> **Note:** Pull request CI runs `npx changeset status --since=origin/main` and fails if a publishable package (`packages/core`, `packages/react`, `packages/svelte`) changed without a changeset in that PR. Changes that only touch docs, demos, CI or root files don't need one. If a package change shouldn't trigger a release (e.g. tests or dev tooling), add an empty changeset with `npx changeset add --empty`.

### 2. Versioning and Releases

Releases are fully automated by the **Release & Publish Packages** workflow on every push to `main`:

1. If changesets are pending, it runs `npm run version-packages` (bumps the fixed `@slopmachine/*` group, writes changelogs, syncs `@version` tags), then commits and pushes a `chore(release): …` commit to `main`. If that push fails (e.g. `main` moved), the run stops before publishing; the changesets stay pending for the next run.
2. It builds the packages and runs `changeset publish`, which publishes only versions not yet on npm, then pushes the release tags. When nothing is new this is a no-op.

Because publishing only happens after the version bump is on `main`, npm can never get ahead of git. If a publish fails, re-run the workflow (or use **Run workflow** / `workflow_dispatch`); it will publish whatever versions are still missing from npm.

Changesets is the only supported way to version packages. Don't edit package versions by hand.

#### Manual Release (if needed)

If you need to cut a release locally:

```bash
# 1. Consume changesets and bump versions (also runs scripts/sync-version.mjs)
npm run version-packages

# 2. Commit and push the version bump to main first, then build and publish
npm run release
```
