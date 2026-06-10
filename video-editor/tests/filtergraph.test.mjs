import test from 'node:test';
import assert from 'node:assert/strict';

import { buildExportArgs, buildFiltergraph } from '../js/exporter/filtergraph.js';

function state(overrides = {}) {
  return {
    video: { width: 1920, height: 1080, duration: 20 },
    trim: { start: 0, end: 20 },
    crop: { x: 0, y: 0, width: 1, height: 1 },
    rotation: 0,
    filter: 'original',
    overlays: [],
    ...overrides,
  };
}

test('buildFiltergraph includes pixel crop when percent crop differs from full frame', () => {
  const graph = buildFiltergraph(state({ crop: { x: 0.1, y: 0.2, width: 0.5, height: 0.25 } }));

  assert.equal(graph, 'crop=960:270:192:216');
});

test('buildFiltergraph maps rotations to deterministic transpose filters', () => {
  assert.equal(buildFiltergraph(state({ rotation: 90 })), 'transpose=2');
  assert.equal(buildFiltergraph(state({ rotation: 180 })), 'transpose=2,transpose=2');
  assert.equal(buildFiltergraph(state({ rotation: 270 })), 'transpose=1');
});

test('buildFiltergraph maps warm filter to deterministic FFmpeg filters', () => {
  assert.equal(buildFiltergraph(state({ filter: 'warm' })), 'eq=saturation=1.08:gamma_r=1.08:gamma_b=0.92');
});

test('buildFiltergraph includes drawtext overlay with percent position and enable window', () => {
  const graph = buildFiltergraph(state({
    overlays: [{
      type: 'text',
      text: 'Hello world',
      x: 0.25,
      y: 0.5,
      fontSize: 42,
      color: '#ffcc00',
      startTime: 1.5,
      endTime: 4,
    }],
  }));

  assert.equal(
    graph,
    "drawtext=text='Hello world':x=480:y=540:fontsize=42:fontcolor=#ffcc00:expansion=none:enable='between(t,1.5,4)'",
  );
});

test('buildFiltergraph includes deterministic mosaic pixelation overlay', () => {
  const graph = buildFiltergraph(state({
    overlays: [{ type: 'mosaic', x: 0.1, y: 0.2, width: 0.3, height: 0.4, startTime: 2, endTime: 6 }],
  }));

  assert.equal(
    graph,
    "split[base0][pix0];[pix0]crop=576:432:192:216,scale=58:43,scale=576:432:flags=neighbor[pixout0];[base0][pixout0]overlay=192:216:enable='between(t,2,6)'",
  );
});

test('buildExportArgs puts trim and input first, filter before MP4 codecs, and output last', () => {
  const exportState = state({ trim: { start: 3, end: 8 }, rotation: 270 });

  assert.deepEqual(buildExportArgs(exportState, 'input.mp4', 'output.mp4'), [
    '-ss', '3',
    '-to', '8',
    '-i', 'input.mp4',
    '-vf', 'transpose=1',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    'output.mp4',
  ]);
});

test('buildFiltergraph escapes drawtext content safely for FFmpeg filter strings', () => {
  const graph = buildFiltergraph(state({
    overlays: [{ type: 'text', text: "a\\b:c'd", x: 0, y: 0, start: 0, end: 2 }],
  }));

  assert.match(graph, /text='a\\\\b\\:c\\'d'/);
});

test('buildExportArgs uses filter_complex with mapped optional audio and MP4 codecs for mosaic overlays', () => {
  const exportState = state({
    overlays: [{ type: 'mosaic', x: 0.1, y: 0.2, width: 0.3, height: 0.4, startTime: 2, endTime: 6 }],
  });
  const args = buildExportArgs(exportState, 'input.mp4', 'output.mp4');

  assert.equal(args.includes('-vf'), false);
  assert.deepEqual(args.slice(0, 6), ['-ss', '0', '-to', '20', '-i', 'input.mp4']);
  assert.equal(args[6], '-filter_complex');
  assert.equal(args[7].endsWith('[vout]'), true);
  assert.deepEqual(args.slice(8), [
    '-map', '[vout]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    'output.mp4',
  ]);
});

test('buildExportArgs keeps simple vf path with WebM codecs for non-mosaic overlays', () => {
  const exportState = state({
    overlays: [{ type: 'text', text: 'Simple', x: 0.1, y: 0.2, startTime: 2, endTime: 6 }],
  });
  const args = buildExportArgs(exportState, 'input.mp4', 'output.webm');

  assert.equal(args.includes('-filter_complex'), false);
  assert.deepEqual(args, [
    '-ss', '0',
    '-to', '20',
    '-i', 'input.mp4',
    '-vf', "drawtext=text='Simple':x=192:y=216:fontsize=32:fontcolor=#ffffff:expansion=none:enable='between(t,2,6)'",
    '-c:v', 'libvpx-vp9',
    '-c:a', 'libopus',
    'output.webm',
  ]);
});

test('buildFiltergraph falls back from unsafe user-controlled colors', () => {
  const graph = buildFiltergraph(state({
    overlays: [
      { type: 'text', text: 'Text', color: 'red;movie=evil', x: 0, y: 0 },
      { type: 'shape', color: '#abc', x: 0, y: 0, width: 0.1, height: 0.1 },
      { type: 'brush', color: 'blue@0.5', points: [{ x: 0.5, y: 0.5 }] },
      { type: 'shape', color: '#11223344', x: 0.2, y: 0.2, width: 0.1, height: 0.1 },
    ],
  }));

  assert.match(graph, /fontcolor=#ffffff/);
  assert.match(graph, /drawbox=x=0:y=0:w=192:h=108:color=#198cff:t=4/);
  assert.match(graph, /drawbox=x=956:y=536:w=8:h=8:color=#198cff:t=fill/);
  assert.match(graph, /drawbox=x=384:y=216:w=192:h=108:color=#11223344:t=4/);
});

test('buildFiltergraph disables drawtext expansion and escapes dangerous text literally', () => {
  const dangerousText = String.raw`100% %{localtime}, semi; [box] back\ slash "double" colon: single'`;
  const graph = buildFiltergraph(state({
    overlays: [{ type: 'text', text: dangerousText, x: 0, y: 0, color: '#12345678' }],
  }));

  assert.match(graph, /:expansion=none:/);
  assert.equal(
    graph.includes(String.raw`text='100% %\{localtime\}\, semi\; \[box\] back\\ slash "double" colon\: single\''`),
    true,
  );
  assert.match(graph, /fontcolor=#12345678/);
});

test('buildFiltergraph returns empty string and export args omit -vf when no filters apply', () => {
  const noFilterState = state();

  assert.equal(buildFiltergraph(noFilterState), '');
  assert.deepEqual(buildExportArgs(noFilterState, 'in.mov', 'out.mp4'), [
    '-ss', '0',
    '-to', '20',
    '-i', 'in.mov',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    'out.mp4',
  ]);
});
