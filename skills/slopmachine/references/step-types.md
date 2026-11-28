# Slop Machine Pipeline Step Schemas & Fuel Reference

This reference documents every supported `PipelineStep` type, configuration schema, valid aspect ratios, durations, voice presets, and Fuel cost formulas for `create_pipeline` and `update_pipeline`.

---

## 1. Common `PipelineStep` Envelope

Every item in a pipeline's `steps` array conforms to:

```typescript
interface PipelineStepInput {
  /** Unique step identifier within the pipeline (e.g. "step_1", "step_video") */
  id?: string;
  /** Human-readable step label */
  name?: string;
  /** Step type identifier (see sections below) */
  type: PipelineStepType;
  /** Step-specific configuration dictionary */
  config?: Record<string, any>;
  /** Save this step's output under `{outputKey}` for downstream steps */
  outputKey?: string;
  /** Read primary media/text input from `{inputKey}` instead of the immediately preceding step */
  inputKey?: string;
  /** Allow callers to pass runtime `attachments` for this step in `execute_pipeline` */
  allowRuntimeAttachments?: boolean;
  /** Allow callers to override `aspectRatio` for this step in `execute_pipeline` */
  allowRuntimeAspectRatio?: boolean;
  /** Allow callers to override `duration` for this step in `execute_pipeline` */
  allowRuntimeDuration?: boolean;
  /** Enable audio generation/preservation on video/effect steps */
  enableAudio?: boolean;
}
```

### Prompt Variable & Template Interpolation Rules
- **Runtime Variables & Upstream Step Outputs**: Use single braces `{variable_name}` or `{outputKey}` inside `config.prompt` or `config.systemPrompt`.
- **Silo Prompt Templates**: Use double braces `{{template_name}}` to inline reusable templates defined at the Silo level (via `create_template`). Templates expand recursively up to 10 levels deep, and any `{variable}` inside a template body becomes a runtime variable of the pipeline.

---

## 2. Supported Aspect Ratios & Durations

### Image Aspect Ratios (`ImageAspectRatio`)
Supported on `image_generation`, `vector`, `animation`, and image-producing steps:
- `"1:1"` (default for images)
- `"16:9"`
- `"9:16"`
- `"4:3"`
- `"3:4"`
- `"3:2"`
- `"2:3"`
- `"4:5"`
- `"5:4"`
- `"21:9"`

### Video Aspect Ratios (`VideoAspectRatio`)
Supported on `video_generation` and video steps:
- `"9:16"` (vertical / Shorts / Reels / TikTok — default for `video_generation` preset)
- `"16:9"` (landscape widescreen — default for `buildVideoUrl` / `<SlopVideo />`)

### Durations (`durationSeconds` / `duration`)
- **`video_generation`**: Typically `4` or `8` seconds (default `4`). Specify via `config.durationSeconds` (or `config.duration`).
- **`animation` / `flair_effect`**: Typically `4`–`10` seconds (default `4`).
- **`music_generation`**: Typically `15`–`30` seconds (default `15`).

---

## 3. Detailed Step Type Schemas

### A. Video Services

#### `video_generation`
Generates video from a text prompt and optional image/video attachments.
- **Allowed Inputs**: `"none"`, `"text"`, `"image"`
- **Default `outputKey`**: `"videoUrl"`
- **Output Result Type**: `"video"`
- **Fuel Cost**: `15 * durationSeconds` Fuel (`60` Fuel for 4s, `120` Fuel for 8s)
- **`config` Schema**:
  ```json
  {
    "prompt": "{{brand_style}} A cinematic tracking shot of {subject} in 4k",
    "aspectRatio": "9:16",
    "durationSeconds": 4,
    "negativePrompt": "blurry, low quality, watermark",
    "enableAudio": true
  }
  ```

#### `video_modification`
Modifies or restyles an upstream video using a text prompt.
- **Allowed Inputs**: `"video"`
- **Default `outputKey`**: `"videoUrl"`
- **Output Result Type**: `"video"`
- **Fuel Cost**: `15 * durationSeconds` Fuel
- **`config` Schema**:
  ```json
  {
    "prompt": "Transform into a cel-shaded anime style while preserving motion",
    "durationSeconds": 4
  }
  ```

#### `video_upscale`
Upscales video resolution and enhances frame quality.
- **Allowed Inputs**: `"video"`
- **Default `outputKey`**: `"videoUrl"`
- **Output Result Type**: `"video"`
- **Fuel Cost**: `15 * durationSeconds` Fuel
- **`config` Schema**:
  ```json
  {
    "targetResolution": "1080p",
    "durationSeconds": 4
  }
  ```

