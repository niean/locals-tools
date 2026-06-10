import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createExportFilenames,
  exportVideoWithFFmpeg,
  getInputExtension,
  getOutputMimeType,
} from '../js/exporter/ffmpeg-exporter.js';

function createFile(bytes = [1, 2, 3], type = 'video/mp4') {
  return {
    type,
    async arrayBuffer() {
      return Uint8Array.from(bytes).buffer;
    },
  };
}

test('getInputExtension maps browser video MIME types to ffmpeg-safe extensions', () => {
  assert.equal(getInputExtension({ type: 'video/webm' }), 'webm');
  assert.equal(getInputExtension({ type: 'video/quicktime' }), 'mov');
  assert.equal(getInputExtension({ type: 'video/mp4' }), 'mp4');
  assert.equal(getInputExtension({ type: 'video/x-matroska' }), 'mp4');
  assert.equal(getInputExtension(null), 'mp4');
});

test('getOutputMimeType maps selected format extensions to Blob MIME types', () => {
  assert.equal(getOutputMimeType('webm'), 'video/webm');
  assert.equal(getOutputMimeType('mp4'), 'video/mp4');
  assert.equal(getOutputMimeType('video/webm'), 'video/webm');
  assert.equal(getOutputMimeType('video/mp4'), 'video/mp4');
  assert.equal(getOutputMimeType('unexpected'), 'video/mp4');
});

test('createExportFilenames uses input and output extensions', () => {
  assert.deepEqual(createExportFilenames({ type: 'video/quicktime' }, 'webm'), {
    inputName: 'input.mov',
    outputName: 'output.webm',
  });
});

test('exportVideoWithFFmpeg writes input, runs built args, cleans files, and returns typed Blob', async () => {
  const calls = [];
  const ffmpeg = {
    loaded: false,
    on(event, callback) {
      calls.push(['on', event, typeof callback]);
    },
    async load(config) {
      calls.push(['load', config]);
      this.loaded = true;
    },
    async writeFile(name, bytes) {
      calls.push(['writeFile', name, [...bytes]]);
    },
    async exec(args) {
      calls.push(['exec', args]);
      return 0;
    },
    async readFile(name) {
      calls.push(['readFile', name]);
      return Uint8Array.from([9, 8, 7]);
    },
    async deleteFile(name) {
      calls.push(['deleteFile', name]);
    },
  };
  const progress = [];

  const blob = await exportVideoWithFFmpeg({
    ffmpeg,
    state: { video: { file: createFile([4, 5, 6], 'video/webm') } },
    outputFormat: 'webm',
    onProgress(value) {
      progress.push(value);
    },
    buildArgs(_state, inputName, outputName) {
      return ['-i', inputName, outputName];
    },
    runtimePaths: {
      coreURL: '/vendor/ffmpeg/ffmpeg-core.js',
      wasmURL: '/vendor/ffmpeg/ffmpeg-core.wasm',
      classWorkerURL: '/vendor/ffmpeg/worker.js',
    },
  });

  assert.equal(blob.type, 'video/webm');
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), Uint8Array.from([9, 8, 7]));
  assert.deepEqual(progress, [0.02, 0.08, 0.96, 1]);
  assert.deepEqual(calls, [
    ['on', 'progress', 'function'],
    ['on', 'log', 'function'],
    ['load', {
      coreURL: '/vendor/ffmpeg/ffmpeg-core.js',
      wasmURL: '/vendor/ffmpeg/ffmpeg-core.wasm',
      classWorkerURL: '/vendor/ffmpeg/worker.js',
    }],
    ['writeFile', 'input.webm', [4, 5, 6]],
    ['exec', ['-i', 'input.webm', 'output.webm']],
    ['readFile', 'output.webm'],
    ['deleteFile', 'input.webm'],
    ['deleteFile', 'output.webm'],
  ]);
});

