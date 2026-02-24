const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createMemoryStorage,
  createLocalStorageAdapter,
} = require("../../../static/js/infra/storage");

test("createMemoryStorage: set/getが動作する", () => {
  const storage = createMemoryStorage();

  storage.set("key", "value");

  assert.equal(storage.get("key"), "value");
  assert.equal(storage.get("missing"), null);
});

test("createLocalStorageAdapter: localStorageが無い環境でもgetはnullを返す", () => {
  const original = global.localStorage;
  delete global.localStorage;

  const adapter = createLocalStorageAdapter("test");
  const value = adapter.get("key");

  if (typeof original !== "undefined") {
    global.localStorage = original;
  }

  assert.equal(value, null);
});

test("createLocalStorageAdapter: get/setで例外が発生してもthrowしない", () => {
  const original = global.localStorage;

  global.localStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };

  const adapter = createLocalStorageAdapter("test");

  assert.doesNotThrow(() => adapter.set("key", "value"));
  assert.equal(adapter.get("key"), null);

  if (typeof original !== "undefined") {
    global.localStorage = original;
  } else {
    delete global.localStorage;
  }
});
