#!/usr/bin/env node
// Excalidraw MCP server — creates and renders Excalidraw diagrams
// No VS Code or browser required — renders to SVG server-side

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';

const server = new McpServer({
  name: 'excalidraw',
  version: '1.0.0',
  description: 'Create, manage, and render Excalidraw diagrams as SVG without VS Code',
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
