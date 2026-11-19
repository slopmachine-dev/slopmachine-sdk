import Foundation
import os

/// Default production Cloud Functions base URL for Slop Machine rendering endpoints.
public let defaultSlopMachineAPIURL = "https://us-central1-slopmachine-12bfb.cloudfunctions.net"

/// Default production web API base URL for authenticated Slop Machine endpoints (such as `rateResult`).
public let defaultSlopMachineWebBaseURL = "https://slopmachine.dev"

// Thread-safe tracker for one-time warnings when bucket-only options are passed with `pipelineId`.
private final class WarnedPipelineOptionsTracker: @unchecked Sendable {
    static let shared = WarnedPipelineOptionsTracker()
    private let lock = NSLock()
    private var warnedKeys = Set<String>()
    private let logger = Logger(subsystem: "dev.slopmachine.sdk", category: "SlopURLBuilder")

    func warnOnceIfNeeded(key: String, isSet: Bool) {
        guard isSet else { return }
        let shouldWarn: Bool = lock.withLock {
            if warnedKeys.contains(key) {
                return false
            }
            warnedKeys.insert(key)
            return true
        }
        if shouldWarn {
            logger.warning(
                "[slopmachine] \"\(key, privacy: .public)\" is only supported for buckets (bucketId) and is ignored when pipelineId is set."
            )
        }
    }
}

/// Resolves the target endpoint URL for a given Cloud Function name.
internal func resolveSlopEndpoint(_ name: String, baseUrl: String?) -> String {
    if let baseUrl, !baseUrl.isEmpty {
        return baseUrl
    }
    return "\(defaultSlopMachineAPIURL)/\(name)"
}

/// Encodes a string using the exact WHATWG `URLSearchParams` (`application/x-www-form-urlencoded`) rules
/// so generated URLs match `@slopmachine/core` byte-for-byte.
internal func encodeURLSearchParam(_ value: String) -> String {
    var output = String()
    output.reserveCapacity(value.utf8.count)
    for byte in value.utf8 {
        switch byte {
        case 0x20: // space -> '+'
            output.append("+")
        case 0x2A, 0x2D, 0x2E, 0x5F, // '*', '-', '.', '_'
             0x30...0x39, // '0'-'9'
             0x41...0x5A, // 'A'-'Z'
             0x61...0x7A: // 'a'-'z'
            output.append(Character(UnicodeScalar(byte)))
        default:
            output.append(String(format: "%%%02X", byte))
        }
    }
    return output
}

/// Escapes a Swift `String` as a JSON string literal matching `JSON.stringify` (without escaping `/`).
internal func encodeJSONStringLiteral(_ string: String) -> String {
    var result = "\""
    result.reserveCapacity(string.count + 2)
    for scalar in string.unicodeScalars {
        switch scalar.value {
        case 0x22: result.append("\\\"")
        case 0x5C: result.append("\\\\")
        case 0x08: result.append("\\b")
        case 0x0C: result.append("\\f")
        case 0x0A: result.append("\\n")
        case 0x0D: result.append("\\r")
        case 0x09: result.append("\\t")
        case 0x00...0x1F:
            result.append(String(format: "\\u%04x", scalar.value))
        default:
            result.unicodeScalars.append(scalar)
        }
    }
    result.append("\"")
    return result
}

internal func serializeNumber(_ double: Double) -> String {
    if double.isFinite, double.rounded() == double, let exactInt = Int64(exactly: double) {
        return String(exactInt)
    }
    return String(double)
}

internal func serializeVariableValue(_ value: SlopVariableValue) -> String {
    switch value {
    case .string(let s):
        return encodeJSONStringLiteral(s)
    case .int(let i):
        return String(i)
    case .double(let d):
        return serializeNumber(d)
    case .null:
        return "null"
    }
}

internal func serializeVariables(_ variables: SlopVariables) -> String? {
    guard !variables.entries.isEmpty else { return nil }
    let parts = variables.entries.map { entry in
        "\(encodeJSONStringLiteral(entry.key)):\(serializeVariableValue(entry.value))"
    }
    return "{\(parts.joined(separator: ","))}"
}

