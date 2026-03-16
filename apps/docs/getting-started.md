---
description: Getting started guide and core concepts for the Slop Machine SDK.
---

# Getting Started

Welcome to the **Slop Machine SDK** documentation!

Slop Machine is a powerful tool to seamlessly integrate AI-generated images and videos into your React and Svelte applications. It handles all the heavy lifting of calling the Slop Machine API, displaying loading states, rendering shimmer effects, and gracefully showing the resulting images and videos.

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

Both the React and Svelte components provide `SlopImage` and `SlopVideo` components. These components require at least a `bucketId` to work, and they will fetch and display the generated media associated with that bucket.

Under the hood, `SlopImage` and `SlopVideo` handle:

- Constructing the appropriate API URL.
- Showing a built-in shimmer effect and spinner while the media is generating or loading.
- Exposing a `loader` prop/snippet to let you fully customize the loading state if desired.
- Smoothly transitioning to the media once it has finished loading.

### Next Steps

Head over to the specific documentation for your framework to see usage examples and detailed API references:

- [React `SlopImage` Component](/react/slopimage)
- [React `SlopVideo` Component](/react/slopvideo)
- [Svelte `SlopImage` Component](/svelte/slopimage)
- [Svelte `SlopVideo` Component](/svelte/slopvideo)
