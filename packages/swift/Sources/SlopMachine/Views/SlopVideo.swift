import AVFoundation
import AVKit
import Foundation
import SwiftUI

#if canImport(UIKit)
import UIKit

@MainActor
private struct SlopPlayerLayerRepresentable: UIViewRepresentable {
    let player: AVPlayer
    let contentMode: ContentMode

    func makeUIView(context: Context) -> PlayerLayerView {
        let view = PlayerLayerView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = contentMode == .fill ? .resizeAspectFill : .resizeAspect
        return view
    }

    func updateUIView(_ uiView: PlayerLayerView, context: Context) {
        uiView.playerLayer.player = player
        uiView.playerLayer.videoGravity = contentMode == .fill ? .resizeAspectFill : .resizeAspect
    }

    final class PlayerLayerView: UIView {
        override static var layerClass: AnyClass {
            AVPlayerLayer.self
        }

        var playerLayer: AVPlayerLayer {
            // swiftlint:disable:next force_cast
            layer as! AVPlayerLayer
        }
    }
}
#elseif canImport(AppKit)
import AppKit

@MainActor
private struct SlopPlayerLayerRepresentable: NSViewRepresentable {
    let player: AVPlayer
    let contentMode: ContentMode

    func makeNSView(context: Context) -> PlayerLayerNSView {
        let view = PlayerLayerNSView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = contentMode == .fill ? .resizeAspectFill : .resizeAspect
        return view
    }

    func updateNSView(_ nsView: PlayerLayerNSView, context: Context) {
        nsView.playerLayer.player = player
        nsView.playerLayer.videoGravity = contentMode == .fill ? .resizeAspectFill : .resizeAspect
    }

    final class PlayerLayerNSView: NSView {
        let playerLayer = AVPlayerLayer()

        override init(frame frameRect: NSRect) {
            super.init(frame: frameRect)
            wantsLayer = true
            layer = playerLayer
        }

        @available(*, unavailable)
        required init?(coder: NSCoder) {
            fatalError("init(coder:) has not been implemented")
        }
    }
}
#endif

/// Renders an AI-generated video from Slop Machine with automatic aspect ratio reservation,
/// animated shimmer loading state, seamless looping, and structured API error reporting.
///
/// Supports both pre-templated Buckets (`bucketId`) and multi-step Pipelines (`pipelineId` + `prompt`).
///
/// ```swift
/// // Bucket mode
/// SlopVideo(
///     bucketId: "my-video-bucket",
///     aspectRatio: .landscape16x9,
///     autoPlay: true,
///     loop: true,
///     muted: true
/// )
///
/// // Pipeline mode
/// SlopVideo(
///     pipelineId: "pipe_live_abc123",
///     prompt: "Drone shot of a cyberpunk city in rain",
///     aspectRatio: .landscape16x9
/// )
/// ```
///
/// @version 1.0.0
public struct SlopVideo<LoaderView: View, FailureView: View>: View {
    public let options: SlopVideoOptions
    public let contentMode: ContentMode
    public let autoPlay: Bool
    public let loop: Bool
    public let muted: Bool
    public let controls: Bool
    public let onGenerationError: (@Sendable (SlopMachineError) -> Void)?
    private let loaderBuilder: () -> LoaderView
    private let errorFallbackBuilder: (SlopMachineError) -> FailureView

    @State private var debouncedUrlString: String
    @State private var player: AVQueuePlayer?
    @State private var looper: AVPlayerLooper?
    @State private var isLoading: Bool = true
    @State private var error: SlopMachineError?

    /// Creates a `SlopVideo` with custom `@ViewBuilder` loader and error fallback views.
    public init(
        options: SlopVideoOptions,
        contentMode: ContentMode = .fill,
        autoPlay: Bool = true,
        loop: Bool = true,
        muted: Bool = true,
        controls: Bool = false,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder loader: @escaping () -> LoaderView,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.options = options
        self.contentMode = contentMode
        self.autoPlay = autoPlay
        self.loop = loop
        self.muted = muted
        self.controls = controls
        self.onGenerationError = onGenerationError
        self.loaderBuilder = loader
        self.errorFallbackBuilder = errorFallback
        self._debouncedUrlString = State(initialValue: buildVideoUrlString(options))
    }

