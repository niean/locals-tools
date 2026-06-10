import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getActiveOverlays,
  getTimelinePercent,
  normalizeOverlayTimes,
} from '../js/timeline.js';
import { formatPercent, formatTime } from '../js/utils/format.js';

test('getActiveOverlays returns overlays active at inclusive start and end times', () => {
  const overlays = [
    { id: 'before', startTime: 0, endTime: 4.9 },
    { id: 'start', startTime: 5, endTime: 8 },
    { id: 'middle', startTime: 3, endTime: 7 },
    { id: 'end', startTime: 2, endTime: 5 },
    { id: 'after', startTime: 5.1, endTime: 9 },
  ];

  assert.deepEqual(
    getActiveOverlays(overlays, 5).map((overlay) => overlay.id),
    ['start', 'middle', 'end'],
  );
});

test('getTimelinePercent returns a clamped percent and zero for missing or invalid duration', () => {
  assert.equal(getTimelinePercent(25, 100), 25);
  assert.equal(getTimelinePercent(-10, 100), 0);
  assert.equal(getTimelinePercent(150, 100), 100);
  assert.equal(getTimelinePercent(10, 0), 0);
  assert.equal(getTimelinePercent(10), 0);
  assert.equal(getTimelinePercent(10, -100), 0);
  assert.equal(getTimelinePercent(10, Number.NaN), 0);
  assert.equal(getTimelinePercent(10, Number.POSITIVE_INFINITY), 0);
  assert.equal(getTimelinePercent(10, Number.NEGATIVE_INFINITY), 0);
  assert.equal(getTimelinePercent(Number.NaN, 100), 0);
  assert.equal(getTimelinePercent(Number.POSITIVE_INFINITY, 100), 100);
  assert.equal(getTimelinePercent(Number.NEGATIVE_INFINITY, 100), 0);
});

test('normalizeOverlayTimes clamps times to duration and normalizes ordering', () => {
  assert.deepEqual(
    normalizeOverlayTimes({ id: 'overlay-1', startTime: 80, endTime: 20, text: 'Title' }, 100),
    { id: 'overlay-1', startTime: 20, endTime: 80, text: 'Title' },
  );
  assert.deepEqual(
    normalizeOverlayTimes({ id: 'overlay-2', startTime: -5, endTime: 150 }, 60),
    { id: 'overlay-2', startTime: 0, endTime: 60 },
  );
  assert.deepEqual(
    normalizeOverlayTimes({ id: 'overlay-3', startTime: 30, endTime: 10 }, 20),
    { id: 'overlay-3', startTime: 10, endTime: 20 },
  );
  assert.deepEqual(
    normalizeOverlayTimes({ id: 'overlay-4', startTime: 5, endTime: 10 }, -20),
    { id: 'overlay-4', startTime: 0, endTime: 0 },
  );
  assert.deepEqual(
    normalizeOverlayTimes({ id: 'overlay-5', startTime: 5, endTime: 10 }, Number.NaN),
    { id: 'overlay-5', startTime: 0, endTime: 0 },
  );
  assert.deepEqual(
    normalizeOverlayTimes({ id: 'overlay-6', startTime: 5, endTime: 10 }, Number.POSITIVE_INFINITY),
    { id: 'overlay-6', startTime: 0, endTime: 0 },
  );
});

test('formatTime renders minutes seconds and tenths', () => {
  assert.equal(formatTime(72.34), '01:12.3');
  assert.equal(formatTime(0), '00:00.0');
  assert.equal(formatTime(5.96), '00:06.0');
});

test('formatTime treats negative and non-finite inputs as zero', () => {
  assert.equal(formatTime(-1), '00:00.0');
  assert.equal(formatTime(Number.NaN), '00:00.0');
  assert.equal(formatTime(Number.POSITIVE_INFINITY), '00:00.0');
  assert.equal(formatTime(Number.NEGATIVE_INFINITY), '00:00.0');
});

test('formatPercent returns rounded percent strings', () => {
  assert.equal(formatPercent(12.4), '12%');
  assert.equal(formatPercent(12.5), '13%');
  assert.equal(formatPercent(99.9), '100%');
});
