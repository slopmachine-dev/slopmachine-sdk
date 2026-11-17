import SwiftUI

/// Default animated shimmer and spinner placeholder shown while Slop Machine media or text is generating.
public struct SlopLoadingOverlay: View {
    @Environment(\.colorScheme) private var colorScheme
    @State private var phase: CGFloat = -1.0

    public init() {}

    private var baseColor: Color {
        colorScheme == .dark
            ? Color(white: 0.16)
            : Color(red: 243.0 / 255.0, green: 244.0 / 255.0, blue: 246.0 / 255.0)
    }

    private var highlightColor: Color {
        colorScheme == .dark
            ? Color(white: 0.24)
            : Color(red: 229.0 / 255.0, green: 231.0 / 255.0, blue: 235.0 / 255.0)
    }

    private var foregroundColor: Color {
        colorScheme == .dark
            ? Color(white: 0.65)
            : Color(red: 107.0 / 255.0, green: 114.0 / 255.0, blue: 128.0 / 255.0)
    }

    public var body: some View {
        ZStack {
            baseColor

            GeometryReader { geo in
                LinearGradient(
                    colors: [baseColor, highlightColor, baseColor],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(width: max(geo.size.width * 2, 1))
                .offset(x: phase * max(geo.size.width, 1))
                .onAppear {
                    withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: false)) {
                        phase = 1.0
                    }
                }
            }
            .clipped()

            VStack(spacing: 8) {
                ProgressView()
                    .tint(foregroundColor)
                Text("Loading...")
                    .font(.caption)
                    .foregroundStyle(foregroundColor)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
