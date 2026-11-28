import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  browserCommandFor,
  buildMcpServerEntry,
  buildRegistrationCommands,
  configureWorkspaceMcp,
  initiateAgentHandshake,
  installSkillFiles,
  isInNpxCache,
  parseCliArgs,
  pollAgentHandshake,
  readCliVersion,
  resolveBundledSkillDir,
  runCli,
  validateVerificationUri,
} from "../src/cli";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function handshakeFetch(verificationUri?: string) {
  const urls: string[] = [];
  const fn = vi.fn(async (url: string) => {
    urls.push(url);
    if (url.endsWith("/api/auth/agent-handshake")) {
      return jsonResponse({
        deviceCode: "pix_dev_handshake",
        userCode: "SLOP-7777",
        ...(verificationUri !== undefined ? { verificationUri } : {}),
      });
    }
    return jsonResponse({ status: "approved", rawKey: "slop_live_from_connect" });
  });
  return { fn, urls };
}

describe("Slop Machine CLI", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "slopmachine-cli-test-")),
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe("module import", () => {
    it("has no side effects: importing cli does not run the CLI", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.resetModules();
      await import("../src/cli");
      expect(log).not.toHaveBeenCalled();
      expect(err).not.toHaveBeenCalled();
    });
  });

  describe("parseCliArgs", () => {
    it("defaults to init command", () => {
      const parsed = parseCliArgs([], tempDir, {});
      expect(parsed).toEqual({
        command: "init",
        apiKey: undefined,
        agentName: "Slop Machine CLI",
        symlink: false,
        skipSkill: false,
        skipMcp: false,
        cwd: tempDir,
      });
      expect(parsed).not.toHaveProperty("baseUrl");
    });

    it("parses login command, --api-key, --client, and flags", () => {
      const parsed = parseCliArgs(
        [
          "login",
          "--api-key",
          "slop_live_abc123",
          "--client=cursor",
          "--agent-name",
          "My Agent",
          "--symlink",
          "--no-skill",
        ],
        tempDir,
        {},
      );
      expect(parsed.command).toBe("login");
      expect(parsed.apiKey).toBe("slop_live_abc123");
      expect(parsed.client).toBe("cursor");
      expect(parsed.agentName).toBe("My Agent");
      expect(parsed.symlink).toBe(true);
      expect(parsed.skipSkill).toBe(true);
    });

    it("reads SLOPMACHINE_API_KEY from environment when --api-key is omitted", () => {
      const parsed = parseCliArgs(["init"], tempDir, {
        SLOPMACHINE_API_KEY: "slop_live_from_env",
      });
      expect(parsed.apiKey).toBe("slop_live_from_env");
    });

    it("ignores SLOPMACHINE_BASE_URL", () => {
      const parsed = parseCliArgs(["init"], tempDir, {
        SLOPMACHINE_BASE_URL: "https://evil.example",
      });
      expect(JSON.stringify(parsed)).not.toContain("evil.example");
    });

    it("handles --help and --version flags", () => {
      expect(parseCliArgs(["--help"], tempDir, {}).command).toBe("help");
      expect(parseCliArgs(["-v"], tempDir, {}).command).toBe("version");
    });

    it("throws on unknown commands, flags, or invalid --client values", () => {
      expect(() => parseCliArgs(["deploy"], tempDir, {})).toThrow(
        /Unknown command "deploy"/,
      );
      expect(() =>
        parseCliArgs(["init", "--client", "unknown"], tempDir, {}),
      ).toThrow(/--client must be one of/);
      expect(() =>
        parseCliArgs(["init", "--client", "claude-desktop"], tempDir, {}),
      ).toThrow(/--client must be one of/);
      expect(() =>
        parseCliArgs(["init", "--base-url", "https://x.dev"], tempDir, {}),
      ).toThrow(/Unknown option "--base-url"/);
      expect(() =>
        parseCliArgs(["init", "--base-url=https://x.dev"], tempDir, {}),
      ).toThrow(/Unknown option "--base-url"/);
      expect(() => parseCliArgs(["init", "--symlnk"], tempDir, {})).toThrow(
        /Unknown option "--symlnk"/,
      );
      expect(() => parseCliArgs(["init", "extra"], tempDir, {})).toThrow(
        /Unexpected argument "extra"/,
      );
      expect(() => parseCliArgs(["--api-key"], tempDir, {})).toThrow(
        /--api-key requires a value/,
      );
    });
  });

  describe("version", () => {
    it("reads the version from @slopmachine/core's package.json", async () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"),
      );
      expect(readCliVersion()).toBe(pkg.version);

      const logs: string[] = [];
      const res = await runCli(["--version"], { stdout: (m) => logs.push(m) });
      expect(res.exitCode).toBe(0);
      expect(logs).toEqual([pkg.version]);
    });
  });

  describe("initiateAgentHandshake & pollAgentHandshake", () => {
    it("only calls the canonical API and polls until approved", async () => {
      let pollCount = 0;
      const urls: string[] = [];
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        urls.push(url);
        if (url.endsWith("/api/auth/agent-handshake")) {
          const body = JSON.parse(String(init?.body));
          expect(body.agentName).toBe("Cursor Agent");
          return jsonResponse({
            deviceCode: "pix_dev_test123",
            userCode: "SLOP-4829",
            verificationUri: "https://slopmachine.dev/connect?code=SLOP-4829",
            expiresAt: "2026-11-15T23:59:00.000Z",
          });
        }
        if (url.endsWith("/api/auth/agent-handshake/redeem")) {
          pollCount += 1;
          if (pollCount < 2) return jsonResponse({ status: "pending" });
          return jsonResponse({
            status: "approved",
            rawKey: "slop_live_minted_key_999",
            apiKeyId: "key_999",
          });
        }
        return jsonResponse({ error: "Not found" }, 404);
      });

      const hs = await initiateAgentHandshake({
        agentName: "Cursor Agent",
        fetchImpl: fetchMock as any,
      });
      expect(hs.userCode).toBe("SLOP-4829");
      expect(hs.verificationUri).toBe(
        "https://slopmachine.dev/connect?code=SLOP-4829",
      );

      const redeemed = await pollAgentHandshake({
        deviceCode: hs.deviceCode,
        intervalMs: 1,
        fetchImpl: fetchMock as any,
        sleepImpl: async () => {},
      });
      expect(redeemed.rawKey).toBe("slop_live_minted_key_999");
      expect(pollCount).toBe(2);
      expect(urls).toEqual([
        "https://slopmachine.dev/api/auth/agent-handshake",
        "https://slopmachine.dev/api/auth/agent-handshake/redeem",
        "https://slopmachine.dev/api/auth/agent-handshake/redeem",
      ]);
    });

    it("falls back to the canonical /connect URL when none is returned", async () => {
      const { fn } = handshakeFetch();
      const hs = await initiateAgentHandshake({ fetchImpl: fn as any });
      expect(hs.verificationUri).toBe(
        "https://slopmachine.dev/connect?code=SLOP-7777",
      );
    });

    it.each([
      "http://slopmachine.dev/connect?code=X",
      "https://evil.example/connect",
      "https://slopmachine.dev.evil.example/connect",
      "https://slopmachine.dev:8443/connect",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "not a url",
    ])("rejects server-supplied verification URL %s", async (uri) => {
      const { fn } = handshakeFetch(uri);
      await expect(
        initiateAgentHandshake({ fetchImpl: fn as any }),
      ).rejects.toThrow(/verification URL/);
    });

    it("throws when handshake is denied or expired", async () => {
      const deniedFetch = vi.fn(async () => jsonResponse({ status: "denied" }));
      await expect(
        pollAgentHandshake({
          deviceCode: "pix_dev_1",
          fetchImpl: deniedFetch as any,
          sleepImpl: async () => {},
        }),
      ).rejects.toThrow("Handshake was denied by the user.");

      const expiredFetch = vi.fn(async () =>
        jsonResponse({ status: "expired" }),
      );
      await expect(
        pollAgentHandshake({
          deviceCode: "pix_dev_2",
          fetchImpl: expiredFetch as any,
          sleepImpl: async () => {},
        }),
      ).rejects.toThrow(/Handshake code expired/);
    });
  });

  describe("validateVerificationUri & browserCommandFor", () => {
    it("accepts canonical https URLs", () => {
      expect(
        validateVerificationUri("https://slopmachine.dev/connect?code=A-1"),
      ).toBe("https://slopmachine.dev/connect?code=A-1");
    });

    it("never routes the URL through a shell on Windows", () => {
      const url = "https://slopmachine.dev/connect?code=A&b=1";
      const [cmd, args] = browserCommandFor("win32", url);
      expect(cmd).toBe("rundll32");
      expect(args).toEqual(["url.dll,FileProtocolHandler", url]);
      expect(browserCommandFor("darwin", url)).toEqual(["open", [url]]);
      expect(browserCommandFor("linux", url)).toEqual(["xdg-open", [url]]);
    });
  });

  describe("MCP config", () => {
    it("uses env-var interpolation instead of the API key", () => {
      expect(buildMcpServerEntry("claude-code")).toEqual({
        type: "http",
        url: "https://slopmachine.dev/api/mcp",
        headers: { Authorization: "Bearer ${SLOPMACHINE_API_KEY}" },
      });
      expect(buildMcpServerEntry("cursor").headers.Authorization).toBe(
        "Bearer ${env:SLOPMACHINE_API_KEY}",
      );
      const cmds = buildRegistrationCommands();
      expect(cmds.claudeCode).toBe(
        'claude mcp add --transport http slopmachine "https://slopmachine.dev/api/mcp" --header "Authorization: Bearer $SLOPMACHINE_API_KEY"',
      );
      expect(cmds.antigravity).toContain("agy mcp add --transport http");
    });

    it("preserves existing mcpServers when merging into .cursor/mcp.json", () => {
      const cursorDir = path.join(tempDir, ".cursor");
      fs.mkdirSync(cursorDir, { recursive: true });
      const mcpPath = path.join(cursorDir, "mcp.json");
      fs.writeFileSync(
        mcpPath,
        JSON.stringify({
          mcpServers: { github: { url: "https://example.com/mcp" } },
        }),
        "utf8",
      );

      const written = configureWorkspaceMcp(tempDir);
      expect(written).toEqual([mcpPath]);

      const parsed = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
      expect(parsed.mcpServers.github).toEqual({
        url: "https://example.com/mcp",
      });
      expect(parsed.mcpServers.slopmachine).toEqual({
        type: "http",
        url: "https://slopmachine.dev/api/mcp",
        headers: { Authorization: "Bearer ${env:SLOPMACHINE_API_KEY}" },
      });
    });
  });

  describe("resolveBundledSkillDir & installSkillFiles", () => {
    it("locates the repository skills/slopmachine directory and installs SKILL.md + references", () => {
      const bundledDir = resolveBundledSkillDir();
      expect(fs.existsSync(path.join(bundledDir, "SKILL.md"))).toBe(true);
      expect(
        fs.existsSync(path.join(bundledDir, "references", "step-types.md")),
      ).toBe(true);

      fs.mkdirSync(path.join(tempDir, ".claude"), { recursive: true });

      const installed = installSkillFiles(tempDir);
      expect(installed).toEqual([
        path.join(tempDir, ".agents", "skills", "slopmachine"),
        path.join(tempDir, ".claude", "skills", "slopmachine"),
      ]);

      for (const dir of installed) {
        const skillContent = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8");
        expect(skillContent).toContain("name: slopmachine");
        expect(
          fs.existsSync(path.join(dir, "references", "step-types.md")),
        ).toBe(true);
      }
    });

    it("rejects --skills-dir outside the project or at its root", () => {
      expect(() =>
        installSkillFiles(tempDir, { skillsDir: "../elsewhere" }),
      ).toThrow(/--skills-dir must be a subdirectory/);
      expect(() =>
        installSkillFiles(tempDir, { skillsDir: os.tmpdir() }),
      ).toThrow(/--skills-dir must be a subdirectory/);
      expect(() => installSkillFiles(tempDir, { skillsDir: "." })).toThrow(
        /--skills-dir must be a subdirectory/,
      );
    });

    it("rejects --skills-dir that escapes the project through a symlinked parent", () => {
      const outside = fs.mkdtempSync(path.join(os.tmpdir(), "sm-outside-"));
      try {
        fs.symlinkSync(outside, path.join(tempDir, "link"), "dir");
        expect(() =>
          installSkillFiles(tempDir, { skillsDir: "link/skill" }),
        ).toThrow(/--skills-dir must be a subdirectory/);
        expect(fs.readdirSync(outside)).toEqual([]);
      } finally {
        fs.rmSync(outside, { recursive: true, force: true });
      }
    });

    it("--symlink refuses to replace an existing directory and leaves it intact", () => {
      const srcDir = path.join(tempDir, "src");
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, "app.ts"), "keep me");

      expect(() =>
        installSkillFiles(tempDir, { skillsDir: "src", symlink: true }),
      ).toThrow(/Refusing to replace .*isn't a symlink/);
      expect(fs.readFileSync(path.join(srcDir, "app.ts"), "utf8")).toBe(
        "keep me",
      );
      expect(fs.lstatSync(srcDir).isSymbolicLink()).toBe(false);
    });

    it("--symlink refuses to replace an existing file", () => {
      fs.writeFileSync(path.join(tempDir, "notes.txt"), "keep me");
      expect(() =>
        installSkillFiles(tempDir, { skillsDir: "notes.txt", symlink: true }),
      ).toThrow(/Refusing to replace/);
      expect(fs.readFileSync(path.join(tempDir, "notes.txt"), "utf8")).toBe(
        "keep me",
      );
    });

    it("--symlink creates a link and replaces only an existing symlink", () => {
      const source = resolveBundledSkillDir();
      const [dest] = installSkillFiles(tempDir, { symlink: true });
      expect(fs.lstatSync(dest).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(dest)).toBe(fs.realpathSync(source));

      // Re-running replaces the link, not the source it points to.
      installSkillFiles(tempDir, { symlink: true });
      expect(fs.lstatSync(dest).isSymbolicLink()).toBe(true);
      expect(fs.existsSync(path.join(source, "SKILL.md"))).toBe(true);
    });

    it("copy mode replaces a previous symlink instead of writing through it", () => {
      const fakeSource = path.join(tempDir, "pkg-skill");
      fs.cpSync(resolveBundledSkillDir(), fakeSource, { recursive: true });
      const dest = path.join(tempDir, ".agents", "skills", "slopmachine");
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const other = path.join(tempDir, "other-target");
      fs.mkdirSync(other);
      fs.symlinkSync(other, dest, "dir");

      installSkillFiles(tempDir, { sourceSkillDir: fakeSource });
      expect(fs.lstatSync(dest).isSymbolicLink()).toBe(false);
      expect(fs.existsSync(path.join(dest, "SKILL.md"))).toBe(true);
      expect(fs.readdirSync(other)).toEqual([]);
    });

    it("--symlink refuses to link into the npx cache", () => {
      const npxSkill = path.join(
        tempDir,
        ".npm",
        "_npx",
        "abc123",
        "node_modules",
        "@slopmachine",
        "core",
        "dist",
        "skills",
        "slopmachine",
      );
      fs.mkdirSync(npxSkill, { recursive: true });
      fs.writeFileSync(path.join(npxSkill, "SKILL.md"), "name: slopmachine");
      expect(isInNpxCache(npxSkill)).toBe(true);
      expect(isInNpxCache(resolveBundledSkillDir())).toBe(false);

      expect(() =>
        installSkillFiles(tempDir, {
          symlink: true,
          sourceSkillDir: npxSkill,
        }),
      ).toThrow(/npx cache/);
      expect(fs.existsSync(path.join(tempDir, ".agents"))).toBe(false);
      // Copying from the npx cache is fine.
      expect(
        installSkillFiles(tempDir, { sourceSkillDir: npxSkill }),
      ).toHaveLength(1);
    });
  });

  describe("runCli end-to-end", () => {
    it("bootstraps MCP config and installs skill files with an API key from the env", async () => {
      const logs: string[] = [];
      const fetchMock = vi.fn();
      const result = await runCli(["init", "--client", "all"], {
        cwd: tempDir,
        env: { SLOPMACHINE_API_KEY: "slop_live_e2e_key" },
        fetch: fetchMock as any,
        stdout: (msg) => logs.push(msg),
        stderr: (msg) => logs.push(msg),
      });

      expect(result.exitCode).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.apiKey).toBe("slop_live_e2e_key");
      expect(result.mcpFilesWritten).toEqual([
        path.join(tempDir, ".mcp.json"),
        path.join(tempDir, ".cursor", "mcp.json"),
      ]);
      expect(result.skillPathsInstalled).toEqual([
        path.join(tempDir, ".agents", "skills", "slopmachine"),
        path.join(tempDir, ".claude", "skills", "slopmachine"),
      ]);
      for (const file of result.mcpFilesWritten) {
        expect(fs.readFileSync(file, "utf8")).not.toContain("slop_live_e2e_key");
      }
      expect(logs.join("\n")).not.toContain("slop_live_e2e_key");
      expect(logs.join("\n")).toContain("Slop Machine setup complete!");
    });

    it("executes the full device-code handshake flow against the canonical API", async () => {
      const logs: string[] = [];
      const openedUrls: string[] = [];
      const { fn, urls } = handshakeFetch(
        "https://slopmachine.dev/connect?code=SLOP-7777",
      );

      const result = await runCli(["init"], {
        cwd: tempDir,
        env: {},
        fetch: fn as any,
        sleep: async () => {},
        openBrowser: (url) => openedUrls.push(url),
        stdout: (msg) => logs.push(msg),
        stderr: (msg) => logs.push(msg),
      });

      expect(result.exitCode).toBe(0);
      expect(result.apiKey).toBe("slop_live_from_connect");
      expect(urls.every((u) => u.startsWith("https://slopmachine.dev/api/"))).toBe(
        true,
      );
      expect(openedUrls).toEqual([
        "https://slopmachine.dev/connect?code=SLOP-7777",
      ]);
      const mcpJson = fs.readFileSync(path.join(tempDir, ".mcp.json"), "utf8");
      expect(mcpJson).not.toContain("slop_live_from_connect");
      expect(mcpJson).toContain("${SLOPMACHINE_API_KEY}");
      const out = logs.join("\n");
      expect(out).toContain("SLOPMACHINE_API_KEY");
      // Shown once for the user to store, but never inside a registration command.
      expect(logs.filter((l) => l.includes("slop_live_from_connect"))).toEqual([
        "  slop_live_from_connect",
      ]);
      expect(
        fs.existsSync(
          path.join(tempDir, ".agents", "skills", "slopmachine", "SKILL.md"),
        ),
      ).toBe(true);
    });

    it("does not open an off-origin verification URL", async () => {
      const logs: string[] = [];
      const openedUrls: string[] = [];
      const { fn } = handshakeFetch("https://evil.example/connect");
      const result = await runCli(["init"], {
        cwd: tempDir,
        env: {},
        fetch: fn as any,
        sleep: async () => {},
        openBrowser: (url) => openedUrls.push(url),
        stdout: (msg) => logs.push(msg),
        stderr: (msg) => logs.push(msg),
      });
      expect(result.exitCode).toBe(1);
      expect(openedUrls).toEqual([]);
      expect(logs.join("\n")).toMatch(/unexpected verification URL/);
    });

    it("checks the --symlink target before starting authentication", async () => {
      fs.mkdirSync(path.join(tempDir, "src"));
      const logs: string[] = [];
      const fetchMock = vi.fn();
      const result = await runCli(
        ["init", "--symlink", "--skills-dir", "src"],
        {
          cwd: tempDir,
          env: {},
          fetch: fetchMock as any,
          stdout: (msg) => logs.push(msg),
          stderr: (msg) => logs.push(msg),
        },
      );
      expect(result.exitCode).toBe(1);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(fs.existsSync(path.join(tempDir, "src"))).toBe(true);
      expect(logs.join("\n")).toMatch(/Refusing to replace/);
    });

    it("reports unknown flags as errors", async () => {
      const logs: string[] = [];
      const result = await runCli(["init", "--base-url", "https://x.dev"], {
        cwd: tempDir,
        env: {},
        stdout: (msg) => logs.push(msg),
        stderr: (msg) => logs.push(msg),
      });
      expect(result.exitCode).toBe(1);
      expect(logs.join("\n")).toMatch(/Unknown option "--base-url"/);
    });
  });
});
