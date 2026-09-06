# @slopmachine/react

The official React SDK for Slop Machine. This package provides high-performance, layout-stable React components to seamlessly integrate AI images, videos, and text into your web applications.

## Installation

```bash
npm install @slopmachine/react @slopmachine/core
# or
yarn add @slopmachine/react @slopmachine/core
# or
pnpm add @slopmachine/react @slopmachine/core
```

## Demo

https://docs.slopmachine.dev/demo-react/

## Usage

### 1. Using Pre-Templated Buckets

```tsx
import { SlopImage, SlopVideo, SlopText } from "@slopmachine/react";

function BucketExample() {
  return (
    <div>
      {/* Dynamic Image */}
      <SlopImage
        bucketId="my-bucket-id"
        aspectRatio="16:9"
        variables={{ style: "anime", character: "wizard" }}
        className="rounded-lg shadow-md"
      />

      {/* Dynamic Video */}
      <SlopVideo
        bucketId="my-video-bucket"
        aspectRatio="16:9"
        duration={5}
        autoPlay
        loop
        muted
      />

      {/* Dynamic Text / Story */}
      <SlopText
        bucketId="my-text-bucket"
        variables={{ hero: "Arthur" }}
        className="prose"
      />
    </div>
  );
}
```

### 2. Using Dynamic Multi-Step Pipelines

Pipelines give you full runtime control over the prompt and pipeline execution while persisting results directly to Slop Machine:

```tsx
import { SlopImage, SlopVideo, SlopText } from "@slopmachine/react";

function PipelineExample() {
  return (
    <div>
      <SlopImage
        pipelineId="pipe_live_abc123"
        prompt="1960s retro robot eating synthetic pizza on Mars"
        aspectRatio="1:1"
        metadata={{ campaign: "retro_future_2026", userId: "u_101" }}
      />

      <SlopVideo
        pipelineId="pipe_live_def456"
        prompt="A drone swooping through neon skyscrapers in heavy rain"
        aspectRatio="9:16"
      />

      <SlopText
        pipelineId="pipe_live_ghi789"
        prompt="Write a whimsical product tagline for a cybernetic toaster"
      />
    </div>
  );
}
```

## License

MIT
