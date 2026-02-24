function createDomController() {
  const sessionLabelEl = document.getElementById("session-label");
  const timeValueEl = document.getElementById("time-value");
  const ringValueEl = document.getElementById("ring-value");
  const primaryBtnEl = document.getElementById("primary-btn");
  const resetBtnEl = document.getElementById("reset-btn");
  const addFiveBtnEl = document.getElementById("add-five-btn");
  const suggestionPanelEl = document.getElementById("suggestion-panel");
  const acceptBreakBtnEl = document.getElementById("accept-break-btn");
  const continueFocusBtnEl = document.getElementById("continue-focus-btn");
  const completedCountEl = document.getElementById("completed-count");
  const focusTimeEl = document.getElementById("focus-time");

  const radius = 84;
  const circumference = 2 * Math.PI * radius;

  ringValueEl.style.strokeDasharray = String(circumference);

  function render(state) {
    const totalSeconds = state.mode.startsWith("break") ? state.breakDurationSec : state.focusDurationSec;

    sessionLabelEl.textContent = modeToLabel(state.mode);
    timeValueEl.textContent = formatSeconds(state.remainingSec);
    completedCountEl.textContent = String(state.completedFocusCount);
    focusTimeEl.textContent = formatMinutes(state.focusSecondsToday);

    const ratio = totalSeconds <= 0 ? 0 : state.remainingSec / totalSeconds;
    const dashOffset = circumference * (1 - clamp(ratio, 0, 1));
    ringValueEl.style.strokeDashoffset = String(dashOffset);

    primaryBtnEl.textContent = primaryLabel(state.mode);
    addFiveBtnEl.disabled = state.mode === "idle";

    if (state.mode === "break_running" || state.mode === "break_paused") {
      hideSuggestion();
    }
  }

  function bindHandlers(handlers) {
    primaryBtnEl.addEventListener("click", handlers.onPrimaryClick);
    resetBtnEl.addEventListener("click", handlers.onResetClick);
    addFiveBtnEl.addEventListener("click", handlers.onAddFiveClick);
    acceptBreakBtnEl.addEventListener("click", handlers.onAcceptBreakClick);
    continueFocusBtnEl.addEventListener("click", handlers.onContinueFocusClick);
  }

  function showSuggestion() {
    suggestionPanelEl.classList.remove("is-hidden");
  }

  function hideSuggestion() {
    suggestionPanelEl.classList.add("is-hidden");
  }

  return {
    render,
    bindHandlers,
    showSuggestion,
    hideSuggestion,
  };
}

function modeToLabel(mode) {
  if (mode === "focus_running" || mode === "focus_paused") {
    return "作業中";
  }

  if (mode === "break_running" || mode === "break_paused") {
    return "休憩中";
  }

  return "準備完了";
}

function primaryLabel(mode) {
  if (mode === "idle") {
    return "開始";
  }

  if (mode === "focus_running" || mode === "break_running") {
    return "停止";
  }

  return "再開";
}

function formatSeconds(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMinutes(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remain = minutes % 60;
    return remain === 0 ? `${hours}時間` : `${hours}時間${remain}分`;
  }

  return `${minutes}分`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

if (typeof window !== "undefined") {
  window.PomodoroDom = {
    createDomController,
  };
}
