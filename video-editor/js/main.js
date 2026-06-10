import { createHistory } from './history.js';
import { player } from './player.js';
import { previewCanvas } from './preview-canvas.js';
import { getPreviewCanvasStyle, getPreviewVideoStyle } from './preview-styles.js';
import {
  createInitialState,
  setActiveTool,
  updateTrim,
  updateVideo,
} from './state.js';
import { exportVideo } from './exporter/ffmpeg-exporter.js';
import { getTimelinePercent } from './timeline.js';
import { BrushTool } from './tools/BrushTool.js';
import { CropTool } from './tools/CropTool.js';
import { FilterTool } from './tools/FilterTool.js';
import { MosaicTool } from './tools/MosaicTool.js';
import { ShapeTool } from './tools/ShapeTool.js';
import { TextTool } from './tools/TextTool.js';
import {
  createObjectUrl,
  downloadBlob,
  getSanitizedBaseName,
  revokeObjectUrl,
  validateVideoFile,
} from './utils/file.js';
import { formatPercent, formatTime } from './utils/format.js';

const dom = {
  toolbar: document.getElementById('toolbar'),
  toolbarToggle: document.getElementById('btnToolbarToggle'),
  toolButtons: [...document.querySelectorAll('[data-tool]')],
  propertyBar: document.getElementById('propertyBar'),
  toolOptions: document.getElementById('toolOptions'),
  toolSpecificOptions: document.getElementById('toolSpecificOptions'),
  startTime: document.getElementById('startTime'),
  endTime: document.getElementById('endTime'),
  toolColor: document.getElementById('toolColor'),
  toolSize: document.getElementById('toolSize'),
  undo: document.getElementById('btnUndo'),
  redo: document.getElementById('btnRedo'),
  open: document.getElementById('btnOpen'),
  exportFormat: document.getElementById('exportFormat'),
  exportButton: document.getElementById('btnExport'),
  previewArea: document.getElementById('previewArea'),
  previewStage: document.getElementById('previewStage'),
  video: document.getElementById('videoPreview'),
  canvas: document.getElementById('overlayCanvas'),
  placeholder: document.getElementById('placeholder'),
  play: document.getElementById('btnPlay'),
  currentTime: document.getElementById('currentTime'),
  duration: document.getElementById('duration'),
  timelineTrack: document.getElementById('timelineTrack'),
  timelineSelection: document.getElementById('timelineSelection'),
  timelinePlayhead: document.getElementById('timelinePlayhead'),
  fileInput: document.getElementById('fileInput'),
  toast: document.getElementById('toast'),
  progressModal: document.getElementById('progressModal'),
  progressBar: document.getElementById('progressBar'),
  progressMessage: document.getElementById('progressMessage'),
};

const toolContext = {
  commit(updater) {
    setState(updater(state), { pushHistory: true });
  },
  getCurrentTime() {
    return player.getElement() ? player.getCurrentTime() : 0;
  },
};

const tools = {
  crop: new CropTool(toolContext),
  brush: new BrushTool(toolContext),
  text: new TextTool(toolContext),
  mosaic: new MosaicTool(toolContext),
  shape: new ShapeTool(toolContext),
  filter: new FilterTool(toolContext),
};

let state = createInitialState();
let history = createHistory(state);
let activeTool = tools[state.activeTool];
let currentObjectUrl = '';
let currentVideoFile = null;
let isExporting = false;

player.init(dom.video);
previewCanvas.init(dom.canvas, dom.previewStage);
activeTool.activate({ state, previewCanvas });

function showToast(message) {
  if (!dom.toast) {
    return;
  }

  dom.toast.textContent = message;
  dom.toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    dom.toast.classList.remove('is-visible');
  }, 2400);
}

function hasVideo() {
  return state.video.duration > 0 && Boolean(player.getCurrentUrl());
}

function setExportProgress(value, message = '') {
  const percent = Math.round(Math.min(1, Math.max(0, Number(value) || 0)) * 100);

  if (dom.progressBar) {
    dom.progressBar.style.width = `${percent}%`;
  }

  if (dom.progressMessage) {
    dom.progressMessage.textContent = message || `导出中... ${percent}%`;
  }
}

function showProgressModal(message = '准备中...') {
  dom.progressModal?.classList.remove('u-hidden');
  setExportProgress(0, message);
}

function hideProgressModal() {
  dom.progressModal?.classList.add('u-hidden');
  setExportProgress(0, '准备中...');
}

