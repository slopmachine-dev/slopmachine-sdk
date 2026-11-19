import CoreGraphics
import Foundation

/// Aspect ratios supported by the `renderImage` endpoint.
///
/// Kept in sync with `ImageAspectRatio` in `@slopmachine/core` and `AspectRatioSchema` in `@pixerate/schemas`.
public enum ImageAspectRatio: String, CaseIterable, Codable, Sendable, Hashable {
    /// Square (`1:1`) aspect ratio.
    case square = "1:1"
    /// Classic portrait (`2:3`) aspect ratio.
    case portrait2x3 = "2:3"
    /// Classic landscape (`3:2`) aspect ratio.
    case landscape3x2 = "3:2"
    /// Standard portrait (`3:4`) aspect ratio.
    case portrait3x4 = "3:4"
    /// Standard landscape (`4:3`) aspect ratio.
    case landscape4x3 = "4:3"
    /// Social portrait (`4:5`) aspect ratio.
    case portrait4x5 = "4:5"
    /// Social landscape (`5:4`) aspect ratio.
    case landscape5x4 = "5:4"
    /// Vertical / mobile (`9:16`) aspect ratio.
    case portrait9x16 = "9:16"
    /// Widescreen (`16:9`) aspect ratio.
    case landscape16x9 = "16:9"
    /// Ultrawide (`21:9`) aspect ratio.
    case ultrawide21x9 = "21:9"

    /// Shorthand alias for `"1:1"`.
    public static let r1x1: Self = .square
    /// Shorthand alias for `"2:3"`.
    public static let r2x3: Self = .portrait2x3
    /// Shorthand alias for `"3:2"`.
    public static let r3x2: Self = .landscape3x2
    /// Shorthand alias for `"3:4"`.
    public static let r3x4: Self = .portrait3x4
    /// Shorthand alias for `"4:3"`.
    public static let r4x3: Self = .landscape4x3
    /// Shorthand alias for `"4:5"`.
    public static let r4x5: Self = .portrait4x5
    /// Shorthand alias for `"5:4"`.
    public static let r5x4: Self = .landscape5x4
    /// Shorthand alias for `"9:16"`.
    public static let r9x16: Self = .portrait9x16
    /// Shorthand alias for `"16:9"`.
    public static let r16x9: Self = .landscape16x9
    /// Shorthand alias for `"21:9"`.
    public static let r21x9: Self = .ultrawide21x9
    /// Shorthand alias for `"16:9"`.
    public static let widescreen: Self = .landscape16x9
    /// Shorthand alias for `"9:16"`.
    public static let portrait: Self = .portrait9x16

    /// Width-to-height ratio (`width / height`) for zero-layout-shift SwiftUI `.aspectRatio(_:contentMode:)` frame reservation.
    public var cgFloatRatio: CGFloat {
        switch self {
        case .square: return 1.0
        case .portrait2x3: return 2.0 / 3.0
        case .landscape3x2: return 3.0 / 2.0
        case .portrait3x4: return 3.0 / 4.0
        case .landscape4x3: return 4.0 / 3.0
        case .portrait4x5: return 4.0 / 5.0
        case .landscape5x4: return 5.0 / 4.0
        case .portrait9x16: return 9.0 / 16.0
        case .landscape16x9: return 16.0 / 9.0
        case .ultrawide21x9: return 21.0 / 9.0
        }
    }
}

/// Aspect ratios supported by the `renderVideo` endpoint.
///
/// Kept in sync with `VideoAspectRatio` in `@slopmachine/core` and `VideoAspectRatioSchema` in `@pixerate/schemas`.
public enum VideoAspectRatio: String, CaseIterable, Codable, Sendable, Hashable {
    /// Vertical / mobile (`9:16`) aspect ratio.
    case portrait9x16 = "9:16"
    /// Widescreen (`16:9`) aspect ratio.
    case landscape16x9 = "16:9"

