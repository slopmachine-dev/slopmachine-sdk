# React SDK Conventions

This document outlines the coding conventions and patterns used in the `@slopmachine/react` SDK. Future agents should adhere to these guidelines when making modifications or adding new components.

## Dependencies and Styling

- **Class Merging:** Use `clsx` and `tailwind-merge` to construct and merge Tailwind CSS classes. A utility function `cn(...inputs: ClassValue[])` is typically used for this purpose.
- **Styling Approach:** Components use Tailwind CSS classes for styling. However, to ensure components remain robust even if the consumer's environment doesn't perfectly process all Tailwind classes, always include equivalent inline `style` properties as a fallback.
- **CSS Variables:** Use standard CSS variables for theme-related colors (e.g., `var(--muted, #f3f4f6)`).
- **Custom Animations/Styles:** If complex animations or specific scoped styles are needed that go beyond Tailwind utility classes, inject them using a scoped `<style>` block within the component.
- **Core Logic:** Import shared logic, utilities, and base types from `@slopmachine/core`.

## Component Structure

- **Functional Components:** Define components as Functional Components (e.g., `React.FC<Props>`).
- **Prop Forwarding:** Spread the remaining props (`...props`) onto the primary underlying DOM element to allow consumers to pass standard HTML attributes (like `aria-` attributes, data attributes, etc.).

## Prop Typing

- **Interfaces:** Define an explicit `Props` interface for each component.
- **Extending Standard Attributes:** Extend the appropriate React HTML attributes interface (e.g., `React.ImgHTMLAttributes<HTMLImageElement>`).
- **Overriding Attributes:** Use `Omit` to exclude standard attributes that are managed internally by the component or replaced by custom SDK options (e.g., `Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">`).
- **Shared Types:** Extend or incorporate types from `@slopmachine/core` (like `SlopImageOptions`).

## IntelliSense and Documentation

- **JSDoc Comments:** Always include descriptive JSDoc comments for components and their props to provide rich IntelliSense in IDEs.
- **Component Documentation:** Component JSDoc blocks should describe what the component does and include a clear `@example` block demonstrating usage, and optionally a `@version` tag if applicable.
- **Prop Documentation:** Every custom prop in a component's interface should have a JSDoc comment explaining its purpose, default behavior, and any edge cases. This is crucial for developer experience when consuming the SDK.

## Exporting Patterns

- **Named Exports:** Use named exports for components and interfaces (e.g., `export const ComponentName = ...`). Avoid default exports.
- **Entry Point:** Ensure components and their prop types are exported from the package's main entry point if they are meant for public consumption.
