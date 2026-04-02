#!/usr/bin/env node

/**
 * mcaps — launch a GitHub Copilot CLI session in the mcaps-iq repo.
 *
 * Installed globally via `npm link` so it works from any directory.
 * Runs `copilot` with the working directory set to the repo root,
 * so MCP servers, agents, and skills are auto-detected.
 *
 * Falls back to opening VS Code if Copilot CLI is not installed.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const isWindows = process.platform === "win32";
const args = process.argv.slice(2);

// Build copilot args: always enable all tools and add the repo dir
const copilotArgs = ["--allow-all-tools", "--add-dir", ROOT];

// If OBSIDIAN_VAULT env var is set, include the vault as an additional dir
const vaultDir = process.env.OBSIDIAN_VAULT || process.env.OBSIDIAN_VAULT_PATH;
if (vaultDir) {
  copilotArgs.push("--add-dir", vaultDir);
}

copilotArgs.push(...args);

// Try Copilot CLI first
let result = spawnSync("copilot", copilotArgs, {
  cwd: ROOT,
  stdio: "inherit",
  shell: isWindows,
});

if (result.error && result.error.code === "ENOENT") {
  // Copilot CLI not installed — try opening VS Code as fallback
  console.log("GitHub Copilot CLI ('copilot') not found.\n");
  console.log("Install it:");
  console.log("  macOS:  brew install copilot-cli");
  console.log("  npm:    npm install -g @github/copilot\n");
  console.log("Falling back to VS Code...\n");

  result = spawnSync("code", [ROOT], {
    stdio: "inherit",
    shell: isWindows,
  });

  if (result.error) {
    console.error("VS Code ('code') also not found in PATH.");
    console.error("Open this repo manually: " + ROOT);
    process.exit(1);
  }
}

process.exit(result.status ?? 1);