    /// Shorthand alias for `"9:16"`.
    public static let r9x16: Self = .portrait9x16
    /// Shorthand alias for `"16:9"`.
    public static let r16x9: Self = .landscape16x9
    /// Shorthand alias for `"9:16"`.
    public static let portrait: Self = .portrait9x16
    /// Shorthand alias for `"16:9"`.
    public static let widescreen: Self = .landscape16x9
    /// Shorthand alias for `"16:9"`.
    public static let landscape: Self = .landscape16x9

    /// Width-to-height ratio (`width / height`) for zero-layout-shift SwiftUI `.aspectRatio(_:contentMode:)` frame reservation.
    public var cgFloatRatio: CGFloat {
        switch self {
        case .portrait9x16: return 9.0 / 16.0
        case .landscape16x9: return 16.0 / 9.0
        }
    }
}

/// A prompt variable value supported by Slop Machine (`string | number | null`).
public enum SlopVariableValue: Sendable, Codable, Equatable, Hashable,
    ExpressibleByStringLiteral,
    ExpressibleByIntegerLiteral,
    ExpressibleByFloatLiteral,
    ExpressibleByNilLiteral
{
    case string(String)
    case int(Int)
    case double(Double)
    case null

    public init(stringLiteral value: String) {
        self = .string(value)
    }

    public init(integerLiteral value: Int) {
        self = .int(value)
    }

    public init(floatLiteral value: Double) {
        self = .double(value)
    }

    public init(nilLiteral: ()) {
        self = .null
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let intVal = try? container.decode(Int.self) {
            self = .int(intVal)
        } else if let doubleVal = try? container.decode(Double.self) {
            self = .double(doubleVal)
        } else if let stringVal = try? container.decode(String.self) {
            self = .string(stringVal)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported SlopVariableValue"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let s):
            try container.encode(s)
        case .int(let i):
            try container.encode(i)
        case .double(let d):
            try container.encode(d)
        case .null:
            try container.encodeNil()
        }
    }

    /// Plain string representation used for prompt interpolation (`nil` when `.null`).
    public var stringValue: String? {
        switch self {
        case .string(let s):
            return s
        case .int(let i):
            return String(i)
        case .double(let d):
            if d.rounded() == d, let exactInt = Int(exactly: d) {
                return String(exactInt)
            }
            return String(d)
        case .null:
            return nil
        }
    }
}

/// Deterministic collection of prompt variables (`[String: SlopVariableValue]`) that guarantees
/// byte-stable JSON serialization for CDN and browser cache keys.
///
/// - When initialized with a dictionary literal (e.g. `["theme": "dark", "n": 2]`) or an array of pairs,
///   exact insertion order is preserved (matching JavaScript object property order).
/// - When initialized from a standard Swift `[String: SlopVariableValue]` dictionary, keys are sorted
///   lexicographically so Swift's per-process dictionary hash randomization never alters generated URLs.
public struct SlopVariables: Sendable, Equatable, Hashable, Codable, ExpressibleByDictionaryLiteral {
    /// A single key-value entry in `SlopVariables`.
    public struct Entry: Sendable, Equatable, Hashable {
        public let key: String
        public let value: SlopVariableValue

        public init(key: String, value: SlopVariableValue) {
            self.key = key
            self.value = value
        }
    }

    /// Ordered entries preserved for deterministic serialization.
    public let entries: [Entry]

    /// Creates an empty `SlopVariables` collection.
    public init() {
        self.entries = []
    }

    /// Creates `SlopVariables` from ordered key-value pairs, preserving insertion order.
    /// Duplicate keys keep the last value at the first seen position (matching JS object semantics).
    public init(_ pairs: [(String, SlopVariableValue)]) {
        var result: [Entry] = []
        var indexByKey: [String: Int] = [:]
        for (key, value) in pairs {
            if let existingIndex = indexByKey[key] {
                result[existingIndex] = Entry(key: key, value: value)
            } else {
                indexByKey[key] = result.count
                result.append(Entry(key: key, value: value))
            }
        }
        self.entries = result
    }

