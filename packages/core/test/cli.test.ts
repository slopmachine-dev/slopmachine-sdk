import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMcpConfig,
  configureWorkspaceMcp,
  initiateAgentHandshake,
  installSkillFiles,
  parseCliArgs,
  pollAgentHandshake,
  resolveBundledSkillDir,
  runCli,
} from "../src/cli";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Slop Machine CLI (@slopmachine/core/cli)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "slopmachine-cli-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe("parseCliArgs", () => {
    it("defaults to init command and production baseUrl", () => {
      const parsed = parseCliArgs([], tempDir, {});
      expect(parsed).toEqual({
        command: "init",
        apiKey: undefined,
        client: undefined,
        baseUrl: "https://slopmachine.dev",
        agentName: "Slop Machine CLI",
        skillsDir: undefined,
        symlink: false,
        skipSkill: false,
        skipMcp: false,
        cwd: tempDir,
      });
    });

    it("parses login command, --api-key, --client, and flags", () => {
      const parsed = parseCliArgs(
        [
          "login",
          "--api-key",
          "slop_live_abc123",
          "--client",
          "cursor",
          "--base-url",
          "https://staging.slopmachine.dev/",
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
      expect(parsed.baseUrl).toBe("https://staging.slopmachine.dev");
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

    it("handles --help and --version flags", () => {
      expect(parseCliArgs(["--help"], tempDir, {}).command).toBe("help");
      expect(parseCliArgs(["-v"], tempDir, {}).command).toBe("version");
    });

    it("throws on unknown commands or invalid --client values", () => {
      expect(() => parseCliArgs(["deploy"], tempDir, {})).toThrow(
        /Unknown command "deploy"/,
      );
      expect(() =>
        parseCliArgs(["init", "--client", "unknown"], tempDir, {}),
      ).toThrow(/--client must be one of/);
    });
  });

  describe("initiateAgentHandshake & pollAgentHandshake", () => {
    it("initiates a handshake and polls until approved", async () => {
      let pollCount = 0;
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
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
          if (pollCount < 2) {
            return jsonResponse({ status: "pending" });
          }
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
    });

    it("throws when handshake is denied or expired", async () => {
      const deniedFetch = vi.fn(async () =>
        jsonResponse({ status: "denied" }),
      );
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

  describe("buildMcpConfig & configureWorkspaceMcp", () => {
    it("builds standard MCP server config and CLI registration commands", () => {
      const cfg = buildMcpConfig("slop_live_key_123");
      expect(cfg.mcpUrl).toBe("https://slopmachine.dev/api/mcp");
      expect(cfg.mcpServers.slopmachine).toEqual({
        type: "http",
        url: "https://slopmachine.dev/api/mcp",
        headers: {
          Authorization: "Bearer slop_live_key_123",
        },
      });
      expect(cfg.claudeCodeCommand).toContain("claude mcp add --transport http");
      expect(cfg.antigravityCommand).toContain("agy mcp add --transport http");
    });

    it("preserves existing mcpServers when merging into .cursor/mcp.json", () => {
      const cursorDir = path.join(tempDir, ".cursor");
      fs.mkdirSync(cursorDir, { recursive: true });
      const mcpPath = path.join(cursorDir, "mcp.json");
      fs.writeFileSync(
        mcpPath,
        JSON.stringify(
          {
            mcpServers: {
              github: { url: "https://example.com/mcp" },
            },
          },
          null,
          2,
        ),
        "utf8",
      );

      const written = configureWorkspaceMcp(tempDir, "slop_live_merged_key");
      expect(written).toEqual([mcpPath]);

      const parsed = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
      expect(parsed.mcpServers.github).toEqual({
        url: "https://example.com/mcp",
      });
      expect(parsed.mcpServers.slopmachine).toEqual({
        type: "http",
        url: "https://slopmachine.dev/api/mcp",
        headers: {
          Authorization: "Bearer slop_live_merged_key",
        },
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

      // Create .claude directory to verify dual installation into .agents and .claude
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
  });

  describe("runCli end-to-end", () => {
    it("bootstraps MCP config and installs skill files non-interactively with --api-key", async () => {
      const logs: string[] = [];
      const result = await runCli(
        ["init", "--api-key", "slop_live_e2e_key", "--client", "all"],
        {
          cwd: tempDir,
          stdout: (msg) => logs.push(msg),
          stderr: (msg) => logs.push(msg),
        },
      );

      expect(result.exitCode).toBe(0);
      expect(result.apiKey).toBe("slop_live_e2e_key");
      expect(result.mcpFilesWritten).toEqual([
        path.join(tempDir, ".mcp.json"),
        path.join(tempDir, ".cursor", "mcp.json"),
      ]);
      expect(result.skillPathsInstalled).toEqual([
        path.join(tempDir, ".agents", "skills", "slopmachine"),
        path.join(tempDir, ".claude", "skills", "slopmachine"),
      ]);
      expect(logs.join("\n")).toContain("Slop Machine setup complete!");
    });

    it("executes the full device-code handshake flow when no API key is passed", async () => {
      const logs: string[] = [];
      const openedUrls: string[] = [];
      const fetchMock = vi.fn(async (url: string) => {
        if (url.endsWith("/api/auth/agent-handshake")) {
          return jsonResponse({
            deviceCode: "pix_dev_handshake",
            userCode: "SLOP-7777",
            verificationUri: "https://slopmachine.dev/connect?code=SLOP-7777",
          });
        }
        return jsonResponse({
          status: "approved",
          rawKey: "slop_live_from_connect",
        });
      });

      const result = await runCli(["init"], {
        cwd: tempDir,
        env: {},
        fetch: fetchMock as any,
        sleep: async () => {},
        openBrowser: (url) => openedUrls.push(url),
        stdout: (msg) => logs.push(msg),
        stderr: (msg) => logs.push(msg),
      });

      expect(result.exitCode).toBe(0);
      expect(result.apiKey).toBe("slop_live_from_connect");
      expect(openedUrls).toEqual([
        "https://slopmachine.dev/connect?code=SLOP-7777",
      ]);
      expect(
        fs.existsSync(path.join(tempDir, ".mcp.json")),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(tempDir, ".agents", "skills", "slopmachine", "SKILL.md"),
        ),
      ).toBe(true);
    });
  });
});