test('exportVideoWithFFmpeg cleans temporary files when ffmpeg execution fails', async () => {
  const calls = [];
  const ffmpeg = {
    loaded: true,
    on() {},
    async writeFile(name) {
      calls.push(['writeFile', name]);
    },
    async exec() {
      calls.push(['exec']);
      return 1;
    },
    async readFile() {
      throw new Error('should not read failed output');
    },
    async deleteFile(name) {
      calls.push(['deleteFile', name]);
    },
  };

  await assert.rejects(
    exportVideoWithFFmpeg({
      ffmpeg,
      state: { video: { file: createFile() } },
      outputFormat: 'mp4',
      buildArgs: (_state, inputName, outputName) => ['-i', inputName, outputName],
    }),
    /FFmpeg export failed with exit code 1/,
  );

  assert.deepEqual(calls, [
    ['writeFile', 'input.mp4'],
    ['exec'],
    ['deleteFile', 'input.mp4'],
    ['deleteFile', 'output.mp4'],
  ]);
});

test('exportVideoWithFFmpeg propagates load errors without writing or downloading output', async () => {
  const calls = [];
  const loadError = new Error('load failed');
  const ffmpeg = {
    loaded: false,
    on() {},
    async load() {
      calls.push(['load']);
      throw loadError;
    },
    async writeFile() {
      calls.push(['writeFile']);
    },
    async exec() {
      calls.push(['exec']);
      return 0;
    },
    async readFile() {
      calls.push(['readFile']);
      return Uint8Array.from([1]);
    },
    async deleteFile(name) {
      calls.push(['deleteFile', name]);
    },
  };

  await assert.rejects(
    exportVideoWithFFmpeg({
      ffmpeg,
      state: { video: { file: createFile() } },
      outputFormat: 'mp4',
      buildArgs: (_state, inputName, outputName) => ['-i', inputName, outputName],
    }),
    loadError,
  );

  assert.deepEqual(calls, [
    ['load'],
    ['deleteFile', 'input.mp4'],
    ['deleteFile', 'output.mp4'],
  ]);
});

test('exportVideoWithFFmpeg propagates writeFile errors without executing or downloading output', async () => {
  const calls = [];
  const writeError = new Error('write failed');
  const ffmpeg = {
    loaded: true,
    on() {},
    async writeFile(name) {
      calls.push(['writeFile', name]);
      throw writeError;
    },
    async exec() {
      calls.push(['exec']);
      return 0;
    },
    async readFile() {
      calls.push(['readFile']);
      return Uint8Array.from([1]);
    },
    async deleteFile(name) {
      calls.push(['deleteFile', name]);
    },
  };

  await assert.rejects(
    exportVideoWithFFmpeg({
      ffmpeg,
      state: { video: { file: createFile() } },
      outputFormat: 'mp4',
      buildArgs: (_state, inputName, outputName) => ['-i', inputName, outputName],
    }),
    writeError,
  );

  assert.deepEqual(calls, [
    ['writeFile', 'input.mp4'],
    ['deleteFile', 'input.mp4'],
    ['deleteFile', 'output.mp4'],
  ]);
});

test('exportVideoWithFFmpeg propagates readFile errors after execution and cleanup', async () => {
  const calls = [];
  const readError = new Error('read failed');
  const ffmpeg = {
    loaded: true,
    on() {},
    async writeFile(name) {
      calls.push(['writeFile', name]);
    },
    async exec() {
      calls.push(['exec']);
      return 0;
    },
    async readFile(name) {
      calls.push(['readFile', name]);
      throw readError;
    },
    async deleteFile(name) {
      calls.push(['deleteFile', name]);
    },
  };

  await assert.rejects(
    exportVideoWithFFmpeg({
      ffmpeg,
      state: { video: { file: createFile() } },
      outputFormat: 'mp4',
      buildArgs: (_state, inputName, outputName) => ['-i', inputName, outputName],
    }),
    readError,
  );

  assert.deepEqual(calls, [
    ['writeFile', 'input.mp4'],
    ['exec'],
    ['readFile', 'output.mp4'],
    ['deleteFile', 'input.mp4'],
    ['deleteFile', 'output.mp4'],
  ]);
});
