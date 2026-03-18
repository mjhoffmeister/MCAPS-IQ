import { describe, it, expect } from 'vitest';
import { renderToSvg } from '../renderer.js';

describe('renderToSvg', () => {
  it('returns empty-state SVG for null input', () => {
    const svg = renderToSvg(null);
    expect(svg).toContain('<svg');
    expect(svg).toContain('No elements');
  });

  it('returns empty-state SVG for empty elements array', () => {
    const svg = renderToSvg({ type: 'excalidraw', version: 2, elements: [] });
    expect(svg).toContain('No elements');
  });

  it('renders a rectangle', () => {
    const doc = {
      type: 'excalidraw',
      version: 2,
      elements: [{
        id: 'r1', type: 'rectangle',
        x: 10, y: 20, width: 200, height: 100,
        strokeColor: '#1e1e1e', backgroundColor: '#a5d8ff',
        fillStyle: 'solid', strokeWidth: 2, opacity: 100,
        angle: 0, isDeleted: false,
      }]
    };
    const svg = renderToSvg(doc);
    expect(svg).toContain('<rect');
    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="100"');
    expect(svg).toContain('fill="#a5d8ff"');
    expect(svg).toContain('stroke="#1e1e1e"');
  });

  it('renders a diamond', () => {
    const doc = {
      type: 'excalidraw',
      version: 2,
      elements: [{
        id: 'd1', type: 'diamond',
        x: 50, y: 50, width: 120, height: 80,
        strokeColor: '#000', backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1, opacity: 100,
        angle: 0, isDeleted: false,
      }]
    };
    const svg = renderToSvg(doc);
    expect(svg).toContain('<polygon');
  });

  it('renders an ellipse', () => {
    const doc = {
      type: 'excalidraw',
      version: 2,
      elements: [{
        id: 'e1', type: 'ellipse',
        x: 0, y: 0, width: 100, height: 60,
        strokeColor: '#333', backgroundColor: '#ffc9c9',
        fillStyle: 'solid', strokeWidth: 2, opacity: 100,
        angle: 0, isDeleted: false,
      }]
    };
    const svg = renderToSvg(doc);
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('rx="50"');
    expect(svg).toContain('ry="30"');
  });

  it('renders text', () => {
    const doc = {
      type: 'excalidraw',
      version: 2,
      elements: [{
        id: 't1', type: 'text',
        x: 10, y: 10, width: 200, height: 30,
        text: 'Hello World', fontSize: 20, fontFamily: 2,
        textAlign: 'left', strokeColor: '#1e1e1e',
        opacity: 100, angle: 0, isDeleted: false,
      }]
    };
    const svg = renderToSvg(doc);
    expect(svg).toContain('<text');
    expect(svg).toContain('Hello World');
    expect(svg).toContain('font-size="20"');
  });

  it('renders multiline text with tspan', () => {
    const doc = {
      type: 'excalidraw',
      version: 2,
      elements: [{
        id: 't2', type: 'text',
        x: 0, y: 0, width: 200, height: 60,
        text: 'Line 1\nLine 2\nLine 3', fontSize: 16, fontFamily: 2,
        textAlign: 'center', strokeColor: '#000',
        opacity: 100, angle: 0, isDeleted: false,
      }]
    };
    const svg = renderToSvg(doc);
    expect(svg).toContain('<tspan');
    expect(svg).toContain('Line 1');
    expect(svg).toContain('Line 2');
    expect(svg).toContain('Line 3');
    expect(svg).toContain('text-anchor="middle"');
  });

  it('renders an arrow with arrowhead', () => {
    const doc = {
      type: 'excalidraw',
      version: 2,
      elements: [{
        id: 'a1', type: 'arrow',
        x: 10, y: 10, width: 200, height: 0,
        points: [[0, 0], [200, 0]],
        strokeColor: '#1e1e1e', strokeWidth: 2,
        endArrowhead: 'arrow', startArrowhead: null,
        opacity: 100, angle: 0, isDeleted: false,
      }]
    };
    const svg = renderToSvg(doc);
    expect(svg).toContain('<path');
    expect(svg).toContain('marker-end="url(#arrowhead)"');
    expect(svg).toContain('<marker id="arrowhead"');
  });

  it('renders a line', () => {
    const doc = {
      type: 'excalidraw',
      version: 2,
      elements: [{
        id: 'l1', type: 'line',
        x: 0, y: 0, width: 100, height: 100,
        points: [[0, 0], [50, 50], [100, 0]],
        strokeColor: '#333', strokeWidth: 1,
        opacity: 100, angle: 0, isDeleted: false,
      }]
    };
    const svg = renderToSvg(doc);
    expect(svg).toContain('<path');
    expect(svg).toContain('M0,0');
    expect(svg).toContain('L50,50');
    expect(svg).toContain('L100,0');
  });

  it('skips deleted elements', () => {
    const doc = {
      type: 'excalidraw',
      version: 2,
      elements: [
        {
          id: 'vis', type: 'rectangle',
          x: 0, y: 0, width: 100, height: 50,
          strokeColor: '#000', backgroundColor: 'transparent',
          fillStyle: 'solid', strokeWidth: 1, opacity: 100,
          angle: 0, isDeleted: false,
        },
        {
          id: 'del', type: 'rectangle',
          x: 200, y: 200, width: 100, height: 50,
          strokeColor: '#f00', backgroundColor: 'transparent',
          fillStyle: 'solid', strokeWidth: 1, opacity: 100,
          angle: 0, isDeleted: true,
        }
      ]
    };
    const svg = renderToSvg(doc);
    // Should contain the visible element but not the deleted one's color
    expect(svg).toContain('stroke="#000"');
    expect(svg).not.toContain('stroke="#f00"');
  });

  it('handles rotation via transform', () => {
    const doc = {
      type: 'excalidraw',
      version: 2,
      elements: [{
        id: 'rot', type: 'rectangle',
        x: 50, y: 50, width: 100, height: 60,
        strokeColor: '#000', backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1,
        opacity: 100, angle: Math.PI / 4, isDeleted: false,
      }]
    };
    const svg = renderToSvg(doc);
    expect(svg).toContain('transform="rotate(');
  });

  it('handles reduced opacity', () => {
    const doc = {
      type: 'excalidraw',
      version: 2,
      elements: [{
        id: 'op', type: 'rectangle',
        x: 0, y: 0, width: 50, height: 50,
        strokeColor: '#000', backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1,
        opacity: 50, angle: 0, isDeleted: false,
      }]
    };
    const svg = renderToSvg(doc);
    expect(svg).toContain('opacity="0.5"');
  });

  it('handles hachure fill as semi-transparent', () => {
    const doc = {
      type: 'excalidraw',
      version: 2,
      elements: [{
        id: 'h1', type: 'rectangle',
        x: 0, y: 0, width: 100, height: 100,
        strokeColor: '#000', backgroundColor: '#ff0000',
        fillStyle: 'hachure', strokeWidth: 1,
        opacity: 100, angle: 0, isDeleted: false,
      }]
    };
    const svg = renderToSvg(doc);
    // Hachure uses semi-transparent approximation
    expect(svg).toContain('fill="#ff000088"');
  });
});