    /// Creates a `SlopVideo` using direct parameters with custom `@ViewBuilder` loader and error fallback views.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        aspectRatio: VideoAspectRatio = .landscape16x9,
        variables: SlopVariables? = nil,
        duration: Int? = nil,
        baseUrl: String? = nil,
        original: Bool? = nil,
        attachments: [String]? = nil,
        contentMode: ContentMode = .fill,
        autoPlay: Bool = true,
        loop: Bool = true,
        muted: Bool = true,
        controls: Bool = false,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder loader: @escaping () -> LoaderView,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.init(
            options: SlopVideoOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                aspectRatio: aspectRatio,
                variables: variables,
                duration: duration,
                baseUrl: baseUrl,
                original: original,
                attachments: attachments
            ),
            contentMode: contentMode,
            autoPlay: autoPlay,
            loop: loop,
            muted: muted,
            controls: controls,
            onGenerationError: onGenerationError,
            loader: loader,
            errorFallback: errorFallback
        )
    }

    private var rawUrlString: String {
        buildVideoUrlString(options)
    }

    public var body: some View {
        ZStack {
            Color.clear

            if let player, error == nil {
                Group {
                    if controls {
                        VideoPlayer(player: player)
                    } else {
                        SlopPlayerLayerRepresentable(player: player, contentMode: contentMode)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipped()
                .opacity(isLoading ? 0 : 1)
                .animation(.easeInOut(duration: 0.5), value: isLoading)
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
            await loadCurrentVideo(urlString: debouncedUrlString)
        }
        .onDisappear {
            player?.pause()
        }
    }

    @MainActor
    private func loadCurrentVideo(urlString: String) async {
        player?.pause()
        player = nil
        looper = nil
        isLoading = true
        error = nil

        let errorCallback = onGenerationError
        let monitor = RenderUrlMonitor { reportedError, _ in
            Task { @MainActor in
                self.player?.pause()
                self.isLoading = false
                self.error = reportedError
                errorCallback?(reportedError)
            }
        }

        monitor.watch(urlString)

        guard let url = URL(string: urlString) else {
            monitor.mediaFailed(urlString, fallbackMessage: "Failed to load video")
            await monitor.flush()
            monitor.stop()
            return
        }

        let asset = AVURLAsset(url: url)
        do {
            let isPlayable = try await asset.load(.isPlayable)
            guard !Task.isCancelled else {
                monitor.stop()
                return
            }
            guard isPlayable else {
                monitor.mediaFailed(urlString, fallbackMessage: "Failed to load video")
                await monitor.flush()
                monitor.stop()
                return
            }

            let item = AVPlayerItem(asset: asset)
            let queuePlayer = AVQueuePlayer()
            queuePlayer.isMuted = muted
            if loop {
                looper = AVPlayerLooper(player: queuePlayer, templateItem: item)
            } else {
                queuePlayer.insert(item, after: nil)
            }

            player = queuePlayer
            isLoading = false
            if autoPlay {
                queuePlayer.play()
            }
            monitor.stop()
        } catch {
            if isSlopCancellationError(error) || Task.isCancelled {
                monitor.stop()
                return
            }
            monitor.mediaFailed(urlString, fallbackMessage: "Failed to load video")
            await monitor.flush()
            monitor.stop()
        }
    }
}

extension SlopVideo where LoaderView == SlopLoadingOverlay, FailureView == SlopDefaultErrorView {
    /// Creates a `SlopVideo` using the default shimmer loader and default error overlay.
    public init(
        options: SlopVideoOptions,
        contentMode: ContentMode = .fill,
        autoPlay: Bool = true,
        loop: Bool = true,
        muted: Bool = true,
        controls: Bool = false,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil
    ) {
        self.init(
            options: options,
            contentMode: contentMode,
            autoPlay: autoPlay,
            loop: loop,
            muted: muted,
            controls: controls,
            onGenerationError: onGenerationError,
            loader: { SlopLoadingOverlay() },
            errorFallback: { SlopDefaultErrorView(error: $0, label: "Failed to load video") }
        )
    }

    /// Creates a `SlopVideo` using direct parameters with the default shimmer loader and default error overlay.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        aspectRatio: VideoAspectRatio = .landscape16x9,
        variables: SlopVariables? = nil,
        duration: Int? = nil,
        baseUrl: String? = nil,
        original: Bool? = nil,
        attachments: [String]? = nil,
        contentMode: ContentMode = .fill,
        autoPlay: Bool = true,
        loop: Bool = true,
        muted: Bool = true,
        controls: Bool = false,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil
    ) {
        self.init(
            options: SlopVideoOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                aspectRatio: aspectRatio,
                variables: variables,
                duration: duration,
                baseUrl: baseUrl,
                original: original,
                attachments: attachments
            ),
            contentMode: contentMode,
            autoPlay: autoPlay,
            loop: loop,
            muted: muted,
            controls: controls,
            onGenerationError: onGenerationError
        )
    }
}

