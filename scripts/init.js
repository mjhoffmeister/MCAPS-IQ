#!/usr/bin/env node

/**
 * Cross-platform environment initializer for mcaps-iq.
 *
 * Usage:
 *   node scripts/init.js          # install + build all MCP servers
 *   node scripts/init.js --check  # verify environment without installing
 *
 * Exit codes:
 *   0 — success
 *   1 — one or more steps failed
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

// ── repo root (scripts/ lives one level below) ──────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── MCP server definitions ──────────────────────────────────────────
// Each entry describes an MCP sub-project and the commands needed to
// initialise it.  Add new entries here as new servers appear.
const SERVERS = [
  {
    name: "msx-crm",
    dir: join(ROOT, "mcp", "msx"),
    install: "npm install",
    build: "npm run build",
    verify: "dist/index.js",
  },
  {
    name: "oil (Obsidian Intelligence Layer)",
    dir: join(ROOT, "mcp", "oil"),
    install: "npm install",
    build: "npm run build",
    verify: "dist/index.js",
  },
  {
    name: "excalidraw",
    dir: join(ROOT, "mcp", "excalidraw"),
    install: "npm install",
    build: null, // plain JS — no build step
    verify: "src/index.js",
  },
];

// ── prerequisite checks ─────────────────────────────────────────────
const PREREQS = [
  { cmd: "node --version", label: "Node.js", minMajor: 18 },
  { cmd: "npm --version", label: "npm" },
];

// ── helpers ─────────────────────────────────────────────────────────
const isWindows = process.platform === "win32";

function run(cmd, cwd) {
  execSync(cmd, {
    cwd,
    stdio: "inherit",
    shell: isWindows ? true : "/bin/sh",
  });
}

function tryRun(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

function heading(text) {
  const bar = "─".repeat(60);
  console.log(`\n${bar}\n  ${text}\n${bar}`);
}

function ok(msg) {
  console.log(`  ✔ ${msg}`);
}
function warn(msg) {
  console.log(`  ⚠ ${msg}`);
}
function fail(msg) {
  console.log(`  ✖ ${msg}`);
}

// ── prerequisite validation ─────────────────────────────────────────
function checkPrereqs() {
  heading("Checking prerequisites");
  let passed = true;

  for (const { cmd, label, minMajor } of PREREQS) {
    const version = tryRun(cmd);
    if (!version) {
      fail(`${label} not found — install it before continuing.`);
      passed = false;
      continue;
    }
    if (minMajor) {
      const major = parseInt(version.replace(/^v/, ""), 10);
      if (major < minMajor) {
        fail(`${label} ${version} found — need v${minMajor}+`);
        passed = false;
        continue;
      }
    }
    ok(`${label} ${version}`);
  }

  // Azure CLI — optional but recommended
  const azVersion = tryRun("az version --query '\"azure-cli\"' -o tsv");
  if (azVersion) {
    ok(`Azure CLI ${azVersion}`);

    // Check if the user is actually signed in
    const account = tryRun("az account show --query user.name -o tsv");
    if (account) {
      ok(`Signed in as ${account}`);
    } else {
      warn("Azure CLI installed but not signed in — run: az login");
    }
  } else {
    warn("Azure CLI not found — needed for CRM authentication.");
    warn("  Install: https://learn.microsoft.com/cli/azure/install-azure-cli");
  }

  return passed;
}

// ── server initialization ───────────────────────────────────────────
function initServers() {
  let allOk = true;
  for (const server of SERVERS) {
    heading(`Initializing ${server.name}`);

    if (!existsSync(server.dir)) {
      fail(`Directory not found: ${server.dir}`);
      allOk = false;
      continue;
    }

    try {
      console.log(`  → ${server.install}`);
      run(server.install, server.dir);
      ok("Dependencies installed");

      if (server.build) {
        console.log(`  → ${server.build}`);
        run(server.build, server.dir);
        ok("Build succeeded");
      }

      const artifact = join(server.dir, server.verify);
      if (existsSync(artifact)) {
        ok(`Entry point verified: ${server.verify}`);
      } else {
        warn(`Expected entry point not found: ${server.verify}`);
      }
    } catch (err) {
      fail(`Failed — ${err.message}`);
      allOk = false;
    }
  }
  return allOk;
}

// ── check-only mode ─────────────────────────────────────────────────
function checkOnly() {
  const prereqsOk = checkPrereqs();

  heading("Checking MCP servers");
  let serversOk = true;
  for (const server of SERVERS) {
    const nodeModules = join(server.dir, "node_modules");
    const artifact = join(server.dir, server.verify);
    const installed = existsSync(nodeModules);
    const built = existsSync(artifact);

    if (installed && built) {
      ok(`${server.name} — ready`);
    } else if (installed && !server.build) {
      ok(`${server.name} — ready (no build step)`);
    } else {
      const missing = [];
      if (!installed) missing.push("npm install");
      if (server.build && !built) missing.push(server.build);
      fail(`${server.name} — needs: ${missing.join(", ")}`);
      serversOk = false;
    }
  }

  if (prereqsOk && serversOk) {
    heading("Environment is ready ✔");
  } else {
    heading("Environment has issues — run `node scripts/init.js` to fix");
  }
  return prereqsOk && serversOk;
}

// ── global alias registration ───────────────────────────────────────
function printAliasFallback() {
  const binPath = join(ROOT, "bin", "mcaps.js");
  if (isWindows) {
    const escaped = binPath.replace(/\\/g, "\\\\");
    console.log();
    warn("  Alternatives for PowerShell:");
    warn("");
    warn("  Option 1 — Add a function to your PowerShell profile:");
    warn(`    Add-Content $PROFILE 'function mcaps { node "${escaped}" @args }'`);
    warn("    . $PROFILE   # reload your profile");
    warn("");
    warn("  Option 2 — Use from the repo directory:");
    warn("    node bin\\mcaps.js");
    warn("");
    warn("  Option 3 — Retry from an elevated terminal:");
    warn("    npm link --ignore-scripts");
  } else {
    warn("  Try: sudo npm link --ignore-scripts");
    warn("  Or with nvm/fnm (no sudo): npm link --ignore-scripts");
  }
}

function registerAlias() {
  heading("Registering 'mcaps' CLI alias");

  // Ensure bin script is executable on Unix
  if (!isWindows) {
    const binScript = join(ROOT, "bin", "mcaps.js");
    try {
      execSync(`chmod +x "${binScript}"`, { stdio: "pipe" });
    } catch { /* best-effort */ }
  }

  try {
    // --ignore-scripts prevents recursive postinstall
    run("npm link --ignore-scripts", ROOT);
  } catch {
    warn("Could not register global alias automatically.");
    printAliasFallback();
    return false;
  }

  // Verify the command is actually reachable after linking
  const whichCmd = isWindows ? "where mcaps" : "which mcaps";
  const found = tryRun(whichCmd);

  if (found) {
    ok("'mcaps' is now available globally — try it from any directory!");
    return true;
  }

  // npm link appeared to succeed but the command isn't callable
  warn("npm link succeeded, but 'mcaps' was not found in your PATH.");

  if (isWindows) {
    const npmPrefix = tryRun("npm config get prefix");
    if (npmPrefix) {
      warn(`  npm global bin directory: ${npmPrefix}`);
      warn("");
      warn("  Add it to your PATH for this session:");
      warn(`    $env:PATH += ";${npmPrefix}"`);
      warn("");
      warn("  Or make it permanent:");
      warn(`    [Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";${npmPrefix}", "User")`);
    }

    // Check PowerShell execution policy (common blocker for .ps1 shims)
    const policy = tryRun('powershell -NoProfile -Command "Get-ExecutionPolicy"');
    if (policy && policy.toLowerCase() === "restricted") {
      warn("");
      warn("  PowerShell execution policy is 'Restricted' — .ps1 scripts are blocked.");
      warn("  Fix:  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser");
    }

    printAliasFallback();
  } else {
    warn("  Check: npm config get prefix");
    warn("  Make sure <prefix>/bin is in your PATH.");
  }

  return false;
}

