function createNoopNotifier() {
  return {
    notify() {},
  };
}

function createBrowserNotifier() {
  return {
    notify(message) {
      if (typeof Notification === "undefined") {
        return;
      }

      if (Notification.permission === "granted") {
        new Notification(message);
      }
    },
  };
}

const api = {
  createNoopNotifier,
  createBrowserNotifier,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.PomodoroNotifier = api;
}