#### `video_compositing`
Overlays dynamic captions, titles, watermarks, or composite graphics onto an upstream video.
- **Allowed Inputs**: `"video"`
- **Default `outputKey`**: `"videoUrl"`
- **Output Result Type**: `"video"`
- **Fuel Cost**: `15 * durationSeconds` Fuel
- **`config` Schema**:
  ```json
  {
    "prompt": "{headline}",
    "position": "bottom",
    "fontFamily": "Rubik Wet Paint"
  }
  ```

#### `video_transcoding`
Compresses, transcodes, or normalizes video format and codecs via FFmpeg.
- **Allowed Inputs**: `"video"`
- **Default `outputKey`**: `"videoUrl"`
- **Output Result Type**: `"video"`
- **Fuel Cost**: `15 * durationSeconds` Fuel
- **`config` Schema**:
  ```json
  {
    "format": "mp4"
  }
  ```

#### `video_analysis`
Analyzes video frames/filmstrips and extracts a structured or narrative text description.
- **Allowed Inputs**: `"video"`
- **Default `outputKey`**: `"text"`
- **Output Result Type**: `"text"`
- **Fuel Cost**: `15 * durationSeconds` Fuel
- **`config` Schema**:
  ```json
  {
    "prompt": "Describe the key visual hooks and camera movements in this clip."
  }
  ```

---

### B. Image Services

#### `image_generation`
Generates high-quality images from text prompts and optional reference attachments.
- **Allowed Inputs**: `"none"`, `"text"`
- **Default `outputKey`**: `"imageUrl"`
- **Output Result Type**: `"image"`
- **Fuel Cost**: `6` Fuel flat
- **`config` Schema**:
  ```json
  {
    "prompt": "A neubrutalist poster for {eventName}, bold black outlines, vibrant primary colors",
    "aspectRatio": "1:1",
    "quality": "fast",
    "negativePrompt": "photorealistic, blurry"
  }
  ```
  - `quality`: `"fast"` (default) or `"high"`

#### `image_transformation`
Edits, in-paints, restyles, or alters an upstream or attached image.
- **Allowed Inputs**: `"image"`
- **Default `outputKey`**: `"imageUrl"`
- **Output Result Type**: `"image"`
- **Fuel Cost**: `6` Fuel flat
- **`config` Schema**:
  ```json
  {
    "prompt": "Replace the background with a sunlit brutalist courtyard",
    "aspectRatio": "16:9"
  }
  ```

#### `background_removal`
Removes the background from an upstream image and outputs a transparent PNG/WebP subject.
- **Allowed Inputs**: `"image"`
- **Default `outputKey`**: `"imageUrl"`
- **Output Result Type**: `"image"`
- **Fuel Cost**: `6` Fuel flat
- **`config` Schema**:
  ```json
  {}
  ```

#### `image_compositing`
Composites text overlays, SVG badges, or secondary graphics onto an upstream image.
- **Allowed Inputs**: `"image"`
- **Default `outputKey`**: `"imageUrl"`
- **Output Result Type**: `"image"`
- **Fuel Cost**: `6` Fuel flat
- **`config` Schema**:
  ```json
  {
    "prompt": "{badgeText}"
  }
  ```

#### `image_analysis`
Inspects an upstream image and outputs descriptions, tags, or answers to visual questions.
- **Allowed Inputs**: `"image"`
- **Default `outputKey`**: `"text"`
- **Output Result Type**: `"text"`
- **Fuel Cost**: `6` Fuel flat
- **`config` Schema**:
  ```json
  {
    "prompt": "Extract the dominant color palette and describe the subject."
  }
  ```

#### `thumbnail_generation`
Generates resized, responsive thumbnails from an upstream image or video frame.
- **Allowed Inputs**: `"image"`, `"video"`
- **Default `outputKey`**: `"imageUrl"`
- **Output Result Type**: `"image"`
- **Fuel Cost**: `6` Fuel flat
- **`config` Schema**:
  ```json
  {
    "width": 300,
    "height": 300
  }
  ```

---

### C. Vector, Animation & Visual Effects (`flair_effect`, `vector`, `animation`)

#### `vector`
Generates clean, scalable SVG vector illustrations.
- **Allowed Inputs**: `"none"`, `"text"`, `"image"`
- **Default `outputKey`**: `"vectorUrl"`
- **Output Result Type**: `"vector"`
- **Fuel Cost**: `3` Fuel flat
- **`config` Schema**:
  ```json
  {
    "prompt": "A flat neubrutalist mascot icon of a {mascotAnimal} wearing sunglasses",
    "aspectRatio": "1:1"
  }
  ```

