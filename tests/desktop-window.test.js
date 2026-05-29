const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createWindowOptions,
  createExternalOpenHandler,
  getPetUrl,
} = require('../src/desktop/window-config');

test('desktop window is compact, resizable, frameless, transparent, and always on top', () => {
  const options = createWindowOptions();

  assert.equal(options.width, 276);
  assert.equal(options.height, 78);
  assert.equal(options.minWidth, 180);
  assert.equal(options.minHeight, 54);
  assert.equal(options.frame, false);
  assert.equal(options.transparent, true);
  assert.equal(options.alwaysOnTop, true);
  assert.equal(options.resizable, true);
  assert.equal(options.skipTaskbar, false);
  assert.equal(options.backgroundColor, '#00000000');
  assert.equal(options.webPreferences.nodeIntegration, false);
  assert.equal(options.webPreferences.contextIsolation, true);
});

test('pet url defaults to the local service and respects custom port', () => {
  assert.equal(getPetUrl(), 'http://127.0.0.1:4321');
  assert.equal(getPetUrl(4322), 'http://127.0.0.1:4322');
});

test('desktop window opens allowed AI links in the system browser', () => {
  const openedUrls = [];
  const handler = createExternalOpenHandler((url) => {
    openedUrls.push(url);
  });

  const result = handler({ url: 'https://chatgpt.com/' });

  assert.deepEqual(result, { action: 'deny' });
  assert.deepEqual(openedUrls, ['https://chatgpt.com/']);
});

test('desktop window blocks unexpected popup links', () => {
  const openedUrls = [];
  const handler = createExternalOpenHandler((url) => {
    openedUrls.push(url);
  });

  const result = handler({ url: 'https://example.com/' });

  assert.deepEqual(result, { action: 'deny' });
  assert.deepEqual(openedUrls, []);
});
