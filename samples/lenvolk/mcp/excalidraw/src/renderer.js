// Excalidraw JSON → SVG renderer
// Handles: rectangle, diamond, ellipse, text, arrow, line

/**
 * Convert an Excalidraw JSON document to an SVG string.
 * @param {object} doc - Parsed Excalidraw JSON ({ type, version, elements, ... })
 * @returns {string} SVG markup
 */
export function renderToSvg(doc) {
  if (!doc || !Array.isArray(doc.elements) || doc.elements.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="20" y="100" font-size="16" fill="#666">No elements in drawing</text></svg>';
  }

  const elements = doc.elements.filter(e => !e.isDeleted);
  if (elements.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="20" y="100" font-size="16" fill="#666">No visible elements</text></svg>';
  }

  // Calculate bounding box
  const bounds = calcBounds(elements);
  const padding = 40;
  const width = bounds.maxX - bounds.minX + padding * 2;
  const height = bounds.maxY - bounds.minY + padding * 2;
  const offsetX = -bounds.minX + padding;
  const offsetY = -bounds.minY + padding;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}">\n`;
  svg += `<defs>\n`;
  svg += `  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" fill="context-stroke"><polygon points="0 0, 10 3.5, 0 7"/></marker>\n`;
  svg += `  <marker id="arrowhead-rev" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" fill="context-stroke"><polygon points="10 0, 0 3.5, 10 7"/></marker>\n`;
  svg += `</defs>\n`;
  svg += `<rect width="100%" height="100%" fill="${doc.appState?.viewBackgroundColor || '#ffffff'}"/>\n`;
  svg += `<g transform="translate(${offsetX}, ${offsetY})">\n`;

  for (const el of elements) {
    svg += renderElement(el);
  }

  svg += `</g>\n</svg>`;
  return svg;
}

function calcBounds(elements) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    if (el.isDeleted) continue;
    const ex = el.x || 0;
    const ey = el.y || 0;
    const ew = el.width || 0;
    const eh = el.height || 0;

    if (el.type === 'arrow' || el.type === 'line') {
      const pts = el.points || [[0, 0]];
      for (const [px, py] of pts) {
        minX = Math.min(minX, ex + px);
        minY = Math.min(minY, ey + py);
        maxX = Math.max(maxX, ex + px);
        maxY = Math.max(maxY, ey + py);
      }
    } else {
      minX = Math.min(minX, ex);
      minY = Math.min(minY, ey);
      maxX = Math.max(maxX, ex + ew);
      maxY = Math.max(maxY, ey + eh);
    }

    // Account for text that might extend beyond element bounds
    if (el.type === 'text') {
      const fontSize = el.fontSize || 20;
      const lines = (el.text || '').split('\n');
      const textWidth = Math.max(...lines.map(l => l.length * fontSize * 0.6));
      const textHeight = lines.length * fontSize * 1.35;
      maxX = Math.max(maxX, ex + textWidth);
      maxY = Math.max(maxY, ey + textHeight);
    }
  }

  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 400; maxY = 200; }
  return { minX, minY, maxX, maxY };
}

function renderElement(el) {
  const opacity = (el.opacity != null ? el.opacity / 100 : 1);
  const stroke = el.strokeColor || '#1e1e1e';
  const fill = resolveFill(el);
  const sw = el.strokeWidth || 2;
  const angle = el.angle || 0;

  const cx = (el.x || 0) + (el.width || 0) / 2;
  const cy = (el.y || 0) + (el.height || 0) / 2;
  const rotation = angle !== 0 ? ` transform="rotate(${rad2deg(angle)}, ${cx}, ${cy})"` : '';
  const opacityAttr = opacity < 1 ? ` opacity="${opacity}"` : '';

  switch (el.type) {
    case 'rectangle':
      return renderRectangle(el, stroke, fill, sw, rotation, opacityAttr);
    case 'diamond':
      return renderDiamond(el, stroke, fill, sw, rotation, opacityAttr);
    case 'ellipse':
      return renderEllipse(el, stroke, fill, sw, rotation, opacityAttr);
    case 'text':
      return renderText(el, opacityAttr);
    case 'arrow':
      return renderArrow(el, stroke, sw, opacityAttr);
    case 'line':
      return renderLine(el, stroke, sw, opacityAttr);
    default:
      return `<!-- unsupported: ${el.type} -->\n`;
  }
}