#### `animation`
Generates animated SVG or motion graphic sequences.
- **Allowed Inputs**: `"none"`, `"text"`, `"image"`, `"vector"`
- **Default `outputKey`**: `"animationUrl"`
- **Output Result Type**: `"animation"`
- **Fuel Cost**: `1 * durationSeconds` Fuel (default 4s = `4` Fuel)
- **`config` Schema**:
  ```json
  {
    "prompt": "Looping idle bounce animation for {subject}",
    "aspectRatio": "1:1",
    "durationSeconds": 4
  }
  ```

#### `flair_effect`
Applies GPU WebGL shaders, video filters, transitions, audio-reactive visualizers, or animated vector flair from the `@pixerate/flair` catalog.
- **Allowed Inputs**: `"none"`, `"text"`, `"image"`, `"video"`, `"audio"`
- **Default `outputKey`**: `"videoUrl"`
- **Output Result Type**:
  - `"animation"` when `config.outputFormat` / `config.format` is `"svg"` or `"animation"` (or `config.asSvg === true`)
  - `"vector"` when `config.outputFormat` / `config.format` is `"vector"`
  - `"video"` otherwise (default WebGL shader video rendering)
- **Fuel Cost**:
  - SVG / Animation output (`outputFormat: "svg" | "animation"` or `asSvg: true`): `1 * durationSeconds` Fuel (default 4s = `4` Fuel)
  - Vector output (`outputFormat: "vector"`): `3` Fuel flat
  - Video shader output (default): `15 * durationSeconds` Fuel (default 4s = `60` Fuel)
- **`config` Schema**:
  ```json
  {
    "effectId": "crt-scanlines",
    "preset": "arcade",
    "outputFormat": "video",
    "durationSeconds": 4,
    "enableAudio": true,
    "params": {
      "intensity": 0.75
    }
  }
  ```

---

### D. Audio, Speech & Music Services

#### `speech_generation`
Synthesizes natural voiceover narration from text using Gemini TTS voices.
- **Allowed Inputs**: `"none"`, `"text"`
- **Default `outputKey`**: `"audioUrl"`
- **Output Result Type**: `"audio"`
- **Fuel Cost**: `2` Fuel flat
- **Supported `voice` Values**:
  - `"Aoede"` — Female, Warm (default)
  - `"Kore"` — Female, Storytelling
  - `"Zephyr"` — Female, Bright
  - `"Leda"` — Female, Youthful
  - `"Puck"` — Male, Upbeat
  - `"Charon"` — Male, Professional
  - `"Fenrir"` — Male, Energetic
- **`config` Schema**:
  ```json
  {
    "prompt": "Welcome to {productName}, where autonomous agents ship creative media.",
    "voice": "Aoede"
  }
  ```

#### `music_generation`
Generates instrumental background music tracks.
- **Allowed Inputs**: `"none"`, `"text"`
- **Default `outputKey`**: `"audioUrl"`
- **Output Result Type**: `"audio"`
- **Fuel Cost**: `1 * durationSeconds` Fuel (default 15s = `15` Fuel)
- **`config` Schema**:
  ```json
  {
    "prompt": "Upbeat synthwave backing track with punchy analog bass",
    "genre": "synthwave",
    "durationSeconds": 15
  }
  ```

#### `audio_transcription`
Transcribes spoken audio or video tracks into text and timestamps.
- **Allowed Inputs**: `"audio"`, `"video"`
- **Default `outputKey`**: `"transcription"`
- **Output Result Type**: `"text"`
- **Fuel Cost**: `1` Fuel flat
- **`config` Schema**:
  ```json
  {}
  ```

#### `audio_processing`
Normalizes audio loudness (LUFS), limits true peak, trims silence, and converts audio formats.
- **Allowed Inputs**: `"audio"`, `"video"`
- **Default `outputKey`**: `"audioUrl"`
- **Output Result Type**: `"audio"`
- **Fuel Cost**: `1` Fuel flat
- **`config` Schema**:
  ```json
  {
    "targetLufs": -14,
    "truePeak": -1.0,
    "format": "mp3",
    "removeSilence": false
  }
  ```

---

### E. Text, Structured JSON, Code & Document Services