    /// Creates `SlopVariables` from a standard Swift `Dictionary`, sorting keys lexicographically
    /// so JSON serialization is deterministic across launches.
    public init(_ dictionary: [String: SlopVariableValue]) {
        self.entries = dictionary.keys.sorted().compactMap { key in
            guard let val = dictionary[key] else { return nil }
            return Entry(key: key, value: val)
        }
    }

    /// Creates `SlopVariables` from a `[String: String]` dictionary with sorted keys.
    public init(_ dictionary: [String: String]) {
        self.entries = dictionary.keys.sorted().compactMap { key in
            guard let val = dictionary[key] else { return nil }
            return Entry(key: key, value: .string(val))
        }
    }

    public init(dictionaryLiteral elements: (String, SlopVariableValue)...) {
        self.init(elements)
    }

    /// Whether the collection has no entries.
    public var isEmpty: Bool {
        entries.isEmpty
    }

    /// Looks up a variable value by key.
    public subscript(key: String) -> SlopVariableValue? {
        entries.first(where: { $0.key == key })?.value
    }

    /// Returns a standard Swift dictionary representation.
    public var dictionaryValue: [String: SlopVariableValue] {
        var dict: [String: SlopVariableValue] = [:]
        for entry in entries {
            dict[entry.key] = entry.value
        }
        return dict
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let dict = try container.decode([String: SlopVariableValue].self)
        self.init(dict)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(dictionaryValue)
    }
}

/// Arbitrary JSON value used for `metadata` and dynamic pipeline step `outputData`.
public enum SlopJSONValue: Sendable, Equatable, Hashable, Codable,
    ExpressibleByStringLiteral,
    ExpressibleByIntegerLiteral,
    ExpressibleByFloatLiteral,
    ExpressibleByBooleanLiteral,
    ExpressibleByArrayLiteral,
    ExpressibleByDictionaryLiteral,
    ExpressibleByNilLiteral
{
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case array([SlopJSONValue])
    case object(SlopMetadata)
    case null

    public init(stringLiteral value: String) {
        self = .string(value)
    }

    public init(integerLiteral value: Int) {
        self = .int(value)
    }

    public init(floatLiteral value: Double) {
        self = .double(value)
    }

    public init(booleanLiteral value: Bool) {
        self = .bool(value)
    }

    public init(arrayLiteral elements: SlopJSONValue...) {
        self = .array(elements)
    }

    public init(dictionaryLiteral elements: (String, SlopJSONValue)...) {
        self = .object(SlopMetadata(elements))
    }

    public init(nilLiteral: ()) {
        self = .null
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let b = try? container.decode(Bool.self) {
            self = .bool(b)
        } else if let i = try? container.decode(Int.self) {
            self = .int(i)
        } else if let d = try? container.decode(Double.self) {
            self = .double(d)
        } else if let s = try? container.decode(String.self) {
            self = .string(s)
        } else if let arr = try? container.decode([SlopJSONValue].self) {
            self = .array(arr)
        } else if let obj = try? container.decode([String: SlopJSONValue].self) {
            self = .object(SlopMetadata(obj))
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported SlopJSONValue"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let s):
            try container.encode(s)
        case .int(let i):
            try container.encode(i)
        case .double(let d):
            try container.encode(d)
        case .bool(let b):
            try container.encode(b)
        case .array(let arr):
            try container.encode(arr)
        case .object(let obj):
            try container.encode(obj)
        case .null:
            try container.encodeNil()
        }
    }
}

/// Deterministic JSON object used for `metadata` parameters, preserving insertion order for
/// dictionary literals and sorting keys lexicographically when constructed from `[String: SlopJSONValue]`.
public struct SlopMetadata: Sendable, Equatable, Hashable, Codable, ExpressibleByDictionaryLiteral {
    /// A single key-value entry in `SlopMetadata`.
    public struct Entry: Sendable, Equatable, Hashable {
        public let key: String
        public let value: SlopJSONValue

        public init(key: String, value: SlopJSONValue) {
            self.key = key
            self.value = value
        }
    }

    /// Ordered entries preserved for deterministic JSON serialization.
    public let entries: [Entry]

