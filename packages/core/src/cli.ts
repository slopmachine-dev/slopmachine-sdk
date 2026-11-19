#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

export type AgentClient =
  | "cursor"
  | "claude-code"
  | "claude-desktop"
  | "antigravity"
  | "all";

export type CliCommand = "init" | "login" | "help" | "version";

export interface CliOptions {
  command: CliCommand;
  apiKey?: string;
  client?: AgentClient;
  baseUrl: string;
  agentName: string;
  skillsDir?: string;
  symlink: boolean;
  skipSkill: boolean;
  skipMcp: boolean;
  cwd: string;
}

export interface HandshakeInitResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresAt: string;
}

export interface HandshakeRedeemResponse {
  status: "pending" | "approved" | "redeemed" | "expired" | "denied";
  rawKey?: string;
  apiKeyId?: string;
}

export interface McpServerConfigEntry {
  type?: "http";
  url: string;
  headers: Record<string, string>;
}

export interface McpConfigResult {
  serverName: string;
  mcpUrl: string;
  mcpServers: Record<string, McpServerConfigEntry>;
  jsonString: string;
  claudeCodeCommand: string;
  antigravityCommand: string;
}

export interface CliDependencies {
  fetch?: typeof globalThis.fetch;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdout?: (msg: string) => void;
  stderr?: (msg: string) => void;
  sleep?: (ms: number) => Promise<void>;
  openBrowser?: (url: string) => void;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

export interface CliResult {
  exitCode: number;
  apiKey?: string;
  mcpFilesWritten: string[];
  skillPathsInstalled: string[];
}

const DEFAULT_BASE_URL = "https://slopmachine.dev";
const DEFAULT_AGENT_NAME = "Slop Machine CLI";
const VALID_CLIENTS: readonly AgentClient[] = [
  "cursor",
  "claude-code",
  "claude-desktop",
  "antigravity",
  "all",
];

/**
 * Parses CLI arguments for `npx @slopmachine/core init` / `login`.
 */
export function parseCliArgs(
  argv: string[],
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): CliOptions {
  const options: CliOptions = {
    command: "init",
    apiKey: env.SLOPMACHINE_API_KEY?.trim() || undefined,
    baseUrl: (env.SLOPMACHINE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    agentName: DEFAULT_AGENT_NAME,
    symlink: false,
    skipSkill: false,
    skipMcp: false,
    cwd,
  };

  let commandSet = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h" || arg === "help") {
      options.command = "help";
      return options;
    }
    if (arg === "--version" || arg === "-v" || arg === "version") {
      options.command = "version";
      return options;
    }

    if (!arg.startsWith("-") && !commandSet) {
      if (arg === "init" || arg === "login") {
        options.command = arg;
        commandSet = true;
        continue;
      }
      throw new Error(
        `Unknown command "${arg}". Expected "init" or "login" (run with --help for usage).`,
      );
    }

    if (arg === "--api-key" || arg === "-k") {
      const val = argv[++i];
      if (!val || val.startsWith("-")) {
        throw new Error("--api-key requires a value (e.g. --api-key slop_live_...)");
      }
      options.apiKey = val.trim();
      continue;
    }
    if (arg.startsWith("--api-key=")) {
      options.apiKey = arg.slice("--api-key=".length).trim();
      continue;
    }

    if (arg === "--client" || arg === "-c") {
      const val = argv[++i] as AgentClient | undefined;
      if (!val || !VALID_CLIENTS.includes(val)) {
        throw new Error(
          `--client must be one of: ${VALID_CLIENTS.join(", ")}`,
        );
      }
      options.client = val;
      continue;
    }
    if (arg.startsWith("--client=")) {
      const val = arg.slice("--client=".length).trim() as AgentClient;
      if (!VALID_CLIENTS.includes(val)) {
        throw new Error(
          `--client must be one of: ${VALID_CLIENTS.join(", ")}`,
        );
      }
      options.client = val;
      continue;
    }

    if (arg === "--base-url") {
      const val = argv[++i];
      if (!val) throw new Error("--base-url requires a URL");
      options.baseUrl = val.trim().replace(/\/+$/, "");
      continue;
    }
    if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg
        .slice("--base-url=".length)
        .trim()
        .replace(/\/+$/, "");
      continue;
    }

