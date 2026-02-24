(function initPomodoroApp() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    runFullApp();
  } catch {
    runFallbackTimer();
  }
})();

function runFullApp() {
  const { createTimerUseCase } = window.PomodoroTimerUseCase;
  const { createDomController } = window.PomodoroDom;
  const { createLocalStorageAdapter } = window.PomodoroStorage;
  const { createBrowserSoundPlayer } = window.PomodoroSoundPlayer;
  const { createBrowserNotifier } = window.PomodoroNotifier;

  const useCase = createTimerUseCase({
    storage: createLocalStorageAdapter("pomodoro"),
    notifier: createBrowserNotifier(),
    soundPlayer: createBrowserSoundPlayer(),
  });

  const dom = createDomController();

  dom.bindHandlers({
    onPrimaryClick: () => {
      const state = useCase.getState();

      if (state.mode === "idle") {
        useCase.startFocus();
        dom.render(useCase.getState());
        return;
      }

      if (state.mode === "focus_running" || state.mode === "break_running") {
        useCase.pause();
        dom.render(useCase.getState());
        return;
      }

      useCase.resume();
      dom.render(useCase.getState());
    },
    onResetClick: () => {
      useCase.reset();
      dom.hideSuggestion();
      dom.render(useCase.getState());
    },
    onAddFiveClick: () => {
      try {
        useCase.extendBySeconds(5 * 60);
        dom.render(useCase.getState());
      } catch {
      }
    },
    onAcceptBreakClick: () => {
      useCase.acceptBreak();
      dom.hideSuggestion();
      dom.render(useCase.getState());
    },
    onContinueFocusClick: () => {
      useCase.continueFocus();
      dom.hideSuggestion();
      dom.render(useCase.getState());
    },
  });

  dom.render(useCase.getState());

  window.setInterval(() => {
    const result = useCase.tick();

    if (result.events.includes("break_suggestion_due")) {
      dom.showSuggestion();
    }

    if (result.events.includes("break_completed")) {
      dom.hideSuggestion();
    }

    dom.render(useCase.getState());
  }, 250);
}

function runFallbackTimer() {
  const primaryBtnEl = document.getElementById("primary-btn");
  const resetBtnEl = document.getElementById("reset-btn");
  const addFiveBtnEl = document.getElementById("add-five-btn");
  const timeValueEl = document.getElementById("time-value");
  const sessionLabelEl = document.getElementById("session-label");

  if (!primaryBtnEl || !resetBtnEl || !addFiveBtnEl || !timeValueEl || !sessionLabelEl) {
    return;
  }

  let remainingSec = 25 * 60;
  let timerId = null;
  let running = false;

  renderFallback();

  primaryBtnEl.addEventListener("click", () => {
    if (!running) {
      running = true;
      primaryBtnEl.textContent = "停止";
      sessionLabelEl.textContent = "作業中";
      timerId = window.setInterval(() => {
        remainingSec -= 1;
        if (remainingSec <= 0) {
          remainingSec = 0;
          stopFallback();
        }
        renderFallback();
      }, 1000);
      return;
    }

    stopFallback();
    primaryBtnEl.textContent = "再開";
    renderFallback();
  });

  resetBtnEl.addEventListener("click", () => {
    stopFallback();
    remainingSec = 25 * 60;
    primaryBtnEl.textContent = "開始";
    sessionLabelEl.textContent = "準備完了";
    renderFallback();
  });

  addFiveBtnEl.addEventListener("click", () => {
    remainingSec += 5 * 60;
    renderFallback();
  });

  function stopFallback() {
    running = false;
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function renderFallback() {
    const minutes = Math.floor(remainingSec / 60);
    const seconds = remainingSec % 60;
    timeValueEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
}
