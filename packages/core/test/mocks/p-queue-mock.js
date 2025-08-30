class PQueueMock {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 1;
    this.size = 0;
    this.pending = 0;
  }

  async add(fn) {
    this.size++;
    this.pending++;
    try {
      const result = await fn();
      this.pending--;
      return result;
    } catch (error) {
      this.pending--;
      throw error;
    }
  }

  onIdle() {
    return Promise.resolve();
  }

  onEmpty() {
    return Promise.resolve();
  }

  onSizeLessThan(limit) {
    return Promise.resolve();
  }

  on(event, handler) {
    // Mock event handling
  }

  emit(event, data) {
    // Mock event emission
  }
}

module.exports = PQueueMock;
