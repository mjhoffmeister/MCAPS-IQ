#!/usr/bin/env node

/**
 * OIL MCP Server launcher.
 *
 * Loads .env, auto-installs deps and builds TypeScript on first run,
 * then starts the Obsidian Intelligence Layer server.
 *
 * Works identically in VS Code MCP hosting and Copilot CLI.
 */

import { launch } from "./lib/mcp-launcher.js";

await launch({
  name: "oil",
  serverDir: "mcp/oil",
});
