import AVFoundation
import Foundation

/// Checks whether an error represents task or URLSession cancellation.
internal func isSlopCancellationError(_ error: Error) -> Bool {
    if error is CancellationError {
        return true
    }
    if let urlError = error as? URLError, urlError.code == .cancelled {
        return true
    }
    let nsError = error as NSError
    return nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled
}

/// Returns standard Title-Cased HTTP status text matching browser `Response.statusText`.
internal func httpStatusMessage(for response: HTTPURLResponse) -> String {
    switch response.statusCode {
    case 400: return "Bad Request"
    case 401: return "Unauthorized"
    case 403: return "Forbidden"
    case 404: return "Not Found"
    case 408: return "Request Timeout"
    case 409: return "Conflict"
    case 422: return "Unprocessable Entity"
    case 429: return "Too Many Requests"
    case 500: return "Internal Server Error"
    case 502: return "Bad Gateway"
    case 503: return "Service Unavailable"
    case 504: return "Gateway Timeout"
    default:
        let localized = HTTPURLResponse.localizedString(forStatusCode: response.statusCode)
        if !localized.isEmpty && localized.lowercased() != "no error" {
            return localized.capitalized
        }
        return "Request failed with status \(response.statusCode)"
    }
}

/// Extracts `{ error: string }` or `{ error: { message: string } }` from an API error body.
internal func extractAPIErrorMessage(from data: Data, fallback: String) -> String {
    guard !data.isEmpty,
          let jsonObject = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
        return fallback
    }

    if let errorString = jsonObject["error"] as? String, !errorString.isEmpty {
        return errorString
    }
    if let errorDict = jsonObject["error"] as? [String: Any],
       let nestedMessage = errorDict["message"] as? String,
       !nestedMessage.isEmpty
    {
        return nestedMessage
    }
    return fallback
}

/// Checks that a render URL resolves successfully without downloading the full media body.
///
/// Sends a `HEAD` request to warm up generation and validate the URL. If the API responds
/// with an error status, a follow-up `GET` reads the JSON error body and throws a `SlopMachineError`
/// with the message and HTTP `status`. Network-level and cancellation errors are rethrown as-is.
///
/// - Parameters:
///   - url: A URL produced by `buildImageUrl`, `buildVideoUrl`, or `buildTextUrl`.
///   - session: The `URLSession` to use (defaults to `.shared`).
public func checkRenderUrl(_ url: URL, session: URLSession = .shared) async throws {
    try Task.checkCancellation()
    var headRequest = URLRequest(url: url)
    headRequest.httpMethod = "HEAD"

    let (_, response) = try await session.data(for: headRequest)
    try Task.checkCancellation()

    guard let httpResponse = response as? HTTPURLResponse else {
        return
    }
    if (200..<300).contains(httpResponse.statusCode) {
        return
    }

    // HEAD responses have no body, so fetch again with GET to read the error detail.
    var message = httpStatusMessage(for: httpResponse)
    do {
        var getRequest = URLRequest(url: url)
        getRequest.httpMethod = "GET"
        let (errorData, _) = try await session.data(for: getRequest)
        try Task.checkCancellation()
        message = extractAPIErrorMessage(from: errorData, fallback: message)
    } catch {
        if isSlopCancellationError(error) {
            throw error
        }
        // Otherwise fall back to the HTTP status text
    }

    throw SlopMachineError(message, status: httpResponse.statusCode)
}

/// Checks that a render URL string resolves successfully without downloading the media body.
public func checkRenderUrl(_ urlString: String, session: URLSession = .shared) async throws {
    guard let url = URL(string: urlString) else {
        throw SlopMachineError("Invalid URL: \(urlString)")
    }
    try await checkRenderUrl(url, session: session)
}

