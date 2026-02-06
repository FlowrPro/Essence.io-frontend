class Interpolator {
  constructor(bufferSize = 2) {
    this.bufferSize = bufferSize;
    this.states = [];
    this.currentIndex = 0;
  }

  addState(state) {
    this.states.push({
      ...state,
      timestamp: Date.now()
    });

    if (this.states.length > this.bufferSize) {
      this.states.shift();
    }

    this.currentIndex = this.states.length - 1;
  }

  getInterpolatedState(targetTime) {
    if (this.states.length < 2) {
      return this.states[0] || null;
    }

    const state1 = this.states[this.states.length - 2];
    const state2 = this.states[this.states.length - 1];

    const timeDiff = state2.timestamp - state1.timestamp;
    if (timeDiff === 0) return state2;

    const alpha = Math.min(1, (targetTime - state1.timestamp) / timeDiff);

    return {
      position: {
        x: state1.position.x + (state2.position.x - state1.position.x) * alpha,
        y: state1.position.y + (state2.position.y - state1.position.y) * alpha
      },
      rotation: state1.rotation + (state2.rotation - state1.rotation) * alpha,
      velocity: state2.velocity,
      timestamp: targetTime
    };
  }
}
