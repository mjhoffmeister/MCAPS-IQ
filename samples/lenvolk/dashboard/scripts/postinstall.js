// Postinstall patch: fix vscode-jsonrpc ESM exports for @github/copilot-sdk
// The SDK imports 'vscode-jsonrpc/node' but the package lacks an exports field.
// This script adds the necessary exports mapping after npm install.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, 'node_modules', 'vscode-jsonrpc', 'package.json');

try {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (!pkg.exports) {
    pkg.exports = {
      '.': './lib/node/main.js',
      './node': './node.js',
      './node.js': './node.js',
      './browser': './browser.js',
      './browser.js': './browser.js',
      './lib/*': './lib/*',
    };
    writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
    console.log('[postinstall] Patched vscode-jsonrpc exports for ESM compatibility');
  }
} catch {
  // Ignore if package not installed yet
}
