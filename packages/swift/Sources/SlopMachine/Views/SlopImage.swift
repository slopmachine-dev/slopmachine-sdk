import Foundation
import SwiftUI

#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// Default constants for `SlopImage`.
public enum SlopImageDefaults {
    /// Default accessibility label for images rendered by `SlopImage`.
    public static let defaultAlt = "Image produced by Slop Machine (slopmachine.dev)"
}

/// Decodes raw image `Data` into a SwiftUI `Image`.
internal func makeSwiftUIImage(from data: Data) -> Image? {
    #if canImport(UIKit)
    guard let uiImage = UIImage(data: data) else { return nil }
    return Image(uiImage: uiImage)
    #elseif canImport(AppKit)
    guard let nsImage = NSImage(data: data) else { return nil }
    return Image(nsImage: nsImage)
    #else
    return nil
    #endif
}

/// Renders an AI-generated image from Slop Machine with automatic aspect ratio reservation,
/// animated shimmer loading state, and structured API error reporting.
///
/// Supports both pre-templated Buckets (`bucketId`) and multi-step Pipelines (`pipelineId` + `prompt`).
///
/// ```swift
/// // Bucket mode
/// SlopImage(
///     bucketId: "my-avatar-bucket",
///     aspectRatio: .square,
///     variables: ["theme": "cyberpunk"]
/// )
///
/// // Pipeline mode with custom loader and error fallback
/// SlopImage(
///     pipelineId: "pipe_live_abc123",
///     prompt: "1960s retro robot eating pizza on Mars",
///     aspectRatio: .landscape16x9
/// ) {
///     ProgressView("Generating scene...")
/// } errorFallback: { error in
///     Text("Failed: \(error.message)")
/// }
/// ```
///
/// @version 1.0.0
public struct SlopImage<LoaderView: View, FailureView: View>: View {
    public let options: SlopImageOptions
    public let alt: String
    public let contentMode: ContentMode
    public let onGenerationError: (@Sendable (SlopMachineError) -> Void)?
    private let loaderBuilder: () -> LoaderView
    private let errorFallbackBuilder: (SlopMachineError) -> FailureView

    @State private var debouncedUrlString: String
    @State private var loadedImage: Image?
    @State private var isLoading: Bool = true
    @State private var error: SlopMachineError?
    // Identifies the load whose errors may still be applied; a newer load replaces it.
    @State private var activeLoadId: UUID?

    /// Creates a `SlopImage` with custom `@ViewBuilder` loader and error fallback views.
    public init(
        options: SlopImageOptions,
        alt: String = SlopImageDefaults.defaultAlt,
        contentMode: ContentMode = .fill,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder loader: @escaping () -> LoaderView,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.options = options
        self.alt = alt
        self.contentMode = contentMode
        self.onGenerationError = onGenerationError
        self.loaderBuilder = loader
        self.errorFallbackBuilder = errorFallback
        self._debouncedUrlString = State(initialValue: buildImageUrlString(options))
    }

    /// Creates a `SlopImage` using direct parameters with custom `@ViewBuilder` loader and error fallback views.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        aspectRatio: ImageAspectRatio = .square,
        model: String? = nil,
        variables: SlopVariables? = nil,
        baseUrl: String? = nil,
        original: Bool? = nil,
        attachments: [String]? = nil,
        alt: String = SlopImageDefaults.defaultAlt,
        contentMode: ContentMode = .fill,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder loader: @escaping () -> LoaderView,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.init(
            options: SlopImageOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                aspectRatio: aspectRatio,
                model: model,
                variables: variables,
                baseUrl: baseUrl,
                original: original,
                attachments: attachments
            ),
            alt: alt,
            contentMode: contentMode,
            onGenerationError: onGenerationError,
            loader: loader,
            errorFallback: errorFallback
        )
    }

    private var rawUrlString: String {
        buildImageUrlString(options)
    }

    public var body: some View {
        ZStack {
            Color.clear

            if let loadedImage, error == nil {
                loadedImage
                    .resizable()
                    .aspectRatio(contentMode: contentMode)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipped()
                    .opacity(isLoading ? 0 : 1)
                    .animation(.easeInOut(duration: 0.5), value: isLoading)
                    .accessibilityLabel(Text(alt))
                    .accessibilityHidden(alt.isEmpty)
            }

            if isLoading && error == nil {
                loaderBuilder()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.opacity.animation(.easeInOut(duration: 0.3)))
            }

            if let error {
                errorFallbackBuilder(error)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .aspectRatio(options.aspectRatio.cgFloatRatio, contentMode: .fit)
        .clipped()
        .task(id: rawUrlString) {
            if debouncedUrlString != rawUrlString {
                try? await Task.sleep(for: .milliseconds(100))
                guard !Task.isCancelled else { return }
                debouncedUrlString = rawUrlString
            }
        }
        .task(id: debouncedUrlString) {
            await loadCurrentImage(urlString: debouncedUrlString)
        }
    }

    @MainActor
    private func loadCurrentImage(urlString: String) async {
        isLoading = true
        error = nil
        loadedImage = nil
        let loadId = UUID()
        activeLoadId = loadId

        let errorCallback = onGenerationError
        let monitor = RenderUrlMonitor { reportedError, reportedUrl in
            Task { @MainActor in
                // The hop to the main actor can land after the URL changed; drop stale errors.
                guard self.activeLoadId == loadId,
                      self.debouncedUrlString == urlString,
                      reportedUrl == urlString
                else { return }
                self.isLoading = false
                self.error = reportedError
                errorCallback?(reportedError)
            }
        }

        monitor.watch(urlString)

        guard let url = URL(string: urlString) else {
            monitor.mediaFailed(urlString, fallbackMessage: "Failed to load image")
            await monitor.flush()
            monitor.stop()
            return
        }

        do {
            let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
            let (data, response) = try await URLSession.shared.data(for: request)
            guard !Task.isCancelled else {
                monitor.stop()
                return
            }

            if let httpResponse = response as? HTTPURLResponse,
               (200..<300).contains(httpResponse.statusCode),
               let decodedImage = makeSwiftUIImage(from: data)
            {
                loadedImage = decodedImage
                isLoading = false
                monitor.stop()
            } else {
                monitor.mediaFailed(urlString, fallbackMessage: "Failed to load image")
                await monitor.flush()
                monitor.stop()
            }
        } catch {
            if isSlopCancellationError(error) || Task.isCancelled {
                monitor.stop()
                return
            }
            monitor.mediaFailed(urlString, fallbackMessage: "Failed to load image")
            await monitor.flush()
            monitor.stop()
        }
    }
}

