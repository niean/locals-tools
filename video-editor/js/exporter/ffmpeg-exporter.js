import { FFmpeg } from '../../vendor/ffmpeg/index.js';
import { buildExportArgs } from './filtergraph.js';

const DEFAULT_RUNTIME_PATHS = {
  coreURL: new URL('../../vendor/ffmpeg/ffmpeg-core.js', import.meta.url).href,
  wasmURL: new URL('../../vendor/ffmpeg/ffmpeg-core.wasm', import.meta.url).href,
  classWorkerURL: new URL('../../vendor/ffmpeg/worker.js', import.meta.url).href,
};

let ffmpegInstance;
const callbackBoundInstances = new WeakSet();
let activeCallbacks = {
  onProgress: null,
  onLog: null,
};

export function getInputExtension(file) {
  const type = String(file?.type || '').toLowerCase();

  if (type.includes('webm')) {
    return 'webm';
  }

  if (type.includes('quicktime')) {
    return 'mov';
  }

  return 'mp4';
}

export function getOutputMimeType(outputFormat = 'mp4') {
  return String(outputFormat).toLowerCase().includes('webm') ? 'video/webm' : 'video/mp4';
}

export function getOutputExtension(outputFormat = 'mp4') {
  return getOutputMimeType(outputFormat) === 'video/webm' ? 'webm' : 'mp4';
}

export function createExportFilenames(file, outputFormat) {
  return {
    inputName: `input.${getInputExtension(file)}`,
    outputName: `output.${getOutputExtension(outputFormat)}`,
  };
}

function getVideoFile(state = {}) {
  return state.video?.file || state.video?.sourceFile || state.file || null;
}

async function cleanupFile(ffmpeg, filename) {
  try {
    await ffmpeg.deleteFile(filename);
  } catch {
    // Missing temporary files are safe to ignore during cleanup.
  }
}

function normalizeProgress(progressEvent) {
  const ratio = Number(progressEvent?.progress ?? progressEvent?.ratio ?? 0);
  return Number.isFinite(ratio) ? Math.min(0.95, Math.max(0.08, ratio)) : 0.08;
}

async function loadFFmpeg(ffmpeg, runtimePaths) {
  if (ffmpeg.loaded) {
    return;
  }

  await ffmpeg.load(runtimePaths);
}

function bindCallbacks(ffmpeg) {
  if (callbackBoundInstances.has(ffmpeg)) {
    return;
  }

  ffmpeg.on('progress', (event) => {
    activeCallbacks.onProgress?.(normalizeProgress(event));
  });
  ffmpeg.on('log', (event) => {
    activeCallbacks.onLog?.(event);
  });
  callbackBoundInstances.add(ffmpeg);
}

function createDefaultFFmpeg() {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  return ffmpegInstance;
}

export async function exportVideoWithFFmpeg({
  ffmpeg = createDefaultFFmpeg(),
  state,
  outputFormat = 'mp4',
  onProgress,
  onLog,
  buildArgs = buildExportArgs,
  runtimePaths = DEFAULT_RUNTIME_PATHS,
} = {}) {
  const file = getVideoFile(state);

  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('没有可导出的视频文件');
  }

  bindCallbacks(ffmpeg);
  activeCallbacks = { onProgress, onLog };
  onProgress?.(0.02);

  const { inputName, outputName } = createExportFilenames(file, outputFormat);

  try {
    await loadFFmpeg(ffmpeg, runtimePaths);
    onProgress?.(0.08);

    const inputBytes = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile(inputName, inputBytes);

    const exitCode = await ffmpeg.exec(buildArgs(state, inputName, outputName));
    if (exitCode !== 0) {
      throw new Error(`FFmpeg export failed with exit code ${exitCode}`);
    }

    onProgress?.(0.96);
    const outputBytes = await ffmpeg.readFile(outputName);
    const blob = new Blob([outputBytes], { type: getOutputMimeType(outputFormat) });
    onProgress?.(1);

    return blob;
  } finally {
    await cleanupFile(ffmpeg, inputName);
    await cleanupFile(ffmpeg, outputName);
    activeCallbacks = { onProgress: null, onLog: null };
  }
}

export function exportVideo(state, outputFormat, callbacks = {}) {
  return exportVideoWithFFmpeg({ state, outputFormat, ...callbacks });
}
