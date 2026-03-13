# Slop Machine SDK

The official SDK for integrating Slop Machine into your web applications. Provide a top-tier Developer Experience (DX) for seamlessly rendering AI-generated images and videos in your apps.

![Slop Machine Infographic](https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage?bucketId=0Risb3L5eS76tidF3ug9&resultId=C7rAqS6PkHL70lyHLVtV)

[![npm version](https://img.shields.io/npm/v/@slopmachine/core.svg)](https://www.npmjs.com/package/@slopmachine/core)
[![License](https://img.shields.io/github/license/slopmachine-dev/slopmachine-sdk.svg)](https://github.com/slopmachine-dev/slopmachine-sdk/blob/main/LICENSE)

## Packages

This monorepo contains the following packages:

- [`@slopmachine/core`](packages/core/README.md) - Core utility functions and API client for Slop Machine.
- [`@slopmachine/react`](packages/react/README.md) - React components (`<SlopImage />`, `<SlopVideo />`) with built-in loading states and layout shift prevention.
- [`@slopmachine/svelte`](packages/svelte/README.md) - Svelte components (`<SlopImage />`, `<SlopVideo />`) for seamless integration in Svelte/SvelteKit projects.

## Installation

Install the package for your preferred framework:

### React

```bash
npm install @slopmachine/react
```

### Svelte

```bash
npm install @slopmachine/svelte
```

### Vanilla JS / Core

```bash
npm install @slopmachine/core
```

## Quick Start

### React

The components handle loading states with a built-in shimmer effect and loading spinner, ensuring the layout respects the `aspectRatio` without layout shifts (CLS).

```tsx
import { SlopImage, SlopVideo } from "@slopmachine/react";

function App() {
  return (
    <div style={{ width: "300px" }}>
      <SlopImage
        bucketId="my-unique-bucket-id"
        aspectRatio="16:9"
        variables={{ theme: "cyberpunk" }}
      />

      <SlopVideo bucketId="my-video-bucket" aspectRatio="16:9" />
    </div>
  );
}
```

### Svelte

```svelte
<script>
  import { SlopImage, SlopVideo } from "@slopmachine/svelte";
</script>

<div style="width: 300px;">
  <SlopImage
    bucketId="my-unique-bucket-id"
    aspectRatio="16:9"
    variables={{ theme: "cyberpunk" }}
  />

  <SlopVideo bucketId="my-video-bucket" aspectRatio="16:9" />
</div>
```

## Demos

Check out our live interactive demos to see the components in action:

- [React Demo](https://slopmachine-dev.github.io/slopmachine-sdk/demo-react/)
- [Svelte Demo](https://slopmachine-dev.github.io/slopmachine-sdk/demo-svelte/)

## Documentation

For full documentation, advanced usage, and API reference, please see our [Docs](https://slopmachine-dev.github.io/slopmachine-sdk/).

## Contributing

If you want to contribute to the SDK or run the project locally, please see [BUILDING.md](BUILDING.md) for instructions on setting up your development environment.

## License

MIT License
