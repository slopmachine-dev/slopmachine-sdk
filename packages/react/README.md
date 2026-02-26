# @slopmachine/react

The official React SDK for Slop Machine. This package provides React components to easily integrate Slop Machine image generation into your applications.

## Installation

```bash
npm install @slopmachine/react
# or
yarn add @slopmachine/react
# or
pnpm add @slopmachine/react
```

## Usage

```tsx
import { SlopImage } from "@slopmachine/react";

function App() {
  return (
    <div style={{ width: "400px", height: "400px" }}>
      <SlopImage
        prompt="A cute cat drinking coffee in a {style} style"
        aspectRatio="1:1"
        variables={{ style: "anime" }}
      />
    </div>
  );
}

export default App;
```

## API / Props

### `SlopImage`

The `SlopImage` component inherits from standard `React.ImgHTMLAttributes<HTMLImageElement>` (excluding `src` and `alt`) and accepts the following additional props:

| Prop          | Type                     | Default      | Description                                             |
| :------------ | :----------------------- | :----------- | :------------------------------------------------------ |
| `prompt`      | `string`                 | **Required** | The prompt to use for image generation.                 |
| `aspectRatio` | `string`                 | `"1:1"`      | The aspect ratio of the image (e.g. `"16:9"`, `"1:1"`). |
| `variables`   | `Record<string, string>` | `{}`         | Variables to interpolate into the prompt.               |
| `model`       | `string`                 | `undefined`  | The AI model to use for generation.                     |
| `baseUrl`     | `string`                 | `undefined`  | Custom base URL for the Slop Machine API.               |

## License

MIT
