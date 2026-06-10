import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createPreviewCanvas } from '../js/preview-canvas.js';
import { BrushTool } from '../js/tools/BrushTool.js';
import { MosaicTool } from '../js/tools/MosaicTool.js';
import { ShapeTool } from '../js/tools/ShapeTool.js';
import { TextTool } from '../js/tools/TextTool.js';

const testDir = dirname(fileURLToPath(import.meta.url));
const editorRoot = resolve(testDir, '..');

function createRecordingContext() {
  const calls = [];
  const context = {
    calls,
    clearRect(...args) { calls.push(['clearRect', ...args]); },
    strokeRect(...args) { calls.push(['strokeRect', ...args]); },
    fillRect(...args) { calls.push(['fillRect', ...args]); },
    beginPath() { calls.push(['beginPath']); },
    moveTo(...args) { calls.push(['moveTo', ...args]); },
    lineTo(...args) { calls.push(['lineTo', ...args]); },
    stroke() { calls.push(['stroke']); },
    fillText(...args) { calls.push(['fillText', ...args]); },
    ellipse(...args) { calls.push(['ellipse', ...args]); },
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    setLineDash(value) { calls.push(['setLineDash', value]); },
  };

  return context;
}

function createCanvas(context) {
  return {
    width: 200,
    height: 100,
    style: {},
    getContext() {
      return context;
    },
    getBoundingClientRect() {
      return { left: 10, top: 20, width: 200, height: 100 };
    },
  };
}

function createPreview(context = createRecordingContext()) {
  const preview = createPreviewCanvas();
  preview.init(createCanvas(context), { style: {} });
  return { preview, context };
}

function createState(overlays = []) {
  return {
    video: { duration: 10 },
    trim: { start: 1, end: 9 },
    crop: { x: 0.1, y: 0.2, width: 0.5, height: 0.4 },
    overlays,
    nextOverlayId: overlays.length + 1,
  };
}

test('property bar exposes a dedicated tool-specific options container', () => {
  const html = readFileSync(resolve(editorRoot, 'index.html'), 'utf8');
  const toolOptionsStart = html.indexOf('id="toolOptions"');
  const toolSpecificStart = html.indexOf('id="toolSpecificOptions"');

  assert.ok(toolOptionsStart > -1, 'generic tool options container should exist');
  assert.ok(toolSpecificStart > toolOptionsStart, 'tool-specific container should be nested after generic controls');
  assert.match(html, /id="startTime"[\s\S]*id="endTime"[\s\S]*id="toolSpecificOptions"/);
});

test('preview canvas remains pointer-interactive for overlay tools', () => {
  const css = readFileSync(resolve(editorRoot, 'css/components/_preview.css'), 'utf8');
  const canvasRules = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)]
    .filter(([, selector]) => selector.includes('.c-preview__canvas'))
    .map(([, selector, body]) => `${selector}{${body}}`)
    .join('\n');

  assert.doesNotMatch(canvasRules, /pointer-events\s*:\s*none/i);
});

test('drawState clears canvas, draws crop, and renders only active overlays in percentage coordinates', () => {
  const { preview, context } = createPreview();
  const state = createState([
    { type: 'brush', startTime: 2, endTime: 5, color: '#f00', lineWidth: 4, points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }] },
    { type: 'text', startTime: 2, endTime: 5, text: 'Hello', color: '#00f', fontSize: 16, x: 0.5, y: 0.25 },
    { type: 'mosaic', startTime: 6, endTime: 8, x: 0.2, y: 0.2, width: 0.2, height: 0.2, blockSize: 12 },
    { type: 'shape', shape: 'ellipse', startTime: 2, endTime: 5, color: '#0f0', lineWidth: 3, x: 0.25, y: 0.2, width: 0.25, height: 0.4 },
  ]);

  preview.drawState(state, 3);

  assert.deepEqual(context.calls[0], ['clearRect', 0, 0, 200, 100]);
  assert.ok(context.calls.some((call) => call[0] === 'strokeRect' && call[1] === 20 && call[2] === 20 && call[3] === 100 && call[4] === 40));
  assert.ok(context.calls.some((call) => call[0] === 'moveTo' && call[1] === 20 && call[2] === 20));
  assert.ok(context.calls.some((call) => call[0] === 'lineTo' && call[1] === 60 && call[2] === 40));
  assert.ok(context.calls.some((call) => call[0] === 'fillText' && call[1] === 'Hello' && call[2] === 100 && call[3] === 25));
  assert.ok(context.calls.some((call) => call[0] === 'ellipse' && call[1] === 75 && call[2] === 40 && call[3] === 25 && call[4] === 20));
  assert.equal(context.calls.some((call) => call[0] === 'fillRect'), false);
});

