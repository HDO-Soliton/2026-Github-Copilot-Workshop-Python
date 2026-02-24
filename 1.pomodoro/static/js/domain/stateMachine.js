const STATES = Object.freeze({
  IDLE: "idle",
  FOCUS_RUNNING: "focus_running",
  FOCUS_PAUSED: "focus_paused",
  BREAK_RUNNING: "break_running",
  BREAK_PAUSED: "break_paused",
});

const ALLOWED_TRANSITIONS = Object.freeze({
  [STATES.IDLE]: [STATES.FOCUS_RUNNING, STATES.BREAK_RUNNING],
  [STATES.FOCUS_RUNNING]: [STATES.FOCUS_PAUSED, STATES.IDLE, STATES.BREAK_RUNNING],
  [STATES.FOCUS_PAUSED]: [STATES.FOCUS_RUNNING, STATES.IDLE, STATES.BREAK_RUNNING],
  [STATES.BREAK_RUNNING]: [STATES.BREAK_PAUSED, STATES.IDLE],
  [STATES.BREAK_PAUSED]: [STATES.BREAK_RUNNING, STATES.IDLE],
});

function isValidState(state) {
  return Object.values(STATES).includes(state);
}

function canTransition(fromState, toState) {
  if (!isValidState(fromState) || !isValidState(toState)) {
    return false;
  }

  return ALLOWED_TRANSITIONS[fromState].includes(toState);
}

function transition(fromState, toState) {
  if (!canTransition(fromState, toState)) {
    throw new Error(`Invalid state transition: ${fromState} -> ${toState}`);
  }

  return toState;
}

const api = {
  STATES,
  canTransition,
  transition,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.PomodoroStateMachine = api;
}
