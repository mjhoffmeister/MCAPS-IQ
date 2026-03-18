// Excalidraw MCP server — tool definitions
// Provides: create_drawing, list_drawings, get_drawing, export_to_svg

import { z } from 'zod';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { renderToSvg } from './renderer.js';

const DRAWINGS_DIR = path.resolve(process.env.REPO_ROOT || '.', '.copilot', 'docs', 'excalidraw');

function text(content) { return { content: [{ type: 'text', text: content }] }; }
function error(msg) { return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true }; }

async function ensureDir() {
  if (!existsSync(DRAWINGS_DIR)) {
    await mkdir(DRAWINGS_DIR, { recursive: true });
  }
}

/**
 * Validate an Excalidraw JSON structure.
 * Returns null if valid, or error string.
 */
function validateExcalidraw(doc) {
  if (!doc || typeof doc !== 'object') return 'Document must be a JSON object';
  if (doc.type !== 'excalidraw') return 'Document "type" must be "excalidraw"';
  if (!Array.isArray(doc.elements)) return 'Document must have an "elements" array';
  if (doc.elements.length === 0) return 'Elements array must not be empty — every drawing needs at least one element';
  for (let i = 0; i < doc.elements.length; i++) {
    const el = doc.elements[i];
    if (!el.type) return `Element ${i} is missing "type"`;
    if (!el.id) return `Element ${i} is missing "id"`;
  }
  return null;
}

export function registerTools(server) {

  // ── create_drawing ──
  server.tool(
    'create_drawing',
    'Create an Excalidraw diagram file. Validates the JSON structure and ensures elements are non-empty. Saves to .copilot/docs/excalidraw/.',
    {
      filename: z.string().describe('Filename for the drawing (e.g. "Contoso_milestones.excalidraw"). Must end with .excalidraw'),
      document: z.string().describe('Complete Excalidraw JSON as a string. Must have type:"excalidraw", version:2, and a non-empty elements array.'),
      overwrite: z.boolean().optional().describe('If true, overwrite an existing file. Default: false')
    },
    async ({ filename, document: docStr, overwrite }) => {
      try {
        // Validate filename
        if (!filename.endsWith('.excalidraw')) {
          return error('Filename must end with .excalidraw');
        }
        if (/[/\\:*?"<>|]/.test(filename.replace('.excalidraw', ''))) {
          return error('Filename contains invalid characters');
        }

        // Parse JSON
        let doc;
        try {
          doc = JSON.parse(docStr);
        } catch (e) {
          return error(`Invalid JSON: ${e.message}`);
        }

        // Validate structure
        const valErr = validateExcalidraw(doc);
        if (valErr) return error(valErr);

        await ensureDir();
        const filePath = path.join(DRAWINGS_DIR, filename);

        // Check existing
        if (!overwrite && existsSync(filePath)) {
          return error(`File "${filename}" already exists. Set overwrite:true to replace it.`);
        }

        await writeFile(filePath, JSON.stringify(doc, null, 2), 'utf-8');

        const visibleCount = doc.elements.filter(e => !e.isDeleted).length;
        return text(`Drawing saved: ${filename} (${visibleCount} elements)\nPath: ${filePath}`);
      } catch (e) {
        return error(e.message);
      }
    }
  );

  // ── list_drawings ──
  server.tool(
    'list_drawings',
    'List all Excalidraw diagram files in .copilot/docs/excalidraw/. Returns filenames, sizes, and element counts.',
    {},
    async () => {
      try {
        await ensureDir();
        const files = await readdir(DRAWINGS_DIR);
        const drawings = [];

        for (const f of files) {
          if (!f.endsWith('.excalidraw')) continue;
          const filePath = path.join(DRAWINGS_DIR, f);
          try {
            const raw = await readFile(filePath, 'utf-8');
            const doc = JSON.parse(raw);
            const visibleEls = (doc.elements || []).filter(e => !e.isDeleted).length;
            drawings.push({
              filename: f,
              elements: visibleEls,
              sizeBytes: Buffer.byteLength(raw, 'utf-8')
            });
          } catch {
            drawings.push({ filename: f, elements: '?', sizeBytes: '?' });
          }
        }

        if (drawings.length === 0) {
          return text('No drawings found in .copilot/docs/excalidraw/');
        }

        const lines = drawings.map(d =>
          `  ${d.filename} — ${d.elements} elements, ${typeof d.sizeBytes === 'number' ? Math.round(d.sizeBytes / 1024) + 'KB' : '?'}`
        );
        return text(`Drawings (${drawings.length}):\n${lines.join('\n')}`);
      } catch (e) {
        return error(e.message);
      }
    }
  );

  // ── get_drawing ──
  server.tool(
    'get_drawing',
    'Read an Excalidraw drawing file and return its JSON content.',
    {
      filename: z.string().describe('Name of the .excalidraw file to read')
    },
    async ({ filename }) => {
      try {
        const filePath = path.join(DRAWINGS_DIR, path.basename(filename));
        if (!existsSync(filePath)) {
          return error(`Drawing not found: ${filename}`);
        }
        const raw = await readFile(filePath, 'utf-8');
        return text(raw);
      } catch (e) {
        return error(e.message);
      }
    }
  );

  // ── export_to_svg ──
  server.tool(
    'export_to_svg',
    'Render an Excalidraw drawing to SVG. Can export from an existing file or from inline JSON.',
    {
      filename: z.string().optional().describe('Name of an existing .excalidraw file to render'),
      document: z.string().optional().describe('Excalidraw JSON string to render (alternative to filename)')
    },
    async ({ filename, document: docStr }) => {
      try {
        let doc;
        if (filename) {
          const filePath = path.join(DRAWINGS_DIR, path.basename(filename));
          if (!existsSync(filePath)) return error(`Drawing not found: ${filename}`);
          const raw = await readFile(filePath, 'utf-8');
          doc = JSON.parse(raw);
        } else if (docStr) {
          doc = JSON.parse(docStr);
        } else {
          return error('Provide either filename or document');
        }

        const svg = renderToSvg(doc);
        return text(svg);
      } catch (e) {
        return error(e.message);
      }
    }
  );
}
