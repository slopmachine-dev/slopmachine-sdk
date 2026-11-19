import SwiftUI

/// Default error view displayed inside the reserved media or text slot when generation or loading fails.
public struct SlopDefaultErrorView: View {
    @Environment(\.colorScheme) private var colorScheme

    public let error: SlopMachineError
    public let label: String

    public init(error: SlopMachineError, label: String) {
        self.error = error
        self.label = label
    }

    private var backgroundColor: Color {
        colorScheme == .dark
            ? Color(white: 0.16)
            : Color(red: 243.0 / 255.0, green: 244.0 / 255.0, blue: 246.0 / 255.0)
    }

    private var foregroundColor: Color {
        colorScheme == .dark
            ? Color(white: 0.65)
            : Color(red: 107.0 / 255.0, green: 114.0 / 255.0, blue: 128.0 / 255.0)
    }

    public var body: some View {
        ZStack {
            backgroundColor

            VStack(spacing: 8) {
                Image(systemName: "exclamationmark.circle")
                    .font(.system(size: 22, weight: .regular))
                    .foregroundStyle(foregroundColor)
                    .accessibilityHidden(true)

                Text(label)
                    .font(.caption)
                    .foregroundStyle(foregroundColor)
                    .multilineTextAlignment(.center)
            }
            .padding(12)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
        .accessibilityValue(error.message)
    }
}