internal func serializeJSONValue(_ value: SlopJSONValue) -> String {
    switch value {
    case .string(let s):
        return encodeJSONStringLiteral(s)
    case .int(let i):
        return String(i)
    case .double(let d):
        return serializeNumber(d)
    case .bool(let b):
        return b ? "true" : "false"
    case .array(let items):
        return "[\(items.map(serializeJSONValue).joined(separator: ","))]"
    case .object(let obj):
        let parts = obj.entries.map { entry in
            "\(encodeJSONStringLiteral(entry.key)):\(serializeJSONValue(entry.value))"
        }
        return "{\(parts.joined(separator: ","))}"
    case .null:
        return "null"
    }
}

internal func serializeMetadata(_ metadata: SlopMetadata) -> String? {
    guard !metadata.entries.isEmpty else { return nil }
    return serializeJSONValue(.object(metadata))
}

internal func serializeAttachments(_ attachments: [String]) -> String? {
    guard !attachments.isEmpty else { return nil }
    return "[\(attachments.map(encodeJSONStringLiteral).joined(separator: ","))]"
}

internal enum SlopQueryValue {
    case string(String?)
    case int(Int?)
    case bool(Bool?)
    case rawJSON(String?)
}

/// Serializes query parameters in exact entry order, skipping empty values (`nil`, `false`, `""`, `0`,
/// and empty objects/arrays) to match `toQuery` in `@slopmachine/core`.
internal func buildQueryString(_ entries: [(String, SlopQueryValue)]) -> String {
    var pairs: [String] = []
    pairs.reserveCapacity(entries.count)

    for (key, queryValue) in entries {
        let serializedValue: String?
        switch queryValue {
        case .string(let s):
            if let s, !s.isEmpty {
                serializedValue = s
            } else {
                serializedValue = nil
            }
        case .int(let i):
            if let i, i != 0 {
                serializedValue = String(i)
            } else {
                serializedValue = nil
            }
        case .bool(let b):
            if let b, b == true {
                serializedValue = "true"
            } else {
                serializedValue = nil
            }
        case .rawJSON(let json):
            if let json, !json.isEmpty {
                serializedValue = json
            } else {
                serializedValue = nil
            }
        }

        if let value = serializedValue {
            pairs.append("\(encodeURLSearchParam(key))=\(encodeURLSearchParam(value))")
        }
    }

    return pairs.joined(separator: "&")
}

private func buildPipelineComponentQuery(
    pipelineId: String,
    mode: String,
    siloId: String?,
    prompt: String?,
    resultId: String?,
    variables: SlopVariables?,
    metadata: SlopMetadata?
) -> String {
    buildQueryString([
        ("pipelineId", .string(pipelineId)),
        (mode, .bool(true)),
        ("siloId", .string(siloId)),
        ("prompt", .string(prompt)),
        ("resultId", .string(resultId)),
        ("variables", .rawJSON(variables.flatMap(serializeVariables))),
        ("metadata", .rawJSON(metadata.flatMap(serializeMetadata))),
    ])
}

/// Interpolates `{variable}` placeholders in a prompt string using the supplied `SlopVariables`.
///
/// Treats variable keys and replacement values literally without regular expression metacharacter expansion.
/// Placeholders with `.null` or missing values are left unchanged.
///
/// - Parameters:
///   - prompt: Prompt template string containing `{key}` placeholders.
///   - variables: Optional variables collection.
/// - Returns: The interpolated prompt string, or `""` if `prompt` is `nil` or empty.
public func interpolatePrompt(_ prompt: String?, variables: SlopVariables? = nil) -> String {
    guard let prompt, !prompt.isEmpty else { return "" }
    guard let variables, !variables.isEmpty else { return prompt }

    var text = prompt
    for entry in variables.entries {
        if let replacement = entry.value.stringValue {
            text = text.components(separatedBy: "{\(entry.key)}").joined(separator: replacement)
        }
    }
    return text
}

/// Interpolates `{variable}` placeholders in a prompt string using a standard Swift dictionary.
public func interpolatePrompt(_ prompt: String?, variables: [String: SlopVariableValue]?) -> String {
    interpolatePrompt(prompt, variables: variables.map(SlopVariables.init))
}