    if (arg === "--agent-name") {
      const val = argv[++i];
      if (!val) throw new Error("--agent-name requires a value");
      options.agentName = val.trim();
      continue;
    }
    if (arg.startsWith("--agent-name=")) {
      options.agentName = arg.slice("--agent-name=".length).trim();
      continue;
    }

    if (arg === "--skills-dir") {
      const val = argv[++i];
      if (!val) throw new Error("--skills-dir requires a path");
      options.skillsDir = val.trim();
      continue;
    }
    if (arg.startsWith("--skills-dir=")) {
      options.skillsDir = arg.slice("--skills-dir=".length).trim();
      continue;
    }

    if (arg === "--symlink") {
      options.symlink = true;
      continue;
    }
    if (arg === "--no-skill") {
      options.skipSkill = true;
      continue;
    }
    if (arg === "--no-mcp") {
      options.skipMcp = true;
      continue;
    }
  }

  return options;
}

/**
 * Starts the device-code agent authentication handshake at `/api/auth/agent-handshake`.
 */
export async function initiateAgentHandshake(options: {
  baseUrl?: string;
  agentName?: string;
  clientSource?: string;
  scopes?: string[];
  fetchImpl?: typeof globalThis.fetch;
}): Promise<HandshakeInitResponse> {
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const fetchFn = options.fetchImpl || globalThis.fetch;

  const response = await fetchFn(`${baseUrl}/api/auth/agent-handshake`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agentName: options.agentName || DEFAULT_AGENT_NAME,
      clientSource: options.clientSource || "cli",
      scopes: options.scopes || ["mcp", "pipelines:read", "pipelines:write"],
    }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errBody = await response.json();
      if (errBody?.error) {
        detail =
          typeof errBody.error === "string"
            ? errBody.error
            : errBody.error.message || detail;
      }
    } catch {
      // fallback to statusText
    }
    throw new Error(
      `Failed to start Slop Machine handshake (${response.status}): ${detail}`,
    );
  }

  const data = (await response.json()) as Partial<HandshakeInitResponse>;
  if (!data.deviceCode || !data.userCode) {
    throw new Error("Invalid handshake response from server");
  }

  const verificationUri =
    data.verificationUri ||
    `${baseUrl}/connect?code=${encodeURIComponent(data.userCode)}`;

  return {
    deviceCode: data.deviceCode,
    userCode: data.userCode,
    verificationUri,
    expiresAt:
      data.expiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
}

/**
 * Polls `/api/auth/agent-handshake/redeem` until the user approves the handshake in the browser.
 */
export async function pollAgentHandshake(options: {
  deviceCode: string;
  baseUrl?: string;
  intervalMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof globalThis.fetch;
  sleepImpl?: (ms: number) => Promise<void>;
}): Promise<{ rawKey: string; apiKeyId?: string }> {
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const intervalMs = options.intervalMs ?? 3000;
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const fetchFn = options.fetchImpl || globalThis.fetch;
  const sleepFn =
    options.sleepImpl ||
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetchFn(
      `${baseUrl}/api/auth/agent-handshake/redeem`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deviceCode: options.deviceCode }),
      },
    );

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody?.error) {
          detail =
            typeof errBody.error === "string"
              ? errBody.error
              : errBody.error.message || detail;
        }
      } catch {
        // ignore
      }
      throw new Error(
        `Handshake redemption failed (${response.status}): ${detail}`,
      );
    }

    const result = (await response.json()) as HandshakeRedeemResponse;

    if (result.status === "approved" && result.rawKey) {
      return {
        rawKey: result.rawKey,
        apiKeyId: result.apiKeyId,
      };
    }

    if (result.status === "denied") {
      throw new Error("Handshake was denied by the user.");
    }

    if (result.status === "expired") {
      throw new Error(
        "Handshake code expired before approval. Please run `npx @slopmachine/core init` again.",
      );
    }

    if (result.status === "redeemed") {
      throw new Error("Handshake code has already been redeemed.");
    }

    await sleepFn(intervalMs);
  }

  throw new Error(
    "Timed out waiting for browser approval at /connect. Please try again.",
  );
}

