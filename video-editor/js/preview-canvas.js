function clampPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(1, Math.max(0, number));
}

function scaleRect(rect = {}, canvas) {
  const x = clampPercent(rect.x) * canvas.width;
  const y = clampPercent(rect.y) * canvas.height;
  const width = clampPercent(rect.width) * canvas.width;
  const height = clampPercent(rect.height) * canvas.height;

  return { x, y, width, height };
}

function isOverlayActive(overlay, currentTime) {
  const startTime = Number(overlay.startTime) || 0;
  const endTime = Number.isFinite(Number(overlay.endTime)) ? Number(overlay.endTime) : Infinity;

  return currentTime >= startTime && currentTime <= endTime;
}

export function createPreviewCanvas() {
  let canvasEl = null;
  let stageEl = null;
  let context = null;

  function requireCanvas() {
    if (!canvasEl) {
      throw new Error('Preview canvas has not been initialized');
    }

    return canvasEl;
  }

  function getVideoSize(video = {}) {
    return {
      width: video.videoWidth || video.width || 0,
      height: video.videoHeight || video.height || 0,
    };
  }

  function init(canvasElement, stageElement) {
    canvasEl = canvasElement;
    stageEl = stageElement;
    context = canvasElement.getContext('2d');
  }

  function resizeToVideo(video) {
    const canvas = requireCanvas();
    const { width, height } = getVideoSize(video);

    if (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function updateDisplaySize(video) {
    const canvas = requireCanvas();
    const { width, height } = getVideoSize(video);

    if (width <= 0 || height <= 0) {
      return;
    }

    const aspectRatio = `${width} / ${height}`;

    canvas.style.aspectRatio = aspectRatio;
    if (stageEl) {
      stageEl.style.aspectRatio = aspectRatio;
    }
  }

  function getScale() {
    const canvas = requireCanvas();
    const rect = canvas.getBoundingClientRect();

    return {
      x: rect.width > 0 ? canvas.width / rect.width : 1,
      y: rect.height > 0 ? canvas.height / rect.height : 1,
    };
  }

  function getCanvasPoint(event) {
    const canvas = requireCanvas();
    const rect = canvas.getBoundingClientRect();
    const scale = getScale();

    return {
      x: (event.clientX - rect.left) * scale.x,
      y: (event.clientY - rect.top) * scale.y,
    };
  }

  function clear() {
    const canvas = requireCanvas();
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawCrop(state = {}) {
    const canvas = requireCanvas();
    const crop = state.crop || { x: 0, y: 0, width: 1, height: 1 };
    const { x, y, width, height } = scaleRect(crop, canvas);

    context.save();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;
    context.setLineDash([8, 6]);
    context.strokeRect(x, y, width, height);
    context.restore();
  }

  function drawBrush(overlay) {
    const canvas = requireCanvas();
    const points = Array.isArray(overlay.points) ? overlay.points : [];

    if (points.length < 2) {
      return;
    }

    context.save();
    context.strokeStyle = overlay.color || '#198cff';
    context.lineWidth = Number(overlay.lineWidth) || 8;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(clampPercent(points[0].x) * canvas.width, clampPercent(points[0].y) * canvas.height);
    points.slice(1).forEach((point) => {
      context.lineTo(clampPercent(point.x) * canvas.width, clampPercent(point.y) * canvas.height);
    });
    context.stroke();
    context.restore();
  }

  function drawText(overlay) {
    const canvas = requireCanvas();

    context.save();
    context.fillStyle = overlay.color || '#ffffff';
    context.font = `${Number(overlay.fontSize) || 24}px sans-serif`;
    context.textBaseline = 'top';
    context.fillText(
      String(overlay.text || ''),
      clampPercent(overlay.x) * canvas.width,
      clampPercent(overlay.y) * canvas.height,
    );
    context.restore();
  }

  function drawMosaic(overlay) {
    const canvas = requireCanvas();
    const { x, y, width, height } = scaleRect(overlay, canvas);

    if (width <= 0 || height <= 0) {
      return;
    }

    context.save();
    context.fillStyle = 'rgba(80, 80, 80, 0.35)';
    context.fillRect(x, y, width, height);
    context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    context.lineWidth = 1;
    context.strokeRect(x, y, width, height);
    context.restore();
  }

  function drawShape(overlay) {
    const canvas = requireCanvas();
    const { x, y, width, height } = scaleRect(overlay, canvas);

    if (width <= 0 || height <= 0) {
      return;
    }

    context.save();
    context.strokeStyle = overlay.color || '#198cff';
    context.lineWidth = Number(overlay.lineWidth) || 4;
    context.beginPath();

    if (overlay.shape === 'ellipse') {
      context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      context.stroke();
    } else {
      context.strokeRect(x, y, width, height);
    }

    context.restore();
  }

  function drawOverlay(overlay) {
    if (overlay.type === 'brush') {
      drawBrush(overlay);
    } else if (overlay.type === 'text') {
      drawText(overlay);
    } else if (overlay.type === 'mosaic') {
      drawMosaic(overlay);
    } else if (overlay.type === 'shape') {
      drawShape(overlay);
    }
  }

  function drawState(state = {}, currentTime = 0) {
    clear();
    drawCrop(state);
    (state.overlays || [])
      .filter((overlay) => isOverlayActive(overlay, currentTime))
      .forEach(drawOverlay);
  }

  function getContext() {
    return context;
  }

  function getCanvas() {
    return canvasEl;
  }

  return {
    init,
    resizeToVideo,
    updateDisplaySize,
    getScale,
    getCanvasPoint,
    clear,
    drawState,
    getContext,
    getCanvas,
  };
}

export const previewCanvas = createPreviewCanvas();