/// Builds a URL string to render or retrieve an image from Slop Machine.
///
/// Supports both standard Buckets (via `bucketId`) and multi-step Pipelines (via `pipelineId`).
///
/// - Parameter options: Configuration options for the image generation.
/// - Returns: The constructed URL string, byte-for-byte identical to `@slopmachine/core`.
public func buildImageUrlString(_ options: SlopImageOptions) -> String {
    if let pipelineId = options.pipelineId, !pipelineId.isEmpty {
        let tracker = WarnedPipelineOptionsTracker.shared
        tracker.warnOnceIfNeeded(key: "model", isSet: options.model != nil && !(options.model?.isEmpty ?? true))
        tracker.warnOnceIfNeeded(key: "version", isSet: options.version != nil && options.version != 0)
        tracker.warnOnceIfNeeded(key: "original", isSet: options.original == true)
        tracker.warnOnceIfNeeded(key: "attachments", isSet: !(options.attachments?.isEmpty ?? true))

        let query = buildPipelineComponentQuery(
            pipelineId: pipelineId,
            mode: "redirect",
            siloId: options.siloId,
            prompt: options.prompt,
            resultId: options.resultId,
            variables: options.variables,
            metadata: options.metadata
        )
        return "\(resolveSlopEndpoint("renderPipeline", baseUrl: options.baseUrl))?\(query)"
    }

    let query: String
    if let resultId = options.resultId, !resultId.isEmpty {
        query = buildQueryString([
            ("bucketId", .string(options.bucketId)),
            ("resultId", .string(resultId)),
        ])
    } else {
        query = buildQueryString([
            ("bucketId", .string(options.bucketId)),
            ("aspectRatio", .string(options.aspectRatio.rawValue)),
            ("model", .string(options.model)),
            ("version", .int(options.version)),
            ("original", .bool(options.original)),
            ("variables", .rawJSON(options.variables.flatMap(serializeVariables))),
            ("metadata", .rawJSON(options.metadata.flatMap(serializeMetadata))),
            ("attachments", .rawJSON(options.attachments.flatMap(serializeAttachments))),
        ])
    }

    return "\(resolveSlopEndpoint("renderImage", baseUrl: options.baseUrl))?\(query)"
}

/// Builds a `URL` to render or retrieve an image from Slop Machine.
///
/// - Parameter options: Configuration options for the image generation.
/// - Returns: A `URL` targeting the `renderImage` or `renderPipeline` endpoint.
public func buildImageUrl(_ options: SlopImageOptions) -> URL {
    let urlString = buildImageUrlString(options)
    return URL(string: urlString) ?? URL(string: defaultSlopMachineAPIURL)!
}

/// Builds a URL string to render or stream an AI-generated video from Slop Machine.
///
/// Supports both standard Buckets (via `bucketId`) and multi-step Pipelines (via `pipelineId`).
///
/// - Parameter options: Configuration options for the video generation.
/// - Returns: The constructed URL string, byte-for-byte identical to `@slopmachine/core`.
public func buildVideoUrlString(_ options: SlopVideoOptions) -> String {
    if let pipelineId = options.pipelineId, !pipelineId.isEmpty {
        let tracker = WarnedPipelineOptionsTracker.shared
        tracker.warnOnceIfNeeded(key: "version", isSet: options.version != nil && options.version != 0)
        tracker.warnOnceIfNeeded(key: "duration", isSet: options.duration != nil && options.duration != 0)
        tracker.warnOnceIfNeeded(key: "original", isSet: options.original == true)
        tracker.warnOnceIfNeeded(key: "attachments", isSet: !(options.attachments?.isEmpty ?? true))

        let query = buildPipelineComponentQuery(
            pipelineId: pipelineId,
            mode: "redirect",
            siloId: options.siloId,
            prompt: options.prompt,
            resultId: options.resultId,
            variables: options.variables,
            metadata: options.metadata
        )
        return "\(resolveSlopEndpoint("renderPipeline", baseUrl: options.baseUrl))?\(query)"
    }

    let query: String
    if let resultId = options.resultId, !resultId.isEmpty {
        query = buildQueryString([
            ("bucketId", .string(options.bucketId)),
            ("resultId", .string(resultId)),
        ])
    } else {
        query = buildQueryString([
            ("bucketId", .string(options.bucketId)),
            ("aspectRatio", .string(options.aspectRatio.rawValue)),
            ("version", .int(options.version)),
            ("duration", .int(options.duration)),
            ("original", .bool(options.original)),
            ("variables", .rawJSON(options.variables.flatMap(serializeVariables))),
            ("metadata", .rawJSON(options.metadata.flatMap(serializeMetadata))),
            ("attachments", .rawJSON(options.attachments.flatMap(serializeAttachments))),
        ])
    }

    return "\(resolveSlopEndpoint("renderVideo", baseUrl: options.baseUrl))?\(query)"
}

