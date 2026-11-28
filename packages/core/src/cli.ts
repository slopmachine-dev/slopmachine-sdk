// Side-effect-free CLI implementation. The executable entry point is
// `src/bin.ts`, which calls `runCli()`. Nothing in this module runs on import,
// and it isn't exported from the package (internal to the `slopmachine` bin).
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

export type AgentClient = "cursor" | "claude-code" | "antigravity" | "all";

export type CliCommand = "init" | "login" | "help" | "version";

export interface CliOptions {
  command: CliCommand;
  apiKey?: string;
  client?: AgentClient;
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
  type: "http";
  url: string;
  headers: Record<string, string>;
}

/** Which env-var interpolation syntax the target config file understands. */
export type McpConfigFlavor = "claude-code" | "cursor";

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
  /** Overrides the bundled skill directory (tests). */
  sourceSkillDir?: string;
}

export interface CliResult {
  exitCode: number;
  apiKey?: string;
  mcpFilesWritten: string[];
  skillPathsInstalled: string[];
}

/** The canonical Slop Machine origin. Deliberately not configurable. */
export const SLOPMACHINE_ORIGIN = "https://slopmachine.dev";
export const MCP_URL = `${SLOPMACHINE_ORIGIN}/api/mcp`;
export const API_KEY_ENV_VAR = "SLOPMACHINE_API_KEY";
const MCP_SERVER_NAME = "slopmachine";
const DEFAULT_AGENT_NAME = "Slop Machine CLI";
const VALID_CLIENTS: readonly AgentClient[] = [
  "cursor",
  "claude-code",
  "antigravity",
  "all",
];

function takeValue(argv: string[], i: number, flag: string): string {
  const val = argv[i];
  if (val === undefined || val.startsWith("-")) {
    throw new Error(`${flag} requires a value`);
  }
  return val.trim();
}

function parseClient(val: string | undefined): AgentClient {
  if (!val || !VALID_CLIENTS.includes(val as AgentClient)) {
    throw new Error(`--client must be one of: ${VALID_CLIENTS.join(", ")}`);
  }
  return val as AgentClient;
}

/**
 * Parses CLI arguments for `npx @slopmachine/core init` / `login`.
 * Throws on unknown commands, unknown flags and unexpected arguments.
 */
export function parseCliArgs(
  argv: string[],
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): CliOptions {
  const options: CliOptions = {
    command: "init",
    apiKey: env[API_KEY_ENV_VAR]?.trim() || undefined,
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

    if (!arg.startsWith("-")) {
      if (!commandSet && (arg === "init" || arg === "login")) {
        options.command = arg;
        commandSet = true;
        continue;
      }
      throw new Error(
        commandSet
          ? `Unexpected argument "${arg}" (run with --help for usage).`
          : `Unknown command "${arg}". Expected "init" or "login" (run with --help for usage).`,
      );
    }

    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const inline = eq === -1 ? undefined : arg.slice(eq + 1).trim();
    const value = () => {
      if (inline !== undefined) {
        if (!inline) throw new Error(`${flag} requires a value`);
        return inline;
      }
      return takeValue(argv, ++i, flag);
    };
    const noValue = () => {
      if (inline !== undefined) {
        throw new Error(`${flag} doesn't take a value`);
      }
    };

    switch (flag) {
      case "--api-key":
      case "-k":
        options.apiKey = value();
        break;
      case "--client":
      case "-c":
        options.client = parseClient(value());
        break;
      case "--agent-name":
        options.agentName = value();
        break;
      case "--skills-dir":
        options.skillsDir = value();
        break;
      case "--symlink":
        noValue();
        options.symlink = true;
        break;
      case "--no-skill":
        noValue();
        options.skipSkill = true;
        break;
      case "--no-mcp":
        noValue();
        options.skipMcp = true;
        break;
      default:
        throw new Error(
          `Unknown option "${flag}" (run with --help for usage).`,
        );
    }
  }

  return options;
}

