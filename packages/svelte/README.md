# @slopmachine/svelte

The official Svelte wrapper for Slop Machine. Easily integrate Slop Machine image generation into your Svelte 5 applications.

## Installation

```bash
npm install @slopmachine/svelte
# or
yarn add @slopmachine/svelte
# or
pnpm add @slopmachine/svelte
```

## Demo

https://slopmachine-dev.github.io/slopmachine-sdk/svelte/

## Usage

```svelte
<script lang="ts">
  import { SlopImage } from '@slopmachine/svelte';
</script>

<div style="width: 400px; height: 400px;">
  <SlopImage
    prompt={"A cute dog wearing a hat in a {style} style"}
    aspectRatio="1:1"
    variables={{ style: "realistic" }}
  />
</div>
```

## API / Props

### `SlopImage`

The `SlopImage` component inherits standard HTML `<img>` attributes and accepts the following additional props:

| Prop          | Type                     | Default      | Description                                             |
| :------------ | :----------------------- | :----------- | :------------------------------------------------------ |
| `prompt`      | `string`                 | **Required** | The prompt to use for image generation.                 |
| `aspectRatio` | `string`                 | `"1:1"`      | The aspect ratio of the image (e.g. `"16:9"`, `"1:1"`). |
| `variables`   | `Record<string, string>` | `{}`         | Variables to interpolate into the prompt.               |
| `model`       | `string`                 | `undefined`  | The AI model to use for generation.                     |
| `baseUrl`     | `string`                 | `undefined`  | Custom base URL for the Slop Machine API.               |

## License

MIT
