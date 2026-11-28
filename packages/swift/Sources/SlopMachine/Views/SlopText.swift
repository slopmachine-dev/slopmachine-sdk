import Foundation
import SwiftUI

/// Parses Markdown text into a safe Swift `AttributedString`.
///
/// Uses Foundation's native Markdown parser, which ignores raw HTML tags and active scripts,
/// and falls back to a plain `AttributedString` if parsing fails.
///
/// - Important: Parsing uses `.inlineOnlyPreservingWhitespace`, so only inline syntax (bold, italics,
///   strikethrough, inline code, links) is styled. Block-level syntax such as headings, lists, block
///   quotes, tables and fenced code blocks is shown as plain text, unlike the React and Svelte
///   `SlopText`, which render full Markdown to sanitized HTML.
///
/// - Parameter markdown: The Markdown string returned by `fetchRenderedText`.
/// - Returns: A parsed `AttributedString`.
public func renderMarkdownAttributedString(_ markdown: String) -> AttributedString {
    guard !markdown.isEmpty else { return AttributedString() }
    let options = AttributedString.MarkdownParsingOptions(
        interpretedSyntax: .inlineOnlyPreservingWhitespace
    )
    if let attributed = try? AttributedString(markdown: markdown, options: options) {
        return attributed
    }
    return AttributedString(markdown)
}

/// Renders AI-generated text (Markdown) from Slop Machine with automatic loading and error states.
///
/// Only inline Markdown is styled (see `renderMarkdownAttributedString(_:)`); headings, lists and
/// code blocks are displayed as plain text.
///
/// Supports both pre-templated Buckets (`bucketId`) and multi-step Pipelines (`pipelineId` + `prompt`).
///
/// ```swift
/// // Bucket mode
/// SlopText(
///     bucketId: "my-text-bucket",
///     variables: ["topic": "SwiftUI"]
/// )
///
/// // Pipeline mode with custom fallback and error views
/// SlopText(
///     pipelineId: "pipe_live_abc123",
///     prompt: "Write a whimsical haiku about quantum physics"
/// ) {
///     ProgressView("Writing haiku...")
/// } errorFallback: { error in
///     Text("Failed: \(error.message)")
/// }
/// ```
///
/// @version 1.0.0
public struct SlopText<FallbackView: View, FailureView: View>: View {
    public let options: SlopTextOptions
    public let onGenerationError: (@Sendable (SlopMachineError) -> Void)?
    private let fallbackBuilder: () -> FallbackView
    private let errorFallbackBuilder: (SlopMachineError) -> FailureView

    @State private var text: String?
    @State private var isLoading: Bool = true
    @State private var error: SlopMachineError?

    /// Creates a `SlopText` view with custom `@ViewBuilder` loading fallback and error fallback views.
    public init(
        options: SlopTextOptions,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder fallback: @escaping () -> FallbackView,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.options = options
        self.onGenerationError = onGenerationError
        self.fallbackBuilder = fallback
        self.errorFallbackBuilder = errorFallback
    }

    /// Creates a `SlopText` view using direct parameters with custom `@ViewBuilder` loading fallback and error fallback views.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        model: String? = nil,
        variables: SlopVariables? = nil,
        baseUrl: String? = nil,
        attachments: [String]? = nil,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder fallback: @escaping () -> FallbackView,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.init(
            options: SlopTextOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                model: model,
                variables: variables,
                baseUrl: baseUrl,
                attachments: attachments
            ),
            onGenerationError: onGenerationError,
            fallback: fallback,
            errorFallback: errorFallback
        )
    }

    private var rawUrlString: String {
        buildTextUrlString(options)
    }

    public var body: some View {
        Group {
            if let error {
                errorFallbackBuilder(error)
            } else if isLoading {
                fallbackBuilder()
            } else if let text {
                Text(renderMarkdownAttributedString(text))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .task(id: rawUrlString) {
            await loadText(from: rawUrlString)
        }
    }

    @MainActor
    private func loadText(from urlString: String) async {
        isLoading = true
        error = nil

        do {
            let content = try await fetchRenderedText(urlString)
            guard !Task.isCancelled else { return }
            text = content
            isLoading = false
        } catch {
            if isSlopCancellationError(error) || Task.isCancelled {
                return
            }
            let finalError = (error as? SlopMachineError) ?? SlopMachineError("Failed to load text")
            self.error = finalError
            self.isLoading = false
            onGenerationError?(finalError)
        }
    }
}

extension SlopText where FallbackView == AnyView, FailureView == AnyView {
    /// Creates a `SlopText` view using the default shimmer loading overlay and default error overlay.
    public init(
        options: SlopTextOptions,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil
    ) {
        self.init(
            options: options,
            onGenerationError: onGenerationError,
            fallback: {
                AnyView(
                    SlopLoadingOverlay()
                        .frame(minHeight: 100)
                )
            },
            errorFallback: { error in
                AnyView(
                    SlopDefaultErrorView(error: error, label: "Failed to load text")
                        .frame(minHeight: 100)
                )
            }
        )
    }

    /// Creates a `SlopText` view using direct parameters with the default shimmer loading overlay and default error overlay.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        model: String? = nil,
        variables: SlopVariables? = nil,
        baseUrl: String? = nil,
        attachments: [String]? = nil,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil
    ) {
        self.init(
            options: SlopTextOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                model: model,
                variables: variables,
                baseUrl: baseUrl,
                attachments: attachments
            ),
            onGenerationError: onGenerationError
        )
    }
}

extension SlopText where FailureView == AnyView {
    /// Creates a `SlopText` view with a custom `@ViewBuilder` loading fallback and the default error overlay.
    public init(
        options: SlopTextOptions,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder fallback: @escaping () -> FallbackView
    ) {
        self.init(
            options: options,
            onGenerationError: onGenerationError,
            fallback: fallback,
            errorFallback: { error in
                AnyView(
                    SlopDefaultErrorView(error: error, label: "Failed to load text")
                        .frame(minHeight: 100)
                )
            }
        )
    }

    /// Creates a `SlopText` view using direct parameters with a custom `@ViewBuilder` loading fallback.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        model: String? = nil,
        variables: SlopVariables? = nil,
        baseUrl: String? = nil,
        attachments: [String]? = nil,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder fallback: @escaping () -> FallbackView
    ) {
        self.init(
            options: SlopTextOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                model: model,
                variables: variables,
                baseUrl: baseUrl,
                attachments: attachments
            ),
            onGenerationError: onGenerationError,
            fallback: fallback
        )
    }
}

extension SlopText where FallbackView == AnyView {
    /// Creates a `SlopText` view with the default shimmer loading overlay and a custom `@ViewBuilder` error fallback.
    public init(
        options: SlopTextOptions,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.init(
            options: options,
            onGenerationError: onGenerationError,
            fallback: {
                AnyView(
                    SlopLoadingOverlay()
                        .frame(minHeight: 100)
                )
            },
            errorFallback: errorFallback
        )
    }

    /// Creates a `SlopText` view using direct parameters with a custom `@ViewBuilder` error fallback.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        model: String? = nil,
        variables: SlopVariables? = nil,
        baseUrl: String? = nil,
        attachments: [String]? = nil,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.init(
            options: SlopTextOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                model: model,
                variables: variables,
                baseUrl: baseUrl,
                attachments: attachments
            ),
            onGenerationError: onGenerationError,
            errorFallback: errorFallback
        )
    }
}
