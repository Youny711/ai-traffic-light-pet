const test = require('node:test');
const assert = require('node:assert/strict');

const { createAppServer } = require('../src/server');

test('server accepts status updates and returns aggregate snapshot', async (t) => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => server.close());

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const updateResponse = await fetch(`${baseUrl}/api/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'chatgpt', status: 'generating' }),
  });

  assert.equal(updateResponse.status, 200);
  const updateBody = await updateResponse.json();
  assert.equal(updateBody.petState, 'working');

  const snapshotResponse = await fetch(`${baseUrl}/api/status`);
  assert.equal(snapshotResponse.status, 200);
  const snapshotBody = await snapshotResponse.json();
  assert.equal(snapshotBody.petState, 'working');
  assert.equal(snapshotBody.providers[0].provider, 'chatgpt');
});

test('server rejects invalid status payloads', async (t) => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => server.close());

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${baseUrl}/api/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'chatgpt', status: 'unknown' }),
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /Unsupported status/);
});
