const DEFAULT_DURATION = 0;

function getDuration(video = {}) {
  return Math.max(0, Number(video.duration) || DEFAULT_DURATION);
}

function clamp(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(max, Math.max(min, number));
}

function normalizeTrim(trim, duration) {
  const start = clamp(trim.start, 0, duration);
  const end = clamp(trim.end, 0, duration);

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function roundPercent(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function normalizeCrop(crop) {
  const x = roundPercent(clamp(crop.x, 0, 1));
  const y = roundPercent(clamp(crop.y, 0, 1));
  const width = roundPercent(clamp(crop.width, 0, 1 - x));
  const height = roundPercent(clamp(crop.height, 0, 1 - y));

  return { x, y, width, height };
}

export function createInitialState(video = {}) {
  const duration = getDuration(video);

  return {
    activeTool: 'crop',
    video: { ...video },
    trim: { start: 0, end: duration },
    crop: { x: 0, y: 0, width: 1, height: 1 },
    rotation: 0,
    filter: 'original',
    overlays: [],
    nextOverlayId: 1,
  };
}

export function setActiveTool(state, activeTool) {
  return { ...state, activeTool };
}

export function updateVideo(state, videoUpdates = {}) {
  const video = { ...state.video, ...videoUpdates };
  const duration = getDuration(video);
  const isInitialVideoLoad = getDuration(state.video) === 0 && state.trim.end === 0;

  return {
    ...state,
    video,
    trim: normalizeTrim(
      isInitialVideoLoad ? { start: state.trim.start, end: duration } : state.trim,
      duration,
    ),
  };
}

export function updateTrim(state, trimUpdates = {}) {
  const duration = getDuration(state.video);

  return {
    ...state,
    trim: normalizeTrim({ ...state.trim, ...trimUpdates }, duration),
  };
}

export function updateCrop(state, cropUpdates = {}) {
  return {
    ...state,
    crop: normalizeCrop({ ...state.crop, ...cropUpdates }),
  };
}

export function setRotation(state, rotation) {
  const normalized = ((Math.round(Number(rotation) / 90) * 90) % 360 + 360) % 360;

  return { ...state, rotation: normalized };
}

export function setFilter(state, filter) {
  return { ...state, filter };
}

export function addOverlay(state, overlay = {}) {
  const nextId = state.nextOverlayId;

  return {
    ...state,
    overlays: [...state.overlays, { ...overlay, id: `overlay-${nextId}` }],
    nextOverlayId: nextId + 1,
  };
}

export function updateOverlay(state, overlayId, overlayUpdates = {}) {
  return {
    ...state,
    overlays: state.overlays.map((overlay) => (
      overlay.id === overlayId ? { ...overlay, ...overlayUpdates, id: overlay.id } : overlay
    )),
  };
}

export function removeOverlay(state, overlayId) {
  return {
    ...state,
    overlays: state.overlays.filter((overlay) => overlay.id !== overlayId),
  };
}
