const FILTER_STYLES = {
  original: 'none',
  vivid: 'saturate(1.35) contrast(1.08)',
  warm: 'saturate(1.08) sepia(0.12) hue-rotate(-8deg)',
  cool: 'saturate(1.05) hue-rotate(12deg) brightness(1.02)',
  mono: 'grayscale(1)',
};

function normalizeRotation(rotation) {
  return ((Math.round(Number(rotation) / 90) * 90) % 360 + 360) % 360;
}

export function getPreviewCanvasStyle(state = {}) {
  const rotation = normalizeRotation(state.rotation);

  return {
    transform: `rotate(${rotation}deg)`,
  };
}

export function getPreviewVideoStyle(state = {}) {
  return {
    ...getPreviewCanvasStyle(state),
    filter: FILTER_STYLES[state.filter] || FILTER_STYLES.original,
  };
}