#### `text_generation`
Generates Markdown/plain text from prompts, upstream context, and optional image/video attachments, with optional Google Search grounding.
- **Allowed Inputs**: `"none"`, `"text"`, `"image"`, `"video"`
- **Default `outputKey`**: `"text"`
- **Output Result Type**: `"text"`
- **Fuel Cost**: `1` Fuel flat
- **`config` Schema**:
  ```json
  {
    "prompt": "Write a 3-sentence launch announcement for {feature} in a witty tone.",
    "systemPrompt": "{{brand_voice}}",
    "temperature": 0.7,
    "googleSearch": false
  }
  ```

#### `json_generation`
Generates schema-validated structured JSON outputs and exposes each field key (`{key}`) as a variable to all downstream steps.
- **Allowed Inputs**: `"none"`, `"text"`
- **Default `outputKey`**: `"data"`
- **Output Result Type**: `"text"` / `"json"`
- **Fuel Cost**: `1` Fuel flat
- **Supported Field `type` Values**: `"string"` (default), `"number"`, `"boolean"`, `"string[]"`, `"number[]"`, `"json"`
- **`config` Schema**:
  ```json
  {
    "prompt": "Plan a 3-scene social reel for {topic}.",
    "systemPrompt": "Return concise, high-impact creative direction.",
    "outputs": [
      {
        "key": "hookHeadline",
        "instructions": "Punchy 4-word opening hook",
        "type": "string"
      },
      {
        "key": "scenePrompt",
        "instructions": "Detailed visual prompt for the hero video generator",
        "type": "string"
      },
      {
        "key": "hashtags",
        "instructions": "3 relevant tags without #",
        "type": "string[]"
      }
    ]
  }
  ```

#### `text_modification`
Summarizes, translates, refines, or rewrites upstream text.
- **Allowed Inputs**: `"text"`
- **Default `outputKey`**: `"text"`
- **Output Result Type**: `"text"`
- **Fuel Cost**: `1` Fuel flat
- **`config` Schema**:
  ```json
  {
    "prompt": "Condense the following text into a single punchy tweet: {researchBrief}"
  }
  ```

#### `code_generation`
Generates source code or scripts from text specifications.
- **Allowed Inputs**: `"none"`, `"text"`
- **Default `outputKey`**: `"text"`
- **Output Result Type**: `"text"`
- **Fuel Cost**: `1` Fuel flat
- **`config` Schema**:
  ```json
  {
    "prompt": "Write a TypeScript React component using <SlopVideo /> for {campaign}",
    "language": "typescript"
  }
  ```

#### `document_generation`
Renders a formatted PDF document from Markdown/text input.
- **Allowed Inputs**: `"text"`
- **Default `outputKey`**: `"documentUrl"`
- **Output Result Type**: `"file"`
- **Fuel Cost**: `1` Fuel flat
- **`config` Schema**:
  ```json
  {
    "title": "Campaign Brief: {campaignName}",
    "prompt": "{researchBrief}"
  }
  ```

---

## 4. Fuel Cost & Plan Allocation Summary

### Step Fuel Formula (`calculateStepCost`)
Total Fuel for a pipeline execution with variation `count` (1–10):
$$\text{Total Fuel} = \left(\sum_{i=1}^{k} \text{StepCost}(\text{step}_i)\right) \times \text{count} + (\text{aiSelectionEnabled} ? 1 : 0)$$

| Category | Constants (`FUEL_COSTS`) | Rate |
| :--- | :--- | :--- |
| Video (`video_*`, shader `flair_effect`) | `VIDEO_GENERATION_PER_SECOND` | `15` Fuel / second (default 4s = `60` Fuel) |
| Image (`image_*`, `background_removal`, `thumbnail_generation`) | `IMAGE_GENERATION` | `6` Fuel / step |
| Vector (`vector`, vector `flair_effect`) | `VECTOR_GENERATION` | `3` Fuel / step |
| Animation (`animation`, SVG/animation `flair_effect`) | `ANIMATION_GENERATION_PER_SECOND` | `1` Fuel / second (default 4s = `4` Fuel) |
| Speech (`speech_generation`) | `SPEECH_GENERATION` | `2` Fuel / step |
| Music (`music_generation`) | `MUSIC_GENERATION_PER_SECOND` | `1` Fuel / second (default 15s = `15` Fuel) |
| Text / JSON / Code / Audio Utility / Document | `TEXT_GENERATION` | `1` Fuel / step |

### Monthly Plan Allocations (`PLAN_ALLOCATIONS`)
| Plan ID | Plan Name | Monthly Fuel | Unused Fuel Rollover |
| :--- | :--- | :--- | :--- |
| `free` | Super Basic | `200` Fuel / month | No |
| `basic` | Refined | `2,000` Fuel / month | Yes |
| `pro` | Outrageous | `12,000` Fuel / month | Yes |
