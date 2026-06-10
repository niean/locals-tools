import { addOverlay } from '../state.js';
import { BaseTool } from './BaseTool.js';
import { createLabeledInput, getOverlayTimeRange, percentPoint } from './tool-utils.js';

export class TextTool extends BaseTool {
  constructor(options = {}) {
    super({ name: 'text' });
    this.commit = options.commit || (() => {});
    this.getCurrentTime = options.getCurrentTime || (() => 0);
    this.text = options.text || '文字';
    this.color = options.color || '#ffffff';
    this.fontSize = options.fontSize || 24;
  }

  renderPropertyBar(host) {
    if (!host) {
      return;
    }

    const [textLabel, textInput] = createLabeledInput({ id: 'textContent', label: '文字', type: 'text', value: this.text });
    const [colorLabel, colorInput] = createLabeledInput({ id: 'textColor', label: '颜色', type: 'color', value: this.color });
    const [sizeLabel, sizeInput] = createLabeledInput({
      id: 'textFontSize',
      label: '字号',
      type: 'number',
      value: this.fontSize,
      attrs: { min: 8, max: 160, step: 1 },
    });

    textInput.addEventListener('input', () => { this.text = textInput.value; });
    colorInput.addEventListener('input', () => { this.color = colorInput.value; });
    sizeInput.addEventListener('change', () => { this.fontSize = Math.max(8, Number(sizeInput.value) || 8); });

    host.replaceChildren(textLabel, textInput, colorLabel, colorInput, sizeLabel, sizeInput);
  }

  onPointerDown(event, { previewCanvas, state } = {}) {
    if (!previewCanvas) {
      return;
    }

    const timeRange = getOverlayTimeRange(state, this.getCurrentTime());
    if (!timeRange) {
      return;
    }

    const point = percentPoint(previewCanvas, event);
    const overlay = {
      type: 'text',
      text: this.text,
      color: this.color,
      fontSize: this.fontSize,
      ...timeRange,
      x: point.x,
      y: point.y,
    };
    this.commit((currentState) => addOverlay(currentState, overlay));
  }
}
