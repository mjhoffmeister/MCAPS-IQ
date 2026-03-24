#!/usr/bin/env node

/**
 * Shared MCP server launcher.
 *
 * Provides consistent startup for all local MCP servers:
 *   - Loads .env from repo root (simple key=value, no dotenv)
 *   - Extends PATH for common tool locations (homebrew, conda, az CLI)
 *   - Auto-installs npm dependencies on first run
 *   - Auto-builds TypeScript when source is newer than dist
 *   - Structured error handling with troubleshooting hints
 *
 * Usage:
 *   import { launch } from "./lib/mcp-launcher.js";
 *   await launch({ name: "msx-crm", serverDir: "mcp/msx" });
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, join, delimiter } from "node:path";
import { homedir, platform } from "node:os";
import { pathToFileURL } from "node:url";

const isWin = platform() === "win32";
const ROOT = resolve(import.meta.dirname, "..");

// ── .env loader ────────────────────────────────────────────────────
function loadEnv() {
  const envFile = resolve(ROOT, ".env");
  if (!existsSync(envFile)) return;
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

// ── PATH extension ─────────────────────────────────────────────────
function extendPath() {
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
}

// ── Auto-install + auto-build ──────────────────────────────────────
function ensureBuilt(serverDir, name, log) {
  const distEntry = join(serverDir, "dist", "index.js");
  const nodeModules = join(serverDir, "node_modules");

  // Install dependencies if missing
  if (!existsSync(nodeModules)) {
    log("First run — installing dependencies...");
    execSync("npm install --ignore-scripts", {
      cwd: serverDir,
      stdio: ["ignore", "ignore", "inherit"],
      timeout: 120_000,
    });
    log("Dependencies installed.");
  }

  // Check if build is needed (source newer than dist)
  let needsBuild = !existsSync(distEntry);
  if (!needsBuild) {
    try {
      const distMtime = statSync(distEntry).mtimeMs;
      const buildInputs = [
        join(serverDir, "package.json"),
        join(serverDir, "tsconfig.json"),
      ];
      const srcDir = join(serverDir, "src");
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
        (f) => existsSync(f) && statSync(f).mtimeMs > distMtime,
      );
    } catch {
      needsBuild = true;
    }
  }

  if (needsBuild) {
    log("Building from source...");
    execSync("npm run build", {
      cwd: serverDir,
      stdio: ["ignore", "ignore", "inherit"],
      timeout: 120_000,
    });
    log("Build complete.");
  }

  return distEntry;
}

// ── Pre-flight checks ──────────────────────────────────────────────
function preflightChecks(checks, log) {
  for (const check of checks) {
    try {
      execSync(check.cmd, {
        cwd: ROOT,
        stdio: ["ignore", "ignore", "ignore"],
        timeout: 10_000,
      });
    } catch {
      log("");
      log(`⚠️  ${check.warn}`);
      log(`   ${check.hint}`);
      log("");
    }
  }
}

/**
 * Launch an MCP server with full bootstrap lifecycle.
 *
 * @param {object} opts
 * @param {string} opts.name       - Human-readable server name (for logs)
 * @param {string} opts.serverDir  - Path relative to repo root (e.g. "mcp/msx")
 * @param {Array}  [opts.checks]   - Pre-flight checks: [{ cmd, warn, hint }]
 */
export async function launch({ name, serverDir, checks = [] }) {
  const log = (msg) => process.stderr.write(`[${name}] ${msg}\n`);
  const fullDir = resolve(ROOT, serverDir);

  try {
    // 1. Load environment
    loadEnv();
    extendPath();

    // 2. Ensure deps + build
    const distEntry = ensureBuilt(fullDir, name, log);

    // 3. Pre-flight checks (non-blocking)
    if (checks.length) preflightChecks(checks, log);

    // 4. Start server
    await import(pathToFileURL(distEntry).href);
  } catch (err) {
    log(`Failed to start: ${err.message || err}`);
    log("");
    log("Troubleshooting:");
    log(`  1. Run 'node scripts/init.js' to install dependencies.`);
    log(`  2. Run 'cd ${serverDir} && npm install && npm run build'`);
    if (checks.length) {
      for (const c of checks) log(`  3. ${c.hint}`);
    }
    process.exit(1);
  }
}