/// Builds a `URL` to render or stream an AI-generated video from Slop Machine.
///
/// - Parameter options: Configuration options for the video generation.
/// - Returns: A `URL` targeting the `renderVideo` or `renderPipeline` endpoint.
public func buildVideoUrl(_ options: SlopVideoOptions) -> URL {
    let urlString = buildVideoUrlString(options)
    return URL(string: urlString) ?? URL(string: defaultSlopMachineAPIURL)!
}

/// Builds a URL string to render or retrieve text from Slop Machine.
///
/// Supports both standard Buckets (via `bucketId`) and multi-step Pipelines (via `pipelineId`).
///
/// - Parameter options: Configuration options for the text generation.
/// - Returns: The constructed URL string, byte-for-byte identical to `@slopmachine/core`.
public func buildTextUrlString(_ options: SlopTextOptions) -> String {
    if let pipelineId = options.pipelineId, !pipelineId.isEmpty {
        let tracker = WarnedPipelineOptionsTracker.shared
        tracker.warnOnceIfNeeded(key: "model", isSet: options.model != nil && !(options.model?.isEmpty ?? true))
        tracker.warnOnceIfNeeded(key: "version", isSet: options.version != nil && options.version != 0)
        tracker.warnOnceIfNeeded(key: "attachments", isSet: !(options.attachments?.isEmpty ?? true))

        let query = buildPipelineComponentQuery(
            pipelineId: pipelineId,
            mode: "sync",
            siloId: options.siloId,
            prompt: options.prompt,
            resultId: options.resultId,
            variables: options.variables,
            metadata: options.metadata
        )
        return "\(resolveSlopEndpoint("renderPipeline", baseUrl: options.baseUrl))?\(query)"
    }

    let query: String
    if let resultId = options.resultId, !resultId.isEmpty {
        query = buildQueryString([
            ("bucketId", .string(options.bucketId)),
            ("resultId", .string(resultId)),
        ])
    } else {
        query = buildQueryString([
            ("bucketId", .string(options.bucketId)),
            ("model", .string(options.model)),
            ("version", .int(options.version)),
            ("variables", .rawJSON(options.variables.flatMap(serializeVariables))),
            ("metadata", .rawJSON(options.metadata.flatMap(serializeMetadata))),
            ("attachments", .rawJSON(options.attachments.flatMap(serializeAttachments))),
        ])
    }

    return "\(resolveSlopEndpoint("renderText", baseUrl: options.baseUrl))?\(query)"
}

/// Builds a `URL` to render or retrieve text from Slop Machine.
///
/// - Parameter options: Configuration options for the text generation.
/// - Returns: A `URL` targeting the `renderText` or `renderPipeline` endpoint.
public func buildTextUrl(_ options: SlopTextOptions) -> URL {
    let urlString = buildTextUrlString(options)
    return URL(string: urlString) ?? URL(string: defaultSlopMachineAPIURL)!
}

/// Builds a URL string to execute or inspect a multi-step Pipeline from Slop Machine.
///
/// - Parameter options: Configuration options for the pipeline execution.
/// - Returns: The constructed URL string, byte-for-byte identical to `@slopmachine/core`.
public func buildPipelineUrlString(_ options: SlopPipelineOptions) -> String {
    let query = buildQueryString([
        ("pipelineId", .string(options.pipelineId)),
        ("siloId", .string(options.siloId)),
        ("prompt", .string(options.prompt)),
        ("resultId", .string(options.resultId)),
        // Always sent, including an explicit sync=false
        ("sync", .string(options.sync ? "true" : "false")),
        ("redirect", .bool(options.redirect)),
        ("variables", .rawJSON(options.variables.flatMap(serializeVariables))),
        ("metadata", .rawJSON(options.metadata.flatMap(serializeMetadata))),
    ])
    return "\(resolveSlopEndpoint("renderPipeline", baseUrl: options.baseUrl))?\(query)"
}

/// Builds a `URL` to execute or inspect a multi-step Pipeline from Slop Machine.
///
/// - Parameter options: Configuration options for the pipeline execution.
/// - Returns: A `URL` targeting the `renderPipeline` endpoint.
public func buildPipelineUrl(_ options: SlopPipelineOptions) -> URL {
    let urlString = buildPipelineUrlString(options)
    return URL(string: urlString) ?? URL(string: defaultSlopMachineAPIURL)!
}