function setControlsEnabled(enabled) {
  const interactive = enabled && !isExporting;

  [dom.startTime, dom.endTime, dom.play].forEach((control) => {
    if (control) {
      control.disabled = !interactive;
    }
  });

  [dom.toolColor, dom.toolSize, dom.exportFormat].forEach((control) => {
    if (control) {
      control.disabled = !interactive;
    }
  });

  if (dom.exportButton) {
    dom.exportButton.disabled = !interactive;
  }
}

function updateUndoRedo() {
  if (dom.undo) {
    dom.undo.disabled = !history.canUndo();
  }

  if (dom.redo) {
    dom.redo.disabled = !history.canRedo();
  }
}

function updateTimeLabels() {
  const currentTime = player.getElement() ? player.getCurrentTime() : 0;
  const duration = state.video.duration || player.getDuration();

  if (dom.currentTime) {
    dom.currentTime.textContent = formatTime(currentTime);
  }

  if (dom.duration) {
    dom.duration.textContent = formatTime(duration);
  }
}

function renderTimeline() {
  const duration = state.video.duration || 0;
  const currentTime = player.getElement() ? player.getCurrentTime() : 0;
  const playheadPercent = getTimelinePercent(currentTime, duration);
  const startPercent = getTimelinePercent(state.trim.start, duration);
  const endPercent = getTimelinePercent(state.trim.end, duration);

  if (dom.timelinePlayhead) {
    dom.timelinePlayhead.style.left = formatPercent(playheadPercent);
  }

  if (dom.timelineSelection) {
    dom.timelineSelection.style.left = formatPercent(startPercent);
    dom.timelineSelection.style.right = formatPercent(100 - endPercent);
  }
}

function renderPropertyBar() {
  const duration = state.video.duration || 0;

  if (dom.startTime) {
    dom.startTime.max = String(duration);
    dom.startTime.value = String(Math.round(state.trim.start * 10) / 10);
  }

  if (dom.endTime) {
    dom.endTime.max = String(duration);
    dom.endTime.value = String(Math.round(state.trim.end * 10) / 10);
  }

  activeTool.renderPropertyBar(dom.toolSpecificOptions, state);
}

function applyPreviewStyles() {
  Object.assign(dom.video.style, getPreviewVideoStyle(state));
  Object.assign(dom.canvas.style, getPreviewCanvasStyle(state));
}

function render() {
  dom.toolButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tool === state.activeTool);
  });

  setControlsEnabled(hasVideo());
  updateUndoRedo();
  updateTimeLabels();
  renderTimeline();
  applyPreviewStyles();
  previewCanvas.drawState(state, player.getElement() ? player.getCurrentTime() : 0);
  renderPropertyBar();
}

function setState(nextState, options = {}) {
  state = nextState;

  if (options.pushHistory) {
    state = history.push(state);
  }

  render();
}

function switchTool(toolName) {
  const nextTool = tools[toolName];

  if (!nextTool || toolName === state.activeTool) {
    return;
  }

  activeTool.deactivate({ state, previewCanvas });
  activeTool = nextTool;
  activeTool.activate({ state, previewCanvas });
  setState(setActiveTool(state, toolName), { pushHistory: true });
}

function resetForVideo(metadata, file) {
  currentVideoFile = file;
  state = updateVideo(createInitialState(), {
    duration: metadata.duration,
    width: metadata.width,
    height: metadata.height,
    name: getSanitizedBaseName(file),
    type: file.type,
  });
  history = createHistory(state);
  activeTool.deactivate({ state, previewCanvas });
  activeTool = tools[state.activeTool];
  activeTool.activate({ state, previewCanvas });
}

async function loadVideoFile(file) {
  const validation = validateVideoFile(file);

  if (!validation.valid) {
    showToast(validation.error);
    return;
  }

  const objectUrl = createObjectUrl(file);

  try {
    const metadata = await player.load(objectUrl);

    revokeObjectUrl(currentObjectUrl);
    currentObjectUrl = objectUrl;
    resetForVideo(metadata, file);
    previewCanvas.resizeToVideo(dom.video);
    previewCanvas.updateDisplaySize(dom.video);
    previewCanvas.drawState(state, player.getCurrentTime());

    if (dom.placeholder) {
      dom.placeholder.classList.add('u-hidden');
    }

    render();
  } catch (error) {
    revokeObjectUrl(objectUrl);
    showToast(error.message || '无法加载视频文件');
  }
}

