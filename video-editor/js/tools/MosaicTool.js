import { addOverlay } from '../state.js';
import { BaseTool } from './BaseTool.js';
import { createLabeledInput, getOverlayTimeRange, isNonZeroRect, normalizeRect, percentPoint } from './tool-utils.js';

export class MosaicTool extends BaseTool {
  constructor(options = {}) {
    super({ name: 'mosaic' });
    this.commit = options.commit || (() => {});
    this.getCurrentTime = options.getCurrentTime || (() => 0);
    this.blockSize = options.blockSize || 12;
    this.startPoint = null;
  }

  renderPropertyBar(host) {
    if (!host) {
      return;
    }

    const [label, input] = createLabeledInput({
      id: 'mosaicBlockSize',
      label: '块大小',
      type: 'number',
      value: this.blockSize,
      attrs: { min: 2, max: 80, step: 1 },
    });
    input.addEventListener('change', () => { this.blockSize = Math.max(2, Number(input.value) || 2); });
    host.replaceChildren(label, input);
  }

  onPointerDown(event, { previewCanvas } = {}) {
    if (!previewCanvas) {
      return;
    }

    this.startPoint = percentPoint(previewCanvas, event);
    event.target?.setPointerCapture?.(event.pointerId);
  }

  onPointerUp(event, { previewCanvas, state } = {}) {
    if (!this.startPoint || !previewCanvas) {
      return;
    }

    const rect = normalizeRect(this.startPoint, percentPoint(previewCanvas, event));
    this.startPoint = null;
    event.target?.releasePointerCapture?.(event.pointerId);

    if (!isNonZeroRect(rect)) {
      return;
    }

    const timeRange = getOverlayTimeRange(state, this.getCurrentTime());
    if (!timeRange) {
      return;
    }

    const overlay = {
      type: 'mosaic',
      blockSize: this.blockSize,
      ...timeRange,
      ...rect,
    };
    this.commit((currentState) => addOverlay(currentState, overlay));
  }
}