/// Fetches generated text from a URL produced by `buildTextUrl`.
///
/// Bypasses the local HTTP cache (`.reloadIgnoringLocalCacheData`), so remounting always shows the latest result.
///
/// - Parameters:
///   - url: A URL produced by `buildTextUrl`.
///   - session: The `URLSession` to use (defaults to `.shared`).
/// - Returns: The generated Markdown or plain text string.
/// - Throws: `SlopMachineError` with the API's message and HTTP `status` if generation fails,
///   or without a status if the request could not be made. Task cancellations are rethrown as-is.
public func fetchRenderedText(_ url: URL, session: URLSession = .shared) async throws -> String {
    try Task.checkCancellation()
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.cachePolicy = .reloadIgnoringLocalCacheData
    request.setValue("no-store", forHTTPHeaderField: "Cache-Control")

    let data: Data
    let response: URLResponse
    do {
        (data, response) = try await session.data(for: request)
        try Task.checkCancellation()
    } catch {
        if isSlopCancellationError(error) {
            throw error
        }
        throw SlopMachineError("Failed to load text")
    }

    if let httpResponse = response as? HTTPURLResponse,
       !(200..<300).contains(httpResponse.statusCode)
    {
        let fallback = httpStatusMessage(for: httpResponse)
        let message = extractAPIErrorMessage(from: data, fallback: fallback)
        throw SlopMachineError(message, status: httpResponse.statusCode)
    }

    return String(decoding: data, as: UTF8.self)
}

/// Fetches generated text from a URL string produced by `buildTextUrlString`.
public func fetchRenderedText(_ urlString: String, session: URLSession = .shared) async throws -> String {
    guard let url = URL(string: urlString) else {
        throw SlopMachineError("Failed to load text")
    }
    return try await fetchRenderedText(url, session: session)
}

/// Executes a Slop Machine multi-step Pipeline programmatically and returns the full typed `PipelineResult` payload.
///
/// - Parameters:
///   - options: Execution parameters including `pipelineId` and optional runtime `prompt`, `variables`, and `metadata`.
///   - session: The `URLSession` to use (defaults to `.shared`).
/// - Returns: The completed `PipelineResult` document.
public func executePipeline(
    _ options: ExecutePipelineOptions,
    session: URLSession = .shared
) async throws -> PipelineResult {
    let endpointString = resolveSlopEndpoint("renderPipeline", baseUrl: options.baseUrl)
    guard let url = URL(string: endpointString) else {
        throw SlopMachineError("Invalid pipeline endpoint URL: \(endpointString)")
    }

    var bodyEntries: [(String, SlopJSONValue)] = [
        ("pipelineId", .string(options.pipelineId)),
    ]
    if let siloId = options.siloId, !siloId.isEmpty {
        bodyEntries.append(("siloId", .string(siloId)))
    }
    if let prompt = options.prompt, !prompt.isEmpty {
        bodyEntries.append(("prompt", .string(prompt)))
    }
    if let variables = options.variables {
        let varEntries: [(String, SlopJSONValue)] = variables.entries.map { entry in
            switch entry.value {
            case .string(let s): return (entry.key, .string(s))
            case .int(let i): return (entry.key, .int(i))
            case .double(let d): return (entry.key, .double(d))
            case .null: return (entry.key, .null)
            }
        }
        bodyEntries.append(("variables", .object(SlopMetadata(varEntries))))
    }
    if let metadata = options.metadata {
        bodyEntries.append(("metadata", .object(metadata)))
    }
    bodyEntries.append(("sync", .bool(true)))

    let bodyString = serializeJSONValue(.object(SlopMetadata(bodyEntries)))

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = Data(bodyString.utf8)

    let (data, response) = try await session.data(for: request)
    if let httpResponse = response as? HTTPURLResponse,
       !(200..<300).contains(httpResponse.statusCode)
    {
        let fallback = httpStatusMessage(for: httpResponse)
        let detail = extractAPIErrorMessage(from: data, fallback: fallback)
        throw SlopMachineError(
            "Pipeline execution failed (\(httpResponse.statusCode)): \(detail)",
            status: httpResponse.statusCode
        )
    }

    return try JSONDecoder().decode(PipelineResult.self, from: data)
}

