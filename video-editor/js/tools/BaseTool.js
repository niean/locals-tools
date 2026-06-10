export class BaseTool {
  constructor(options = {}) {
    this.name = options.name || 'base';
    this.active = false;
  }

  activate() {
    this.active = true;
  }

  deactivate() {
    this.active = false;
  }

  isActive() {
    return this.active;
  }

  renderPropertyBar() {}

  onPointerDown() {}

  onPointerMove() {}

  onPointerUp() {}
}
