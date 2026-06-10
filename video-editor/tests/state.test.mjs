import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addOverlay,
  createInitialState,
  removeOverlay,
  setActiveTool,
  setFilter,
  setRotation,
  updateCrop,
  updateOverlay,
  updateTrim,
  updateVideo,
} from '../js/state.js';
import { createHistory } from '../js/history.js';
import { getPreviewCanvasStyle, getPreviewVideoStyle } from '../js/preview-styles.js';

test('createInitialState returns default edit state from video metadata', () => {
  const state = createInitialState({ duration: 120, width: 1920, height: 1080, name: 'clip.mp4' });

  assert.deepEqual(state, {
    activeTool: 'crop',
    video: { duration: 120, width: 1920, height: 1080, name: 'clip.mp4' },
    trim: { start: 0, end: 120 },
    crop: { x: 0, y: 0, width: 1, height: 1 },
    rotation: 0,
    filter: 'original',
    overlays: [],
    nextOverlayId: 1,
  });
});

test('state update helpers return updated copies without mutating prior state', () => {
  const initial = createInitialState({ duration: 10 });

  const withTool = setActiveTool(initial, 'trim');
  const withVideo = updateVideo(withTool, { duration: 20, title: 'new' });
  const withFilter = setFilter(withVideo, 'grayscale');

  assert.equal(withTool.activeTool, 'trim');
  assert.deepEqual(withVideo.video, { duration: 20, title: 'new' });
  assert.deepEqual(withVideo.trim, { start: 0, end: 10 });
  assert.equal(withFilter.filter, 'grayscale');
  assert.equal(initial.activeTool, 'crop');
  assert.deepEqual(initial.video, { duration: 10 });
});

test('updateVideo sets trim to full duration when initially loading video duration', () => {
  const state = updateVideo(createInitialState(), { duration: 45 });

  assert.deepEqual(state.trim, { start: 0, end: 45 });
});

test('updateVideo preserves partial trim and clamps it to updated duration', () => {
  const state = updateTrim(createInitialState({ duration: 100 }), { start: 20, end: 80 });

  const sameDuration = updateVideo(state, { title: 'same duration metadata update' });
  const shorterDuration = updateVideo(state, { duration: 60 });

  assert.deepEqual(sameDuration.trim, { start: 20, end: 80 });
  assert.deepEqual(shorterDuration.trim, { start: 20, end: 60 });
});

test('updateTrim clamps trim values into duration and normalizes order', () => {
  const state = createInitialState({ duration: 100 });

  assert.deepEqual(updateTrim(state, { start: 80, end: 20 }).trim, { start: 20, end: 80 });
  assert.deepEqual(updateTrim(state, { start: -10, end: 150 }).trim, { start: 0, end: 100 });
  assert.deepEqual(updateTrim(state, { start: 25 }).trim, { start: 25, end: 100 });
  assert.deepEqual(updateTrim(state, { end: 40 }).trim, { start: 0, end: 40 });
});

test('updateCrop clamps percentage crop values to valid bounds', () => {
  const state = createInitialState({ duration: 10 });

  assert.deepEqual(
    updateCrop(state, { x: -0.5, y: 1.5, width: 2, height: -1 }).crop,
    { x: 0, y: 1, width: 1, height: 0 },
  );
  assert.deepEqual(
    updateCrop(state, { x: 0.75, y: 0.8, width: 0.5, height: 0.4 }).crop,
    { x: 0.75, y: 0.8, width: 0.25, height: 0.2 },
  );
  assert.deepEqual(
    updateCrop(state, { width: 0.25 }).crop,
    { x: 0, y: 0, width: 0.25, height: 1 },
  );
});

test('setRotation normalizes rotation to right angles', () => {
  const state = createInitialState();

  assert.equal(setRotation(state, 90).rotation, 90);
  assert.equal(setRotation(state, 450).rotation, 90);
  assert.equal(setRotation(state, -90).rotation, 270);
  assert.equal(setRotation(state, 181).rotation, 180);
  assert.equal(setRotation(state, 359).rotation, 0);
});

test('preview style helpers map rotation and filter state to CSS feedback', () => {
  assert.deepEqual(getPreviewVideoStyle({ rotation: 90, filter: 'warm' }), {
    transform: 'rotate(90deg)',
    filter: 'saturate(1.08) sepia(0.12) hue-rotate(-8deg)',
  });
  assert.deepEqual(getPreviewCanvasStyle({ rotation: 270 }), {
    transform: 'rotate(270deg)',
  });
  assert.equal(getPreviewVideoStyle({ filter: 'unknown' }).filter, 'none');
});

test('overlay helpers create deterministic ids and update/remove overlays immutably', () => {
  const initial = createInitialState();
  const first = addOverlay(initial, { type: 'text', text: 'Hello', x: 0.1 });
  const second = addOverlay(first, { type: 'text', text: 'World', y: 0.2 });
  const updated = updateOverlay(second, 'overlay-1', { text: 'Updated' });
  const removed = removeOverlay(updated, 'overlay-2');

  assert.deepEqual(first.overlays, [{ id: 'overlay-1', type: 'text', text: 'Hello', x: 0.1 }]);
  assert.equal(first.nextOverlayId, 2);
  assert.deepEqual(second.overlays.map((overlay) => overlay.id), ['overlay-1', 'overlay-2']);
  assert.equal(second.nextOverlayId, 3);
  assert.equal(updated.overlays[0].text, 'Updated');
  assert.equal(updated.overlays[1].text, 'World');
  assert.deepEqual(removed.overlays, [{ id: 'overlay-1', type: 'text', text: 'Updated', x: 0.1 }]);
  assert.deepEqual(initial.overlays, []);
});

test('createHistory stores immutable snapshots and supports undo redo reset', () => {
  const initial = createInitialState({ duration: 10 });
  const history = createHistory(initial);

  const firstCurrent = history.current();
  firstCurrent.video.duration = 999;
  assert.equal(history.current().video.duration, 10);
  assert.equal(history.canUndo(), false);
  assert.equal(history.canRedo(), false);

  const overlayState = addOverlay(initial, { type: 'text', text: 'Snapshot' });
  history.push(overlayState);
  overlayState.overlays[0].text = 'Mutated outside';
  assert.equal(history.current().overlays[0].text, 'Snapshot');
  assert.equal(history.canUndo(), true);
  assert.equal(history.canRedo(), false);

  const undone = history.undo();
  assert.deepEqual(undone.overlays, []);
  assert.equal(history.canUndo(), false);
  assert.equal(history.canRedo(), true);

  const redone = history.redo();
  assert.equal(redone.overlays[0].text, 'Snapshot');
  assert.equal(history.canUndo(), true);
  assert.equal(history.canRedo(), false);

  history.reset(createInitialState({ duration: 5 }));
  assert.deepEqual(history.current().trim, { start: 0, end: 5 });
  assert.equal(history.canUndo(), false);
  assert.equal(history.canRedo(), false);
});

test('createHistory keeps at most 50 snapshots', () => {
  const history = createHistory(createInitialState({ duration: 100 }));

  for (let index = 1; index <= 55; index += 1) {
    history.push(updateTrim(createInitialState({ duration: 100 }), { start: index, end: 100 }));
  }

  let undoCount = 0;
  while (history.canUndo()) {
    history.undo();
    undoCount += 1;
  }

  assert.equal(undoCount, 49);
  assert.deepEqual(history.current().trim, { start: 6, end: 100 });
});
