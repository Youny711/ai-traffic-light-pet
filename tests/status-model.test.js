const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeStatusEvent,
  createStatusStore,
  PET_STATES,
  PROVIDERS,
} = require('../src/shared/status-model');

test('normalizes supported provider status into pet states', () => {
  assert.deepEqual(normalizeStatusEvent({
    provider: 'chatgpt',
    status: 'generating',
    title: 'ChatGPT',
  }), {
    provider: 'chatgpt',
    status: 'generating',
    petState: PET_STATES.WORKING,
    title: 'ChatGPT',
    message: 'ChatGPT 正在生成',
  });

  assert.deepEqual(normalizeStatusEvent({
    provider: 'gemini',
    status: 'error',
  }), {
    provider: 'gemini',
    status: 'error',
    petState: PET_STATES.ERROR,
    title: 'Gemini',
    message: 'Gemini 出错了',
  });

  assert.deepEqual(normalizeStatusEvent({
    provider: 'doubao',
    status: 'waiting',
  }), {
    provider: 'doubao',
    status: 'waiting',
    petState: PET_STATES.WAITING,
    title: '豆包',
    message: '豆包 等待你操作',
  });

  assert.deepEqual(normalizeStatusEvent({
    provider: 'deepseek',
    status: 'open',
  }), {
    provider: 'deepseek',
    status: 'open',
    petState: PET_STATES.IDLE,
    title: 'DeepSeek',
    message: 'DeepSeek 已打开',
  });
});

test('rejects unknown provider and status values', () => {
  assert.throws(() => normalizeStatusEvent({
    provider: 'perplexity',
    status: 'idle',
  }), /Unsupported provider/);

  assert.throws(() => normalizeStatusEvent({
    provider: 'chatgpt',
    status: 'sleeping',
  }), /Unsupported status/);
});

test('status store exposes four independent provider lights', () => {
  const store = createStatusStore({ now: () => 1000 });

  const initial = store.getSnapshot();
  assert.equal(initial.petState, PET_STATES.DISCONNECTED);
  assert.deepEqual(initial.providers.map((provider) => provider.provider), [
    PROVIDERS.CHATGPT,
    PROVIDERS.GEMINI,
    PROVIDERS.DOUBAO,
    PROVIDERS.DEEPSEEK,
  ]);
  assert.ok(initial.providers.every((provider) => provider.petState === PET_STATES.DISCONNECTED));

  store.update({ provider: 'chatgpt', status: 'open' });
  assert.equal(store.getProvider(PROVIDERS.CHATGPT).petState, PET_STATES.IDLE);
  assert.equal(store.getProvider(PROVIDERS.GEMINI).petState, PET_STATES.DISCONNECTED);

  store.update({ provider: 'gemini', status: 'generating' });
  assert.equal(store.getProvider(PROVIDERS.GEMINI).petState, PET_STATES.WORKING);

  store.update({ provider: 'chatgpt', status: 'error' });
  assert.equal(store.getProvider(PROVIDERS.CHATGPT).petState, PET_STATES.ERROR);

  store.update({ provider: 'chatgpt', status: 'open' });
  assert.equal(store.getProvider(PROVIDERS.CHATGPT).petState, PET_STATES.ERROR);
  assert.equal(store.getProvider(PROVIDERS.GEMINI).petState, PET_STATES.WORKING);
});

test('idle means page is open but no operation should be highlighted', () => {
  const store = createStatusStore({ now: () => 1000 });

  store.update({ provider: 'chatgpt', status: 'idle' });

  assert.equal(store.getProvider(PROVIDERS.CHATGPT).status, 'idle');
  assert.equal(store.getProvider(PROVIDERS.CHATGPT).petState, PET_STATES.DISCONNECTED);
});

test('generating remains yellow while execution heartbeat is fresh', () => {
  let currentTime = 1000;
  const store = createStatusStore({
    activeTtlMs: 60000,
    now: () => currentTime,
  });

  store.update({ provider: 'deepseek', status: 'generating' });
  assert.equal(store.getProvider(PROVIDERS.DEEPSEEK).petState, PET_STATES.WORKING);

  currentTime = 30000;
  assert.equal(store.getProvider(PROVIDERS.DEEPSEEK).petState, PET_STATES.WORKING);

  currentTime = 62000;
  assert.equal(store.getProvider(PROVIDERS.DEEPSEEK).petState, PET_STATES.DISCONNECTED);
});

test('page open green notification expires to idle gray after 3 seconds', () => {
  let currentTime = 1000;
  const store = createStatusStore({
    activeTtlMs: 30000,
    openDisplayMs: 3000,
    now: () => currentTime,
  });

  store.update({ provider: 'gemini', status: 'open' });
  assert.equal(store.getProvider(PROVIDERS.GEMINI).status, 'open');
  assert.equal(store.getProvider(PROVIDERS.GEMINI).petState, PET_STATES.IDLE);

  currentTime = 4001;
  assert.equal(store.getProvider(PROVIDERS.GEMINI).status, 'idle');
  assert.equal(store.getProvider(PROVIDERS.GEMINI).petState, PET_STATES.DISCONNECTED);
});

test('completion green and error red notifications expire after 10 seconds', () => {
  let currentTime = 1000;
  const store = createStatusStore({
    activeTtlMs: 30000,
    resultDisplayMs: 10000,
    now: () => currentTime,
  });

  store.update({ provider: 'chatgpt', status: 'complete' });
  store.update({ provider: 'gemini', status: 'error' });
  assert.equal(store.getProvider(PROVIDERS.CHATGPT).petState, PET_STATES.COMPLETE);
  assert.equal(store.getProvider(PROVIDERS.GEMINI).petState, PET_STATES.ERROR);

  currentTime = 12001;
  assert.equal(store.getProvider(PROVIDERS.CHATGPT).petState, PET_STATES.DISCONNECTED);
  assert.equal(store.getProvider(PROVIDERS.GEMINI).status, 'idle');
  assert.equal(store.getProvider(PROVIDERS.GEMINI).petState, PET_STATES.DISCONNECTED);
});

test('idle or open updates cannot overwrite a recent completion notification', () => {
  let currentTime = 1000;
  const store = createStatusStore({
    resultDisplayMs: 10000,
    now: () => currentTime,
  });

  store.update({ provider: 'chatgpt', status: 'complete' });
  currentTime = 4000;
  store.update({ provider: 'chatgpt', status: 'idle' });
  assert.equal(store.getProvider(PROVIDERS.CHATGPT).status, 'complete');
  assert.equal(store.getProvider(PROVIDERS.CHATGPT).petState, PET_STATES.COMPLETE);

  store.update({ provider: 'chatgpt', status: 'open' });
  assert.equal(store.getProvider(PROVIDERS.CHATGPT).status, 'complete');
  assert.equal(store.getProvider(PROVIDERS.CHATGPT).petState, PET_STATES.COMPLETE);
});