    /// Creates an empty `SlopMetadata` collection.
    public init() {
        self.entries = []
    }

    /// Creates `SlopMetadata` from ordered key-value pairs, preserving insertion order.
    public init(_ pairs: [(String, SlopJSONValue)]) {
        var result: [Entry] = []
        var indexByKey: [String: Int] = [:]
        for (key, value) in pairs {
            if let existingIndex = indexByKey[key] {
                result[existingIndex] = Entry(key: key, value: value)
            } else {
                indexByKey[key] = result.count
                result.append(Entry(key: key, value: value))
            }
        }
        self.entries = result
    }

    /// Creates `SlopMetadata` from a standard Swift `Dictionary`, sorting keys lexicographically.
    public init(_ dictionary: [String: SlopJSONValue]) {
        self.entries = dictionary.keys.sorted().compactMap { key in
            guard let val = dictionary[key] else { return nil }
            return Entry(key: key, value: val)
        }
    }

    /// Creates `SlopMetadata` from a `[String: String]` dictionary with sorted keys.
    public init(_ dictionary: [String: String]) {
        self.entries = dictionary.keys.sorted().compactMap { key in
            guard let val = dictionary[key] else { return nil }
            return Entry(key: key, value: .string(val))
        }
    }

    public init(dictionaryLiteral elements: (String, SlopJSONValue)...) {
        self.init(elements)
    }

    /// Whether the metadata object has no entries.
    public var isEmpty: Bool {
        entries.isEmpty
    }

    /// Looks up a metadata value by key.
    public subscript(key: String) -> SlopJSONValue? {
        entries.first(where: { $0.key == key })?.value
    }

    /// Returns a standard Swift dictionary representation.
    public var dictionaryValue: [String: SlopJSONValue] {
        var dict: [String: SlopJSONValue] = [:]
        for entry in entries {
            dict[entry.key] = entry.value
        }
        return dict
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let dict = try container.decode([String: SlopJSONValue].self)
        self.init(dict)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(dictionaryValue)
    }
}

/// Configuration options for generating or retrieving an image via `buildImageUrl` or `SlopImage`.
public struct SlopImageOptions: Sendable, Equatable, Hashable {
    /// The unique identifier of your Slop Machine bucket.
    /// Required when using a bucket unless `pipelineId` is provided.
    public var bucketId: String?

    /// The unique identifier of your Slop Machine pipeline.
    /// Required when targeting a pipeline instead of a bucket.
    public var pipelineId: String?

    /// Optional silo identifier.
    public var siloId: String?

    /// Dynamic runtime prompt (used when targeting a pipeline).
    public var prompt: String?

    /// Arbitrary user metadata to attach to the generation request / result document.
    public var metadata: SlopMetadata?

    /// The specific version of the prompt/settings to use.
    /// If omitted, the latest version will be used.
    public var version: Int?

    /// Result ID to retrieve a specific previously generated image instead of generating a new one.
    public var resultId: String?

    /// The aspect ratio of the generated image. Defaults to `.square` (`"1:1"`).
    public var aspectRatio: ImageAspectRatio

    /// Overrides the AI model used for generation.
    /// If omitted, the bucket version's configured model is used.
    public var model: String?

    /// Dynamic variables to interpolate into the prompt.
    public var variables: SlopVariables?

    /// Full endpoint URL to send this request to instead of the default production `renderImage` endpoint.
    public var baseUrl: String?

    /// If `true`, bypasses the WebP optimized media and returns the original generated file (e.g. PNG/JPEG).
    public var original: Bool?

    /// Array of attachment URLs to include with the request.
    public var attachments: [String]?

    /// Creates a new `SlopImageOptions` configuration.
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
        attachments: [String]? = nil
    ) {
        self.bucketId = bucketId
        self.pipelineId = pipelineId
        self.siloId = siloId
        self.prompt = prompt
        self.metadata = metadata
        self.version = version
        self.resultId = resultId
        self.aspectRatio = aspectRatio
        self.model = model
        self.variables = variables
        self.baseUrl = baseUrl
        self.original = original
        self.attachments = attachments
    }
}

