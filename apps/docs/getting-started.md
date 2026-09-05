---
description: Getting started guide and core concepts for the Slop Machine SDK.
---

# Getting Started

Welcome to the **Slop Machine SDK** documentation!

Slop Machine is a powerful tool to seamlessly integrate AI-generated images, videos, and text into your React and Svelte applications. It handles all the heavy lifting of calling the Slop Machine API, displaying loading states, rendering shimmer effects, and gracefully showing the resulting media.

The core package `@slopmachine/core` contains the shared logic and utilities, while framework-specific packages like `@slopmachine/react` and `@slopmachine/svelte` provide idiomatic components for a superior Developer Experience (DX).

## Installation

Depending on your framework, install the respective package via your favorite package manager.

### React

```bash
npm install @slopmachine/react @slopmachine/core
```

### Svelte

```bash
npm install @slopmachine/svelte @slopmachine/core
```

## Core Concepts: Buckets vs Pipelines

Slop Machine provides two powerful paradigms for AI generation:

### 1. Buckets (Pre-Templated)
Ideal when prompt templates and guardrails are defined in advance in the Slop Machine dashboard. Developers supply dynamic variables at runtime (e.g. `{ username: "Alice", theme: "retro" }`) as well as optional custom `metadata` (e.g. `{ userId: "usr_123", feature: "avatar" }`) to attach arbitrary contextual data to the generation request and result document.
- Identified by `bucketId`.
- Prompt structure is pre-configured and managed by versions in the Silo.
- Supports runtime `variables`, `metadata`, and temporary `attachments`.

### 2. Pipelines (Developer Runtime Control)
Ideal when external processes or users supply dynamic prompts on demand, or when multi-step chaining (e.g., text generation &rarr; video generation &rarr; audio &rarr; video text compositing) is required.
- Identified by `pipelineId` (and optional `siloId`).
- Developers supply the runtime `prompt`, optional `variables`, and arbitrary `metadata`.
- Results are tracked and organized in the Silo's Pipeline repository.

Under the hood, `SlopImage`, `SlopVideo`, and `SlopText` handle:

- Constructing the appropriate API URL (for both Buckets and Pipelines).
- Showing a built-in shimmer effect and spinner while the media is generating or loading.
- Exposing a `loader` / `fallback` prop to let you fully customize the loading state if desired.
- Smoothly transitioning to the media once it has finished loading.

### Next Steps

Head over to the specific documentation for your framework to see usage examples and detailed API references:

- [Render Pipeline API Reference](/api/render-pipeline)
- [Render Image API Reference](/api/render-image)
- [Render Video API Reference](/api/render-video)
- [Render Text API Reference](/api/render-text)
- [React `SlopImage` Component](/react/slopimage)
- [React `SlopVideo` Component](/react/slopvideo)
- [React `SlopText` Component](/react/sloptext)
- [Svelte `SlopImage` Component](/svelte/slopimage)
- [Svelte `SlopVideo` Component](/svelte/slopvideo)
- [Svelte `SlopText` Component](/svelte/sloptext)
