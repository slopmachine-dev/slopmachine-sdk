---
description: Complete index and reference guide to all Slop Machine SDK documentation.
---

# Documentation Index

Welcome to the Slop Machine documentation. Here you will find guides, API references, component documentation, and examples for integrating AI-generated images, videos, text, and multi-step pipelines into your applications.

---

## 🚀 Getting Started

- **[Getting Started](/getting-started)**  
  Introduction to the Slop Machine SDK, installation instructions for React and Svelte, and core architectural concepts (**Buckets** vs **Pipelines**).

---

## ⚡ API Reference

Direct cloud function endpoints for media rendering, pipeline execution, and file attachments:

- **[Render Pipeline API](/api/render-pipeline)**  
  Execute multi-step AI pipelines dynamically using secret pipeline keys. Supports prompt chaining (text &rarr; video &rarr; composite), dynamic variables, and custom metadata persistence.
- **[Render Image API](/api/render-image)**  
  Generate and retrieve dynamic images using bucket templates, custom variables, aspect ratio constraints, and cache controls.
- **[Render Video API](/api/render-video)**  
  Generate dynamic AI video clips with motion models, custom variables, durations, and aspect ratios.
- **[Render Text API](/api/render-text)**  
  Generate AI copywriting, dynamic slogans, and text snippets using templated prompt buckets.
- **[Upload Temp Attachment API](/api/upload-temp-attachment)**  
  Upload temporary media files (images/attachments) to pass to generation endpoints via the `attachments` parameter.

---

## ⚛️ React SDK (`@slopmachine/react`)

Components and hooks tailored for React applications with built-in loading states and zero layout shifts:

- **[`<SlopImage />` Component](/react/slopimage)**  
  Render generative images with automatic shimmer placeholders, aspect ratio preservation, custom loader slots, and preloading helpers.
- **[`<SlopVideo />` Component](/react/slopvideo)**  
  Render generative videos with looping, autoplay, shimmer loading states, and poster fallbacks.
- **[`<SlopText />` Component](/react/sloptext)**  
  Render dynamic generative copy with custom loading skeletons and fallback support.

---

## 🟧 Svelte SDK (`@slopmachine/svelte`)

Idiomatic Svelte components for rendering generative media:

- **[`<SlopImage />` Component](/svelte/slopimage)**  
  Svelte component for rendering generative images with shimmer loading animations and aspect ratio retention.
- **[`<SlopVideo />` Component](/svelte/slopvideo)**  
  Svelte component for rendering generative videos with smooth playback and loading states.
- **[`<SlopText />` Component](/svelte/sloptext)**  
  Svelte component for rendering dynamic text and copywriting.

---

## 🛠️ Core Package (`@slopmachine/core`)

Shared TypeScript utilities, types, and client-side execution helpers:

- **URL Builders**: `buildImageUrl`, `buildVideoUrl`, `buildTextUrl`, `buildPipelineUrl`
- **Preloading Utilities**: `preloadImage`, `preloadVideo`, `preloadText`
- **Pipeline Execution**: `executePipeline` for programmatic, typed server/client pipeline execution
- **File Upload Helpers**: `uploadTempAttachment` for base64 file uploads

---

## 🎮 Interactive Demos

Explore live interactive sandboxes with real-time parameter tweaking:

- **[React Interactive Demo](https://docs.slopmachine.dev/demo-react/)**
- **[Svelte Interactive Demo](https://docs.slopmachine.dev/demo-svelte/)**
