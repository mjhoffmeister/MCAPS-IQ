#!/usr/bin/env node

/**
 * MSX CRM MCP Server — bootstrap for Copilot CLI plugin install.
 *
 * When `copilot plugin install microsoft/MCAPS-IQ` clones this repo,
 * there's no dist/ or node_modules/ under mcp/msx/. This script:
 *   1. Installs dependencies in mcp/msx/ (first run only)
 *   2. Compiles TypeScript in mcp/msx/ (first run only)
 *   3. Loads .env from repo root (if present)
 *   4. Ensures PATH includes common `az` CLI locations
 *   5. Starts the MCP server (stdio transport)
 *
 * Subsequent starts skip steps 1-2 and are instant.
 * Zero external dependencies — uses only node: builtins.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve, delimiter } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir, platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MSX_DIR = join(ROOT, "mcp", "msx");
const DIST = join(MSX_DIR, "dist", "index.js");
const NODE_MODULES = join(MSX_DIR, "node_modules");

function log(msg) {
  // stderr so MCP JSON-RPC on stdout stays clean
  process.stderr.write(`[mcaps-iq] ${msg}\n`);
}

// ── Step 1: Install dependencies (first run) ──────────────────────
try {
  if (!existsSync(NODE_MODULES)) {
    log("First run — installing MSX MCP dependencies...");
    execSync("npm install --ignore-scripts", {
      cwd: MSX_DIR,
      stdio: ["ignore", "ignore", "inherit"],
      timeout: 120_000,
    });
    log("Dependencies installed.");
  }

  // ── Step 2: Build TypeScript (first run or after update) ─────────
  // Check if any source file is newer than dist to handle plugin updates.
  // Directory mtime doesn't change when file contents are edited on
  // Windows/NTFS, so we scan actual files instead.
  let needsBuild = !existsSync(DIST);
  if (!needsBuild) {
    try {
      const distMtime = statSync(DIST).mtimeMs;
      const buildInputs = [
        join(MSX_DIR, "package.json"),
        join(MSX_DIR, "tsconfig.json"),
      ];
      // Add all .ts files from src/
      const srcDir = join(MSX_DIR, "src");
      if (existsSync(srcDir)) {
        const walk = (dir) => {
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith(".ts")) buildInputs.push(full);
          }
        };
        walk(srcDir);
      }
      needsBuild = buildInputs.some(
        (f) => existsSync(f) && statSync(f).mtimeMs > distMtime
      );
    } catch {
      needsBuild = true;
    }
  }
  if (needsBuild) {
    log("Building MSX MCP server from source...");
    execSync("npm run build", {
      cwd: MSX_DIR,
      stdio: ["ignore", "ignore", "inherit"],
      timeout: 120_000,
    });
    log("Build complete.");
  }
} catch (err) {
  log(`Bootstrap failed: ${err.message}`);
  log("");
  log("Troubleshooting:");
  log("  1. Ensure Node.js >= 20 is installed");
  log("  2. Run: cd mcp/msx && npm install && npm run build");
  log("  3. Run: az login");
  process.exit(1);
}

// ── Step 3: Load .env (simple key=value, no dotenv dependency) ────
const envFile = join(ROOT, ".env");
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ── Step 4: Ensure PATH includes common `az` CLI locations ────────
const isWin = platform() === "win32";
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

// ── Step 5: Start MSX CRM server ──────────────────────────────────
// Pre-check: warn if Azure CLI isn't authenticated (non-blocking)
try {
  execSync("az account show", {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "ignore"],
    timeout: 10_000,
  });
} catch {
  log("");
  log("⚠️  Azure CLI is not authenticated. Run: az login");
  log("   The MCP server will start, but CRM calls will fail until you authenticate.");
  log("");
}

try {
  await import(pathToFileURL(DIST).href);
} catch (err) {
  log(`MSX CRM MCP server failed to start: ${err.message || err}`);
  log("");
  log("Troubleshooting:");
  log("  1. Run: az login");
  log("  2. Run: cd mcp/msx && npm run build");
  process.exit(1);
}
