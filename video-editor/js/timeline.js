function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getActiveOverlays(overlays, currentTime) {
  return overlays.filter(
    (overlay) => currentTime >= overlay.startTime && currentTime <= overlay.endTime,
  );
}

export function getTimelinePercent(time, duration) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  const percent = Number.isNaN(time) ? 0 : (time / duration) * 100;
  return clamp(percent, 0, 100);
}

export function normalizeOverlayTimes(overlay, duration) {
  const maxDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const startTime = clamp(overlay.startTime, 0, maxDuration);
  const endTime = clamp(overlay.endTime, 0, maxDuration);

  return {
    ...overlay,
    startTime: Math.min(startTime, endTime),
    endTime: Math.max(startTime, endTime),
  };
}
