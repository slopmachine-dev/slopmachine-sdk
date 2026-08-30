# Changesets

Hello and welcome! This folder contains Changeset markdown files that track changes to packages in this repository.

## How to add a changeset

Whenever you make changes to one or more packages in `packages/`:

1. Run `npm run changeset` from the monorepo root.
2. Select which packages have changed (e.g. `@slopmachine/core`, `@slopmachine/react`, `@slopmachine/svelte`).
3. Select whether the change is `major`, `minor`, or `patch`.
4. Enter a summary of the change.
5. Commit the generated `.changeset/*.md` file alongside your code changes in your pull request.

## How releasing works

- Pull requests targeting `main` must include a changeset if publishable packages are modified.
- When pull requests are merged into `main`, GitHub Actions automatically maintains a "Version Packages" release PR.
- When the release PR is merged, the packages are built and published to npm automatically.
