const test = require("node:test");
const assert = require("node:assert/strict");

const { STATES } = require("../../../static/js/domain/stateMachine");
const {
  createInitialState,
  startFocus,
  pause,
  resume,
  reset,
  continueFocus,
  extendRemainingTime,
  startBreak,
  shouldSuggestBreak,
  advance,
  getRemainingSeconds,
  checkAndResetDailyProgress,
} = require("../../../static/js/domain/timerEngine");

test("開始時に終了予定時刻と提案時刻を持つ", () => {
  const now = 1_700_000_000_000;
  const initial = createInitialState({ suggestionIntervalSec: 60 });
  const next = startFocus(initial, now);

  assert.equal(next.mode, STATES.FOCUS_RUNNING);
  assert.equal(next.endAt, now + initial.focusDurationSec * 1000);
  assert.equal(next.nextBreakSuggestionAt, now + 60 * 1000);
});

test("一時停止と再開で残り時間を維持できる", () => {
  const now = 1_700_000_000_000;
  const started = startFocus(createInitialState(), now);
  const paused = pause(started, now + 10_000);
  const resumed = resume(paused, now + 20_000);

  assert.equal(paused.mode, STATES.FOCUS_PAUSED);
  assert.equal(paused.remainingSec, 25 * 60 - 10);
  assert.equal(resumed.mode, STATES.FOCUS_RUNNING);
  assert.equal(getRemainingSeconds(resumed, now + 20_000), paused.remainingSec);
});

test("提案時刻に到達すると休憩提案判定がtrueになる", () => {
  const now = 1_700_000_000_000;
  const started = startFocus(createInitialState({ suggestionIntervalSec: 30 }), now);

  assert.equal(shouldSuggestBreak(started, now + 29_000), false);
  assert.equal(shouldSuggestBreak(started, now + 30_000), true);
});

test("続けるを選ぶと再提案時刻が先送りされる", () => {
  const now = 1_700_000_000_000;
  const started = startFocus(createInitialState({ suggestionSnoozeSec: 20 }), now);
  const deferred = continueFocus(started, now + 61_000);

  assert.equal(deferred.nextBreakSuggestionAt, now + 61_000 + 20_000);
});

test("提案イベントは一度発火したら再設定されるまで連続しない", () => {
  const now = 1_700_000_000_000;
  const started = startFocus(createInitialState({ suggestionIntervalSec: 1 }), now);

  const first = advance(started, now + 1_100);
  const second = advance(first.state, now + 1_500);

  assert.equal(first.events.includes("break_suggestion_due"), true);
  assert.equal(second.events.includes("break_suggestion_due"), false);
});

test("実行中タイマーを延長できる", () => {
  const now = 1_700_000_000_000;
  const started = startFocus(createInitialState(), now);
  const extended = extendRemainingTime(started, 300);

  assert.equal(extended.remainingSec, started.remainingSec + 300);
  assert.equal(extended.endAt, started.endAt + 300_000);
});

test("0秒到達でfocus_completedイベントとidle遷移になる", () => {
  const now = 1_700_000_000_000;
  const started = startFocus(createInitialState(), now);
  const result = advance(started, started.endAt);

  assert.equal(result.state.mode, STATES.IDLE);
  assert.deepEqual(result.events.includes("focus_completed"), true);
  assert.equal(result.state.completedFocusCount, 1);
});

test("休憩開始と休憩終了の遷移が正しい", () => {
  const now = 1_700_000_000_000;
  const focus = startFocus(createInitialState(), now);
  const breakRunning = startBreak(focus, now + 15_000);
  const breakEnded = advance(breakRunning, breakRunning.endAt);

  assert.equal(breakRunning.mode, STATES.BREAK_RUNNING);
  assert.equal(breakEnded.state.mode, STATES.IDLE);
  assert.deepEqual(breakEnded.events.includes("break_completed"), true);
});

test("リセットで初期状態に戻る", () => {
  const now = 1_700_000_000_000;
  const started = startFocus(createInitialState({ focusDurationSec: 1800 }), now);
  const resetState = reset(started);

  assert.equal(resetState.mode, STATES.IDLE);
  assert.equal(resetState.remainingSec, 1800);
  assert.equal(resetState.endAt, null);
});

test("リセット時に当日進捗が保持される", () => {
  const now = 1_700_000_000_000;
  const started = startFocus(createInitialState(), now);
  const completed = advance(started, started.endAt);
  
  assert.equal(completed.state.focusSecondsToday, 25 * 60);
  assert.equal(completed.state.completedFocusCount, 1);
  
  const resetState = reset(completed.state);
  
  assert.equal(resetState.mode, STATES.IDLE);
  assert.equal(resetState.focusSecondsToday, 25 * 60);
  assert.equal(resetState.completedFocusCount, 1);
});

test("日付が変わると進捗がリセットされる", () => {
  const state = {
    ...createInitialState(),
    focusSecondsToday: 3600,
    completedFocusCount: 3,
    progressDate: "2026-02-23",
  };
  
  const checkedState = checkAndResetDailyProgress(state);
  
  assert.equal(checkedState.focusSecondsToday, 0);
  assert.equal(checkedState.completedFocusCount, 0);
  assert.notEqual(checkedState.progressDate, "2026-02-23");
});

test("同じ日付なら進捗が保持される", () => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  
  const state = {
    ...createInitialState(),
    focusSecondsToday: 3600,
    completedFocusCount: 3,
    progressDate: todayStr,
  };
  
  const checkedState = checkAndResetDailyProgress(state);
  
  assert.equal(checkedState.focusSecondsToday, 3600);
  assert.equal(checkedState.completedFocusCount, 3);
  assert.equal(checkedState.progressDate, todayStr);
});
