import { updateCrop, setRotation } from '../state.js';
import { BaseTool } from './BaseTool.js';
import { createLabeledInput } from './tool-utils.js';

export class CropTool extends BaseTool {
  constructor(options = {}) {
    super({ name: 'crop' });
    this.commit = options.commit || (() => {});
  }

  renderPropertyBar(host, state = {}) {
    if (!host) {
      return;
    }

    const crop = state.crop || { x: 0, y: 0, width: 1, height: 1 };
    const fields = [
      { key: 'x', label: 'X%', value: crop.x * 100 },
      { key: 'y', label: 'Y%', value: crop.y * 100 },
      { key: 'width', label: '宽%', value: crop.width * 100 },
      { key: 'height', label: '高%', value: crop.height * 100 },
    ];
    const nodes = [];

    fields.forEach((field) => {
      const [label, input] = createLabeledInput({
        id: `crop-${field.key}`,
        label: field.label,
        type: 'number',
        value: Math.round(field.value * 10) / 10,
        attrs: { min: 0, max: 100, step: 0.1 },
      });
      input.addEventListener('change', () => {
        this.commit((currentState) => updateCrop(currentState, { [field.key]: Number(input.value) / 100 }));
      });
      nodes.push(label, input);
    });

    const rotateButton = document.createElement('button');
    rotateButton.className = 'c-property-bar__btn';
    rotateButton.type = 'button';
    rotateButton.id = 'cropRotateLeft';
    rotateButton.textContent = '逆时针旋转';
    rotateButton.addEventListener('click', () => {
      this.commit((currentState) => setRotation(currentState, (currentState.rotation || 0) - 90));
    });
    nodes.push(rotateButton);

    host.replaceChildren(...nodes);
  }
}
