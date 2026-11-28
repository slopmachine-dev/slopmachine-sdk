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
    // Pending listener tasks, keyed so each one can remove itself when it finishes.
    private var listenerTasks: [UUID: Task<Void, Never>] = [:]
    // Listeners that finished before they were registered (so they are never inserted).
    private var finishedListenerIds: Set<UUID> = []

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

        let listenerId = UUID()
        let listener = Task { [weak self] in
            let apiError = await check.checkTask.value
            guard let self else { return }
            if let apiError {
                self.report(apiError, for: url, checkId: check.id)
            }
            self.listenerFinished(listenerId)
        }
        registerListener(listener, id: listenerId)
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

        let listenerId = UUID()
        let listener = Task { [weak self] in
            let apiError = await check.checkTask.value
            guard let self else { return }
            self.report(
                apiError ?? SlopMachineError(fallbackMessage),
                for: url,
                checkId: check.id
            )
            self.listenerFinished(listenerId)
        }
        registerListener(listener, id: listenerId)
    }

    /// Called when the image or video view fails to load `url` (`URL` overload).
    public func mediaFailed(_ url: URL, fallbackMessage: String) {
        mediaFailed(url.absoluteString, fallbackMessage: fallbackMessage)
    }

    /// Cancels the current check and discards any pending results for it.
    public func stop() {
        let (taskToCancel, listeners) = lock.withLock {
            () -> (Task<SlopMachineError?, Never>?, [Task<Void, Never>]) in
            let existing = current?.checkTask
            current = nil
            let pending = Array(listenerTasks.values)
            listenerTasks.removeAll()
            finishedListenerIds.removeAll()
            return (existing, pending)
        }
        taskToCancel?.cancel()
        // Their results would be dropped anyway (no current check), so release them now.
        for listener in listeners {
            listener.cancel()
        }
    }

    /// Waits for all currently scheduled check and listener tasks to settle.
    public func flush() async {
        let (checkTask, tasks) = lock.withLock {
            (current?.checkTask, listenerTasks)
        }
        _ = await checkTask?.value
        for task in tasks.values {
            await task.value
        }
        // Listeners normally remove themselves; also prune any awaited ones (e.g. whose monitor
        // reference was already gone) so the registry never grows across URL changes.
        lock.withLock {
            for id in tasks.keys {
                listenerTasks.removeValue(forKey: id)
            }
        }
    }

    /// Number of listener tasks still registered (test hook).
    internal var pendingListenerCount: Int {
        lock.withLock { listenerTasks.count }
    }

    private func registerListener(_ task: Task<Void, Never>, id: UUID) {
        lock.withLock {
            if finishedListenerIds.remove(id) == nil {
                listenerTasks[id] = task
            }
        }
    }

    private func listenerFinished(_ id: UUID) {
        lock.withLock {
            if listenerTasks.removeValue(forKey: id) == nil {
                finishedListenerIds.insert(id)
            }
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