async function readErrorDetail(response: Response): Promise<string> {
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
    // fall back to statusText
  }
  return detail;
}

/**
 * Checks that a verification URL supplied by the server points at the
 * canonical Slop Machine origin over HTTPS, and returns it normalised.
 * Throws otherwise, so the CLI never opens an arbitrary URL or scheme.
 */
export function validateVerificationUri(uri: string): string {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("Server returned an invalid verification URL.");
  }
  if (parsed.protocol !== "https:" || parsed.origin !== SLOPMACHINE_ORIGIN) {
    throw new Error(
      `Server returned an unexpected verification URL (expected ${SLOPMACHINE_ORIGIN}).`,
    );
  }
  return parsed.href;
}

/**
 * Starts the device-code agent authentication handshake at `/api/auth/agent-handshake`.
 */
export async function initiateAgentHandshake(options: {
  agentName?: string;
  clientSource?: string;
  scopes?: string[];
  fetchImpl?: typeof globalThis.fetch;
}): Promise<HandshakeInitResponse> {
  const fetchFn = options.fetchImpl || globalThis.fetch;

  const response = await fetchFn(
    `${SLOPMACHINE_ORIGIN}/api/auth/agent-handshake`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentName: options.agentName || DEFAULT_AGENT_NAME,
        clientSource: options.clientSource || "cli",
        scopes: options.scopes || ["mcp", "pipelines:read", "pipelines:write"],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to start Slop Machine handshake (${response.status}): ${await readErrorDetail(response)}`,
    );
  }

  const data = (await response.json()) as Partial<HandshakeInitResponse>;
  if (!data.deviceCode || !data.userCode) {
    throw new Error("Invalid handshake response from server");
  }

  const verificationUri = validateVerificationUri(
    data.verificationUri ||
      `${SLOPMACHINE_ORIGIN}/connect?code=${encodeURIComponent(data.userCode)}`,
  );

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
  intervalMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof globalThis.fetch;
  sleepImpl?: (ms: number) => Promise<void>;
}): Promise<{ rawKey: string; apiKeyId?: string }> {
  const intervalMs = options.intervalMs ?? 3000;
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const fetchFn = options.fetchImpl || globalThis.fetch;
  const sleepFn =
    options.sleepImpl ||
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetchFn(
      `${SLOPMACHINE_ORIGIN}/api/auth/agent-handshake/redeem`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceCode: options.deviceCode }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Handshake redemption failed (${response.status}): ${await readErrorDetail(response)}`,
      );
    }

    const result = (await response.json()) as HandshakeRedeemResponse;

    if (result.status === "approved" && result.rawKey) {
      return { rawKey: result.rawKey, apiKeyId: result.apiKeyId };
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
 * Builds the MCP server entry for a project config file. The API key is never
 * written: the `Authorization` header references the `SLOPMACHINE_API_KEY`
 * environment variable using the interpolation syntax of the target tool
 * (`${VAR}` for Claude Code's `.mcp.json`, `${env:VAR}` for Cursor).
 */
export function buildMcpServerEntry(
  flavor: McpConfigFlavor,
): McpServerConfigEntry {
  const ref =
    flavor === "cursor" ? `\${env:${API_KEY_ENV_VAR}}` : `\${${API_KEY_ENV_VAR}}`;
  return {
    type: "http",
    url: MCP_URL,
    headers: { Authorization: `Bearer ${ref}` },
  };
}

/**
 * CLI registration commands, with an env-var placeholder instead of the key.
 */
export function buildRegistrationCommands(): {
  claudeCode: string;
  antigravity: string;
} {
  const header = `--header "Authorization: Bearer $${API_KEY_ENV_VAR}"`;
  return {
    claudeCode: `claude mcp add --transport http ${MCP_SERVER_NAME} "${MCP_URL}" ${header}`,
    antigravity: `agy mcp add --transport http ${MCP_SERVER_NAME} "${MCP_URL}" ${header}`,
  };
}

function mergeMcpJsonFile(
  filePath: string,
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
      // If the existing file is malformed JSON, keep a backup before writing
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
    mcpServers: { ...currentServers, [MCP_SERVER_NAME]: entry },
  };

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + "\n", "utf8");
}

