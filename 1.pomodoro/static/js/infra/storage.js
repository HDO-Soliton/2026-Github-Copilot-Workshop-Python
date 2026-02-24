function createMemoryStorage(initialState = {}) {
  const store = new Map(Object.entries(initialState));

  return {
    get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    set(key, value) {
      store.set(key, value);
    },
  };
}

function createLocalStorageAdapter(prefix = "pomodoro") {
  return {
    get(key) {
      if (typeof localStorage === "undefined") {
        return null;
      }

      try {
        return localStorage.getItem(`${prefix}:${key}`);
      } catch {
        return null;
      }
    },
    set(key, value) {
      if (typeof localStorage === "undefined") {
        return;
      }

      try {
        localStorage.setItem(`${prefix}:${key}`, value);
      } catch {
      }
    },
  };
}

const api = {
  createMemoryStorage,
  createLocalStorageAdapter,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.PomodoroStorage = api;
}
