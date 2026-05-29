const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyNetworkEvent,
  shouldTrackNetworkUrl,
} = require('../extension/network-status-detector');

test('tracks likely AI conversation network requests', () => {
  assert.equal(shouldTrackNetworkUrl('https://chatgpt.com/backend-api/conversation'), true);
  assert.equal(shouldTrackNetworkUrl('https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate'), true);
  assert.equal(shouldTrackNetworkUrl('https://www.doubao.com/samantha/chat/completion'), true);
  assert.equal(shouldTrackNetworkUrl('https://chat.deepseek.com/api/v0/chat/completion'), true);
});

test('ignores static assets and telemetry', () => {
  assert.equal(shouldTrackNetworkUrl('https://chatgpt.com/favicon.ico'), false);
  assert.equal(shouldTrackNetworkUrl('https://example.com/assets/app.js'), false);
  assert.equal(shouldTrackNetworkUrl('https://mon.zijieapi.com/monitor_browser/collect/batch'), false);
});

test('network lifecycle maps to traffic light statuses', () => {
  assert.equal(classifyNetworkEvent('start'), 'generating');
  assert.equal(classifyNetworkEvent('finish'), 'complete');
  assert.equal(classifyNetworkEvent('error'), 'error');
  assert.equal(classifyNetworkEvent('abort'), 'complete');
});
