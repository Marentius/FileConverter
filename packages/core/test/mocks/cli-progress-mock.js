class SingleBar {
  constructor(options = {}) {
    this.options = options;
  }

  start(total, startValue, payload) {
    // Mock start
  }

  update(current, payload) {
    // Mock update
  }

  stop() {
    // Mock stop
  }
}

const cliProgress = {
  SingleBar
};

module.exports = cliProgress;
