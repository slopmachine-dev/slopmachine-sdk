import Foundation

/// Low-level monitor that coordinates the `HEAD` warm-up check and media element failure events for a render URL.
///
/// A failing render URL is noticed twice: by `checkRenderUrl` (which can read the API's JSON error detail)
/// and by the media view/player failure callback (which often fires first but carries no HTTP status or JSON detail).
/// `RenderUrlMonitor` shares a single in-flight check per URL between both paths, reports at most one error per URL,
/// and drops stale results when the watched URL changes or `stop()` is called.
public final class RenderUrlMonitor: @unchecked Sendable {
    public typealias ErrorHandler = @Sendable (SlopMachineError, String) -> Void

    private struct CurrentCheck {
        let id: UUID
        let url: String
        let checkTask: Task<SlopMachineError?, Never>
    }

    private let lock = NSLock()
    private let session: URLSession
    private let onError: ErrorHandler
    private var current: CurrentCheck?
    private var reportedUrl: String?
    private var listenerTasks: [Task<Void, Never>] = []

    /// Creates a new `RenderUrlMonitor`.
    /// - Parameters:
    ///   - session: The `URLSession` used for `checkRenderUrl` requests (defaults to `.shared`).
    ///   - onError: Callback invoked at most once per watched URL with the resolved `SlopMachineError` and URL string.
    public init(
        session: URLSession = .shared,
        onError: @escaping ErrorHandler
    ) {
        self.session = session
        self.onError = onError
    }

    /// Starts checking `url`, cancelling any in-flight check for a different URL.
    /// Reports an error if the API rejects the URL.
    public func watch(_ url: String) {
        let check = lock.withLock { () -> CurrentCheck in
            if current?.url != url {
                current?.checkTask.cancel()
                current = nil
                reportedUrl = nil
            }
            return ensureCheckLocked(for: url)
        }

        let listener = Task { [weak self] in
            let apiError = await check.checkTask.value
            guard let self, let apiError else { return }
            self.report(apiError, for: url, checkId: check.id)
        }
        lock.withLock {
            listenerTasks.append(listener)
        }
    }

    /// Starts checking `url` (`URL` overload).
    public func watch(_ url: URL) {
        watch(url.absoluteString)
    }

    /// Called when the image or video view fails to load `url`.
    ///
    /// Awaits the shared URL check so the API's error message and HTTP `status` are reported
    /// when available, falling back to `SlopMachineError(fallbackMessage)`.
    public func mediaFailed(_ url: String, fallbackMessage: String) {
        let check = lock.withLock { () -> CurrentCheck in
            ensureCheckLocked(for: url)
        }

        let listener = Task { [weak self] in
            let apiError = await check.checkTask.value
            guard let self else { return }
            self.report(
                apiError ?? SlopMachineError(fallbackMessage),
                for: url,
                checkId: check.id
            )
        }
        lock.withLock {
            listenerTasks.append(listener)
        }
    }

    /// Called when the image or video view fails to load `url` (`URL` overload).
    public func mediaFailed(_ url: URL, fallbackMessage: String) {
        mediaFailed(url.absoluteString, fallbackMessage: fallbackMessage)
    }

    /// Cancels the current check and discards any pending results for it.
    public func stop() {
        let taskToCancel = lock.withLock { () -> Task<SlopMachineError?, Never>? in
            let existing = current?.checkTask
            current = nil
            return existing
        }
        taskToCancel?.cancel()
    }

    /// Waits for all currently scheduled check and listener tasks to settle.
    public func flush() async {
        let (checkTask, tasks) = lock.withLock {
            (current?.checkTask, listenerTasks)
        }
        _ = await checkTask?.value
        for task in tasks {
            await task.value
        }
    }

    private func ensureCheckLocked(for url: String) -> CurrentCheck {
        if let existing = current, existing.url == url {
            return existing
        }
        current?.checkTask.cancel()
        let session = self.session
        let checkId = UUID()
        let checkTask = Task<SlopMachineError?, Never> {
            do {
                try await checkRenderUrl(url, session: session)
                return nil
            } catch let slopError as SlopMachineError {
                return slopError
            } catch {
                // Network, CORS, and cancellation failures carry no API detail
                return nil
            }
        }
        let created = CurrentCheck(id: checkId, url: url, checkTask: checkTask)
        current = created
        return created
    }

    private func report(_ error: SlopMachineError, for url: String, checkId: UUID) {
        let shouldInvoke: Bool = lock.withLock {
            guard let active = current,
                  active.id == checkId,
                  active.url == url,
                  reportedUrl != url
            else {
                return false
            }
            reportedUrl = url
            return true
        }
        if shouldInvoke {
            onError(error, url)
        }
    }
}

/// Creates a `RenderUrlMonitor` instance (functional factory matching `@slopmachine/core`).
///
/// - Parameters:
///   - session: The `URLSession` to use for `HEAD` and error detail requests (defaults to `.shared`).
///   - onError: Callback invoked at most once per watched URL with the best available `SlopMachineError`.
/// - Returns: A configured `RenderUrlMonitor`.
public func createRenderUrlMonitor(
    session: URLSession = .shared,
    onError: @escaping RenderUrlMonitor.ErrorHandler
) -> RenderUrlMonitor {
    RenderUrlMonitor(session: session, onError: onError)
}