/// Uploads a base64-encoded file as a temporary attachment to be used in generation requests.
///
/// - Parameters:
///   - base64: Base64-encoded file data (without the `data:mime/type;base64,` prefix).
///   - mimeType: MIME type of the file (e.g. `"image/png"`).
///   - baseUrl: Optional override endpoint URL.
///   - session: The `URLSession` to use (defaults to `.shared`).
/// - Returns: An `UploadedAttachment` containing the temporary `url`.
public func uploadTempAttachment(
    base64: String,
    mimeType: String,
    baseUrl: String? = nil,
    session: URLSession = .shared
) async throws -> UploadedAttachment {
    let endpointString = resolveSlopEndpoint("uploadTempAttachment", baseUrl: baseUrl)
    guard let url = URL(string: endpointString) else {
        throw SlopMachineError("Invalid uploadTempAttachment endpoint URL: \(endpointString)")
    }

    let payload = SlopMetadata([
        ("data", .object(SlopMetadata([
            ("base64", .string(base64)),
            ("mimeType", .string(mimeType)),
        ]))),
    ])
    let bodyString = serializeJSONValue(.object(payload))

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = Data(bodyString.utf8)

    let (data, response) = try await session.data(for: request)
    if let httpResponse = response as? HTTPURLResponse,
       !(200..<300).contains(httpResponse.statusCode)
    {
        let statusText = httpStatusMessage(for: httpResponse)
        throw SlopMachineError(
            "Failed to upload attachment: \(statusText)",
            status: httpResponse.statusCode
        )
    }

    guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        throw SlopMachineError("Failed to upload attachment: Invalid JSON response")
    }

    if let errorVal = json["error"] {
        if let errorDict = errorVal as? [String: Any], let msg = errorDict["message"] as? String {
            throw SlopMachineError("Failed to upload attachment: \(msg)")
        } else if let errorStr = errorVal as? String {
            throw SlopMachineError("Failed to upload attachment: \(errorStr)")
        } else if let errorData = try? JSONSerialization.data(withJSONObject: errorVal),
                  let errorJSON = String(data: errorData, encoding: .utf8)
        {
            throw SlopMachineError("Failed to upload attachment: \(errorJSON)")
        } else {
            throw SlopMachineError("Failed to upload attachment: Unknown error")
        }
    }

    guard let resultDict = json["result"] as? [String: Any],
          let uploadedUrl = resultDict["url"] as? String
    else {
        throw SlopMachineError("Failed to upload attachment: Missing result.url")
    }

    return UploadedAttachment(url: uploadedUrl)
}

/// Uploads raw `Data` as a temporary attachment to be used in generation requests.
///
/// - Parameters:
///   - data: Raw binary file data.
///   - mimeType: MIME type of the file (e.g. `"image/png"`).
///   - baseUrl: Optional override endpoint URL.
///   - session: The `URLSession` to use (defaults to `.shared`).
/// - Returns: An `UploadedAttachment` containing the temporary `url`.
public func uploadTempAttachment(
    data: Data,
    mimeType: String,
    baseUrl: String? = nil,
    session: URLSession = .shared
) async throws -> UploadedAttachment {
    try await uploadTempAttachment(
        base64: data.base64EncodedString(),
        mimeType: mimeType,
        baseUrl: baseUrl,
        session: session
    )
}

/// Percent-encodes a path component matching JavaScript's `encodeURIComponent`.
private func encodeURIComponent(_ string: String) -> String {
    var allowed = CharacterSet.alphanumerics
    allowed.insert(charactersIn: "-_.!~*'()")
    return string.addingPercentEncoding(withAllowedCharacters: allowed) ?? string
}