/// Configuration options for generating or retrieving a video via `buildVideoUrl` or `SlopVideo`.
public struct SlopVideoOptions: Sendable, Equatable, Hashable {
    /// The unique identifier of your Slop Machine bucket.
    /// Required when using a bucket unless `pipelineId` is provided.
    public var bucketId: String?

    /// The unique identifier of your Slop Machine pipeline.
    /// Required when targeting a pipeline instead of a bucket.
    public var pipelineId: String?

    /// Optional silo identifier.
    public var siloId: String?

    /// Dynamic runtime prompt (used when targeting a pipeline).
    public var prompt: String?

    /// Arbitrary user metadata to attach to the generation request / result document.
    public var metadata: SlopMetadata?

    /// The specific version of the prompt/settings to use.
    public var version: Int?

    /// Result ID to retrieve a specific previously generated video instead of generating a new one.
    public var resultId: String?

    /// The aspect ratio of the generated video. Defaults to `.landscape16x9` (`"16:9"`).
    public var aspectRatio: VideoAspectRatio

    /// Dynamic variables to interpolate into the prompt.
    public var variables: SlopVariables?

    /// The duration of the generated video in seconds.
    /// If not specified, defaults to the bucket version's configured duration.
    public var duration: Int?

    /// Full endpoint URL to send this request to instead of the default production `renderVideo` endpoint.
    public var baseUrl: String?

    /// If `true`, serves the original generated uncompressed asset directly from storage.
    public var original: Bool?

    /// Array of runtime image attachments (URLs) to use with the video model.
    public var attachments: [String]?

    /// Creates a new `SlopVideoOptions` configuration.
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
        attachments: [String]? = nil
    ) {
        self.bucketId = bucketId
        self.pipelineId = pipelineId
        self.siloId = siloId
        self.prompt = prompt
        self.metadata = metadata
        self.version = version
        self.resultId = resultId
        self.aspectRatio = aspectRatio
        self.variables = variables
        self.duration = duration
        self.baseUrl = baseUrl
        self.original = original
        self.attachments = attachments
    }
}

/// Configuration options for generating or retrieving text via `buildTextUrl` or `SlopText`.
public struct SlopTextOptions: Sendable, Equatable, Hashable {
    /// The unique identifier of your Slop Machine bucket.
    /// Required when using a bucket unless `pipelineId` is provided.
    public var bucketId: String?

    /// The unique identifier of your Slop Machine pipeline.
    /// Required when targeting a pipeline instead of a bucket.
    public var pipelineId: String?

    /// Optional silo identifier.
    public var siloId: String?

    /// Dynamic runtime prompt (used when targeting a pipeline).
    public var prompt: String?

    /// Arbitrary user metadata to attach to the generation request / result document.
    public var metadata: SlopMetadata?

    /// The specific version of the prompt/settings to use.
    public var version: Int?

    /// Result ID to retrieve a specific previously generated text instead of generating a new one.
    public var resultId: String?

    /// Overrides the AI model used for generation.
    public var model: String?

    /// Dynamic variables to interpolate into the prompt.
    public var variables: SlopVariables?

    /// Full endpoint URL to send this request to instead of the default production `renderText` endpoint.
    public var baseUrl: String?

    /// Array of attachment URLs to include with the request.
    public var attachments: [String]?

    /// Creates a new `SlopTextOptions` configuration.
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
        attachments: [String]? = nil
    ) {
        self.bucketId = bucketId
        self.pipelineId = pipelineId
        self.siloId = siloId
        self.prompt = prompt
        self.metadata = metadata
        self.version = version
        self.resultId = resultId
        self.model = model
        self.variables = variables
        self.baseUrl = baseUrl
        self.attachments = attachments
    }
}

/// Configuration options for building a pipeline execution URL via `buildPipelineUrl`.
public struct SlopPipelineOptions: Sendable, Equatable, Hashable {
    /// The unique identifier of the pipeline to execute.
    public var pipelineId: String

