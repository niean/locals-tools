import { setFilter } from '../state.js';
import { BaseTool } from './BaseTool.js';
import { createLabeledSelect } from './tool-utils.js';

export class FilterTool extends BaseTool {
  constructor(options = {}) {
    super({ name: 'filter' });
    this.commit = options.commit || (() => {});
  }

  renderPropertyBar(host, state = {}) {
    if (!host) {
      return;
    }

    const [label, select] = createLabeledSelect({
      id: 'filterSelect',
      label: '滤镜',
      value: state.filter || 'original',
      options: [
        { value: 'original', label: '原始' },
        { value: 'vivid', label: '鲜艳' },
        { value: 'warm', label: '暖色' },
        { value: 'cool', label: '冷色' },
        { value: 'mono', label: '黑白' },
      ],
    });

    select.addEventListener('change', () => {
      this.commit((currentState) => setFilter(currentState, select.value));
    });

    host.replaceChildren(label, select);
  }
}
