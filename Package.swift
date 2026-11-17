// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SlopMachine",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
        .tvOS(.v17),
        .visionOS(.v1),
    ],
    products: [
        .library(
            name: "SlopMachine",
            targets: ["SlopMachine"]
        ),
    ],
    targets: [
        .target(
            name: "SlopMachine",
            path: "packages/swift/Sources/SlopMachine"
        ),
        .testTarget(
            name: "SlopMachineTests",
            dependencies: ["SlopMachine"],
            path: "packages/swift/Tests/SlopMachineTests"
        ),
    ]
)
