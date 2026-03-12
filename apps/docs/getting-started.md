# Getting Started

Welcome to the **Slop Machine SDK** documentation!

Slop Machine is a powerful tool to seamlessly integrate AI-generated images into your React and Svelte applications. It handles all the heavy lifting of calling the Slop Machine API, displaying loading states, rendering shimmer effects, and gracefully showing the resulting images.

The core package `@slopmachine/core` contains the shared logic, while framework-specific packages like `@slopmachine/react` and `@slopmachine/svelte` provide idiomatic components for a superior Developer Experience (DX).

## Installation

Depending on your framework, install the respective package via your favorite package manager.

### React

```bash
npm install @slopmachine/react
```

### Svelte

```bash
npm install @slopmachine/svelte
```

## Core Concepts

Both the React and Svelte components provide a `SlopImage` component. This component requires at least a `bucketId` to work, and it will fetch and display the generated image associated with that bucket.

Under the hood, `SlopImage` handles:

- Constructing the appropriate API URL.
- Showing a built-in shimmer effect and spinner while the image is generating or loading.
- Exposing a `loader` prop/snippet to let you fully customize the loading state if desired.
- Smoothly transitioning to the image once it has finished loading.

### Next Steps

Head over to the specific documentation for your framework to see usage examples and detailed API references:

- [React `SlopImage` Component](/react/slopimage)
- [Svelte `SlopImage` Component](/svelte/slopimage)