extension SlopVideo where FailureView == SlopDefaultErrorView {
    /// Creates a `SlopVideo` with a custom `@ViewBuilder` loader and the default error overlay.
    public init(
        options: SlopVideoOptions,
        contentMode: ContentMode = .fill,
        autoPlay: Bool = true,
        loop: Bool = true,
        muted: Bool = true,
        controls: Bool = false,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder loader: @escaping () -> LoaderView
    ) {
        self.init(
            options: options,
            contentMode: contentMode,
            autoPlay: autoPlay,
            loop: loop,
            muted: muted,
            controls: controls,
            onGenerationError: onGenerationError,
            loader: loader,
            errorFallback: { SlopDefaultErrorView(error: $0, label: "Failed to load video") }
        )
    }

    /// Creates a `SlopVideo` using direct parameters with a custom `@ViewBuilder` loader.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        aspectRatio: VideoAspectRatio = .landscape16x9,
        variables: SlopVariables? = nil,
        duration: Int? = nil,
        baseUrl: String? = nil,
        original: Bool? = nil,
        attachments: [String]? = nil,
        contentMode: ContentMode = .fill,
        autoPlay: Bool = true,
        loop: Bool = true,
        muted: Bool = true,
        controls: Bool = false,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder loader: @escaping () -> LoaderView
    ) {
        self.init(
            options: SlopVideoOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                aspectRatio: aspectRatio,
                variables: variables,
                duration: duration,
                baseUrl: baseUrl,
                original: original,
                attachments: attachments
            ),
            contentMode: contentMode,
            autoPlay: autoPlay,
            loop: loop,
            muted: muted,
            controls: controls,
            onGenerationError: onGenerationError,
            loader: loader
        )
    }
}

extension SlopVideo where LoaderView == SlopLoadingOverlay {
    /// Creates a `SlopVideo` with the default shimmer loader and a custom `@ViewBuilder` error fallback.
    public init(
        options: SlopVideoOptions,
        contentMode: ContentMode = .fill,
        autoPlay: Bool = true,
        loop: Bool = true,
        muted: Bool = true,
        controls: Bool = false,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.init(
            options: options,
            contentMode: contentMode,
            autoPlay: autoPlay,
            loop: loop,
            muted: muted,
            controls: controls,
            onGenerationError: onGenerationError,
            loader: { SlopLoadingOverlay() },
            errorFallback: errorFallback
        )
    }

    /// Creates a `SlopVideo` using direct parameters with a custom `@ViewBuilder` error fallback.
    public init(
        bucketId: String? = nil,
        pipelineId: String? = nil,
        siloId: String? = nil,
        prompt: String? = nil,
        metadata: SlopMetadata? = nil,
        version: Int? = nil,
        resultId: String? = nil,
        aspectRatio: VideoAspectRatio = .landscape16x9,
        variables: SlopVariables? = nil,
        duration: Int? = nil,
        baseUrl: String? = nil,
        original: Bool? = nil,
        attachments: [String]? = nil,
        contentMode: ContentMode = .fill,
        autoPlay: Bool = true,
        loop: Bool = true,
        muted: Bool = true,
        controls: Bool = false,
        onGenerationError: (@Sendable (SlopMachineError) -> Void)? = nil,
        @ViewBuilder errorFallback: @escaping (SlopMachineError) -> FailureView
    ) {
        self.init(
            options: SlopVideoOptions(
                bucketId: bucketId,
                pipelineId: pipelineId,
                siloId: siloId,
                prompt: prompt,
                metadata: metadata,
                version: version,
                resultId: resultId,
                aspectRatio: aspectRatio,
                variables: variables,
                duration: duration,
                baseUrl: baseUrl,
                original: original,
                attachments: attachments
            ),
            contentMode: contentMode,
            autoPlay: autoPlay,
            loop: loop,
            muted: muted,
            controls: controls,
            onGenerationError: onGenerationError,
            errorFallback: errorFallback
        )
    }
}