extension SlopImage where LoaderView == SlopLoadingOverlay, FailureView == SlopDefaultErrorView {
    /// Creates a `SlopImage` using the default shimmer loader and default error overlay.
    public init(
        options: SlopImageOptions,
        alt: String = SlopImageDefaults.defaultAlt,
        contentMode: ContentMode = .fill,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil
    ) {
        self.init(
            options: options,
            alt: alt,
            contentMode: contentMode,
            onGenerationError: onGenerationError,
            loader: { SlopLoadingOverlay() },
            errorFallback: { SlopDefaultErrorView(error: $0, label: "Failed to load image") }
        )
    }

    /// Creates a `SlopImage` using direct parameters with the default shimmer loader and default error overlay.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        aspectRatio: ImageAspectRatio = .square,
        model: String? = nil,
        variables: SlopVariables? = nil,
        baseUrl: String? = nil,
        original: Bool? = nil,
        attachments: [String]? = nil,
        alt: String = SlopImageDefaults.defaultAlt,
        contentMode: ContentMode = .fill,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil
    ) {
        self.init(
            options: SlopImageOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                aspectRatio: aspectRatio,
                model: model,
                variables: variables,
                baseUrl: baseUrl,
                original: original,
                attachments: attachments
            ),
            alt: alt,
            contentMode: contentMode,
            onGenerationError: onGenerationError
        )
    }
}

extension SlopImage where FailureView == SlopDefaultErrorView {
    /// Creates a `SlopImage` with a custom `@ViewBuilder` loader and the default error overlay.
    public init(
        options: SlopImageOptions,
        alt: String = SlopImageDefaults.defaultAlt,
        contentMode: ContentMode = .fill,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder loader: @escaping () -> LoaderView
    ) {
        self.init(
            options: options,
            alt: alt,
            contentMode: contentMode,
            onGenerationError: onGenerationError,
            loader: loader,
            errorFallback: { SlopDefaultErrorView(error: $0, label: "Failed to load image") }
        )
    }

    /// Creates a `SlopImage` using direct parameters with a custom `@ViewBuilder` loader.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        aspectRatio: ImageAspectRatio = .square,
        model: String? = nil,
        variables: SlopVariables? = nil,
        baseUrl: String? = nil,
        original: Bool? = nil,
        attachments: [String]? = nil,
        alt: String = SlopImageDefaults.defaultAlt,
        contentMode: ContentMode = .fill,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder loader: @escaping () -> LoaderView
    ) {
        self.init(
            options: SlopImageOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                aspectRatio: aspectRatio,
                model: model,
                variables: variables,
                baseUrl: baseUrl,
                original: original,
                attachments: attachments
            ),
            alt: alt,
            contentMode: contentMode,
            onGenerationError: onGenerationError,
            loader: loader
        )
    }
}

extension SlopImage where LoaderView == SlopLoadingOverlay {
    /// Creates a `SlopImage` with the default shimmer loader and a custom `@ViewBuilder` error fallback.
    public init(
        options: SlopImageOptions,
        alt: String = SlopImageDefaults.defaultAlt,
        contentMode: ContentMode = .fill,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.init(
            options: options,
            alt: alt,
            contentMode: contentMode,
            onGenerationError: onGenerationError,
            loader: { SlopLoadingOverlay() },
            errorFallback: errorFallback
        )
    }

    /// Creates a `SlopImage` using direct parameters with a custom `@ViewBuilder` error fallback.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        aspectRatio: ImageAspectRatio = .square,
        model: String? = nil,
        variables: SlopVariables? = nil,
        baseUrl: String? = nil,
        original: Bool? = nil,
        attachments: [String]? = nil,
        alt: String = SlopImageDefaults.defaultAlt,
        contentMode: ContentMode = .fill,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.init(
            options: SlopImageOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                aspectRatio: aspectRatio,
                model: model,
                variables: variables,
                baseUrl: baseUrl,
                original: original,
                attachments: attachments
            ),
            alt: alt,
            contentMode: contentMode,
            onGenerationError: onGenerationError,
            errorFallback: errorFallback
        )
    }
}