/// Rates a previously generated result as `.good`, `.bad`, or clears its rating (`nil`).
///
/// - Important: **Server-side / privileged use only:** This function requires a Slop Machine API key (`apiKey`),
///   which grants write access to your silos and must never be embedded in public client binaries.
///
/// - Parameters:
///   - resultId: The unique ID of the result to rate.
///   - rating: The rating to apply (`.good`, `.bad`, or `nil` to clear).
///   - options: Configuration options including the required `apiKey` and optional `apiBaseUrl`.
///   - session: The `URLSession` to use (defaults to `.shared`).
/// - Returns: The rating update response (`RateResultResponse`).
public func rateResult(
    resultId: String,
    rating: ResultRating?,
    options: RateResultOptions,
    session: URLSession = .shared
) async throws -> RateResultResponse {
    if resultId.isEmpty {
        throw SlopMachineError("resultId is required")
    }

    let trimmedKey = options.apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmedKey.isEmpty {
        throw SlopMachineError("apiKey is required to rate a result")
    }

    let rawBase = options.apiBaseUrl.flatMap { $0.isEmpty ? nil : $0 } ?? defaultSlopMachineWebBaseURL
    var baseUrl = rawBase
    while baseUrl.hasSuffix("/") {
        baseUrl.removeLast()
    }

    let encodedId = encodeURIComponent(resultId)
    let urlString = "\(baseUrl)/api/results/\(encodedId)/rating"
    guard let url = URL(string: urlString) else {
        throw SlopMachineError("Invalid rateResult URL: \(urlString)")
    }

    let ratingJSON: SlopJSONValue = rating.map { .string($0.rawValue) } ?? .null
    let bodyString = serializeJSONValue(.object(SlopMetadata([("rating", ratingJSON)])))

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(trimmedKey, forHTTPHeaderField: "x-api-key")
    request.httpBody = Data(bodyString.utf8)

    let (data, response) = try await session.data(for: request)
    if let httpResponse = response as? HTTPURLResponse,
       !(200..<300).contains(httpResponse.statusCode)
    {
        let fallback = httpStatusMessage(for: httpResponse)
        let detail = extractAPIErrorMessage(from: data, fallback: fallback)
        throw SlopMachineError(
            "Failed to rate result (\(httpResponse.statusCode)): \(detail)",
            status: httpResponse.statusCode
        )
    }

    return try JSONDecoder().decode(RateResultResponse.self, from: data)
}

/// Preloads an image from Slop Machine into `URLCache` so it renders immediately when displayed.
///
/// - Parameters:
///   - options: Configuration options for the image generation.
///   - session: The `URLSession` to use (defaults to `.shared`).
public func preloadImage(
    _ options: SlopImageOptions,
    session: URLSession = .shared
) async throws {
    let url = buildImageUrl(options)
    let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
    let (data, response) = try await session.data(for: request)
    if let httpResponse = response as? HTTPURLResponse,
       !(200..<300).contains(httpResponse.statusCode)
    {
        let fallback = httpStatusMessage(for: httpResponse)
        let message = extractAPIErrorMessage(from: data, fallback: fallback)
        throw SlopMachineError(message, status: httpResponse.statusCode)
    }
    let cachedResponse = CachedURLResponse(response: response, data: data)
    (session.configuration.urlCache ?? URLCache.shared).storeCachedResponse(
        cachedResponse,
        for: URLRequest(url: url)
    )
}

/// Preloads a video from Slop Machine by warming the backend generation cache and `AVURLAsset` metadata.
///
/// - Parameters:
///   - options: Configuration options for the video generation.
///   - session: The `URLSession` to use (defaults to `.shared`).
public func preloadVideo(
    _ options: SlopVideoOptions,
    session: URLSession = .shared
) async throws {
    let url = buildVideoUrl(options)
    try await checkRenderUrl(url, session: session)
    if session === URLSession.shared {
        let asset = AVURLAsset(url: url)
        _ = try? await asset.load(.isPlayable)
    }
}

/// Preloads generated text from Slop Machine into `URLCache`.
///
/// - Parameters:
///   - options: Configuration options for the text generation.
///   - session: The `URLSession` to use (defaults to `.shared`).
public func preloadText(
    _ options: SlopTextOptions,
    session: URLSession = .shared
) async throws {
    let url = buildTextUrl(options)
    let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
    let (data, response) = try await session.data(for: request)
    if let httpResponse = response as? HTTPURLResponse,
       !(200..<300).contains(httpResponse.statusCode)
    {
        let fallback = httpStatusMessage(for: httpResponse)
        let message = extractAPIErrorMessage(from: data, fallback: fallback)
        throw SlopMachineError(message, status: httpResponse.statusCode)
    }
    let cachedResponse = CachedURLResponse(response: response, data: data)
    (session.configuration.urlCache ?? URLCache.shared).storeCachedResponse(
        cachedResponse,
        for: URLRequest(url: url)
    )
}
