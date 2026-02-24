const test = require("node:test");
const assert = require("node:assert/strict");

const { STATES } = require("../../../static/js/domain/stateMachine");
const { createTimerUseCase } = require("../../../static/js/application/timerUseCase");

function createFakeClock(start) {
  let current = start;

  return {
    now() {
      return current;
    },
    advance(ms) {
      current += ms;
    },
  };
}

function createSpyNotifier() {
  const messages = [];

  return {
    notify(message) {
      messages.push(message);
    },
    messages,
  };
}

function createSpySoundPlayer() {
  let bellCount = 0;

  return {
    playBell() {
      bellCount += 1;
    },
    getBellCount() {
      return bellCount;
    },
  };
}

function createMemoryStorage() {
  const map = new Map();

  return {
    get(key) {
      return map.has(key) ? map.get(key) : null;
    },
    set(key, value) {
      map.set(key, value);
    },
  };
}

test("start/pause/resume/reset をユースケース経由で実行できる", () => {
  const clock = createFakeClock(1_700_000_000_000);
  const useCase = createTimerUseCase({ clock, storage: createMemoryStorage() });

  useCase.startFocus();
  assert.equal(useCase.getState().mode, STATES.FOCUS_RUNNING);

  clock.advance(5_000);
  useCase.pause();
  assert.equal(useCase.getState().mode, STATES.FOCUS_PAUSED);

  useCase.resume();
  assert.equal(useCase.getState().mode, STATES.FOCUS_RUNNING);

  useCase.reset();
  assert.equal(useCase.getState().mode, STATES.IDLE);
});

test("acceptBreak / continueFocus が実行できる", () => {
  const clock = createFakeClock(1_700_000_000_000);
  const useCase = createTimerUseCase({ clock, storage: createMemoryStorage() });

  useCase.startFocus();
  useCase.continueFocus();
  assert.equal(useCase.getState().mode, STATES.FOCUS_RUNNING);

  useCase.acceptBreak();
  assert.equal(useCase.getState().mode, STATES.BREAK_RUNNING);
});

test("extendBySecondsで残り時間を延長できる", () => {
  const clock = createFakeClock(1_700_000_000_000);
  const useCase = createTimerUseCase({ clock, storage: createMemoryStorage() });

  useCase.startFocus();
  const before = useCase.getState();
  useCase.extendBySeconds(300);
  const after = useCase.getState();

  assert.equal(after.remainingSec, before.remainingSec + 300);
});

test("提案イベント発火時に通知とベルが呼ばれる", () => {
  const clock = createFakeClock(1_700_000_000_000);
  const notifier = createSpyNotifier();
  const soundPlayer = createSpySoundPlayer();
  const useCase = createTimerUseCase({
    clock,
    notifier,
    soundPlayer,
    storage: createMemoryStorage(),
    initialStateOptions: {
      suggestionIntervalSec: 1,
    },
  });

  useCase.startFocus();
  clock.advance(1_100);

  const result = useCase.tick();

  assert.equal(result.events.includes("break_suggestion_due"), true);
  assert.equal(notifier.messages.includes("休憩しませんか？"), true);
  assert.equal(soundPlayer.getBellCount() > 0, true);
});

test("subscribeで状態変更イベントを受け取れる", () => {
  const clock = createFakeClock(1_700_000_000_000);
  const useCase = createTimerUseCase({ clock, storage: createMemoryStorage() });
  const eventTypes = [];

  const unsubscribe = useCase.subscribe((event) => {
    eventTypes.push(event.type);
  });

  useCase.startFocus();
  useCase.tick();
  unsubscribe();
  useCase.reset();

  assert.equal(eventTypes.includes("state_changed"), true);
});

test("保存済みmodeが不正な場合は初期状態で起動する", () => {
  const clock = createFakeClock(1_700_000_000_000);
  const storage = {
    get() {
      return JSON.stringify({ mode: "legacy_mode", remainingSec: 999 });
    },
    set() {},
  };

  const useCase = createTimerUseCase({ clock, storage });

  assert.equal(useCase.getState().mode, STATES.IDLE);
  assert.equal(useCase.getState().remainingSec, 25 * 60);
});

test("storageが例外を投げても動作継続できる", () => {
  const clock = createFakeClock(1_700_000_000_000);
  const storage = {
    get() {
      throw new Error("read failed");
    },
    set() {
      throw new Error("write failed");
    },
  };

  const useCase = createTimerUseCase({ clock, storage });

  assert.doesNotThrow(() => useCase.startFocus());
  assert.equal(useCase.getState().mode, STATES.FOCUS_RUNNING);
});