function renderRectangle(el, stroke, fill, sw, rotation, opacityAttr) {
  const x = el.x || 0;
  const y = el.y || 0;
  const w = el.width || 0;
  const h = el.height || 0;
  const r = el.roundness ? Math.min(w, h) * 0.1 : 0;
  return `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" ` +
    `fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${rotation}${opacityAttr}/>\n`;
}

function renderDiamond(el, stroke, fill, sw, rotation, opacityAttr) {
  const x = el.x || 0;
  const y = el.y || 0;
  const w = el.width || 0;
  const h = el.height || 0;
  const points = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
  return `  <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${rotation}${opacityAttr}/>\n`;
}

function renderEllipse(el, stroke, fill, sw, rotation, opacityAttr) {
  const cx = (el.x || 0) + (el.width || 0) / 2;
  const cy = (el.y || 0) + (el.height || 0) / 2;
  const rx = (el.width || 0) / 2;
  const ry = (el.height || 0) / 2;
  return `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ` +
    `fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${rotation}${opacityAttr}/>\n`;
}

function renderText(el, opacityAttr) {
  const x = el.x || 0;
  const y = el.y || 0;
  const fontSize = el.fontSize || 20;
  const color = el.strokeColor || '#1e1e1e';
  const fontFamily = resolveFontFamily(el.fontFamily);
  const textAnchor = resolveTextAnchor(el.textAlign);
  const lines = (el.text || '').split('\n');
  const lineHeight = fontSize * 1.35;

  // Adjust x for alignment
  let ax = x;
  if (el.textAlign === 'center') ax = x + (el.width || 0) / 2;
  else if (el.textAlign === 'right') ax = x + (el.width || 0);

  let svg = `  <text x="${ax}" y="${y + fontSize}" font-size="${fontSize}" ` +
    `font-family="${esc(fontFamily)}" fill="${color}" text-anchor="${textAnchor}"${opacityAttr}>\n`;
  for (let i = 0; i < lines.length; i++) {
    svg += `    <tspan x="${ax}" dy="${i === 0 ? 0 : lineHeight}">${esc(lines[i])}</tspan>\n`;
  }
  svg += `  </text>\n`;
  return svg;
}

function renderArrow(el, stroke, sw, opacityAttr) {
  const x = el.x || 0;
  const y = el.y || 0;
  const pts = el.points || [[0, 0]];
  if (pts.length < 2) return '';

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x + p[0]},${y + p[1]}`).join(' ');
  const startArrow = el.startArrowhead ? ' marker-start="url(#arrowhead-rev)"' : '';
  const endArrow = el.endArrowhead !== 'none' ? ' marker-end="url(#arrowhead)"' : '';
  return `  <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}"${startArrow}${endArrow}${opacityAttr}/>\n`;
}

function renderLine(el, stroke, sw, opacityAttr) {
  const x = el.x || 0;
  const y = el.y || 0;
  const pts = el.points || [[0, 0]];
  if (pts.length < 2) return '';

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x + p[0]},${y + p[1]}`).join(' ');
  return `  <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}"${opacityAttr}/>\n`;
}

// ── Helpers ──

function resolveFill(el) {
  if (!el.backgroundColor || el.backgroundColor === 'transparent') return 'none';
  if (el.fillStyle === 'solid') return el.backgroundColor;
  // For hachure/cross-hatch, approximate with semi-transparent fill
  return el.backgroundColor + '88';
}

function resolveFontFamily(code) {
  switch (code) {
    case 1: return 'Virgil, cursive, sans-serif';
    case 2: return 'Helvetica, Arial, sans-serif';
    case 3: return 'Cascadia, monospace';
    default: return 'Helvetica, Arial, sans-serif';
  }
}

function resolveTextAnchor(align) {
  switch (align) {
    case 'center': return 'middle';
    case 'right': return 'end';
    default: return 'start';
  }
}

function rad2deg(rad) {
  return (rad * 180 / Math.PI).toFixed(2);
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
