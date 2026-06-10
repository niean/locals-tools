import test from 'node:test';
import assert from 'node:assert/strict';

import { BaseTool } from '../js/tools/BaseTool.js';
import { createPlayer } from '../js/player.js';
import { createPreviewCanvas } from '../js/preview-canvas.js';

test('BaseTool exposes no-op lifecycle methods and tracks active state', () => {
  const tool = new BaseTool({ name: 'brush' });

  assert.equal(tool.name, 'brush');
  assert.equal(tool.isActive(), false);
  assert.equal(tool.activate({ color: '#fff' }), undefined);
  assert.equal(tool.isActive(), true);
  assert.equal(tool.renderPropertyBar({}), undefined);
  assert.equal(tool.onPointerDown({}), undefined);
  assert.equal(tool.onPointerMove({}), undefined);
  assert.equal(tool.onPointerUp({}), undefined);
  assert.equal(tool.deactivate(), undefined);
  assert.equal(tool.isActive(), false);
});

test('player loads a URL and resolves metadata', async () => {
  const listeners = new Map();
  const video = {
    src: '',
    duration: 12.5,
    videoWidth: 640,
    videoHeight: 360,
    currentTime: 0,
    paused: true,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) {
        listeners.delete(type);
      }
    },
    load() {
      listeners.get('loadedmetadata')();
    },
    play() {
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
    },
  };

  const player = createPlayer();
  player.init(video);
  const metadata = await player.load('blob:clip');
  await player.play();
  player.seek(7.25);
  player.pause();

  assert.deepEqual(metadata, { duration: 12.5, width: 640, height: 360 });
  assert.equal(video.src, 'blob:clip');
  assert.equal(player.getCurrentUrl(), 'blob:clip');
  assert.equal(player.getElement(), video);
  assert.equal(player.getDuration(), 12.5);
  assert.equal(player.getCurrentTime(), 7.25);
  assert.equal(player.isPaused(), true);
});

test('preview canvas sizes stage, canvas, and coordinate conversion to video display', () => {
  const context = { clearRectCalls: [], clearRect(...args) { this.clearRectCalls.push(args); } };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext(type) {
      assert.equal(type, '2d');
      return context;
    },
    getBoundingClientRect() {
      return { left: 10, top: 20, width: 640, height: 360 };
    },
  };
  const stage = { style: {} };
  const video = { videoWidth: 1280, videoHeight: 720 };

  const preview = createPreviewCanvas();
  preview.init(canvas, stage);
  preview.resizeToVideo(video);
  preview.updateDisplaySize(video);
  const point = preview.getCanvasPoint({ clientX: 330, clientY: 200 });
  preview.clear();

  assert.equal(canvas.width, 1280);
  assert.equal(canvas.height, 720);
  assert.equal(stage.style.aspectRatio, '1280 / 720');
  assert.equal(canvas.style.aspectRatio, '1280 / 720');
  assert.deepEqual(point, { x: 640, y: 360 });
  assert.deepEqual(preview.getScale(), { x: 2, y: 2 });
  assert.equal(preview.getContext(), context);
  assert.equal(preview.getCanvas(), canvas);
  assert.deepEqual(context.clearRectCalls, [[0, 0, 1280, 720]]);
});