/**
 * Writes or merges the Slop Machine remote MCP server into workspace config
 * files (`.mcp.json` and/or `.cursor/mcp.json`). The API key itself is never
 * written; see {@link buildMcpServerEntry}.
 */
export function configureWorkspaceMcp(
  cwd: string,
  options?: { client?: AgentClient },
): string[] {
  const client = options?.client;
  const claudeFile = path.join(cwd, ".mcp.json");
  const cursorFile = path.join(cwd, ".cursor", "mcp.json");
  const targets: Array<[string, McpConfigFlavor]> = [];

  if (client === "cursor") {
    targets.push([cursorFile, "cursor"]);
  } else if (client === "claude-code" || client === "antigravity") {
    targets.push([claudeFile, "claude-code"]);
  } else if (client === "all") {
    targets.push([claudeFile, "claude-code"], [cursorFile, "cursor"]);
  } else {
    // Auto-detect based on workspace directories
    const hasCursorDir = fs.existsSync(path.join(cwd, ".cursor"));
    const hasMcpJson = fs.existsSync(claudeFile);
    const hasClaudeDir = fs.existsSync(path.join(cwd, ".claude"));

    if (hasCursorDir) targets.push([cursorFile, "cursor"]);
    if (hasMcpJson || hasClaudeDir || !hasCursorDir) {
      targets.push([claudeFile, "claude-code"]);
    }
  }

  for (const [filePath, flavor] of targets) {
    mergeMcpJsonFile(filePath, buildMcpServerEntry(flavor));
  }

  return targets.map(([filePath]) => filePath);
}

function moduleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

/**
 * Resolves the directory containing the bundled `skills/slopmachine` files.
 */