    /// Optional silo identifier for direct pipeline path resolution.
    public var siloId: String?

    /// Dynamic runtime prompt to feed into the pipeline.
    public var prompt: String?

    /// Variables to interpolate into prompt or step configs.
    public var variables: SlopVariables?

    /// Arbitrary user metadata to attach to the pipeline result document.
    public var metadata: SlopMetadata?

    /// Whether to wait for full execution (default `true`) or return a job ID immediately.
    public var sync: Bool

    /// Whether to redirect to the primary media output URL upon completion.
    public var redirect: Bool?

    /// Result ID to retrieve a specific previously generated result.
    public var resultId: String?

    /// Full endpoint URL to send this request to instead of the default production `renderPipeline` endpoint.
    public var baseUrl: String?

    /// Creates a new `SlopPipelineOptions` configuration.
    public init(
        pipelineId: String,
        siloId: String? = nil,
        prompt: String? = nil,
        variables: SlopVariables? = nil,
        metadata: SlopMetadata? = nil,
        sync: Bool = true,
        redirect: Bool? = nil,
        resultId: String? = nil,
        baseUrl: String? = nil
    ) {
        self.pipelineId = pipelineId
        self.siloId = siloId
        self.prompt = prompt
        self.variables = variables
        self.metadata = metadata
        self.sync = sync
        self.redirect = redirect
        self.resultId = resultId
        self.baseUrl = baseUrl
    }
}

/// Execution parameters for programmatically running a pipeline via `executePipeline`.
public struct ExecutePipelineOptions: Sendable, Equatable, Hashable {
    /// The unique identifier of the pipeline to execute.
    public var pipelineId: String

    /// Optional silo identifier for direct pipeline path resolution.
    public var siloId: String?

    /// Dynamic runtime prompt to feed into the pipeline.
    public var prompt: String?

    /// Variables to interpolate into prompt or step configs.
    public var variables: SlopVariables?

    /// Arbitrary user metadata to attach to the pipeline result document.
    public var metadata: SlopMetadata?

    /// Full endpoint URL to send this request to instead of the default production `renderPipeline` endpoint.
    public var baseUrl: String?

    /// Creates a new `ExecutePipelineOptions` configuration.
    public init(
        pipelineId: String,
        siloId: String? = nil,
        prompt: String? = nil,
        variables: SlopVariables? = nil,
        metadata: SlopMetadata? = nil,
        baseUrl: String? = nil
    ) {
        self.pipelineId = pipelineId
        self.siloId = siloId
        self.prompt = prompt
        self.variables = variables
        self.metadata = metadata
        self.baseUrl = baseUrl
    }
}

/// Output details for an individual step within a completed `PipelineResult`.
public struct PipelineStepResult: Codable, Sendable, Equatable {
    /// Unique identifier of the step within the pipeline version.
    public let stepId: String
    /// Optional human-readable display name of the step.
    public let stepName: String?
    /// Step type (e.g. `"image_generation"`, `"video_generation"`, `"text_generation"`).
    public let type: String
    /// Output media URL if this step produced an image, video, or audio asset.
    public let outputUrl: String?
    /// Output text if this step produced text content.
    public let outputText: String?
    /// Structured output data if this step produced JSON data.
    public let outputData: SlopJSONValue?
    /// Execution time in milliseconds.
    public let computeTimeMs: Double?
    /// Fuel cost consumed by this step.
    public let fuelCost: Double?
    /// Error message if this step failed.
    public let error: String?

    public init(
        stepId: String,
        stepName: String? = nil,
        type: String,
        outputUrl: String? = nil,
        outputText: String? = nil,
        outputData: SlopJSONValue? = nil,
        computeTimeMs: Double? = nil,
        fuelCost: Double? = nil,
        error: String? = nil
    ) {
        self.stepId = stepId
        self.stepName = stepName
        self.type = type
        self.outputUrl = outputUrl
        self.outputText = outputText
        self.outputData = outputData
        self.computeTimeMs = computeTimeMs
        self.fuelCost = fuelCost
        self.error = error
    }
}

