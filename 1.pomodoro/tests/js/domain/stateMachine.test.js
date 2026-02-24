const test = require("node:test");
const assert = require("node:assert/strict");

const { STATES, canTransition, transition } = require("../../../static/js/domain/stateMachine");

test("canTransition: 許可された遷移を判定できる", () => {
  assert.equal(canTransition(STATES.IDLE, STATES.FOCUS_RUNNING), true);
  assert.equal(canTransition(STATES.FOCUS_RUNNING, STATES.FOCUS_PAUSED), true);
  assert.equal(canTransition(STATES.BREAK_PAUSED, STATES.BREAK_RUNNING), true);
});

test("canTransition: 不正な遷移を拒否する", () => {
  assert.equal(canTransition(STATES.IDLE, STATES.FOCUS_PAUSED), false);
  assert.equal(canTransition(STATES.BREAK_RUNNING, STATES.FOCUS_RUNNING), false);
  assert.equal(canTransition("unknown", STATES.IDLE), false);
});

test("transition: 不正な遷移で例外を投げる", () => {
  assert.throws(
    () => transition(STATES.IDLE, STATES.BREAK_PAUSED),
    /Invalid state transition/
  );
});
