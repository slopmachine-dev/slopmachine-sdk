---
description: Install the official Slop Machine Agent Skill, configure the remote MCP server, and run zero-UI media generation pipelines from Claude Code, Cursor, Antigravity, Windsurf, and Codex.
---

# Agent Skill & MCP Setup

Slop Machine is built for **zero-UI agent workflows**. You can hand Slop Machine over to your coding or creative agent (Claude Code, Cursor, Antigravity, Windsurf, Codex, or Claude Desktop) and let it create workspaces, author multi-step generation pipelines, execute runs, poll results, and drop `<SlopImage />`, `<SlopVideo />`, and `<SlopText />` components directly into your application code.

---

## Quick Start (One-Liner)

### Install the Open-Source Agent Skill

The official Slop Machine Agent Skill ([`skills/slopmachine/SKILL.md`](https://github.com/slopmachine-dev/slopmachine-sdk/blob/main/skills/slopmachine/SKILL.md)) is open-source and housed directly in [`slopmachine-dev/slopmachine-sdk`](https://github.com/slopmachine-dev/slopmachine-sdk).

Install it into your workspace with the `skills` CLI:

```bash
npx skills add slopmachine-dev/slopmachine-sdk
```

### Full CLI Onboarding (`init` / `login`)

To authenticate with Slop Machine, configure the remote MCP server in your workspace (`.mcp.json` / `.cursor/mcp.json`), and install the Agent Skill in a single command, run:

```bash
npx @slopmachine/core init
```

If you already have a `slop_live_...` API key, set the `SLOPMACHINE_API_KEY` environment variable and the CLI uses it instead of the browser flow. Prefer this to `--api-key`, which leaves the key in your shell history:

```bash
export SLOPMACHINE_API_KEY=slop_live_YOUR_API_KEY   # e.g. in your shell profile
npx @slopmachine/core init
```

The MCP config files the CLI writes never contain your key. They reference the `SLOPMACHINE_API_KEY` environment variable instead (`${SLOPMACHINE_API_KEY}` in `.mcp.json`, `${env:SLOPMACHINE_API_KEY}` in `.cursor/mcp.json`), so they're safe to commit. Make sure the variable is set in the environment your agent runs in. If the CLI mints a new key through the browser flow, it prints the key once so you can store it.

#### CLI Options

| Flag | Description |
| :--- | :--- |
| `--api-key, -k <key>` | Use an existing `slop_live_...` API key instead of opening the browser `/connect` flow (prefer `SLOPMACHINE_API_KEY`) |
| `--client, -c <name>` | Target a specific agent host: `cursor`, `claude-code`, `antigravity`, or `all` |
| `--skills-dir <path>` | Custom target directory for `SKILL.md` installation (must be inside the project) |
| `--symlink` | Symlink the skill directory instead of copying files. Requires `@slopmachine/core` installed in the project (a link into the temporary `npx` cache would break), and never replaces an existing file or directory that isn't a symlink |
| `--no-skill` | Skip installing `skills/slopmachine/SKILL.md` |
| `--no-mcp` | Skip writing MCP configuration files |

---

## Agent-Initiated Signup & Claim Flow (`/connect`)

If you don't have a Slop Machine account or API key yet, your agent (or `npx @slopmachine/core init`) can initiate a device-code handshake on your behalf:

1. **Agent requests a handshake code**:
   `POST https://slopmachine.dev/api/auth/agent-handshake` returns a `deviceCode`, a short human-readable `userCode` (e.g. `SLOP-4829`), and a `verificationUri` (`https://slopmachine.dev/connect?code=SLOP-4829`).
2. **One-click browser approval**:
   Open the `verificationUri` link, sign in with Google if needed, and click **Approve & Connect Agent**. New accounts automatically receive a default workspace on the free plan (`200` Fuel / month).
3. **Automatic key redemption**:
   The polling agent calls `POST https://slopmachine.dev/api/auth/agent-handshake/redeem` with `deviceCode` and receives a freshly minted `slop_live_...` API key.

---

## Remote MCP Server Configuration

Slop Machine hosts a streamable HTTP Model Context Protocol (MCP) server at:

```text
https://slopmachine.dev/api/mcp
```

Authenticate using the `Authorization: Bearer slop_live_...` header (or `x-api-key: slop_live_...`).

The examples below read the key from the `SLOPMACHINE_API_KEY` environment variable rather than pasting it into a command or a project file.

### Claude Code

```bash
claude mcp add --transport http slopmachine "https://slopmachine.dev/api/mcp" \
  --header "Authorization: Bearer $SLOPMACHINE_API_KEY"
```

Or in a project `.mcp.json` (Claude Code expands `${VAR}`):

```json
{
  "mcpServers": {
    "slopmachine": {
      "type": "http",
      "url": "https://slopmachine.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer ${SLOPMACHINE_API_KEY}"
      }
    }
  }
}
```

### Antigravity (`agy`)

```bash
agy mcp add --transport http slopmachine "https://slopmachine.dev/api/mcp" \
  --header "Authorization: Bearer $SLOPMACHINE_API_KEY"
```

### Cursor (`.cursor/mcp.json`)

Cursor expands `${env:VAR}`:

```json
{
  "mcpServers": {
    "slopmachine": {
      "type": "http",
      "url": "https://slopmachine.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer ${env:SLOPMACHINE_API_KEY}"
      }
    }
  }
}
```

### Claude Desktop

Claude Desktop doesn't load remote (HTTP) MCP servers from `claude_desktop_config.json`, which is for local servers only. Add Slop Machine as a custom connector under **Settings → Connectors** with the URL `https://slopmachine.dev/api/mcp`.

---

## In-Browser WebMCP (`document.modelContext`)

When you are signed in to `https://slopmachine.dev` in a browser tab, Slop Machine automatically exposes WebMCP tools on `document.modelContext` (powered by `@mcp-b/global`) so browser-based agents and extensions can orchestrate workspaces without manual API key setup:

- `list_silos`: Discover accessible workspaces.
- `list_pipelines`: Inspect pipelines in the active workspace.
- `create_pipeline`: Create a new video, image, audio, or text pipeline.
- `execute_pipeline`: Trigger generation with runtime `variables` and `count`.
- `create_api_key`: Mint a `slop_live_...` API key for remote MCP use.

---

## Available MCP Tools

| Tool | Description |
| :--- | :--- |
| `list_silos` | List accessible workspaces (`id`, `title`, `description`). |
| `create_silo` | Create a new workspace (silo) for organizing projects or campaigns. |
| `list_pipelines` | List pipelines in a silo or across user workspaces. |
| `get_pipeline` | Inspect a pipeline's metadata, active version, and `steps` array. |
| `create_pipeline` | Create a multi-step pipeline (`title`, `steps`, `defaultResultType`, `expiresAfter`, `whitelistedDomains`). |
| `update_pipeline` | Update a pipeline's metadata or replace its version's `steps` and `expiresAfter` policy in place. |
| `execute_pipeline` | Run a pipeline with runtime `variables`, `aspectRatio`, `duration`, `attachments`, and `count` (1–10). |
| `get_pipeline_result` | Poll execution status (`queued` &rarr; `processing` &rarr; `completed` / `failed`) and output URLs. |
| `list_templates` | List reusable `{{template_name}}` prompt fragments in a silo. |
| `create_template` | Create a shared silo prompt template (e.g., brand voice or visual style). |
| `update_template` | Update a silo prompt template (creates a new version when `body` changes). |
| `create_schedule` | Configure a recurring 5-field cron schedule (minimum 1-hour interval) for a pipeline. |
| `list_schedules` | List recurring schedules for a pipeline. |
| `update_schedule` | Update, pause, or resume a pipeline schedule. |
| `list_pending_reviews` | Inspect scheduled results awaiting human review, including AI batch rankings. |
| `get_fuel_balance` | Check active team `fuelBalance`, plan tier, step fuel costs, and top-up URLs. |

---

## Pipeline Step Types & Fuel Costs

Pipelines chain multiple steps using `outputKey` and `inputKey`. Use single braces `{variable}` for runtime variables and upstream step outputs, and double braces `{{template_name}}` exclusively for Silo Templates.

| Step Type | Primary Output | Supported Aspect Ratios | Fuel Cost Formula |
| :--- | :--- | :--- | :--- |
| `video_generation`, `video_*` | `"video"` | `"9:16"`, `"16:9"` | `15 * durationSeconds` Fuel (4s = `60` Fuel) |
| `image_generation`, `image_*`, `background_removal`, `thumbnail_generation` | `"image"` | `"1:1"`, `"16:9"`, `"9:16"`, `"4:3"`, `"3:4"`, `"3:2"`, `"2:3"`, `"4:5"`, `"5:4"`, `"21:9"` | `6` Fuel flat |
| `vector` | `"vector"` | Image aspect ratios (default `"1:1"`) | `3` Fuel flat |
| `animation` | `"animation"` | Image aspect ratios (default `"1:1"`) | `1 * durationSeconds` Fuel (4s = `4` Fuel) |
| `flair_effect` | `"video"`, `"animation"`, or `"vector"` | Matches input / target modality | `1 * durationSeconds` (SVG/animation), `3` (vector), or `15 * durationSeconds` (video shader) |
| `speech_generation` | `"audio"` | N/A (`voice`: `Aoede`, `Kore`, `Zephyr`, `Leda`, `Puck`, `Charon`, `Fenrir`) | `2` Fuel flat |
| `music_generation` | `"audio"` | N/A (default `15`s) | `1 * durationSeconds` Fuel (15s = `15` Fuel) |
| `text_generation`, `text_modification`, `json_generation`, `code_generation`, `document_generation`, `audio_transcription`, `audio_processing` | `"text"` / `"json"` / `"file"` / `"audio"` | N/A | `1` Fuel flat |

For full step configuration schemas, see [`skills/slopmachine/references/step-types.md`](https://github.com/slopmachine-dev/slopmachine-sdk/blob/main/skills/slopmachine/references/step-types.md).

---

## Example Prompts for Your Agent

Once the skill and MCP server are configured, try giving your agent prompts like:

1. **End-to-End Hero Video Pipeline + React Component**:
   > *"Use Slop Machine to create a 2-step pipeline in my workspace: Step 1 uses `json_generation` to write a cinematic video prompt and a 4-word headline for `{productName}`, and Step 2 uses `video_generation` (16:9, 4 seconds) with `{videoPrompt}`. Run a test execution for 'Neon Skateboard', wait for the result URL, and then add a `<SlopVideo />` hero component to `src/Hero.tsx` wired to that `pipelineId`."*

2. **Shared Brand Style Template + Dynamic Avatars**:
   > *"Create a Slop Machine template named `brand_style` with our neubrutalist visual direction (bold black outlines, offset shadows, warm halftone textures). Then create an `image_generation` pipeline that references `{{brand_style}}` and `{role}`, generate 3 variations, and render it with `<SlopImage />`."*

3. **Scheduled Daily Social Reel with AI Batch Selection**:
   > *"Create a vertical (9:16) `video_generation` pipeline for daily developer tips and schedule it to run every weekday at 9:00 AM America/New_York (`0 9 * * 1-5`) generating 3 variations per run with AI selection keeping the top 1."*