/**
 * Builds MCP configuration snippets and CLI commands for Slop Machine.
 */
export function buildMcpConfig(
  apiKey: string,
  options?: { baseUrl?: string; client?: AgentClient },
): McpConfigResult {
  const trimmedKey = apiKey?.trim();
  if (!trimmedKey) {
    throw new Error("API key is required to build MCP configuration");
  }

  const baseUrl = (options?.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const mcpUrl = `${baseUrl}/api/mcp`;
  const serverName = "slopmachine";
  const includeType = options?.client !== "claude-desktop";

  const entry: McpServerConfigEntry = {
    ...(includeType ? { type: "http" } : {}),
    url: mcpUrl,
    headers: {
      Authorization: `Bearer ${trimmedKey}`,
    },
  };

  const mcpServers = { [serverName]: entry };

  return {
    serverName,
    mcpUrl,
    mcpServers,
    jsonString: JSON.stringify({ mcpServers }, null, 2),
    claudeCodeCommand: `claude mcp add --transport http ${serverName} "${mcpUrl}" --header "Authorization: Bearer ${trimmedKey}"`,
    antigravityCommand: `agy mcp add --transport http ${serverName} "${mcpUrl}" --header "Authorization: Bearer ${trimmedKey}"`,
  };
}

function mergeMcpJsonFile(
  filePath: string,
  serverName: string,
  entry: McpServerConfigEntry,
): void {
  let existing: Record<string, any> = {};
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf8").trim();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          existing = parsed;
        }
      }
    } catch {
      // If existing file is malformed JSON, preserve a backup before writing
      try {
        fs.copyFileSync(filePath, `${filePath}.bak`);
      } catch {
        // ignore backup error
      }
    }
  }

  const currentServers =
    existing.mcpServers &&
    typeof existing.mcpServers === "object" &&
    !Array.isArray(existing.mcpServers)
      ? existing.mcpServers
      : {};

  const updated = {
    ...existing,
    mcpServers: {
      ...currentServers,
      [serverName]: entry,
    },
  };

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + "\n", "utf8");
}

/**
 * Writes or merges the Slop Machine remote MCP configuration into workspace config files.
 */
export function configureWorkspaceMcp(
  cwd: string,
  apiKey: string,
  options?: { baseUrl?: string; client?: AgentClient },
): string[] {
  const client = options?.client;
  const config = buildMcpConfig(apiKey, options);
  const entry = config.mcpServers[config.serverName];

  const targetFiles: string[] = [];

  if (client === "cursor") {
    targetFiles.push(path.join(cwd, ".cursor", "mcp.json"));
  } else if (client === "claude-code" || client === "antigravity") {
    targetFiles.push(path.join(cwd, ".mcp.json"));
  } else if (client === "claude-desktop") {
    targetFiles.push(path.join(cwd, "claude_desktop_config.json"));
  } else if (client === "all") {
    targetFiles.push(
      path.join(cwd, ".mcp.json"),
      path.join(cwd, ".cursor", "mcp.json"),
    );
  } else {
    // Auto-detect based on workspace directories
    const hasCursorDir = fs.existsSync(path.join(cwd, ".cursor"));
    const hasMcpJson = fs.existsSync(path.join(cwd, ".mcp.json"));
    const hasClaudeDir = fs.existsSync(path.join(cwd, ".claude"));

    if (hasCursorDir) {
      targetFiles.push(path.join(cwd, ".cursor", "mcp.json"));
    }
    if (hasMcpJson || hasClaudeDir || !hasCursorDir) {
      targetFiles.push(path.join(cwd, ".mcp.json"));
    }
  }

  for (const filePath of targetFiles) {
    mergeMcpJsonFile(filePath, config.serverName, entry);
  }

  return targetFiles;
}

