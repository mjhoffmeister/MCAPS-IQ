#!/usr/bin/env node

/**
 * MSX CRM MCP Server launcher.
 *
 * Loads .env, extends PATH for az CLI, auto-installs deps and builds
 * TypeScript on first run, then starts the MSX CRM server.
 *
 * Works identically in VS Code MCP hosting and Copilot CLI.
 */

import { launch } from "./lib/mcp-launcher.js";

await launch({
  name: "msx-crm",
  serverDir: "mcp/msx",
  checks: [
    {
      cmd: "az account show",
      warn: "Azure CLI is not authenticated. Run: az login",
      hint: "Run 'az login' to authenticate with Azure CLI.",
    },
  ],
});
