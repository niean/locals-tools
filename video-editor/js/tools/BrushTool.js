import { addOverlay } from '../state.js';
import { BaseTool } from './BaseTool.js';
import { createLabeledInput, getOverlayTimeRange, percentPoint } from './tool-utils.js';

export class BrushTool extends BaseTool {
  constructor(options = {}) {
    super({ name: 'brush' });
    this.commit = options.commit || (() => {});
    this.getCurrentTime = options.getCurrentTime || (() => 0);
    this.color = options.color || '#198cff';
    this.lineWidth = options.lineWidth || 8;
    this.points = [];
    this.drawing = false;
  }

  renderPropertyBar(host) {
    if (!host) {
      return;
    }

    const [colorLabel, colorInput] = createLabeledInput({ id: 'brushColor', label: '颜色', type: 'color', value: this.color });
    const [widthLabel, widthInput] = createLabeledInput({
      id: 'brushLineWidth',
      label: '线宽',
      type: 'number',
      value: this.lineWidth,
      attrs: { min: 1, max: 80, step: 1 },
    });

    colorInput.addEventListener('input', () => { this.color = colorInput.value; });
    widthInput.addEventListener('change', () => { this.lineWidth = Math.max(1, Number(widthInput.value) || 1); });

    host.replaceChildren(colorLabel, colorInput, widthLabel, widthInput);
  }

  onPointerDown(event, { previewCanvas } = {}) {
    if (!previewCanvas) {
      return;
    }

    this.drawing = true;
    this.points = [percentPoint(previewCanvas, event)];
    event.target?.setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event, { previewCanvas } = {}) {
    if (!this.drawing || !previewCanvas) {
      return;
    }

    const point = percentPoint(previewCanvas, event);
    const last = this.points[this.points.length - 1];
    if (!last || last.x !== point.x || last.y !== point.y) {
      this.points.push(point);
    }
  }

  onPointerUp(event, { previewCanvas, state } = {}) {
    if (!this.drawing) {
      return;
    }

    if (previewCanvas) {
      this.onPointerMove(event, { previewCanvas });
    }

    this.drawing = false;
    event.target?.releasePointerCapture?.(event.pointerId);

    if (this.points.length < 2) {
      this.points = [];
      return;
    }

    const timeRange = getOverlayTimeRange(state, this.getCurrentTime());
    if (!timeRange) {
      this.points = [];
      return;
    }

    const overlay = {
      type: 'brush',
      color: this.color,
      lineWidth: this.lineWidth,
      ...timeRange,
      points: [...this.points],
    };
    this.points = [];
    this.commit((currentState) => addOverlay(currentState, overlay));
  }
}
