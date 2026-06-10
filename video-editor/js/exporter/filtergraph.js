const FILTERS = {
  vivid: 'eq=saturation=1.35:contrast=1.08:brightness=0.02',
  warm: 'eq=saturation=1.08:gamma_r=1.08:gamma_b=0.92',
  cool: 'eq=saturation=1.05:gamma_r=0.92:gamma_b=1.08',
  mono: 'hue=s=0',
};

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveInteger(value, fallback = 1) {
  return Math.max(1, Math.round(finiteNumber(value, fallback)));
}

function percentToPixels(value, total) {
  return Math.round(finiteNumber(value) * positiveInteger(total));
}

function getVideoSize(state = {}) {
  return {
    width: positiveInteger(state.video?.width),
    height: positiveInteger(state.video?.height),
  };
}

function isFullFrameCrop(crop = {}) {
  return (
    finiteNumber(crop.x) === 0
    && finiteNumber(crop.y) === 0
    && finiteNumber(crop.width, 1) === 1
    && finiteNumber(crop.height, 1) === 1
  );
}

function buildCropFilter(state) {
  const crop = state.crop ?? { x: 0, y: 0, width: 1, height: 1 };

  if (isFullFrameCrop(crop)) {
    return '';
  }

  const { width, height } = getVideoSize(state);
  const cropWidth = percentToPixels(crop.width, width);
  const cropHeight = percentToPixels(crop.height, height);
  const cropX = percentToPixels(crop.x, width);
  const cropY = percentToPixels(crop.y, height);

  return `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`;
}

function buildRotationFilters(rotation) {
  const normalized = ((Math.round(finiteNumber(rotation) / 90) * 90) % 360 + 360) % 360;

  if (normalized === 90) {
    return ['transpose=2'];
  }

  if (normalized === 180) {
    return ['transpose=2', 'transpose=2'];
  }

  if (normalized === 270) {
    return ['transpose=1'];
  }

  return [];
}

function timeValue(value, fallback) {
  return String(finiteNumber(value, fallback));
}

function enableFilter(overlay = {}) {
  const start = timeValue(overlay.startTime ?? overlay.start, 0);
  const end = timeValue(overlay.endTime ?? overlay.end, Number.MAX_SAFE_INTEGER);

  return `enable='between(t,${start},${end})'`;
}

function safeColor(value, fallback) {
  const color = String(value ?? '');

  return /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(color) ? color : fallback;
}

function escapeDrawtextText(text = '') {
  return String(text)
    .replaceAll('\\', '\\\\')
    .replaceAll(':', '\\:')
    .replaceAll("'", "\\'")
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll('{', '\\{')
    .replaceAll('}', '\\}');
}

function buildTextOverlay(overlay, state) {
  const { width, height } = getVideoSize(state);
  const x = percentToPixels(overlay.x, width);
  const y = percentToPixels(overlay.y, height);
  const fontSize = positiveInteger(overlay.fontSize, 32);
  const color = safeColor(overlay.color, '#ffffff');

  return `drawtext=text='${escapeDrawtextText(overlay.text)}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${color}:expansion=none:${enableFilter(overlay)}`;
}

function buildMosaicOverlay(overlay, state, index) {
  const { width, height } = getVideoSize(state);
  const x = percentToPixels(overlay.x, width);
  const y = percentToPixels(overlay.y, height);
  const mosaicWidth = percentToPixels(overlay.width, width);
  const mosaicHeight = percentToPixels(overlay.height, height);
  const pixelWidth = Math.max(1, Math.round(mosaicWidth / 10));
  const pixelHeight = Math.max(1, Math.round(mosaicHeight / 10));

  return `split[base${index}][pix${index}];[pix${index}]crop=${mosaicWidth}:${mosaicHeight}:${x}:${y},scale=${pixelWidth}:${pixelHeight},scale=${mosaicWidth}:${mosaicHeight}:flags=neighbor[pixout${index}];[base${index}][pixout${index}]overlay=${x}:${y}:${enableFilter(overlay)}`;
}

function overlayColor(overlay, fallback = '#198cff') {
  return safeColor(overlay.color || overlay.strokeColor || overlay.fillColor, fallback);
}

function buildShapeOverlay(overlay, state) {
  const { width, height } = getVideoSize(state);
  const x = percentToPixels(overlay.x, width);
  const y = percentToPixels(overlay.y, height);
  const boxWidth = percentToPixels(overlay.width, width);
  const boxHeight = percentToPixels(overlay.height, height);
  const thickness = positiveInteger(overlay.thickness ?? overlay.lineWidth, 4);

  return `drawbox=x=${x}:y=${y}:w=${boxWidth}:h=${boxHeight}:color=${overlayColor(overlay)}:t=${thickness}:${enableFilter(overlay)}`;
}

function buildBrushOverlay(overlay, state) {
  const points = Array.isArray(overlay.points) ? overlay.points : [];
  const { width, height } = getVideoSize(state);
  const size = positiveInteger(overlay.size ?? overlay.lineWidth, 8);
  const halfSize = Math.round(size / 2);

  return points.map((point) => {
    const x = percentToPixels(point.x, width) - halfSize;
    const y = percentToPixels(point.y, height) - halfSize;

    return `drawbox=x=${x}:y=${y}:w=${size}:h=${size}:color=${overlayColor(overlay)}:t=fill:${enableFilter(overlay)}`;
  }).join(',');
}

function buildOverlayFilter(overlay, state, index) {
  if (overlay.type === 'text') {
    return buildTextOverlay(overlay, state);
  }

  if (overlay.type === 'mosaic') {
    return buildMosaicOverlay(overlay, state, index);
  }

  if (overlay.type === 'shape' || overlay.type === 'rect' || overlay.type === 'ellipse') {
    return buildShapeOverlay(overlay, state);
  }

  if (overlay.type === 'brush') {
    return buildBrushOverlay(overlay, state);
  }

  return '';
}

export function buildFiltergraph(state = {}) {
  const filters = [
    buildCropFilter(state),
    ...buildRotationFilters(state.rotation),
    FILTERS[state.filter] || '',
    ...(state.overlays ?? []).map((overlay, index) => buildOverlayFilter(overlay, state, index)),
  ].filter(Boolean);

  return filters.join(',');
}

function hasMosaicOverlay(state = {}) {
  return (state.overlays ?? []).some((overlay) => overlay.type === 'mosaic');
}

function buildComplexFiltergraph(filtergraph) {
  return `[0:v]${filtergraph}[vout]`;
}

function getOutputExtension(outputName = '') {
  const path = String(outputName).split(/[?#]/, 1)[0].toLowerCase();
  const dotIndex = path.lastIndexOf('.');

  return dotIndex === -1 ? '' : path.slice(dotIndex + 1);
}

function buildCodecArgs(outputName) {
  if (getOutputExtension(outputName) === 'webm') {
    return ['-c:v', 'libvpx-vp9', '-c:a', 'libopus'];
  }

  return ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac'];
}

export function buildExportArgs(state = {}, inputName, outputName) {
  const start = timeValue(state.trim?.start, 0);
  const end = timeValue(state.trim?.end, state.video?.duration ?? 0);
  const filtergraph = buildFiltergraph(state);
  const args = ['-ss', start, '-to', end, '-i', inputName];

  if (filtergraph && hasMosaicOverlay(state)) {
    args.push('-filter_complex', buildComplexFiltergraph(filtergraph), '-map', '[vout]', '-map', '0:a?');
  } else if (filtergraph) {
    args.push('-vf', filtergraph);
  }

  args.push(...buildCodecArgs(outputName), outputName);

  return args;
}