/// Execution status of a pipeline run.
public enum PipelineExecutionStatus: String, Codable, Sendable, Equatable {
    case completed
    case failed
    case pending
    case queued
    case processing
}

/// Complete typed result document returned by `executePipeline`.
public struct PipelineResult: Codable, Sendable, Equatable {
    /// Unique identifier of the generated result (`resultId`).
    public let id: String
    /// Identifier of the pipeline that produced this result.
    public let pipelineId: String?
    /// Identifier of the silo containing the pipeline.
    public let siloId: String?
    /// Primary media output URL, if applicable.
    public let url: String?
    /// Primary text output, if applicable.
    public let text: String?
    /// Primary structured JSON data output, if applicable.
    public let data: SlopJSONValue?
    /// Primary result media type (e.g. `"image"`, `"video"`, `"text"`).
    public let resultType: String?
    /// Execution status (`completed`, `failed`, `pending`).
    public let status: PipelineExecutionStatus
    /// Individual results for each executed step.
    public let stepResults: [PipelineStepResult]?
    /// Total compute time in milliseconds across all steps.
    public let totalComputeTimeMs: Double?
    /// Total fuel cost across all steps.
    public let totalFuelCost: Double?
    /// Custom metadata attached to the result.
    public let metadata: SlopMetadata?
    /// Timestamp payload returned by the backend.
    public let timestamp: SlopJSONValue?
    /// Error message if the pipeline execution failed.
    public let error: String?

    public init(
        id: String,
        pipelineId: String? = nil,
        siloId: String? = nil,
        url: String? = nil,
        text: String? = nil,
        data: SlopJSONValue? = nil,
        resultType: String? = nil,
        status: PipelineExecutionStatus,
        stepResults: [PipelineStepResult]? = nil,
        totalComputeTimeMs: Double? = nil,
        totalFuelCost: Double? = nil,
        metadata: SlopMetadata? = nil,
        timestamp: SlopJSONValue? = nil,
        error: String? = nil
    ) {
        self.id = id
        self.pipelineId = pipelineId
        self.siloId = siloId
        self.url = url
        self.text = text
        self.data = data
        self.resultType = resultType
        self.status = status
        self.stepResults = stepResults
        self.totalComputeTimeMs = totalComputeTimeMs
        self.totalFuelCost = totalFuelCost
        self.metadata = metadata
        self.timestamp = timestamp
        self.error = error
    }
}

/// Rating value for `rateResult`. Pass `nil` (`ResultRating? = nil`) to clear an existing rating.
public enum ResultRating: String, Codable, Sendable, Equatable {
    case good
    case bad
}

/// Configuration options for authenticating `rateResult` requests.
public struct RateResultOptions: Sendable, Equatable {
    /// API key (`x-api-key`) used to authenticate the rating request.
    /// Must only be used on the server or in secure environments — never embed secret keys in public client builds.
    public var apiKey: String

    /// Base URL of the Slop Machine web API (defaults to `"https://slopmachine.dev"`).
    public var apiBaseUrl: String?

    /// Creates a new `RateResultOptions` configuration.
    public init(apiKey: String, apiBaseUrl: String? = nil) {
        self.apiKey = apiKey
        self.apiBaseUrl = apiBaseUrl
    }
}

/// Response returned by `rateResult`.
public struct RateResultResponse: Codable, Sendable, Equatable {
    /// Whether the rating update succeeded.
    public let success: Bool
    /// The rated result ID.
    public let resultId: String
    /// The updated rating (`.good`, `.bad`, or `nil` when cleared).
    public let rating: ResultRating?

    public init(success: Bool, resultId: String, rating: ResultRating?) {
        self.success = success
        self.resultId = resultId
        self.rating = rating
    }
}

/// Response returned by `uploadTempAttachment`.
public struct UploadedAttachment: Codable, Sendable, Equatable {
    /// Temporary CDN URL of the uploaded attachment to pass in `attachments`.
    public let url: String

    public init(url: String) {
        self.url = url
    }
}