test('BrushTool commits a non-empty percent path from pointer drag', () => {
  const { preview } = createPreview();
  const committed = [];
  const tool = new BrushTool({ getCurrentTime: () => 2, commit: (updater) => committed.push(updater(createState())) });

  tool.onPointerDown({ clientX: 30, clientY: 40 }, { previewCanvas: preview, state: createState() });
  tool.onPointerMove({ clientX: 70, clientY: 60 }, { previewCanvas: preview, state: createState() });
  tool.onPointerUp({ clientX: 70, clientY: 60 }, { previewCanvas: preview, state: createState() });

  assert.equal(committed.length, 1);
  assert.deepEqual(committed[0].overlays[0], {
    id: 'overlay-1',
    type: 'brush',
    color: '#198cff',
    lineWidth: 8,
    startTime: 2,
    endTime: 9,
    points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
  });
});

test('TextTool commits configured text at the pointer location', () => {
  const { preview } = createPreview();
  let nextState = null;
  const tool = new TextTool({ getCurrentTime: () => 4, commit: (updater) => { nextState = updater(createState()); } });
  tool.text = 'Caption';
  tool.color = '#123456';
  tool.fontSize = 24;
  tool.onPointerDown({ clientX: 110, clientY: 45 }, { previewCanvas: preview, state: createState() });

  assert.deepEqual(nextState.overlays[0], {
    id: 'overlay-1',
    type: 'text',
    text: 'Caption',
    color: '#123456',
    fontSize: 24,
    startTime: 4,
    endTime: 9,
    x: 0.5,
    y: 0.25,
  });
});

test('TextTool normalizes committed overlay times to the video duration', () => {
  const { preview } = createPreview();
  let nextState = null;
  const state = createState();
  const tool = new TextTool({ getCurrentTime: () => 15, commit: (updater) => { nextState = updater(state); } });

  tool.onPointerDown({ clientX: 110, clientY: 45 }, { previewCanvas: preview, state });

  assert.equal(nextState.overlays[0].startTime, 9);
  assert.equal(nextState.overlays[0].endTime, 10);
});

test('BrushTool uses duration as overlay end when current time is outside trim end', () => {
  const { preview } = createPreview();
  let nextState = null;
  const state = { ...createState(), trim: { start: 1, end: 5 } };
  const tool = new BrushTool({ getCurrentTime: () => 8, commit: (updater) => { nextState = updater(state); } });

  tool.onPointerDown({ clientX: 30, clientY: 40 }, { previewCanvas: preview, state });
  tool.onPointerUp({ clientX: 70, clientY: 60 }, { previewCanvas: preview, state });

  assert.equal(nextState.overlays[0].startTime, 5);
  assert.equal(nextState.overlays[0].endTime, 10);
});

test('MosaicTool commits normalized percent rectangles and rejects zero-size rectangles', () => {
  const { preview } = createPreview();
  const committed = [];
  const tool = new MosaicTool({ getCurrentTime: () => 2, commit: (updater) => committed.push(updater(createState())) });

  tool.onPointerDown({ clientX: 170, clientY: 80 }, { previewCanvas: preview, state: createState() });
  tool.onPointerUp({ clientX: 70, clientY: 40 }, { previewCanvas: preview, state: createState() });
  tool.onPointerDown({ clientX: 30, clientY: 40 }, { previewCanvas: preview, state: createState() });
  tool.onPointerUp({ clientX: 30, clientY: 40 }, { previewCanvas: preview, state: createState() });

  assert.equal(committed.length, 1);
  assert.deepEqual(committed[0].overlays[0], {
    id: 'overlay-1',
    type: 'mosaic',
    blockSize: 12,
    startTime: 2,
    endTime: 9,
    x: 0.3,
    y: 0.2,
    width: 0.5,
    height: 0.4,
  });
});

test('ShapeTool commits normalized percent rectangles and rejects zero-size rectangles', () => {
  const { preview } = createPreview();
  const committed = [];
  const tool = new ShapeTool({ getCurrentTime: () => 3, commit: (updater) => committed.push(updater(createState())) });
  tool.shape = 'ellipse';
  tool.color = '#abcdef';
  tool.lineWidth = 7;

  tool.onPointerDown({ clientX: 170, clientY: 80 }, { previewCanvas: preview, state: createState() });
  tool.onPointerUp({ clientX: 70, clientY: 40 }, { previewCanvas: preview, state: createState() });
  tool.onPointerDown({ clientX: 30, clientY: 40 }, { previewCanvas: preview, state: createState() });
  tool.onPointerUp({ clientX: 30, clientY: 40 }, { previewCanvas: preview, state: createState() });

  assert.equal(committed.length, 1);
  assert.deepEqual(committed[0].overlays[0], {
    id: 'overlay-1',
    type: 'shape',
    shape: 'ellipse',
    color: '#abcdef',
    lineWidth: 7,
    startTime: 3,
    endTime: 9,
    x: 0.3,
    y: 0.2,
    width: 0.5,
    height: 0.4,
  });
});
