# Svelte SDK Coding Conventions

This document outlines the coding conventions, architecture, and patterns used in the `@slopmachine/svelte` SDK package. Future agents and contributors should adhere to these guidelines when making changes.

## 1. Svelte 5 Runes

The SDK utilizes **Svelte 5** and exclusively relies on **runes** for state management and reactivity.

- `$props()`: Used for defining component properties. Ensure default values are handled here, and `...restProps` is utilized to spread unused properties onto underlying DOM elements (e.g., `<img>`).
- `$state()`: Used for localized component state (e.g., loading states, URLs).
- `$derived()`: Used for computed values that depend on state or props (e.g., computing an image URL based on options).
- `$effect()`: Used for side effects, such as tracking prop changes over time, fetching, or debouncing.

## 2. TypeScript and Typing

- All Svelte components must use `<script lang="ts">`.
- Props should be strictly typed. Interfaces should extend the base option types provided by the core package. For example, `SlopImageProps` extends `SlopImageOptions` from `@slopmachine/core`.
- Custom markup passed as props (e.g., a custom loader) should utilize the Svelte 5 `Snippet` type imported from `svelte`.

## 3. Dependency Management

- **Core SDK Logic**: Do not duplicate core logic (like URL generation). Always import utility functions and base types from the `@slopmachine/core` package.
- **Peer Dependencies**: The Svelte package lists `svelte` (version `^5.0.0`) as a peer dependency.

## 4. Component Structure

Components should follow a clear top-to-bottom structure:

1.  **Block Comments**: A descriptive JSDoc/HTML block comment at the top of the file outlining the `@component`, its description, `@example`, and `@version`.
2.  **Script Tag**: `<script lang="ts">` containing imports, type definitions, runes (`$props`, `$state`, etc.), and local functions.
3.  **Markup**: The Svelte HTML template using Svelte 5 logic blocks (`{#if}`, `{@render snippet()}`).
4.  **Styles**: A `<style>` tag scoped to the component. Use CSS variables with sensible fallbacks (e.g., `var(--muted, #f3f4f6)`) to allow consumer theming while maintaining a good default appearance.

## 5. Exporting Patterns

- **No Bundling**: The package is published as uncompiled source code to let the consuming project's bundler handle the Svelte compilation.
- **package.json Setup**:
  - Exposes `"type": "module"`.
  - The `"svelte"`, `"main"`, and `"exports"` fields point directly to `./src/index.ts`.
- Component exports should be simple and direct via `src/index.ts`.

## 6. Error Handling and Loading

- Implement clean fallbacks for failing resources (like broken image links). The `SlopImage` component demonstrates using `fetch` to proactively capture error statuses, falling back to an error state or logging.
- Support default loading indicators (spinners/shimmer effects) alongside customizable slots/snippets (e.g., `loader`) for a better user experience.
