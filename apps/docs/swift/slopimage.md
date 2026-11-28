---
description: Documentation and API reference for the Swift / SwiftUI SlopImage view.
---

# SwiftUI `SlopImage`

The `SlopMachine` Swift package provides native Swift and SwiftUI support for rendering AI-generated images across iOS 17+, macOS 14+, tvOS 17+, and visionOS 1+ with full Swift 6 strict concurrency (`Sendable`, `async`/`await`).

By default, `SlopImage` handles loading states with a built-in animated shimmer and loading spinner, reserves container dimensions via `aspectRatio` to prevent layout shifts, and fades in the rendered image once ready.

## Installation (Swift Package Manager)

Add `slopmachine-sdk` to your `Package.swift` dependencies:

```swift
dependencies: [
    .package(url: "https://github.com/slopmachine-dev/slopmachine-sdk.git", branch: "main")
],
targets: [
    .target(
        name: "MyApp",
        dependencies: [
            .product(name: "SlopMachine", package: "slopmachine-sdk")
        ]
    )
]
```

::: info
The Swift package is not tagged with SwiftPM-compatible versions yet (the repository's tags are npm changesets tags such as `@slopmachine/core@0.9.0`), so depend on the `main` branch for now. Versioned tags will come later.
:::

Or in Xcode: **File &rarr; Add Package Dependencies...** and enter `https://github.com/slopmachine-dev/slopmachine-sdk.git`.

## Basic Usage

Pass `bucketId` for pre-templated Buckets or `pipelineId` (with an optional runtime `prompt`) for multi-step Pipelines:

```swift
import SwiftUI
import SlopMachine

struct GalleryView: View {
    var body: some View {
        VStack(spacing: 16) {
            // Using a Bucket
            SlopImage(
                bucketId: "my-unique-bucket-id",
                aspectRatio: .square
            )
            .frame(width: 256)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            // Using a Pipeline with runtime prompt
            SlopImage(
                pipelineId: "pipe_live_abc123",
                prompt: "1960s retro robot eating pizza on Mars",
                aspectRatio: .landscape16x9,
                variables: ["theme": "cyberpunk"]
            )
        }
    }
}
```

## Custom Loading & Error Views

Override the default shimmer skeleton or error overlay using trailing `@ViewBuilder` closures, and receive structured API error details via `onGenerationError`:

```swift
import SwiftUI
import SlopMachine

struct AvatarView: View {
    var body: some View {
        SlopImage(
            bucketId: "user-avatar-bucket",
            aspectRatio: .square,
            model: "gemini-flash",
            variables: ["theme": "cyberpunk", "detail": 100],
            metadata: ["userId": "usr_123", "source": "profile-editor"],
            alt: "Generated user avatar",
            contentMode: .fill,
            onGenerationError: { error in
                print("SlopImage error (\(error.status ?? -1)): \(error.message)")
            }
        ) {
            ProgressView("Generating custom avatar...")
        } errorFallback: { error in
            VStack {
                Image(systemName: "exclamationmark.triangle")
                Text("Could not generate avatar: \(error.message)")
                    .font(.caption)
            }
        }
    }
}
```

## Preloading

Use `preloadImage` to warm the backend generation and `URLCache` before navigating to a view:

```swift
import SlopMachine

Task {
    try? await preloadImage(
        SlopImageOptions(
            bucketId: "my-unique-bucket-id",
            aspectRatio: .landscape16x9,
            variables: ["theme": "cyberpunk"]
        )
    )
}
```

## Parameters Reference

### `bucketId`
**Type:** `String?`
The unique identifier for a Slop Machine bucket. Required unless `pipelineId` is provided.

### `pipelineId`
**Type:** `String?`
The unique identifier for a Slop Machine multi-step pipeline.

### `siloId`
**Type:** `String?`
Optional silo identifier for direct pipeline resolution.

### `prompt`
**Type:** `String?`
Dynamic runtime prompt when targeting a `pipelineId`.

### `aspectRatio`
**Type:** `ImageAspectRatio` (Default: `.square` / `"1:1"`)
Supported cases: `.square` (`"1:1"`), `.portrait2x3` (`"2:3"`), `.landscape3x2` (`"3:2"`), `.portrait3x4` (`"3:4"`), `.landscape4x3` (`"4:3"`), `.portrait4x5` (`"4:5"`), `.landscape5x4` (`"5:4"`), `.portrait9x16` (`"9:16"`), `.landscape16x9` (`"16:9"`), `.ultrawide21x9` (`"21:9"`).

### `variables`
**Type:** `SlopVariables?`
Deterministic dictionary literal (`["theme": "dark", "n": 2]`) or `SlopVariables([String: SlopVariableValue])` interpolated into the prompt.

### `metadata`
**Type:** `SlopMetadata?`
Arbitrary JSON metadata (`["userId": "usr_123"]`) attached to the generation request and result document.

### `model` / `version` / `resultId` / `original` / `attachments` / `baseUrl`
Bucket configuration overrides and endpoint customization matching `@slopmachine/core`.

### `alt`
**Type:** `String` (Default: `"Image produced by Slop Machine (slopmachine.dev)"`)
Accessibility label applied to the rendered image. Pass `""` to mark the image as decorative (`.accessibilityHidden(true)`).

### `contentMode`
**Type:** `ContentMode` (Default: `.fill`)
Controls how the image scales inside the reserved aspect ratio frame (`.fill` or `.fit`).