/**
 * Resolves the directory containing the bundled `skills/slopmachine` files.
 */
export function resolveBundledSkillDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);

  const candidates = [
    // Packaged inside packages/core/dist/skills/slopmachine
    path.resolve(currentDir, "skills/slopmachine"),
    // Monorepo root from packages/core/src or packages/core/dist
    path.resolve(currentDir, "../../../skills/slopmachine"),
    path.resolve(currentDir, "../../skills/slopmachine"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "SKILL.md"))) {
      return candidate;
    }
  }

  throw new Error(
    "Could not locate bundled skills/slopmachine/SKILL.md. Try running `npx skills add slopmachine-dev/slopmachine-sdk`.",
  );
}

/**
 * Copies or symlinks `skills/slopmachine` (`SKILL.md` and `references/`) into the target workspace.
 */
export function installSkillFiles(
  cwd: string,
  options?: {
    client?: AgentClient;
    skillsDir?: string;
    symlink?: boolean;
    sourceSkillDir?: string;
  },
): string[] {
  const sourceDir = options?.sourceSkillDir || resolveBundledSkillDir();
  const targetDirs: string[] = [];

  if (options?.skillsDir) {
    targetDirs.push(path.resolve(cwd, options.skillsDir));
  } else {
    targetDirs.push(path.join(cwd, ".agents", "skills", "slopmachine"));
    if (
      options?.client === "claude-code" ||
      options?.client === "all" ||
      fs.existsSync(path.join(cwd, ".claude"))
    ) {
      targetDirs.push(path.join(cwd, ".claude", "skills", "slopmachine"));
    }
  }

  const installed: string[] = [];

  for (const destDir of targetDirs) {
    if (path.resolve(destDir) === path.resolve(sourceDir)) {
      installed.push(destDir);
      continue;
    }

    if (options?.symlink) {
      fs.mkdirSync(path.dirname(destDir), { recursive: true });
      if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
      }
      fs.symlinkSync(sourceDir, destDir, "dir");
    } else {
      fs.mkdirSync(destDir, { recursive: true });
      fs.cpSync(sourceDir, destDir, { recursive: true });
    }
    installed.push(destDir);
  }

  return installed;
}

function defaultOpenBrowser(url: string): void {
  if (process.env.CI || process.env.NODE_ENV === "test") return;
  const platform = process.platform;
  const cmd =
    platform === "darwin"
      ? "open"
      : platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    execFile(cmd, args, () => {
      // Ignore browser launch errors in headless shells
    });
  } catch {
    // Ignore
  }
}

export function formatHelpText(): string {
  return `
Slop Machine CLI (@slopmachine/core)

Usage:
  npx @slopmachine/core init [options]
  npx @slopmachine/core login [options]

Commands:
  init                  Authenticate, configure MCP server, and install Agent Skill (default)
  login                 Authenticate via /connect (or --api-key) and configure MCP server

Options:
  --api-key, -k <key>   Use an existing slop_live_... API key instead of browser login
  --client, -c <name>   Target agent client: cursor | claude-code | claude-desktop | antigravity | all
  --skills-dir <path>   Custom target directory for SKILL.md installation
  --symlink             Symlink skill directory instead of copying files
  --no-skill            Skip installing skills/slopmachine/SKILL.md
  --no-mcp              Skip writing MCP configuration files
  --base-url <url>      Override Slop Machine base URL (default: https://slopmachine.dev)
  --agent-name <name>   Display name shown on the /connect approval screen
  --help, -h            Show this help message
  --version, -v         Print CLI version
`.trim();
}

/**
 * Executes the Slop Machine CLI workflow.
 */