function seekFromTrack(event) {
  if (!hasVideo()) {
    return;
  }

  const rect = dom.timelineTrack.getBoundingClientRect();
  const percent = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  player.seek(percent * state.video.duration);
  updateTimeLabels();
  renderTimeline();
}

function updateTrimFromInputs() {
  const start = Number(dom.startTime?.value ?? state.trim.start);
  const end = Number(dom.endTime?.value ?? state.trim.end);
  setState(updateTrim(state, { start, end }), { pushHistory: true });
}

async function handleExport() {
  if (!hasVideo() || isExporting) {
    return;
  }

  if (!currentVideoFile) {
    showToast('没有可导出的视频文件');
    return;
  }

  const outputFormat = dom.exportFormat?.value === 'video/webm' ? 'webm' : 'mp4';
  const filename = `${state.video.name || 'video-edit'}.${outputFormat}`;

  isExporting = true;
  render();
  showProgressModal('准备导出...');

  try {
    const blob = await exportVideo(
      { ...state, video: { ...state.video, file: currentVideoFile } },
      outputFormat,
      {
        onProgress(progress) {
          setExportProgress(progress);
        },
      },
    );

    downloadBlob(blob, filename);
    showToast('视频导出完成');
  } catch (error) {
    showToast(error.message || '视频导出失败');
  } finally {
    isExporting = false;
    hideProgressModal();
    render();
  }
}

function bindEvents() {
  dom.open?.addEventListener('click', () => dom.fileInput?.click());
  dom.placeholder?.addEventListener('click', () => dom.fileInput?.click());

  dom.fileInput?.addEventListener('change', (event) => {
    const [file] = event.target.files || [];
    if (file) {
      loadVideoFile(file);
    }
    event.target.value = '';
  });

  dom.previewStage?.addEventListener('dragover', (event) => {
    event.preventDefault();
    dom.previewStage.classList.add('is-dragover');
  });

  dom.previewStage?.addEventListener('dragleave', () => {
    dom.previewStage.classList.remove('is-dragover');
  });

  dom.previewStage?.addEventListener('drop', (event) => {
    event.preventDefault();
    dom.previewStage.classList.remove('is-dragover');
    const [file] = event.dataTransfer?.files || [];
    if (file) {
      loadVideoFile(file);
    }
  });

  dom.toolbarToggle?.addEventListener('click', () => {
    dom.toolbar?.classList.toggle('is-collapsed');
  });

  dom.toolButtons.forEach((button) => {
    button.addEventListener('click', () => switchTool(button.dataset.tool));
  });

  dom.play?.addEventListener('click', async () => {
    if (!hasVideo()) {
      return;
    }

    if (player.isPaused()) {
      await player.play();
    } else {
      player.pause();
    }
  });

  dom.video?.addEventListener('timeupdate', () => {
    updateTimeLabels();
    renderTimeline();
    previewCanvas.drawState(state, player.getCurrentTime());
  });

  dom.video?.addEventListener('loadedmetadata', () => {
    previewCanvas.resizeToVideo(dom.video);
    previewCanvas.updateDisplaySize(dom.video);
    previewCanvas.drawState(state, player.getCurrentTime());
  });

  dom.video?.addEventListener('ended', () => {
    updateTimeLabels();
    renderTimeline();
    previewCanvas.drawState(state, player.getCurrentTime());
  });

  dom.timelineTrack?.addEventListener('click', seekFromTrack);
  dom.startTime?.addEventListener('change', updateTrimFromInputs);
  dom.endTime?.addEventListener('change', updateTrimFromInputs);

  dom.exportButton?.addEventListener('click', handleExport);

  dom.undo?.addEventListener('click', () => {
    state = history.undo();
    render();
  });

  dom.redo?.addEventListener('click', () => {
    state = history.redo();
    render();
  });

  dom.canvas?.addEventListener('pointerdown', (event) => {
    if (hasVideo()) {
      activeTool.onPointerDown(event, { state, previewCanvas });
    }
  });
  dom.canvas?.addEventListener('pointermove', (event) => {
    if (hasVideo()) {
      activeTool.onPointerMove(event, { state, previewCanvas });
    }
  });
  dom.canvas?.addEventListener('pointerup', (event) => {
    if (hasVideo()) {
      activeTool.onPointerUp(event, { state, previewCanvas });
    }
  });

  window.addEventListener('resize', () => {
    if (hasVideo()) {
      previewCanvas.updateDisplaySize(dom.video);
    }
  });

  window.addEventListener('beforeunload', () => revokeObjectUrl(currentObjectUrl));
}

bindEvents();
render();
