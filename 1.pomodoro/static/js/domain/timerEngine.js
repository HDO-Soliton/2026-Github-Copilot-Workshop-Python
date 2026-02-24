let STATES;
let transition;

if (typeof module !== "undefined" && module.exports) {
  ({ STATES, transition } = require("./stateMachine"));
} else {
  ({ STATES, transition } = window.PomodoroStateMachine);
}

function createInitialState(options = {}) {
  const focusDurationSec = options.focusDurationSec ?? 25 * 60;
  const breakDurationSec = options.breakDurationSec ?? 10 * 60;
  const suggestionIntervalSec = options.suggestionIntervalSec ?? 90 * 60;
  const suggestionSnoozeSec = options.suggestionSnoozeSec ?? 20 * 60;

  return {
    mode: STATES.IDLE,
    focusDurationSec,
    breakDurationSec,
    suggestionIntervalSec,
    suggestionSnoozeSec,
    remainingSec: focusDurationSec,
    endAt: null,
    nextBreakSuggestionAt: null,
    focusSecondsToday: 0,
    completedFocusCount: 0,
    progressDate: getTodayDateString(),
  };
}

function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getRemainingSeconds(state, nowMs) {
  if (!isRunning(state.mode) || state.endAt === null) {
    return state.remainingSec;
  }

  const diffMs = state.endAt - nowMs;
  if (diffMs <= 0) {
    return 0;
  }

  return Math.ceil(diffMs / 1000);
}

function startFocus(state, nowMs) {
  const nextMode = transition(state.mode, STATES.FOCUS_RUNNING);

  return {
    ...state,
    mode: nextMode,
    remainingSec: state.focusDurationSec,
    endAt: nowMs + state.focusDurationSec * 1000,
    nextBreakSuggestionAt: nowMs + state.suggestionIntervalSec * 1000,
  };
}

function pause(state, nowMs) {
  if (state.mode === STATES.FOCUS_RUNNING) {
    return {
      ...state,
      mode: transition(state.mode, STATES.FOCUS_PAUSED),
      remainingSec: getRemainingSeconds(state, nowMs),
      endAt: null,
    };
  }

  if (state.mode === STATES.BREAK_RUNNING) {
    return {
      ...state,
      mode: transition(state.mode, STATES.BREAK_PAUSED),
      remainingSec: getRemainingSeconds(state, nowMs),
      endAt: null,
    };
  }

  throw new Error(`Cannot pause in mode: ${state.mode}`);
}

function resume(state, nowMs) {
  if (state.mode === STATES.FOCUS_PAUSED) {
    return {
      ...state,
      mode: transition(state.mode, STATES.FOCUS_RUNNING),
      endAt: nowMs + state.remainingSec * 1000,
      nextBreakSuggestionAt: nowMs + state.suggestionSnoozeSec * 1000,
    };
  }

  if (state.mode === STATES.BREAK_PAUSED) {
    return {
      ...state,
      mode: transition(state.mode, STATES.BREAK_RUNNING),
      endAt: nowMs + state.remainingSec * 1000,
    };
  }

  throw new Error(`Cannot resume in mode: ${state.mode}`);
}

function reset(state) {
  return {
    ...createInitialState({
      focusDurationSec: state.focusDurationSec,
      breakDurationSec: state.breakDurationSec,
      suggestionIntervalSec: state.suggestionIntervalSec,
      suggestionSnoozeSec: state.suggestionSnoozeSec,
    }),
    focusSecondsToday: state.focusSecondsToday,
    completedFocusCount: state.completedFocusCount,
    progressDate: state.progressDate,
  };
}

function checkAndResetDailyProgress(state) {
  const today = getTodayDateString();
  if (state.progressDate !== today) {
    return {
      ...state,
      focusSecondsToday: 0,
      completedFocusCount: 0,
      progressDate: today,
    };
  }
  return state;
}

function continueFocus(state, nowMs) {
  if (state.mode !== STATES.FOCUS_RUNNING) {
    throw new Error(`Cannot continue focus in mode: ${state.mode}`);
  }

  return {
    ...state,
    nextBreakSuggestionAt: nowMs + state.suggestionSnoozeSec * 1000,
  };
}

function extendRemainingTime(state, additionalSec) {
  if (additionalSec <= 0) {
    return state;
  }

  if (!isRunning(state.mode) && state.mode !== STATES.FOCUS_PAUSED && state.mode !== STATES.BREAK_PAUSED) {
    throw new Error(`Cannot extend timer in mode: ${state.mode}`);
  }

  const nextState = {
    ...state,
    remainingSec: state.remainingSec + additionalSec,
  };

  if (state.endAt !== null) {
    nextState.endAt = state.endAt + additionalSec * 1000;
  }

  return nextState;
}

function startBreak(state, nowMs) {
  if (
    state.mode !== STATES.IDLE &&
    state.mode !== STATES.FOCUS_RUNNING &&
    state.mode !== STATES.FOCUS_PAUSED
  ) {
    throw new Error(`Cannot start break in mode: ${state.mode}`);
  }

  const nextMode = transition(state.mode, STATES.BREAK_RUNNING);

  return {
    ...state,
    mode: nextMode,
    remainingSec: state.breakDurationSec,
    endAt: nowMs + state.breakDurationSec * 1000,
    nextBreakSuggestionAt: null,
  };
}

function shouldSuggestBreak(state, nowMs) {
  if (state.mode !== STATES.FOCUS_RUNNING || state.nextBreakSuggestionAt === null) {
    return false;
  }

  return nowMs >= state.nextBreakSuggestionAt;
}

function advance(state, nowMs) {
  const events = [];
  let nextBreakSuggestionAt = state.nextBreakSuggestionAt;

  if (!isRunning(state.mode) || state.endAt === null) {
    return { state, events };
  }

  const remainingSec = getRemainingSeconds(state, nowMs);

  if (state.mode === STATES.FOCUS_RUNNING && shouldSuggestBreak(state, nowMs)) {
    events.push("break_suggestion_due");
    nextBreakSuggestionAt = null;
  }

  if (remainingSec > 0) {
    return {
      state: {
        ...state,
        remainingSec,
        nextBreakSuggestionAt,
      },
      events,
    };
  }

  if (state.mode === STATES.FOCUS_RUNNING) {
    events.push("focus_completed");
    return {
      state: {
        ...state,
        mode: transition(state.mode, STATES.IDLE),
        remainingSec: state.focusDurationSec,
        endAt: null,
        nextBreakSuggestionAt: null,
        focusSecondsToday: state.focusSecondsToday + state.focusDurationSec,
        completedFocusCount: state.completedFocusCount + 1,
        progressDate: getTodayDateString(),
      },
      events,
    };
  }

  events.push("break_completed");
  return {
    state: {
      ...state,
      mode: transition(state.mode, STATES.IDLE),
      remainingSec: state.focusDurationSec,
      endAt: null,
      nextBreakSuggestionAt: null,
    },
    events,
  };
}

function isRunning(mode) {
  return mode === STATES.FOCUS_RUNNING || mode === STATES.BREAK_RUNNING;
}

const api = {
  createInitialState,
  getRemainingSeconds,
  startFocus,
  pause,
  resume,
  reset,
  continueFocus,
  extendRemainingTime,
  startBreak,
  shouldSuggestBreak,
  advance,
  checkAndResetDailyProgress,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.PomodoroTimerEngine = api;
}
