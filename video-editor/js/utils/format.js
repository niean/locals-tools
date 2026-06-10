export function formatTime(seconds) {
  const safeSeconds = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const tenths = Math.round(safeSeconds * 10);
  const totalSeconds = Math.floor(tenths / 10);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const tenth = tenths % 10;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${tenth}`;
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}
