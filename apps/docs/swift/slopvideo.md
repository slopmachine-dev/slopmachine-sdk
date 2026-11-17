---
description: Documentation and API reference for the Swift / SwiftUI SlopVideo view.
---

# SwiftUI `SlopVideo`

The `SlopMachine` Swift package provides `SlopVideo` for rendering AI-generated videos in SwiftUI across iOS 17+, macOS 14+, tvOS 17+, and visionOS 1+.

By default, `SlopVideo` reserves layout space using `aspectRatio`, shows a built-in animated shimmer and loading spinner while the video is generating, and plays the resulting video seamlessly using `AVQueuePlayer` and `AVPlayerLooper`.

## Basic Usage

```swift
import SwiftUI
import SlopMachine

struct HeroVideoView: View {
    var body: some View {
        SlopVideo(
            bucketId: "my-unique-video-bucket",
            aspectRatio: .landscape16x9,
            autoPlay: true,
            loop: true,
            muted: true
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
```

## Advanced Usage with Pipelines & Error Handling

```swift
import SwiftUI
import SlopMachine

struct PromoVideoView: View {
    var body: some View {
        SlopVideo(
            pipelineId: "pipe_live_abc123",
            prompt: "Drone shot of a cyberpunk city in rain",
            metadata: ["campaign": "summer_launch"],
            aspectRatio: .portrait9x16,
            autoPlay: true,
            loop: true,
            muted: true,
            controls: false,
            onGenerationError: { error in
                print("SlopVideo error (\(error.status ?? -1)): \(error.message)")
            }
        ) {
            ProgressView("Generating custom video...")
        } errorFallback: { error in
            Text("Couldn't generate video: \(error.message)")
        }
    }
}
```

## Preloading

Use `preloadVideo` to warm the backend generation cache and `AVURLAsset` playable metadata ahead of presentation:

```swift
import SlopMachine

Task {
    try? await preloadVideo(
        SlopVideoOptions(
            bucketId: "my-unique-video-bucket",
            aspectRatio: .landscape16x9
        )
    )
}
```

## Parameters Reference

### `bucketId` / `pipelineId` / `siloId` / `prompt`
Target a pre-templated Bucket (`bucketId`) or a multi-step Pipeline (`pipelineId` + `prompt`).

### `aspectRatio`
**Type:** `VideoAspectRatio` (Default: `.landscape16x9` / `"16:9"`)
Supported cases: `.landscape16x9` (`"16:9"`), `.portrait9x16` (`"9:16"`).

### `duration`
**Type:** `Int?`
Duration of the generated video in seconds (for Buckets).

### `autoPlay` / `loop` / `muted` / `controls`
**Types:** `Bool` (Defaults: `autoPlay = true`, `loop = true`, `muted = true`, `controls = false`)
Controls playback behavior and whether native system player controls (`VideoPlayer`) are displayed.

### `contentMode`
**Type:** `ContentMode` (Default: `.fill`)
Maps to `AVLayerVideoGravity.resizeAspectFill` (`.fill`) or `.resizeAspect` (`.fit`).
