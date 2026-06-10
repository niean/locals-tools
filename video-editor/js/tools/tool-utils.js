export function createLabeledInput({ id, label, type = 'text', value = '', attrs = {} }) {
  const labelEl = document.createElement('label');
  labelEl.className = 'c-property-bar__label';
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.className = 'c-property-bar__input';
  input.id = id;
  input.type = type;
  input.value = String(value);

  Object.entries(attrs).forEach(([name, attrValue]) => {
    input.setAttribute(name, String(attrValue));
  });

  return [labelEl, input];
}

export function createLabeledSelect({ id, label, value = '', options = [] }) {
  const labelEl = document.createElement('label');
  labelEl.className = 'c-property-bar__label';
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const select = document.createElement('select');
  select.className = 'c-property-bar__select';
  select.id = id;

  options.forEach((option) => {
    const optionEl = document.createElement('option');
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    optionEl.selected = option.value === value;
    select.append(optionEl);
  });

  return [labelEl, select];
}

export function percentPoint(previewCanvas, event) {
  const point = previewCanvas.getCanvasPoint(event);
  const canvas = previewCanvas.getCanvas();
  const x = canvas.width > 0 ? point.x / canvas.width : 0;
  const y = canvas.height > 0 ? point.y / canvas.height : 0;

  return {
    x: Math.min(1, Math.max(0, Math.round(x * 1_000_000) / 1_000_000)),
    y: Math.min(1, Math.max(0, Math.round(y * 1_000_000) / 1_000_000)),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundPercent(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function getOverlayTimeRange(state = {}, currentTime = 0) {
  const durationValue = Number(state.video?.duration);
  const duration = Number.isFinite(durationValue) && durationValue > 0 ? durationValue : 0;
  const trimStartValue = Number(state.trim?.start);
  const trimEndValue = Number(state.trim?.end);
  const hasTrimRange = Number.isFinite(trimStartValue) && Number.isFinite(trimEndValue);
  const rangeStart = hasTrimRange ? clamp(Math.min(trimStartValue, trimEndValue), 0, duration) : 0;
  const rangeEnd = hasTrimRange ? clamp(Math.max(trimStartValue, trimEndValue), 0, duration) : duration;
  const startTime = clamp(Number(currentTime) || 0, rangeStart, rangeEnd);
  const endTime = rangeEnd > startTime ? rangeEnd : duration;

  if (endTime <= startTime) {
    return null;
  }

  return { startTime, endTime };
}

export function normalizeRect(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return {
    x: roundPercent(x),
    y: roundPercent(y),
    width: roundPercent(width),
    height: roundPercent(height),
  };
}

export function isNonZeroRect(rect) {
  return rect.width > 0.001 && rect.height > 0.001;
}
