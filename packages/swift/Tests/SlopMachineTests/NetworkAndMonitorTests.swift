import Foundation
import Testing
@testable import SlopMachine

/// Thread-safe mock URLProtocol for intercepting URLSession requests in unit tests.
final class MockURLProtocol: URLProtocol, @unchecked Sendable {
    typealias Handler = @Sendable (URLRequest) async throws -> (HTTPURLResponse, Data)

    private final class Registry: @unchecked Sendable {
        let lock = NSLock()
        var handlersBySuite: [String: Handler] = [:]
        var recordedRequestsBySuite: [String: [URLRequest]] = [:]
    }

    private static let registry = Registry()

    static func register(suiteID: String, handler: @escaping Handler) {
        registry.lock.withLock {
            registry.handlersBySuite[suiteID] = handler
            registry.recordedRequestsBySuite[suiteID] = []
        }
    }

    static func recordedRequests(suiteID: String) -> [URLRequest] {
        registry.lock.withLock {
            registry.recordedRequestsBySuite[suiteID] ?? []
        }
    }

    static func unregister(suiteID: String) {
        registry.lock.withLock {
            registry.handlersBySuite.removeValue(forKey: suiteID)
            registry.recordedRequestsBySuite.removeValue(forKey: suiteID)
        }
    }

    static func makeSession(suiteID: String, handler: @escaping Handler) -> URLSession {
        register(suiteID: suiteID, handler: handler)
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        config.httpAdditionalHeaders = ["X-Mock-Suite-ID": suiteID]
        return URLSession(configuration: config)
    }

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    private var activeTask: Task<Void, Never>?

    override func startLoading() {
        let req = request
        let suiteID = req.value(forHTTPHeaderField: "X-Mock-Suite-ID") ?? ""
        let handler: Handler? = Self.registry.lock.withLock {
            Self.registry.recordedRequestsBySuite[suiteID, default: []].append(req)
            return Self.registry.handlersBySuite[suiteID]
        }

        guard let handler else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }

        activeTask = Task {
            do {
                let (response, data) = try await handler(req)
                guard !Task.isCancelled else { return }
                client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                if !data.isEmpty {
                    client?.urlProtocol(self, didLoad: data)
                }
                client?.urlProtocolDidFinishLoading(self)
            } catch {
                guard !Task.isCancelled else { return }
                client?.urlProtocol(self, didFailWithError: error)
            }
        }
    }

    override func stopLoading() {
        activeTask?.cancel()
        activeTask = nil
    }
}

private func httpResponse(for request: URLRequest, status: Int, headers: [String: String] = [:]) -> HTTPURLResponse {
    HTTPURLResponse(
        url: request.url ?? URL(string: "https://api/x")!,
        statusCode: status,
        httpVersion: "HTTP/1.1",
        headerFields: headers
    )!
}

private func jsonResponse(for request: URLRequest, jsonString: String, status: Int) -> (HTTPURLResponse, Data) {
    (
        httpResponse(for: request, status: status, headers: ["Content-Type": "application/json"]),
        Data(jsonString.utf8)
    )
}

private func requestBodyData(_ request: URLRequest) -> Data {
    if let body = request.httpBody {
        return body
    }
    if let stream = request.httpBodyStream {
        stream.open()
        defer { stream.close() }
        var data = Data()
        let bufferSize = 1024
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
        defer { buffer.deallocate() }
        while stream.hasBytesAvailable {
            let read = stream.read(buffer, maxLength: bufferSize)
            if read > 0 {
                data.append(buffer, count: read)
            } else {
                break
            }
        }
        return data
    }
    return Data()
}

/// Async gate used to pause and resume mock responses deterministically.
actor AsyncGate {
    private var isOpen = false
    private var continuations: [CheckedContinuation<Void, Never>] = []

    func wait() async {
        if isOpen { return }
        await withCheckedContinuation { continuation in
            continuations.append(continuation)
        }
    }

    func open() {
        isOpen = true
        let pending = continuations
        continuations.removeAll()
        for continuation in pending {
            continuation.resume()
        }
    }
}

/// Thread-safe recorder for `RenderUrlMonitor` error callbacks.
final class ErrorRecorder: @unchecked Sendable {
    private let lock = NSLock()
    private var items: [(error: SlopMachineError, url: String)] = []

    func record(_ error: SlopMachineError, url: String) {
        lock.withLock {
            items.append((error, url))
        }
    }

    var calls: [(error: SlopMachineError, url: String)] {
        lock.withLock { items }
    }
}

