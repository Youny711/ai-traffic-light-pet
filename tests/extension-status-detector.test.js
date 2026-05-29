const test = require('node:test');
const assert = require('node:assert/strict');

const { detectStatusFromSignals } = require('../extension/status-detector');

test('first open AI page reports open for green notification', () => {
  assert.equal(detectStatusFromSignals({
    hasOpened: false,
    hasUserActivity: false,
    hasError: false,
    hasStop: false,
    hasTextChangeRecently: false,
  }), 'open');
});

test('active and error signals override idle page presence', () => {
  assert.equal(detectStatusFromSignals({
    hasOpened: true,
    hasUserActivity: false,
    hasError: false,
    hasStop: true,
    hasTextChangeRecently: false,
  }), 'generating');

  assert.equal(detectStatusFromSignals({
    hasOpened: true,
    hasUserActivity: false,
    hasError: true,
    hasStop: true,
    hasTextChangeRecently: true,
  }), 'error');
});

test('user activity after reading moves open page back to idle gray', () => {
  assert.equal(detectStatusFromSignals({
    hasOpened: true,
    hasUserActivity: true,
    hasError: false,
    hasStop: false,
    hasTextChangeRecently: false,
  }), 'idle');
});

test('completion after generation reports open for green flash', () => {
  assert.equal(detectStatusFromSignals({
    hasOpened: true,
    hasUserActivity: false,
    isTaskCandidate: false,
    hasError: false,
    hasStop: false,
    hasTextChangeRecently: true,
  }), 'open');
});

test('submitted task with changing content reports generating without stop button', () => {
  assert.equal(detectStatusFromSignals({
    hasOpened: true,
    hasUserActivity: false,
    isTaskCandidate: true,
    hasError: false,
    hasStop: false,
    hasTextChangeRecently: true,
  }), 'generating');
});

test('submitted task reports open after content stops changing', () => {
  assert.equal(detectStatusFromSignals({
    hasOpened: true,
    hasUserActivity: false,
    isTaskCandidate: true,
    hasError: false,
    hasStop: false,
    hasTextChangeRecently: false,
  }), 'open');
});

test('recent complete is not downgraded to open by DOM changes', () => {
  assert.equal(detectStatusFromSignals({
    hasOpened: true,
    hasUserActivity: false,
    isTaskCandidate: false,
    hasRecentResult: true,
    hasError: false,
    hasStop: false,
    hasTextChangeRecently: true,
  }), 'complete');
});
