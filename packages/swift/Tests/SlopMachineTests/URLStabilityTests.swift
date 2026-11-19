import Foundation
import SwiftUI
import Testing
@testable import SlopMachine

private let api = "https://us-central1-slopmachine-12bfb.cloudfunctions.net"
private let fullVariables: SlopVariables = ["theme": "dark", "n": 2]
private let fullMetadata: SlopMetadata = ["userId": "u1"]
private let fullAttachments: [String] = ["https://a.dev/x.png"]

private func parse(_ url: URL) -> (endpoint: String, params: [String: String]) {
    let raw = url.absoluteString
    let parts = raw.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
    let endpoint = String(parts[0])
    var params: [String: String] = [:]
    if parts.count > 1 {
        let query = String(parts[1])
        for item in query.split(separator: "&") {
            let kv = item.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
            let key = String(kv[0]).replacingOccurrences(of: "+", with: " ").removingPercentEncoding ?? String(kv[0])
            let val = kv.count > 1
                ? (String(kv[1]).replacingOccurrences(of: "+", with: " ").removingPercentEncoding ?? String(kv[1]))
                : ""
            params[key] = val
        }
    }
    return (endpoint, params)
}

@Suite("URL Byte-for-Byte Stability & Builders")
struct URLStabilityTests {
    @Test("buildImageUrl (bucket) is byte-for-byte stable")
    func buildImageUrlBucketStability() {
        let url = buildImageUrl(
            SlopImageOptions(
                bucketId: "b1",
                metadata: fullMetadata,
                version: 2,
                aspectRatio: .landscape16x9,
                model: "gemini-flash",
                variables: fullVariables,
                original: true,
                attachments: fullAttachments
            )
        )
        #expect(
            url.absoluteString
                == "\(api)/renderImage?bucketId=b1&aspectRatio=16%3A9&model=gemini-flash&version=2&original=true&variables=%7B%22theme%22%3A%22dark%22%2C%22n%22%3A2%7D&metadata=%7B%22userId%22%3A%22u1%22%7D&attachments=%5B%22https%3A%2F%2Fa.dev%2Fx.png%22%5D"
        )
    }

    @Test("buildImageUrl (result) is byte-for-byte stable")
    func buildImageUrlResultStability() {
        let url = buildImageUrl(
            SlopImageOptions(
                bucketId: "b1",
                resultId: "r1",
                model: "m"
            )
        )
        #expect(url.absoluteString == "\(api)/renderImage?bucketId=b1&resultId=r1")
    }

    @Test("buildImageUrl (pipeline) is byte-for-byte stable")
    func buildImageUrlPipelineStability() {
        let url = buildImageUrl(
            SlopImageOptions(
                pipelineId: "p1",
                siloId: "s1",
                prompt: "a b",
                metadata: fullMetadata,
                resultId: "r1",
                variables: fullVariables
            )
        )
        #expect(
            url.absoluteString
                == "\(api)/renderPipeline?pipelineId=p1&redirect=true&siloId=s1&prompt=a+b&resultId=r1&variables=%7B%22theme%22%3A%22dark%22%2C%22n%22%3A2%7D&metadata=%7B%22userId%22%3A%22u1%22%7D"
        )
    }

    @Test("buildVideoUrl (bucket) is byte-for-byte stable")
    func buildVideoUrlBucketStability() {
        let url = buildVideoUrl(
            SlopVideoOptions(
                bucketId: "b1",
                metadata: fullMetadata,
                version: 3,
                aspectRatio: .portrait9x16,
                variables: fullVariables,
                duration: 6,
                original: true,
                attachments: fullAttachments
            )
        )
        #expect(
            url.absoluteString
                == "\(api)/renderVideo?bucketId=b1&aspectRatio=9%3A16&version=3&duration=6&original=true&variables=%7B%22theme%22%3A%22dark%22%2C%22n%22%3A2%7D&metadata=%7B%22userId%22%3A%22u1%22%7D&attachments=%5B%22https%3A%2F%2Fa.dev%2Fx.png%22%5D"
        )
    }

    @Test("buildVideoUrl (pipeline) is byte-for-byte stable")
    func buildVideoUrlPipelineStability() {
        let url = buildVideoUrl(
            SlopVideoOptions(
                pipelineId: "p1",
                prompt: "go"
            )
        )
        #expect(url.absoluteString == "\(api)/renderPipeline?pipelineId=p1&redirect=true&prompt=go")
    }

    @Test("buildTextUrl (bucket) is byte-for-byte stable")
    func buildTextUrlBucketStability() {
        let url = buildTextUrl(
            SlopTextOptions(
                bucketId: "b1",
                metadata: fullMetadata,
                version: 1,
                model: "gemini-pro",
                variables: fullVariables,
                attachments: fullAttachments
            )
        )
        #expect(
            url.absoluteString
                == "\(api)/renderText?bucketId=b1&model=gemini-pro&version=1&variables=%7B%22theme%22%3A%22dark%22%2C%22n%22%3A2%7D&metadata=%7B%22userId%22%3A%22u1%22%7D&attachments=%5B%22https%3A%2F%2Fa.dev%2Fx.png%22%5D"
        )
    }

    @Test("buildTextUrl (pipeline) is byte-for-byte stable")
    func buildTextUrlPipelineStability() {
        let url = buildTextUrl(
            SlopTextOptions(
                pipelineId: "p1",
                siloId: "s1",
                prompt: "go",
                resultId: "r1"
            )
        )
        #expect(
            url.absoluteString
                == "\(api)/renderPipeline?pipelineId=p1&sync=true&siloId=s1&prompt=go&resultId=r1"
        )
    }

    @Test("buildPipelineUrl is byte-for-byte stable")
    func buildPipelineUrlStability() {
        let url = buildPipelineUrl(
            SlopPipelineOptions(
                pipelineId: "p1",
                siloId: "s1",
                prompt: "go",
                variables: ["a": 1],
                metadata: ["b": 2],
                redirect: true,
                resultId: "r1"
            )
        )
        #expect(
            url.absoluteString
                == "\(api)/renderPipeline?pipelineId=p1&siloId=s1&prompt=go&resultId=r1&sync=true&redirect=true&variables=%7B%22a%22%3A1%7D&metadata=%7B%22b%22%3A2%7D"
        )
    }

    @Test("buildImageUrl defaults and parameter omission rules")
    func buildImageUrlDefaultsAndOmissions() {
        let (endpoint, params) = parse(buildImageUrl(SlopImageOptions(bucketId: "b1")))
        #expect(endpoint == "\(api)/renderImage")
        #expect(params == ["bucketId": "b1", "aspectRatio": "1:1"])

        let (_, emptyParams) = parse(
            buildImageUrl(
                SlopImageOptions(
                    bucketId: "b1",
                    metadata: [:],
                    variables: [:],
                    attachments: []
                )
            )
        )
        #expect(emptyParams == ["bucketId": "b1", "aspectRatio": "1:1"])

        let (customEndpoint, _) = parse(
            buildImageUrl(
                SlopImageOptions(
                    bucketId: "b1",
                    baseUrl: "http://localhost:5001/img"
                )
            )
        )
        #expect(customEndpoint == "http://localhost:5001/img")
    }

    @Test("buildVideoUrl defaults and duration")
    func buildVideoUrlDefaults() {
        let (endpoint, params) = parse(buildVideoUrl(SlopVideoOptions(bucketId: "b1")))
        #expect(endpoint == "\(api)/renderVideo")
        #expect(params == ["bucketId": "b1", "aspectRatio": "16:9"])

        let (_, durationParams) = parse(buildVideoUrl(SlopVideoOptions(bucketId: "b1", duration: 6)))
        #expect(durationParams == ["bucketId": "b1", "aspectRatio": "16:9", "duration": "6"])
    }

    @Test("buildPipelineUrl explicit sync=false")
    func buildPipelineUrlExplicitSyncFalse() {
        let (_, params) = parse(
            buildPipelineUrl(
                SlopPipelineOptions(
                    pipelineId: "p1",
                    siloId: "s1",
                    prompt: "go",
                    variables: ["a": 1],
                    metadata: ["b": 2],
                    sync: false,
                    redirect: true,
                    resultId: "r1"
                )
            )
        )
        #expect(
            params == [
                "pipelineId": "p1",
                "siloId": "s1",
                "prompt": "go",
                "resultId": "r1",
                "sync": "false",
                "redirect": "true",
                "variables": "{\"a\":1}",
                "metadata": "{\"b\":2}",
            ]
        )
    }

    @Test("SlopVariables and SlopMetadata sort standard Swift Dictionaries deterministically")
    func dictionarySortedKeysStability() {
        let rawVars: [String: SlopVariableValue] = [
            "zebra": "last",
            "alpha": "first",
            "middle": 42,
        ]
        let rawMeta: [String: SlopJSONValue] = [
            "zKey": true,
            "aKey": "val",
        ]
        let url = buildImageUrl(
            SlopImageOptions(
                bucketId: "b1",
                metadata: SlopMetadata(rawMeta),
                variables: SlopVariables(rawVars)
            )
        )
        let (_, params) = parse(url)
        #expect(params["variables"] == "{\"alpha\":\"first\",\"middle\":42,\"zebra\":\"last\"}")
        #expect(params["metadata"] == "{\"aKey\":\"val\",\"zKey\":true}")
    }

    @Test("interpolatePrompt matches @slopmachine/core behavior")
    func interpolatePromptBehavior() {
        #expect(
            interpolatePrompt(
                "A {color} dog and a {color} cat, {n} total",
                variables: ["color": "brown", "n": 2]
            ) == "A brown dog and a brown cat, 2 total"
        )

        #expect(
            interpolatePrompt(
                "{a} {b} {c}",
                variables: ["a": nil, "c": "x"]
            ) == "{a} {b} x"
        )

        #expect(
            interpolatePrompt(
                "{a.b} {axb} {c+}",
                variables: ["a.b": "dot", "c+": "plus"]
            ) == "dot {axb} plus"
        )

        #expect(
            interpolatePrompt(
                "Price: {p}",
                variables: ["p": "$100 or $& or $1"]
            ) == "Price: $100 or $& or $1"
        )

        #expect(interpolatePrompt(nil, variables: ["a": "x"]) == "")
    }

    @Test("AspectRatio CGFloat helpers and markdown rendering")
    func aspectRatioAndMarkdownHelpers() {
        #expect(ImageAspectRatio.square.cgFloatRatio == 1.0)
        #expect(ImageAspectRatio.landscape16x9.cgFloatRatio == 16.0 / 9.0)
        #expect(ImageAspectRatio.portrait9x16.cgFloatRatio == 9.0 / 16.0)
        #expect(ImageAspectRatio.ultrawide21x9.cgFloatRatio == 21.0 / 9.0)
        #expect(VideoAspectRatio.landscape16x9.cgFloatRatio == 16.0 / 9.0)
        #expect(VideoAspectRatio.portrait9x16.cgFloatRatio == 9.0 / 16.0)

        let rendered = renderMarkdownAttributedString("Hello **Slop Machine**!")
        #expect(String(rendered.characters) == "Hello Slop Machine!")
    }

    @Test("SwiftUI views can be initialized with Bucket and Pipeline configurations")
    @MainActor
    func swiftUIComponentInitialization() {
        let imageView = SlopImage(bucketId: "b1", aspectRatio: .landscape16x9, variables: ["theme": "dark"])
        #expect(imageView.options.bucketId == "b1")
        #expect(imageView.alt == SlopImageDefaults.defaultAlt)

        let videoView = SlopVideo(pipelineId: "p1", prompt: "cyberpunk city", aspectRatio: .portrait9x16)
        #expect(videoView.options.pipelineId == "p1")
        #expect(videoView.autoPlay == true)
        #expect(videoView.loop == true)
        #expect(videoView.muted == true)

        let textView = SlopText(bucketId: "t1", model: "gemini-pro")
        #expect(textView.options.bucketId == "t1")
    }
}