@Suite("Networking, RenderUrlMonitor, Pipeline Execution, Rating & Preloading")
struct NetworkAndMonitorTests {
    @Test("SlopMachineError carries message, status, and name")
    func slopMachineErrorProperties() {
        let err = SlopMachineError("boom", status: 500)
        #expect(err.name == "SlopMachineError")
        #expect(err.message == "boom")
        #expect(err.status == 500)
        #expect(err.localizedDescription == "boom")
    }

    @Test("checkRenderUrl resolves with a single HEAD request when servable")
    func checkRenderUrlSuccess() async throws {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            (httpResponse(for: req, status: 200), Data())
        }

        try await checkRenderUrl("https://api/x", session: session)
        let requests = MockURLProtocol.recordedRequests(suiteID: suiteID)
        #expect(requests.count == 1)
        #expect(requests[0].httpMethod == "HEAD")
    }

    @Test("checkRenderUrl throws API error message and status from follow-up GET")
    func checkRenderUrlAPIError() async {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            if req.httpMethod == "HEAD" {
                return (httpResponse(for: req, status: 400), Data())
            }
            return jsonResponse(
                for: req,
                jsonString: "{\"error\":\"Missing required variable 'theme'\"}",
                status: 400
            )
        }

        do {
            try await checkRenderUrl("https://api/x", session: session)
            Issue.record("Expected checkRenderUrl to throw SlopMachineError")
        } catch let error as SlopMachineError {
            #expect(error.message == "Missing required variable 'theme'")
            #expect(error.status == 400)
        } catch {
            Issue.record("Unexpected error type: \(error)")
        }
    }

    @Test("checkRenderUrl reads nested { error: { message } } bodies")
    func checkRenderUrlNestedError() async {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            if req.httpMethod == "HEAD" {
                return (httpResponse(for: req, status: 500), Data())
            }
            return jsonResponse(
                for: req,
                jsonString: "{\"error\":{\"message\":\"Generation timed out\"}}",
                status: 500
            )
        }

        do {
            try await checkRenderUrl("https://api/x", session: session)
            Issue.record("Expected checkRenderUrl to throw")
        } catch let error as SlopMachineError {
            #expect(error.message == "Generation timed out")
            #expect(error.status == 500)
        } catch {
            Issue.record("Unexpected error: \(error)")
        }
    }

    @Test("checkRenderUrl falls back to status text when body is not JSON")
    func checkRenderUrlFallbackStatusText() async {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            (httpResponse(for: req, status: 502), Data("<html>oops</html>".utf8))
        }

        do {
            try await checkRenderUrl("https://api/x", session: session)
            Issue.record("Expected checkRenderUrl to throw")
        } catch let error as SlopMachineError {
            #expect(error.message == "Bad Gateway")
            #expect(error.status == 502)
        } catch {
            Issue.record("Unexpected error: \(error)")
        }
    }

    @Test("checkRenderUrl rethrows network failures as-is")
    func checkRenderUrlNetworkFailure() async {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { _ in
            throw URLError(.notConnectedToInternet)
        }

        do {
            try await checkRenderUrl("https://api/x", session: session)
            Issue.record("Expected network error")
        } catch let error as SlopMachineError {
            Issue.record("Should not wrap network failure in SlopMachineError: \(error)")
        } catch let urlError as URLError {
            #expect(urlError.code == .notConnectedToInternet)
        } catch {
            Issue.record("Unexpected error: \(error)")
        }
    }

    @Test("fetchRenderedText returns text and bypasses HTTP cache")
    func fetchRenderedTextSuccess() async throws {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            (httpResponse(for: req, status: 200), Data("# Hello".utf8))
        }

        let text = try await fetchRenderedText("https://api/t", session: session)
        #expect(text == "# Hello")

        let requests = MockURLProtocol.recordedRequests(suiteID: suiteID)
        #expect(requests.count == 1)
        #expect(requests[0].cachePolicy == .reloadIgnoringLocalCacheData)
        #expect(requests[0].value(forHTTPHeaderField: "Cache-Control") == "no-store")
    }

    @Test("fetchRenderedText throws API error message and status")
    func fetchRenderedTextAPIError() async {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            jsonResponse(
                for: req,
                jsonString: "{\"error\":\"Missing required variable 'topic'\"}",
                status: 400
            )
        }

        do {
            _ = try await fetchRenderedText("https://api/t", session: session)
            Issue.record("Expected fetchRenderedText to throw")
        } catch let error as SlopMachineError {
            #expect(error.message == "Missing required variable 'topic'")
            #expect(error.status == 400)
        } catch {
            Issue.record("Unexpected error: \(error)")
        }
    }

    @Test("fetchRenderedText falls back to status text for non-JSON errors")
    func fetchRenderedTextNonJSONError() async {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            (httpResponse(for: req, status: 503), Data("oops".utf8))
        }

        do {
            _ = try await fetchRenderedText("https://api/t", session: session)
            Issue.record("Expected fetchRenderedText to throw")
        } catch let error as SlopMachineError {
            #expect(error.message == "Service Unavailable")
            #expect(error.status == 503)
        } catch {
            Issue.record("Unexpected error: \(error)")
        }
    }

    @Test("fetchRenderedText wraps network failures in SlopMachineError without status")
    func fetchRenderedTextNetworkFailure() async {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { _ in
            throw URLError(.cannotFindHost)
        }

        do {
            _ = try await fetchRenderedText("https://api/t", session: session)
            Issue.record("Expected fetchRenderedText to throw")
        } catch let error as SlopMachineError {
            #expect(error.message == "Failed to load text")
            #expect(error.status == nil)
        } catch {
            Issue.record("Unexpected error: \(error)")
        }
    }

    @Test("RenderUrlMonitor reports API error found by watch()")
    func monitorWatchAPIError() async {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            if req.httpMethod == "HEAD" {
                return (httpResponse(for: req, status: 400), Data())
            }
            return jsonResponse(for: req, jsonString: "{\"error\":\"bad input\"}", status: 400)
        }

        let recorder = ErrorRecorder()
        let monitor = createRenderUrlMonitor(session: session) { err, url in
            recorder.record(err, url: url)
        }
        monitor.watch("https://api/a")
        await monitor.flush()

        #expect(recorder.calls.count == 1)
        #expect(recorder.calls[0].error == SlopMachineError("bad input", status: 400))
        #expect(recorder.calls[0].url == "https://api/a")
    }

    @Test("RenderUrlMonitor prunes finished listener tasks after flush() and stop()")
    func monitorPrunesListenerTasks() async {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let gate = AsyncGate()
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            if req.url?.absoluteString == "https://api/slow" {
                await gate.wait()
            }
            return (httpResponse(for: req, status: 200), Data())
        }

        let monitor = createRenderUrlMonitor(session: session) { _, _ in }
        for index in 0..<5 {
            monitor.watch("https://api/\(index)")
            monitor.mediaFailed("https://api/\(index)", fallbackMessage: "Failed")
        }
        await monitor.flush()
        #expect(monitor.pendingListenerCount == 0)

        monitor.watch("https://api/slow")
        monitor.mediaFailed("https://api/slow", fallbackMessage: "Failed")
        #expect(monitor.pendingListenerCount == 2)
        monitor.stop()
        #expect(monitor.pendingListenerCount == 0)
        await gate.open()
    }

    @Test("RenderUrlMonitor prefers API error detail when media element fails first")
    func monitorPrefersAPIDetailWhenMediaFailsFirst() async {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let gate = AsyncGate()
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            if req.httpMethod == "HEAD" {
                await gate.wait()
                return (httpResponse(for: req, status: 400), Data())
            }
            return jsonResponse(for: req, jsonString: "{\"error\":\"bad input\"}", status: 400)
        }

        let recorder = ErrorRecorder()
        let monitor = createRenderUrlMonitor(session: session) { err, url in
            recorder.record(err, url: url)
        }
        monitor.watch("https://api/a")
        monitor.mediaFailed("https://api/a", fallbackMessage: "Failed to load image")

        try? await Task.sleep(for: .milliseconds(30))
        #expect(recorder.calls.isEmpty)

        await gate.open()
        await monitor.flush()

        #expect(recorder.calls.count == 1)
        #expect(recorder.calls[0].error == SlopMachineError("bad input", status: 400))
    }

    @Test("RenderUrlMonitor falls back to generic error when URL check passed or failed at network level")
    func monitorFallbackGenericError() async {
        let suiteID1 = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID1) }
        let session1 = MockURLProtocol.makeSession(suiteID: suiteID1) { req in
            (httpResponse(for: req, status: 200), Data())
        }

        let recorder1 = ErrorRecorder()
        let monitor1 = createRenderUrlMonitor(session: session1) { err, url in
            recorder1.record(err, url: url)
        }
        monitor1.watch("https://api/a")
        monitor1.mediaFailed("https://api/a", fallbackMessage: "Failed to load image")
        await monitor1.flush()

        #expect(recorder1.calls.count == 1)
        #expect(recorder1.calls[0].error == SlopMachineError("Failed to load image", status: nil))

        let suiteID2 = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID2) }
        let session2 = MockURLProtocol.makeSession(suiteID: suiteID2) { _ in
            throw URLError(.notConnectedToInternet)
        }

        let recorder2 = ErrorRecorder()
        let monitor2 = createRenderUrlMonitor(session: session2) { err, url in
            recorder2.record(err, url: url)
        }
        monitor2.watch("https://api/a")
        await monitor2.flush()
        #expect(recorder2.calls.isEmpty)

        monitor2.mediaFailed("https://api/a", fallbackMessage: "Failed to load video")
        await monitor2.flush()
        #expect(recorder2.calls.count == 1)
        #expect(recorder2.calls[0].error == SlopMachineError("Failed to load video", status: nil))
    }

    @Test("RenderUrlMonitor shares a single HEAD request, deduplicates per URL, and drops stale/stopped URLs")
    func monitorDeduplicationAndStaleDropping() async {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            if req.httpMethod == "HEAD" {
                return (httpResponse(for: req, status: 400), Data())
            }
            return jsonResponse(for: req, jsonString: "{\"error\":\"bad input\"}", status: 400)
        }

        let recorder = ErrorRecorder()
        let monitor = createRenderUrlMonitor(session: session) { err, url in
            recorder.record(err, url: url)
        }
        monitor.mediaFailed("https://api/a", fallbackMessage: "Failed to load image")
        monitor.watch("https://api/a")
        monitor.watch("https://api/a")
        monitor.mediaFailed("https://api/a", fallbackMessage: "Failed to load image")
        await monitor.flush()

        #expect(recorder.calls.count == 1)
        #expect(recorder.calls[0].error.message == "bad input")
        let heads = MockURLProtocol.recordedRequests(suiteID: suiteID).filter { $0.httpMethod == "HEAD" }
        #expect(heads.count == 1)

        // Switching away and back reports again
        monitor.stop()
        monitor.watch("https://api/b")
        monitor.stop()
        monitor.watch("https://api/a")
        await monitor.flush()
        #expect(recorder.calls.count == 2)
    }

    @Test("executePipeline POSTs synchronous run and returns decoded PipelineResult")
    func executePipelineSuccessAndError() async throws {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            jsonResponse(
                for: req,
                jsonString: "{\"id\":\"res1\",\"status\":\"completed\",\"totalComputeTimeMs\":1200,\"totalFuelCost\":6}",
                status: 200
            )
        }

        let result = try await executePipeline(
            ExecutePipelineOptions(
                pipelineId: "p1",
                prompt: "go",
                variables: ["a": 1],
                baseUrl: "https://api/pipe"
            ),
            session: session
        )
        #expect(result.id == "res1")
        #expect(result.status == .completed)
        #expect(result.totalFuelCost == 6)

        let requests = MockURLProtocol.recordedRequests(suiteID: suiteID)
        #expect(requests.count == 1)
        #expect(requests[0].url?.absoluteString == "https://api/pipe")
        #expect(requests[0].httpMethod == "POST")
        let bodyString = String(data: requestBodyData(requests[0]), encoding: .utf8)
        #expect(bodyString == "{\"pipelineId\":\"p1\",\"prompt\":\"go\",\"variables\":{\"a\":1},\"sync\":true}")

        // Error case
        let errorSuiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: errorSuiteID) }
        let errorSession = MockURLProtocol.makeSession(suiteID: errorSuiteID) { req in
            jsonResponse(for: req, jsonString: "{\"error\":\"Pipeline not found\"}", status: 404)
        }

        do {
            _ = try await executePipeline(ExecutePipelineOptions(pipelineId: "nope"), session: errorSession)
            Issue.record("Expected executePipeline to throw")
        } catch let error as SlopMachineError {
            #expect(error.message == "Pipeline execution failed (404): Pipeline not found")
            #expect(error.status == 404)
        }
    }

    @Test("rateResult validates inputs, sends x-api-key header, supports nil rating and custom apiBaseUrl")
    func rateResultBehavior() async throws {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            jsonResponse(
                for: req,
                jsonString: "{\"success\":true,\"resultId\":\"r1\",\"rating\":\"good\"}",
                status: 200
            )
        }

        // Validation: missing resultId
        do {
            _ = try await rateResult(
                resultId: "",
                rating: .good,
                options: RateResultOptions(apiKey: "sm_test_key"),
                session: session
            )
            Issue.record("Expected missing resultId to throw")
        } catch let error as SlopMachineError {
            #expect(error.message == "resultId is required")
        }

        // Validation: missing apiKey
        do {
            _ = try await rateResult(
                resultId: "r1",
                rating: .good,
                options: RateResultOptions(apiKey: "   "),
                session: session
            )
            Issue.record("Expected missing apiKey to throw")
        } catch let error as SlopMachineError {
            #expect(error.message == "apiKey is required to rate a result")
        }

        #expect(MockURLProtocol.recordedRequests(suiteID: suiteID).isEmpty)

        // Authenticated POST
        let response = try await rateResult(
            resultId: "r1",
            rating: .good,
            options: RateResultOptions(apiKey: "sm_test_key"),
            session: session
        )
        #expect(response == RateResultResponse(success: true, resultId: "r1", rating: .good))

        let requests = MockURLProtocol.recordedRequests(suiteID: suiteID)
        #expect(requests.count == 1)
        #expect(requests[0].url?.absoluteString == "https://slopmachine.dev/api/results/r1/rating")
        #expect(requests[0].httpMethod == "POST")
        #expect(requests[0].value(forHTTPHeaderField: "x-api-key") == "sm_test_key")
        #expect(String(data: requestBodyData(requests[0]), encoding: .utf8) == "{\"rating\":\"good\"}")

        // Custom apiBaseUrl + nil rating
        let clearSuiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: clearSuiteID) }
        let clearSession = MockURLProtocol.makeSession(suiteID: clearSuiteID) { req in
            jsonResponse(
                for: req,
                jsonString: "{\"success\":true,\"resultId\":\"r1\",\"rating\":null}",
                status: 200
            )
        }

        let clearResponse = try await rateResult(
            resultId: "r1",
            rating: nil,
            options: RateResultOptions(
                apiKey: "sm_test_key",
                apiBaseUrl: "https://staging.slopmachine.dev/"
            ),
            session: clearSession
        )
        #expect(clearResponse == RateResultResponse(success: true, resultId: "r1", rating: nil))
        let clearReqs = MockURLProtocol.recordedRequests(suiteID: clearSuiteID)
        #expect(clearReqs[0].url?.absoluteString == "https://staging.slopmachine.dev/api/results/r1/rating")
        #expect(String(data: requestBodyData(clearReqs[0]), encoding: .utf8) == "{\"rating\":null}")
    }

    @Test("uploadTempAttachment wraps payload and handles error responses")
    func uploadTempAttachmentBehavior() async throws {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            jsonResponse(
                for: req,
                jsonString: "{\"result\":{\"url\":\"https://cdn/x.png\"}}",
                status: 200
            )
        }

        let uploaded = try await uploadTempAttachment(
            base64: "AAAA",
            mimeType: "image/png",
            session: session
        )
        #expect(uploaded == UploadedAttachment(url: "https://cdn/x.png"))
        let requests = MockURLProtocol.recordedRequests(suiteID: suiteID)
        #expect(
            requests[0].url?.absoluteString
                == "https://us-central1-slopmachine-12bfb.cloudfunctions.net/uploadTempAttachment"
        )
        #expect(
            String(data: requestBodyData(requests[0]), encoding: .utf8)
                == "{\"data\":{\"base64\":\"AAAA\",\"mimeType\":\"image/png\"}}"
        )

        // Error payload
        let errorSuiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: errorSuiteID) }
        let errorSession = MockURLProtocol.makeSession(suiteID: errorSuiteID) { req in
            jsonResponse(
                for: req,
                jsonString: "{\"error\":{\"message\":\"Too large\"}}",
                status: 200
            )
        }

        do {
            _ = try await uploadTempAttachment(
                base64: "AAAA",
                mimeType: "image/png",
                session: errorSession
            )
            Issue.record("Expected uploadTempAttachment to throw")
        } catch let error as SlopMachineError {
            #expect(error.message == "Failed to upload attachment: Too large")
        }
    }

    @Test("preloadImage, preloadVideo, and preloadText warm cache via URLSession")
    func preloadHelpers() async throws {
        let suiteID = UUID().uuidString
        defer { MockURLProtocol.unregister(suiteID: suiteID) }
        let session = MockURLProtocol.makeSession(suiteID: suiteID) { req in
            (httpResponse(for: req, status: 200), Data("cached".utf8))
        }

        try await preloadImage(SlopImageOptions(bucketId: "b1"), session: session)
        try await preloadVideo(SlopVideoOptions(bucketId: "v1"), session: session)
        try await preloadText(SlopTextOptions(bucketId: "t1"), session: session)

        let requests = MockURLProtocol.recordedRequests(suiteID: suiteID)
        #expect(requests.count == 3)
    }
}
