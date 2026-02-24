let createInitialState;
let startFocus;
let pause;
let resume;
let reset;
let continueFocus;
let extendRemainingTime;
let startBreak;
let advance;
let checkAndResetDailyProgress;
let STATES;
let createSystemClock;
let createMemoryStorage;
let createNoopNotifier;
let createNoopSoundPlayer;

if (typeof module !== "undefined" && module.exports) {
  ({
    createInitialState,
    startFocus,
    pause,
    resume,
    reset,
    continueFocus,
    extendRemainingTime,
    startBreak,
    advance,
    checkAndResetDailyProgress,
  } = require("../domain/timerEngine"));
  ({ createSystemClock } = require("../infra/clock"));
  ({ createMemoryStorage } = require("../infra/storage"));
  ({ createNoopNotifier } = require("../infra/notifier"));
  ({ createNoopSoundPlayer } = require("../infra/soundPlayer"));
  ({ STATES } = require("../domain/stateMachine"));
} else {
  ({
    createInitialState,
    startFocus,
    pause,
    resume,
    reset,
    continueFocus,
    extendRemainingTime,
    startBreak,
    advance,
    checkAndResetDailyProgress,
  } = window.PomodoroTimerEngine);
  ({ createSystemClock } = window.PomodoroClock);
  ({ createMemoryStorage } = window.PomodoroStorage);
  ({ createNoopNotifier } = window.PomodoroNotifier);
  ({ createNoopSoundPlayer } = window.PomodoroSoundPlayer);
  ({ STATES } = window.PomodoroStateMachine);
}

function createTimerUseCase(options = {}) {
  const clock = options.clock ?? createSystemClock();
  const storage = options.storage ?? createMemoryStorage();
  const notifier = options.notifier ?? createNoopNotifier();
  const soundPlayer = options.soundPlayer ?? createNoopSoundPlayer();

  const stateKey = options.stateKey ?? "runtimeState";
  const listeners = [];

  let state = loadInitialState(storage, stateKey, options.initialStateOptions);

  function getState() {
    return { ...state };
  }

  function subscribe(listener) {
    listeners.push(listener);

    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  }

  function startFocusSession() {
    state = startFocus(state, clock.now());
    persistState();
    publish("state_changed", state);
    return getState();
  }

  function pauseTimer() {
    state = pause(state, clock.now());
    persistState();
    publish("state_changed", state);
    return getState();
  }

  function resumeTimer() {
    state = resume(state, clock.now());
    persistState();
    publish("state_changed", state);
    return getState();
  }

  function resetTimer() {
    state = reset(state);
    persistState();
    publish("state_changed", state);
    return getState();
  }

  function acceptBreak() {
    state = startBreak(state, clock.now());
    persistState();
    publish("state_changed", state);
    return getState();
  }

  function continueFocusSession() {
    state = continueFocus(state, clock.now());
    persistState();
    publish("state_changed", state);
    return getState();
  }

  function extendBySeconds(additionalSeconds = 300) {
    state = extendRemainingTime(state, additionalSeconds);
    persistState();
    publish("state_changed", state);
    return getState();
  }

  function tick() {
    const result = advance(state, clock.now());
    state = result.state;

    handleEvents(result.events);
    persistState();
    publish("state_changed", state);

    return {
      state: getState(),
      events: result.events,
    };
  }

  function publish(type, payload) {
    listeners.forEach((listener) => listener({ type, payload }));
  }

  function handleEvents(events) {
    events.forEach((event) => {
      if (event === "break_suggestion_due") {
        soundPlayer.playBell();
        notifier.notify("休憩しませんか？");
      }

      if (event === "focus_completed") {
        soundPlayer.playBell();
        notifier.notify("集中セッションが完了しました");
      }

      if (event === "break_completed") {
        soundPlayer.playBell();
        notifier.notify("休憩が完了しました。作業に戻りましょう");
      }

      publish("domain_event", event);
    });
  }

  function persistState() {
    try {
      storage.set(stateKey, JSON.stringify(state));
    } catch {
    }
  }

  return {
    getState,
    subscribe,
    startFocus: startFocusSession,
    pause: pauseTimer,
    resume: resumeTimer,
    reset: resetTimer,
    acceptBreak,
    continueFocus: continueFocusSession,
    extendBySeconds,
    tick,
  };
}

function loadInitialState(storage, stateKey, initialStateOptions) {
  let raw = null;

  try {
    raw = storage.get(stateKey);
  } catch {
    raw = null;
  }

  if (!raw) {
    return createInitialState(initialStateOptions);
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isValidMode(parsed.mode)) {
      return createInitialState(initialStateOptions);
    }

    const restoredState = { ...createInitialState(initialStateOptions), ...parsed };
    return checkAndResetDailyProgress(restoredState);
  } catch {
    return createInitialState(initialStateOptions);
  }
}

function isValidMode(mode) {
  return Object.values(STATES).includes(mode);
}

const api = {
  createTimerUseCase,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.PomodoroTimerUseCase = api;
}
