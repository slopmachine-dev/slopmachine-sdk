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

// Generated with node from the built @slopmachine/core (`String(n)` / `JSON.stringify(n)`):
// (input parsed with `Double(_:)`, expected JavaScript output).
private let jsNumberCases: [(String, String)] = [
    ("0", "0"),
    ("-0.0", "0"),
    ("1", "1"),
    ("-1", "-1"),
    ("0.5", "0.5"),
    ("1.5", "1.5"),
    ("-2.25", "-2.25"),
    ("0.1", "0.1"),
    ("0.30000000000000004", "0.30000000000000004"),
    ("0.3333333333333333", "0.3333333333333333"),
    ("0.6666666666666666", "0.6666666666666666"),
    ("100", "100"),
    ("1000000", "1000000"),
    ("123456789.125", "123456789.125"),
    ("0.000001", "0.000001"),
    ("0.0000015", "0.0000015"),
    ("1e-7", "1e-7"),
    ("-1e-7", "-1e-7"),
    ("1.234e-7", "1.234e-7"),
    ("0.00001", "0.00001"),
    ("0.00001234", "0.00001234"),
    ("0.000001", "0.000001"),
    ("0.0000012345", "0.0000012345"),
    ("1000000000000000", "1000000000000000"),
    ("10000000000000000", "10000000000000000"),
    ("100000000000000000", "100000000000000000"),
    ("123000000000000000000", "123000000000000000000"),
    ("10000000000000000000", "10000000000000000000"),
    ("-10000000000000000000", "-10000000000000000000"),
    ("100000000000000000000", "100000000000000000000"),
    ("150000000000000000000", "150000000000000000000"),
    ("1e+21", "1e+21"),
    ("1.5e+21", "1.5e+21"),
    ("-1.5e+21", "-1.5e+21"),
    ("1e+22", "1e+22"),
    ("1.2345e+25", "1.2345e+25"),
    ("9007199254740992", "9007199254740992"),
    ("9007199254740994", "9007199254740994"),
    ("1152921504606847000", "1152921504606847000"),
    ("9223372036854776000", "9223372036854776000"),
    ("18446744073709552000", "18446744073709552000"),
    ("9007199254740992", "9007199254740992"),
    ("1.7976931348623157e+308", "1.7976931348623157e+308"),
    ("5e-324", "5e-324"),
    ("2.2250738585072014e-308", "2.2250738585072014e-308"),
    ("123.456", "123.456"),
    ("3.14159265358979", "3.14159265358979"),
    ("1e+100", "1e+100"),
    ("1e-100", "1e-100"),
    ("4.35", "4.35"),
    ("0.07", "0.07"),
    ("5e-7", "5e-7"),
    ("999999999999999900000", "999999999999999900000"),
    ("999999999999999900000", "999999999999999900000"),
    ("-195185661.31591797", "-195185661.31591797"),
    ("4958810.806274414", "4958810.806274414"),
    ("1731233596.8017578", "1731233596.8017578"),
    ("3.8317206501960754e-21", "3.8317206501960754e-21"),
    ("327534556388.855", "327534556388.855"),
    ("-16225826740264.893", "-16225826740264.893"),
    ("-30778992176055908", "-30778992176055908"),
    ("-2662.379741668701", "-2662.379741668701"),
    ("2.87573516368866e-19", "2.87573516368866e-19"),
    ("3.4398746490478516e+21", "3.4398746490478516e+21"),
    ("-2.961251139640808e-26", "-2.961251139640808e-26"),
    ("-1339865922927.8564", "-1339865922927.8564"),
    ("-1.3174450397491454e-15", "-1.3174450397491454e-15"),
    ("3.707646131515503e+24", "3.707646131515503e+24"),
    ("-7.134449481964112e-7", "-7.134449481964112e-7"),
    ("-3272734880447387600", "-3272734880447387600"),
    ("-1.821295619010925e-22", "-1.821295619010925e-22"),
    ("4.497349262237549e-11", "4.497349262237549e-11"),
    ("-3.246545791625976e+26", "-3.246545791625976e+26"),
    ("-274698734283447.25", "-274698734283447.25"),
    ("0.00003734368085861206", "0.00003734368085861206"),
    ("-1921311616897583000", "-1921311616897583000"),
    ("34.657180309295654", "34.657180309295654"),
    ("-388933300971.98486", "-388933300971.98486"),
    ("-40787.482261657715", "-40787.482261657715"),
    ("-10040891170.501709", "-10040891170.501709"),
    ("-24585855007.17163", "-24585855007.17163"),
    ("-9.961354732513427e-10", "-9.961354732513427e-10"),
    ("0.00000444100022315979", "0.00000444100022315979"),
    ("-0.000004772056341171265", "-0.000004772056341171265"),
    ("-3.670963048934937e-16", "-3.670963048934937e-16"),
    ("-4945068359.375", "-4945068359.375"),
    ("-2.1942806243896486e-14", "-2.1942806243896486e-14"),
    ("-0.000002819929122924805", "-0.000002819929122924805"),
    ("-20625710487365724", "-20625710487365724"),
    ("34.805238246917725", "34.805238246917725"),
    ("199388.86165618896", "199388.86165618896"),
    ("5.407467111945152e-31", "5.407467111945152e-31"),
    ("0.000001086556911468506", "0.000001086556911468506"),
    ("-208156228.06549072", "-208156228.06549072"),
]

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

    @Test("Numbers serialize exactly like JavaScript Number.prototype.toString", arguments: jsNumberCases)
    func jsNumberFormatting(input: String, expected: String) throws {
        let value = try #require(Double(input))
        #expect(formatJSNumber(value) == expected)
        #expect(serializeNumber(value) == expected)
        #expect(SlopVariableValue.double(value).stringValue == expected)
    }

    @Test("Non-finite numbers match String() and JSON.stringify")
    func jsNonFiniteNumbers() {
        #expect(SlopVariableValue.double(.nan).stringValue == "NaN")
        #expect(SlopVariableValue.double(.infinity).stringValue == "Infinity")
        #expect(SlopVariableValue.double(-.infinity).stringValue == "-Infinity")
        #expect(serializeNumber(.nan) == "null")
        #expect(serializeNumber(.infinity) == "null")
    }

    @Test("Variables and metadata match @slopmachine/core number format and integer-key order")
    func jsNumberAndKeyOrderURLParity() {
        // Expected URL generated by @slopmachine/core's buildImageUrl with the same inputs.
        let url = buildImageUrlString(
            SlopImageOptions(
                bucketId: "b1",
                metadata: [
                    "z": ["y": 1, "10": [1e21, 1e-5], "9": true],
                    "3": nil,
                    "x": 0.1,
                ],
                variables: [
                    "b": 1,
                    "2": .double(1e-7),
                    "a": .double(1e19),
                    "1": .double(-0.0),
                    "01": .double(0.00001),
                    "4294967295": .double(1.5e21),
                    "4294967294": .double(0x1p60),
                ]
            )
        )
        #expect(url == "\(api)/renderImage?bucketId=b1&aspectRatio=1%3A1&variables=%7B%221%22%3A0%2C%222%22%3A1e-7%2C%224294967294%22%3A1152921504606847000%2C%22b%22%3A1%2C%22a%22%3A10000000000000000000%2C%2201%22%3A0.00001%2C%224294967295%22%3A1.5e%2B21%7D&metadata=%7B%223%22%3Anull%2C%22z%22%3A%7B%229%22%3Atrue%2C%2210%22%3A%5B1e%2B21%2C0.00001%5D%2C%22y%22%3A1%7D%2C%22x%22%3A0.1%7D")

        #expect(
            interpolatePrompt(
                "{a}|{b}|{c}|{d}",
                variables: ["a": .double(1e-7), "b": .double(1e21), "c": .double(1e-5), "d": .double(0x1p60)]
            ) == "1e-7|1e+21|0.00001|1152921504606847000"
        )
    }

    @Test("Integer-like keys are ordered first, like JavaScript objects")
    func jsIntegerKeyOrdering() {
        let vars: SlopVariables = ["b": 1, "2": 2, "1": 3, "01": 4, "-1": 5, "1.5": 6]
        #expect(vars.entries.map(\.key) == ["1", "2", "b", "01", "-1", "1.5"])
        let fromDict = SlopVariables(["b": 1, "10": 2, "9": 3, "a": 4] as [String: SlopVariableValue])
        #expect(fromDict.entries.map(\.key) == ["9", "10", "a", "b"])
        let meta: SlopMetadata = ["k": 1, "4294967295": 2, "4294967294": 3, "0": 4]
        #expect(meta.entries.map(\.key) == ["0", "4294967294", "k", "4294967295"])
    }

    @Test("AspectRatio CGFloat helpers and markdown rendering")
    func aspectRatioAndMarkdownHelpers() {
        #expect(ImageAspectRatio.square.cgFloatRatio == 1.0)
        #expect(ImageAspectRatio.landscape16x9.cgFloatRatio == CGFloat(16.0 / 9.0))
        #expect(ImageAspectRatio.portrait9x16.cgFloatRatio == CGFloat(9.0 / 16.0))
        #expect(ImageAspectRatio.ultrawide21x9.cgFloatRatio == CGFloat(21.0 / 9.0))
        #expect(VideoAspectRatio.landscape16x9.cgFloatRatio == CGFloat(16.0 / 9.0))
        #expect(VideoAspectRatio.portrait9x16.cgFloatRatio == CGFloat(9.0 / 16.0))

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
