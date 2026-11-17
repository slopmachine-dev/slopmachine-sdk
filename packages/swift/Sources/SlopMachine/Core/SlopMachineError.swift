import Foundation

/// Error raised when Slop Machine fails to generate or serve a result.
public struct SlopMachineError: Error, LocalizedError, CustomNSError, Sendable, Equatable {
    /// Error type name matching the JavaScript SDK (`"SlopMachineError"`).
    public let name: String = "SlopMachineError"

    /// Human-readable error message from the Slop Machine API or client.
    public let message: String

    /// The HTTP status returned by the API (e.g. `400` for validation errors,
    /// `500` for generation failures). `nil` when the media element itself
    /// failed to load and no API status is known.
    public let status: Int?

    /// Creates a new `SlopMachineError`.
    /// - Parameters:
    ///   - message: Descriptive error message.
    ///   - status: Optional HTTP status code returned by the API.
    public init(_ message: String, status: Int? = nil) {
        self.message = message
        self.status = status
    }

    /// Creates a new `SlopMachineError` with an explicit `message:` argument label.
    /// - Parameters:
    ///   - message: Descriptive error message.
    ///   - status: Optional HTTP status code returned by the API.
    public init(message: String, status: Int? = nil) {
        self.message = message
        self.status = status
    }

    public var errorDescription: String? {
        message
    }

    public static var errorDomain: String {
        "SlopMachineErrorDomain"
    }

    public var errorCode: Int {
        status ?? -1
    }

    public var errorUserInfo: [String: Any] {
        [NSLocalizedDescriptionKey: message]
    }
}
