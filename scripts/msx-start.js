#!/usr/bin/env node

/**
 * MSX CRM MCP Server launcher.
 *
 * Loads environment variables from the repo-root .env file (if present),
 * ensures PATH includes common tool locations (homebrew, conda, etc.)
 * so `az` CLI is discoverable, then starts the MSX CRM server.
 *
 * This wrapper ensures a consistent startup path for both
 * VS Code MCP hosting and Copilot CLI (`copilot` / `mcaps`).
 *
 * Priority order for MSX_CRM_URL / MSX_TENANT_ID:
 *   1. Already set in process environment (e.g. shell profile)
 *   2. Defined in <repo-root>/.env
 *   3. Defaults baked into mcp/msx/src/index.js
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, delimiter } from "node:path";
import { homedir, platform } from "node:os";

const isWin = platform() === "win32";
const ROOT = resolve(import.meta.dirname, "..");
const envFile = resolve(ROOT, ".env");

// ── Load .env (simple key=value, no dependency on dotenv) ──────────
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    // Don't override values already in the environment
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ── Ensure PATH includes common tool locations ─────────────────────
// VS Code spawns MCP servers with a minimal PATH that may not include
// homebrew, conda, or other locations where `az` CLI lives.
const home = homedir();
const extraDirs = isWin
  ? [
      resolve(process.env.ProgramFiles || "C:\\Program Files", "Microsoft SDKs", "Azure", "CLI2", "wbin"),
      resolve(home, "AppData", "Local", "Programs", "Azure CLI"),
      resolve(home, "miniconda3", "Scripts"),
      resolve(home, "anaconda3", "Scripts"),
    ]
  : [
      `${home}/miniconda3/bin`,
      `${home}/anaconda3/bin`,
      "/opt/homebrew/bin",
      "/usr/local/bin",
    ];

const existing = extraDirs.filter((d) => existsSync(d));
if (existing.length) {
  const current = process.env.PATH || "";
  const parts = current.split(delimiter);
  const missing = existing.filter((d) => !parts.includes(d));
  if (missing.length) {
    process.env.PATH = [...missing, current].join(delimiter);
  }
}

// ── Start MSX CRM server ──────────────────────────────────────────
try {
  await import("../mcp/msx/src/index.js");
} catch (err) {
  console.error("MSX CRM MCP server failed to start:", err.message || err);
  console.error("");
  console.error("Troubleshooting:");
  console.error("  1. Run 'node scripts/init.js' to install dependencies.");
  console.error("  2. Run 'az login' to authenticate with Azure CLI.");
  console.error("  3. If the problem persists, try using the GitHub Copilot CLI instead:");
  console.error("       npm install -g @github/copilot");
  process.exit(1);
}
