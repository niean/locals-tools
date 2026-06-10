import { addOverlay } from '../state.js';
import { BaseTool } from './BaseTool.js';
import { createLabeledInput, createLabeledSelect, getOverlayTimeRange, isNonZeroRect, normalizeRect, percentPoint } from './tool-utils.js';

export class ShapeTool extends BaseTool {
  constructor(options = {}) {
    super({ name: 'shape' });
    this.commit = options.commit || (() => {});
    this.getCurrentTime = options.getCurrentTime || (() => 0);
    this.shape = options.shape || 'rect';
    this.color = options.color || '#198cff';
    this.lineWidth = options.lineWidth || 4;
    this.startPoint = null;
  }

  renderPropertyBar(host) {
    if (!host) {
      return;
    }

    const [shapeLabel, shapeSelect] = createLabeledSelect({
      id: 'shapeType',
      label: '形状',
      value: this.shape,
      options: [
        { value: 'rect', label: '矩形' },
        { value: 'ellipse', label: '椭圆' },
      ],
    });
    const [colorLabel, colorInput] = createLabeledInput({ id: 'shapeColor', label: '颜色', type: 'color', value: this.color });
    const [widthLabel, widthInput] = createLabeledInput({
      id: 'shapeLineWidth',
      label: '线宽',
      type: 'number',
      value: this.lineWidth,
      attrs: { min: 1, max: 80, step: 1 },
    });

    shapeSelect.addEventListener('change', () => { this.shape = shapeSelect.value; });
    colorInput.addEventListener('input', () => { this.color = colorInput.value; });
    widthInput.addEventListener('change', () => { this.lineWidth = Math.max(1, Number(widthInput.value) || 1); });

    host.replaceChildren(shapeLabel, shapeSelect, colorLabel, colorInput, widthLabel, widthInput);
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
      type: 'shape',
      shape: this.shape,
      color: this.color,
      lineWidth: this.lineWidth,
      ...timeRange,
      ...rect,
    };
    this.commit((currentState) => addOverlay(currentState, overlay));
  }
}