export function resolveBundledSkillDir(): string {
  const currentDir = moduleDir();

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
 * Reads the CLI version from `@slopmachine/core`'s package.json, which sits one
 * level above both `src/` and `dist/`.
 */
export function readCliVersion(): string {
  try {
    const pkgPath = path.resolve(moduleDir(), "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg?.name === "@slopmachine/core" && typeof pkg.version === "string") {
      return pkg.version;
    }
  } catch {
    // fall through
  }
  return "unknown";
}

function isWithin(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/** Realpath of `p`, or of its deepest existing ancestor joined with the rest. */
function realpathLenient(p: string): string {
  const missing: string[] = [];
  let current = p;
  for (;;) {
    try {
      return path.join(fs.realpathSync(current), ...missing.reverse());
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return p;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

/** True when `p` is inside npm's temporary `npx` cache (`~/.npm/_npx/...`). */
export function isInNpxCache(p: string): boolean {
  return path.resolve(p).split(/[\\/]+/).includes("_npx");
}

export interface SkillInstallOptions {
  client?: AgentClient;
  skillsDir?: string;
  symlink?: boolean;
  sourceSkillDir?: string;
}

/**
 * Works out where the skill would be installed and checks it is safe to do so,
 * without touching the filesystem. Throws when:
 * - `--skills-dir` resolves to the project root or outside it,
 * - `--symlink` would replace an existing file or directory that isn't a symlink,
 * - `--symlink` would point into the temporary npx cache.
 */
export function planSkillInstall(
  cwd: string,
  options: SkillInstallOptions = {},
): { sourceDir: string; targetDirs: string[] } {
  const sourceDir = options.sourceSkillDir || resolveBundledSkillDir();
  const root = path.resolve(cwd);
  const targetDirs: string[] = [];

  if (options.skillsDir) {
    const dest = path.resolve(root, options.skillsDir);
    if (
      !isWithin(root, dest) ||
      !isWithin(realpathLenient(root), realpathLenient(dest))
    ) {
      throw new Error(
        `--skills-dir must be a subdirectory of the current project (${root}); got "${options.skillsDir}".`,
      );
    }
    targetDirs.push(dest);
  } else {
    targetDirs.push(path.join(root, ".agents", "skills", "slopmachine"));
    if (
      options.client === "claude-code" ||
      options.client === "all" ||
      fs.existsSync(path.join(root, ".claude"))
    ) {
      targetDirs.push(path.join(root, ".claude", "skills", "slopmachine"));
    }
  }

  if (options.symlink) {
    if (isInNpxCache(realpathLenient(sourceDir))) {
      throw new Error(
        "--symlink needs @slopmachine/core installed in this project (npm install -D @slopmachine/core). " +
          "This copy is running from the temporary npx cache, so a symlink to it would break when the cache is cleared. " +
          "Install the package locally, or run without --symlink to copy the files.",
      );
    }
    for (const dest of targetDirs) {
      if (path.resolve(dest) === path.resolve(sourceDir)) continue;
      let stat: fs.Stats;
      try {
        stat = fs.lstatSync(dest);
      } catch {
        continue; // doesn't exist yet
      }
      if (!stat.isSymbolicLink()) {
        throw new Error(
          `Refusing to replace ${dest} with a symlink: it already exists and isn't a symlink. ` +
            "Remove it yourself, choose another --skills-dir, or run without --symlink.",
        );
      }
    }
  }

  return { sourceDir, targetDirs };
}

/**
 * Copies or symlinks `skills/slopmachine` (`SKILL.md` and `references/`) into
 * the target workspace. Never deletes anything except an existing symlink at
 * the destination.
 */
export function installSkillFiles(
  cwd: string,
  options: SkillInstallOptions = {},
): string[] {
  const { sourceDir, targetDirs } = planSkillInstall(cwd, options);
  const installed: string[] = [];

  for (const destDir of targetDirs) {
    if (path.resolve(destDir) === path.resolve(sourceDir)) {
      installed.push(destDir);
      continue;
    }

    let existing: fs.Stats | undefined;
    try {
      existing = fs.lstatSync(destDir);
    } catch {
      existing = undefined;
    }

    // An existing symlink (from an earlier --symlink run) is removed, never
    // followed: copying through it would write into the package itself.
    if (existing?.isSymbolicLink()) {
      fs.unlinkSync(destDir);
    } else if (existing && options.symlink) {
      // planSkillInstall already refuses this; never delete real files.
      throw new Error(`Refusing to replace ${destDir}: it isn't a symlink.`);
    }

    if (options.symlink) {
      fs.mkdirSync(path.dirname(destDir), { recursive: true });
      fs.symlinkSync(sourceDir, destDir, "dir");
    } else {
      fs.mkdirSync(destDir, { recursive: true });
      fs.cpSync(sourceDir, destDir, { recursive: true });
    }
    installed.push(destDir);
  }

  return installed;
}

/**
 * Returns the command and arguments used to open `url` in a browser. Each is
 * run with `execFile` (no shell). On Windows `rundll32 url.dll` is used rather
 * than `cmd /c start`, which would let cmd interpret characters in the URL.
 */
export function browserCommandFor(
  platform: NodeJS.Platform,
  url: string,
): [string, string[]] {
  if (platform === "darwin") return ["open", [url]];
  if (platform === "win32") {
    return ["rundll32", ["url.dll,FileProtocolHandler", url]];
  }
  return ["xdg-open", [url]];
}

function defaultOpenBrowser(url: string): void {
  if (process.env.CI || process.env.NODE_ENV === "test") return;
  let safeUrl: string;
  try {
    safeUrl = validateVerificationUri(url);
  } catch {
    return;
  }
  const [cmd, args] = browserCommandFor(process.platform, safeUrl);
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
  login                 Authenticate via /connect (or an API key) and configure MCP server

Options:
  --api-key, -k <key>   Use an existing slop_live_... API key instead of browser login
                        (prefer setting ${API_KEY_ENV_VAR}, which is read automatically)
  --client, -c <name>   Target agent client: cursor | claude-code | antigravity | all
  --skills-dir <path>   Custom skill install directory (must be inside the project)
  --symlink             Symlink the skill instead of copying it (needs @slopmachine/core
                        installed in the project, and never replaces non-symlinks)
  --no-skill            Skip installing skills/slopmachine/SKILL.md
  --no-mcp              Skip writing MCP configuration files
  --agent-name <name>   Display name shown on the /connect approval screen
  --help, -h            Show this help message
  --version, -v         Print CLI version

MCP config files reference the ${API_KEY_ENV_VAR} environment variable; the API key
itself is never written to them.
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
  const fail = (err: unknown): CliResult => {
    stderr(`Error: ${(err as Error)?.message || String(err)}`);
    return { exitCode: 1, mcpFilesWritten: [], skillPathsInstalled: [] };
  };

  let options: CliOptions;
  try {
    options = parseCliArgs(argv, cwd, env);
  } catch (err) {
    return fail(err);
  }

  if (options.command === "help") {
    stdout(formatHelpText());
    return { exitCode: 0, mcpFilesWritten: [], skillPathsInstalled: [] };
  }

  if (options.command === "version") {
    stdout(readCliVersion());
    return { exitCode: 0, mcpFilesWritten: [], skillPathsInstalled: [] };
  }

  const installSkill = options.command === "init" && !options.skipSkill;
  const skillOptions: SkillInstallOptions = {
    client: options.client,
    skillsDir: options.skillsDir,
    symlink: options.symlink,
    sourceSkillDir: deps.sourceSkillDir,
  };

  try {
    // Check the skill target before asking the user to approve anything.
    if (installSkill) planSkillInstall(cwd, skillOptions);

    let apiKey = options.apiKey;
    let mintedKey = false;

    if (!apiKey && (!options.skipMcp || options.command === "login")) {
      stdout("Initiating Slop Machine agent authentication handshake...");
      const handshake = await initiateAgentHandshake({
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
        intervalMs: deps.pollIntervalMs,
        timeoutMs: deps.pollTimeoutMs,
        fetchImpl: deps.fetch,
        sleepImpl: deps.sleep,
      });

      apiKey = redeemed.rawKey;
      mintedKey = true;
      stdout("Authentication approved!");
    }

    const mcpFilesWritten: string[] = [];
    if (apiKey && !options.skipMcp) {
      const files = configureWorkspaceMcp(cwd, { client: options.client });
      mcpFilesWritten.push(...files);
      for (const file of files) {
        stdout(`Configured MCP server in ${path.relative(cwd, file) || file}`);
      }

      const commands = buildRegistrationCommands();
      stdout("");
      stdout("CLI Registration Commands (optional):");
      stdout(`  Claude Code:  ${commands.claudeCode}`);
      stdout(`  Antigravity:  ${commands.antigravity}`);
    }

    if (mintedKey && apiKey) {
      stdout("");
      stdout("Your new Slop Machine API key (shown once, store it securely):");
      stdout(`  ${apiKey}`);
    }
    if (apiKey && !options.skipMcp && !env[API_KEY_ENV_VAR]?.trim()) {
      stdout("");
      stdout(
        `The MCP config reads your key from the ${API_KEY_ENV_VAR} environment variable; it isn't written to any file.`,
      );
      stdout(
        `Set ${API_KEY_ENV_VAR} in the environment your agent runs in (e.g. your shell profile), then restart the agent.`,
      );
    }

    const skillPathsInstalled: string[] = [];
    if (installSkill) {
      const installed = installSkillFiles(cwd, skillOptions);
      skillPathsInstalled.push(...installed);
      for (const dir of installed) {
        stdout(
          `Installed Slop Machine skill in ${path.relative(cwd, dir) || dir}`,
        );
      }
    }

    stdout("");
    stdout("Slop Machine setup complete!");
    return { exitCode: 0, apiKey, mcpFilesWritten, skillPathsInstalled };
  } catch (err) {
    return fail(err);
  }
}
