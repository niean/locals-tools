const SUPPORTED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export function validateVideoFile(file) {
  if (!file) {
    return { valid: false, error: '请选择视频文件' };
  }

  if (!SUPPORTED_VIDEO_TYPES.has(file.type)) {
    return { valid: false, error: '仅支持 MP4、WebM 或 MOV 视频文件' };
  }

  return { valid: true, error: '' };
}

export function createObjectUrl(file) {
  return URL.createObjectURL(file);
}

export function revokeObjectUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

export function getSanitizedBaseName(file) {
  const name = typeof file?.name === 'string' ? file.name : '';
  const withoutExtension = name.replace(/\.[^/.]+$/, '');
  const sanitized = withoutExtension
    .replace(/[\\/]/g, ' ')
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized || 'video';
}

export function downloadBlob(blob, filename) {
  const url = createObjectUrl(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  revokeObjectUrl(url);
}
