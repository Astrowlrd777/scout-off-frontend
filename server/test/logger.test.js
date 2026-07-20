const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDbPath = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), 'scout-off-backend-logger-test-')),
  'test.db',
);
process.env.DB_PATH = tmpDbPath;

const { createRequestLogger, getOrCreateRequestId, REQUEST_ID_HEADER } = require('../src/logger');
const createApp = require('../src/app');

test.after(() => {
  fs.rmSync(path.dirname(tmpDbPath), { recursive: true, force: true });
});

test('getOrCreateRequestId propagates an incoming x-request-id header', () => {
  const req = { headers: { [REQUEST_ID_HEADER]: 'incoming-id' } };
  assert.equal(getOrCreateRequestId(req), 'incoming-id');
});

test('getOrCreateRequestId generates a fresh id when there is no header', () => {
  const req = { headers: {} };
  const id = getOrCreateRequestId(req);
  assert.equal(typeof id, 'string');
  assert.ok(id.length > 0);
});

test('createRequestLogger emits structured JSON lines sharing one requestId', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const lines = { log: [], warn: [], error: [] };
  console.log = (line) => lines.log.push(line);
  console.warn = (line) => lines.warn.push(line);
  console.error = (line) => lines.error.push(line);

  try {
    const req = {
      headers: { [REQUEST_ID_HEADER]: 'shared-id' },
      originalUrl: '/referrals/generate?foo=bar',
    };
    const log = createRequestLogger(req);
    assert.equal(log.requestId, 'shared-id');

    log.info('starting', { safe: 'ok' });
    log.warn('careful', { secretToken: 'abc123' });
    log.error('boom');

    const info = JSON.parse(lines.log[0]);
    const warn = JSON.parse(lines.warn[0]);
    const error = JSON.parse(lines.error[0]);

    assert.equal(info.requestId, 'shared-id');
    assert.equal(info.route, '/referrals/generate');
    assert.equal(info.safe, 'ok');

    assert.equal(warn.requestId, 'shared-id');
    assert.equal(warn.secretToken, '[REDACTED]');

    assert.equal(error.requestId, 'shared-id');
    assert.equal(error.level, 'error');
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
});

test('the app echoes X-Request-Id back on the response, propagating an incoming one', async () => {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const res = await fetch(`${baseUrl}/health`, {
      headers: { [REQUEST_ID_HEADER]: 'client-supplied-id' },
    });
    assert.equal(res.headers.get(REQUEST_ID_HEADER), 'client-supplied-id');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('the app generates a fresh X-Request-Id when the client sends none', async () => {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const res = await fetch(`${baseUrl}/health`);
    const id = res.headers.get(REQUEST_ID_HEADER);
    assert.equal(typeof id, 'string');
    assert.ok(id.length > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