export async function runCli(
  argv: string[] = process.argv.slice(2),
  deps: CliDependencies = {},
): Promise<CliResult> {
  const stdout = deps.stdout || ((msg: string) => console.log(msg));
  const stderr = deps.stderr || ((msg: string) => console.error(msg));
  const cwd = deps.cwd || process.cwd();
  const env = deps.env || process.env;
  const openBrowser = deps.openBrowser || defaultOpenBrowser;

  let options: CliOptions;
  try {
    options = parseCliArgs(argv, cwd, env);
  } catch (err: any) {
    stderr(`Error: ${err?.message || String(err)}`);
    return { exitCode: 1, mcpFilesWritten: [], skillPathsInstalled: [] };
  }

  if (options.command === "help") {
    stdout(formatHelpText());
    return { exitCode: 0, mcpFilesWritten: [], skillPathsInstalled: [] };
  }

  if (options.command === "version") {
    stdout("1.0.0");
    return { exitCode: 0, mcpFilesWritten: [], skillPathsInstalled: [] };
  }

  let apiKey = options.apiKey;

  try {
    if (!apiKey && (!options.skipMcp || options.command === "login")) {
      stdout("Initiating Slop Machine agent authentication handshake...");
      const handshake = await initiateAgentHandshake({
        baseUrl: options.baseUrl,
        agentName: options.agentName,
        clientSource: options.client || "cli",
        fetchImpl: deps.fetch,
      });

      stdout("");
      stdout(`  Verification code: ${handshake.userCode}`);
      stdout(`  Approve in browser: ${handshake.verificationUri}`);
      stdout("");
      stdout("Waiting for approval...");

      openBrowser(handshake.verificationUri);

      const redeemed = await pollAgentHandshake({
        deviceCode: handshake.deviceCode,
        baseUrl: options.baseUrl,
        intervalMs: deps.pollIntervalMs,
        timeoutMs: deps.pollTimeoutMs,
        fetchImpl: deps.fetch,
        sleepImpl: deps.sleep,
      });

      apiKey = redeemed.rawKey;
      stdout("Authentication approved!");
    }

    const mcpFilesWritten: string[] = [];
    if (apiKey && !options.skipMcp) {
      const files = configureWorkspaceMcp(cwd, apiKey, {
        baseUrl: options.baseUrl,
        client: options.client,
      });
      mcpFilesWritten.push(...files);
      for (const file of files) {
        stdout(`Configured MCP server in ${path.relative(cwd, file) || file}`);
      }

      const snippets = buildMcpConfig(apiKey, {
        baseUrl: options.baseUrl,
        client: options.client,
      });
      stdout("");
      stdout("CLI Registration Commands (optional):");
      stdout(`  Claude Code:  ${snippets.claudeCodeCommand}`);
      stdout(`  Antigravity:  ${snippets.antigravityCommand}`);
    }

    const skillPathsInstalled: string[] = [];
    if (options.command === "init" && !options.skipSkill) {
      const installed = installSkillFiles(cwd, {
        client: options.client,
        skillsDir: options.skillsDir,
        symlink: options.symlink,
      });
      skillPathsInstalled.push(...installed);
      for (const dir of installed) {
        stdout(
          `Installed Slop Machine skill in ${path.relative(cwd, dir) || dir}`,
        );
      }
    }

    stdout("");
    stdout("Slop Machine setup complete!");
    return {
      exitCode: 0,
      apiKey,
      mcpFilesWritten,
      skillPathsInstalled,
    };
  } catch (err: any) {
    stderr(`Error: ${err?.message || String(err)}`);
    return { exitCode: 1, mcpFilesWritten: [], skillPathsInstalled: [] };
  }
}

// Run automatically when invoked directly as a CLI binary
const isMainModule = (() => {
  try {
    if (!process.argv[1]) return false;
    const entryPath = fs.realpathSync(path.resolve(process.argv[1]));
    const modulePath = fs.realpathSync(fileURLToPath(import.meta.url));
    return (
      entryPath === modulePath ||
      path.basename(entryPath, path.extname(entryPath)) === "cli" ||
      path.basename(process.argv[1]) === "slopmachine" ||
      path.basename(process.argv[1]) === "core"
    );
  } catch {
    return false;
  }
})();

if (isMainModule && !process.env.VITEST) {
  runCli().then((res) => {
    if (res.exitCode !== 0) {
      process.exitCode = res.exitCode;
    }
  });
}
