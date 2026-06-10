import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createObjectUrl,
  downloadBlob,
  getSanitizedBaseName,
  revokeObjectUrl,
  validateVideoFile,
} from '../js/utils/file.js';

test('validateVideoFile accepts supported browser video formats', () => {
  assert.equal(validateVideoFile({ type: 'video/mp4' }).valid, true);
  assert.equal(validateVideoFile({ type: 'video/webm' }).valid, true);
  assert.equal(validateVideoFile({ type: 'video/quicktime' }).valid, true);
});

test('validateVideoFile rejects missing files and unsupported formats', () => {
  assert.deepEqual(validateVideoFile(null), { valid: false, error: '请选择视频文件' });
  assert.deepEqual(validateVideoFile({ type: 'video/x-msvideo' }), {
    valid: false,
    error: '仅支持 MP4、WebM 或 MOV 视频文件',
  });
});

test('object URL helpers delegate to URL APIs', () => {
  const calls = [];
  const originalUrl = globalThis.URL;

  globalThis.URL = {
    createObjectURL(file) {
      calls.push(['create', file.name]);
      return `blob:${file.name}`;
    },
    revokeObjectURL(url) {
      calls.push(['revoke', url]);
    },
  };

  try {
    const url = createObjectUrl({ name: 'clip.mp4' });
    revokeObjectUrl(url);
    revokeObjectUrl('');

    assert.equal(url, 'blob:clip.mp4');
    assert.deepEqual(calls, [['create', 'clip.mp4'], ['revoke', 'blob:clip.mp4']]);
  } finally {
    globalThis.URL = originalUrl;
  }
});

test('getSanitizedBaseName removes extension and unsafe filename characters', () => {
  assert.equal(getSanitizedBaseName({ name: 'Summer Trip.mov' }), 'Summer_Trip');
  assert.equal(getSanitizedBaseName({ name: '../秘密 视频!.mp4' }), '秘密_视频');
  assert.equal(getSanitizedBaseName({ name: '***.webm' }), 'video');
  assert.equal(getSanitizedBaseName({}), 'video');
});

test('downloadBlob creates a temporary link and clicks it', () => {
  const events = [];
  const originalUrl = globalThis.URL;
  const originalDocument = globalThis.document;

  globalThis.URL = {
    createObjectURL(blob) {
      events.push(['create', blob.type]);
      return 'blob:download';
    },
    revokeObjectURL(url) {
      events.push(['revoke', url]);
    },
  };

  const link = {
    href: '',
    download: '',
    click() {
      events.push(['click', this.href, this.download]);
    },
    remove() {
      events.push(['remove']);
    },
  };

  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, 'a');
      return link;
    },
    body: {
      appendChild(node) {
        assert.equal(node, link);
        events.push(['append']);
      },
    },
  };

  try {
    downloadBlob({ type: 'video/webm' }, 'clip.webm');

    assert.deepEqual(events, [
      ['create', 'video/webm'],
      ['append'],
      ['click', 'blob:download', 'clip.webm'],
      ['remove'],
      ['revoke', 'blob:download'],
    ]);
  } finally {
    globalThis.URL = originalUrl;
    globalThis.document = originalDocument;
  }
});