// ── .env configuration ──────────────────────────────────────────────
function parseEnvFile(filePath) {
  const vars = {};
  if (!existsSync(filePath)) return vars;
  const lines = readFileSync(filePath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    vars[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return vars;
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

async function configureEnv() {
  const envPath = join(ROOT, ".env");
  const existing = parseEnvFile(envPath);

  if (existing.OBSIDIAN_VAULT_PATH) {
    ok(`Vault path already configured: ${existing.OBSIDIAN_VAULT_PATH}`);
    return;
  }

  // Skip prompt in non-interactive environments (CI, piped stdin)
  if (!process.stdin.isTTY) {
    warn("Non-interactive shell — skipping vault path prompt.");
    warn("Set OBSIDIAN_VAULT_PATH in .env manually for the OIL MCP server.");
    return;
  }

  heading("Obsidian Vault Configuration");
  console.log("  The OIL MCP server needs the path to your Obsidian vault.");
  console.log("  This is stored in .env (gitignored) — not committed.\n");

  const vaultPath = await ask("  Obsidian vault path (or press Enter to skip): ");

  if (!vaultPath) {
    warn("Skipped — OIL server won't start without a vault path.");
    warn("You can set it later:  echo 'OBSIDIAN_VAULT_PATH=/your/path' >> .env");
    return;
  }

  if (!existsSync(vaultPath)) {
    warn(`Path does not exist yet: ${vaultPath}`);
    warn("Saving anyway — make sure the vault is created before starting OIL.");
  }

  // Append to .env (preserve any other vars)
  const envLine = `OBSIDIAN_VAULT_PATH=${vaultPath}\n`;
  const content = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";
  writeFileSync(envPath, content + envLine, "utf-8");
  ok(`Saved to .env: OBSIDIAN_VAULT_PATH=${vaultPath}`);
}

// ── main ────────────────────────────────────────────────────────────
const checkMode = process.argv.includes("--check");

if (checkMode) {
  const ok = checkOnly();
  process.exit(ok ? 0 : 1);
} else {
  const prereqsOk = checkPrereqs();
  if (!prereqsOk) {
    console.log("\nFix prerequisite issues above, then re-run this script.");
    process.exit(1);
  }

  // ── risk acknowledgement ────────────────────────────────────────
  heading("⚠  Important — Please Read");
  console.log(`
  This toolkit uses agentic AI (GitHub Copilot + MCP servers) to read
  and write CRM records, query M365 data, and suggest strategic actions.

  AI models can produce incorrect, incomplete, or misleading outputs.
  YOU are responsible for reviewing and validating every action.

  By proceeding you acknowledge that:
    • All AI-generated outputs are drafts requiring human judgment.
    • Write operations require your explicit confirmation before executing.
    • You will not rely on AI outputs without independent verification.
`);

  if (process.stdin.isTTY) {
    const consent = await ask("  Type 'yes' to accept and continue installation: ");
    if (consent.toLowerCase() !== "yes") {
      console.log("\n  Setup cancelled. Re-run when you're ready.\n");
      process.exit(0);
    }
  } else {
    warn("Non-interactive shell — proceeding with installation.");
    warn("By using this toolkit you accept the risks described above.");
  }

  const serversOk = initServers();
  if (serversOk) {
    await configureEnv();
    registerAlias();
    heading("All done ✔");

    // Check if already signed in to provide the right next step
    const account = tryRun("az account show --query user.name -o tsv");
    if (account) {
      console.log(`
  You're signed in as ${account}. Everything is ready!

  Next steps:
    1. Open this repo in VS Code:  code .
    2. MCP servers auto-start via .vscode/mcp.json
    3. Open Copilot chat (Cmd+Shift+I) and try: "Who am I in MSX?"

  Or from anywhere:  mcaps
  (launches Copilot CLI in this repo)
`);
    } else {
      console.log(`
  Next steps:
    1. Connect to Microsoft VPN
    2. Sign in to Azure:        az login
    3. Open this repo in VS Code:  code .
    4. MCP servers auto-start via .vscode/mcp.json
    5. Open Copilot chat (Cmd+Shift+I) and try: "Who am I in MSX?"

  Or from anywhere:  mcaps
  (launches Copilot CLI in this repo)
`);
    }
  } else {
    heading("Some steps failed — see errors above");
    process.exit(1);
  }
}
