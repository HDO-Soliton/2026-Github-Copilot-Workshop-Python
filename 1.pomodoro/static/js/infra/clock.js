function createSystemClock() {
  return {
    now() {
      return Date.now();
    },
  };
}

const api = {
  createSystemClock,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.PomodoroClock = api;
}
