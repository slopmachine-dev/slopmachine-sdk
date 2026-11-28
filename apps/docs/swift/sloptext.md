---
description: Documentation and API reference for the Swift / SwiftUI SlopText view and programmatic SDK utilities.
---

# SwiftUI `SlopText` & Core Utilities

The `SlopMachine` Swift package provides `SlopText` for rendering AI-generated Markdown text in SwiftUI, alongside full programmatic Core utilities (`executePipeline`, `uploadTempAttachment`, `rateResult`, and URL builders).

## Basic Usage

```swift
import SwiftUI
import SlopMachine

struct ArticleSummaryView: View {
    var body: some View {
        SlopText(
            bucketId: "blog-post-bucket",
            model: "gemini-pro",
            variables: ["topic": "Swift 6 concurrency", "length": "short"],
            metadata: ["authorId": "usr_42"]
        )
    }
}
```

## Markdown Support

`SlopText` renders Markdown with Foundation's `AttributedString(markdown:)` using the `.inlineOnlyPreservingWhitespace` syntax, so only **inline** Markdown is styled: bold, italics, strikethrough, inline code and links. Line breaks are preserved, but block-level syntax is not rendered: headings, lists, block quotes, tables and fenced code blocks appear as plain text (e.g. a heading keeps its leading `#`). This differs from the React and Svelte `SlopText`, which render full Markdown to sanitized HTML. If you need block-level formatting, fetch the raw text with `fetchRenderedText` and render it with a Markdown library of your choice.

## Custom Loading & Error Fallbacks

```swift
import SwiftUI
import SlopMachine

struct HaikuView: View {
    var body: some View {
        SlopText(
            pipelineId: "pipe_live_abc123",
            prompt: "Write a whimsical haiku about quantum physics",
            onGenerationError: { error in
                print("SlopText failed (\(error.status ?? -1)): \(error.message)")
            }
        ) {
            ProgressView("Composing haiku...")
        } errorFallback: { error in
            Text("Failed to load text: \(error.message)")
                .foregroundStyle(.red)
        }
    }
}
```

## Programmatic Pipeline Execution, Attachments & Rating

All `@slopmachine/core` functions have direct async/await equivalents in `SlopMachine`:

```swift
import Foundation
import SlopMachine

// 1. Execute a multi-step pipeline synchronously
let result = try await executePipeline(
    ExecutePipelineOptions(
        pipelineId: "pipe_live_abc123",
        siloId: "silo_xyz",
        prompt: "A futuristic rooftop garden in Seoul",
        variables: ["season": "autumn"],
        metadata: ["requestId": "req_01"]
    )
)
print(result.id, result.url ?? "", result.totalFuelCost ?? 0)

// 2. Upload a temporary attachment (from Data or base64 String)
let uploaded = try await uploadTempAttachment(
    data: imageData,
    mimeType: "image/png"
)

// 3. Rate a generated result (Server-side / privileged use only)
let ratingResponse = try await rateResult(
    resultId: result.id,
    rating: .good,
    options: RateResultOptions(apiKey: ProcessInfo.processInfo.environment["SLOPMACHINE_API_KEY"] ?? "")
)
```
