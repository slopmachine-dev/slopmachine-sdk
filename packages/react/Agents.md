# React SDK Conventions

This document outlines the coding conventions and patterns used in the `@slopmachine/react` SDK. Future agents should adhere to these guidelines when making modifications or adding new components.

> **Important:** Review the repository-wide guidelines in [AGENTS.md](../../AGENTS.md) and check [GOTCHAS.md](../../GOTCHAS.md) for known issues, pitfalls, and workarounds before starting tasks. Maintain `GOTCHAS.md` whenever resolving new pitfalls.

## Dependencies and Styling

- **Class Merging:** Use `clsx` and `tailwind-merge` to construct and merge Tailwind CSS classes. A utility function `cn(...inputs: ClassValue[])` is typically used for this purpose.
- **Styling Approach:** Components use Tailwind CSS classes for styling. However, to ensure components remain robust even if the consumer's environment doesn't perfectly process all Tailwind classes, always include equivalent inline `style` properties as a fallback.
- **CSS Variables:** Use namespaced `--slop-*` variables with a fallback (e.g., `var(--slop-muted, var(--muted, #f3f4f6))`, enforced by `npm run lint`). The variables are documented under "Theming" in `apps/docs/getting-started.md`.
- **Custom Animations/Styles:** If complex animations or specific scoped styles are needed that go beyond Tailwind utility classes, inject them using a scoped `<style>` block within the component.
- **Core Logic:** Import shared logic, utilities, and base types from `@slopmachine/core` (deep/relative imports are blocked by `npm run lint`).

## Component Structure

- **Functional Components:** Define components as Functional Components (enforced by `npm run lint`), not classes.
- **Prop Forwarding:** Spread the remaining props (`...props`) onto the primary underlying DOM element to allow consumers to pass standard HTML attributes (like `aria-` attributes, data attributes, etc.).

## Prop Typing

- **Interfaces:** Define an explicit `Props` interface (not a `type` alias, enforced by `npm run lint`) for each component.
- **Extending Standard Attributes:** Extend the appropriate React HTML attributes interface (e.g., `React.ImgHTMLAttributes<HTMLImageElement>`).
- **Overriding Attributes:** Use `Omit` to exclude standard attributes that are managed internally by the component or replaced by custom SDK options (e.g., `Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src">`).
- **Shared Types:** Extend or incorporate types from `@slopmachine/core` (like `SlopImageOptions`).

## IntelliSense and Documentation

- **JSDoc Comments:** Component JSDoc (`@example` required on exported `Slop*` components) and prop JSDoc on `export interface *Props` are enforced by `npm run lint`.

## Exporting Patterns

- **Named Exports:** Use named exports only (default exports are blocked by `npm run lint`).
- **Entry Point:** Ensure components and their prop types are exported from the package's main entry point if they are meant for public consumption.
