import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sendSuccess } from '../../src/utils/ApiResponse.js';

// Minimal fake Express `res` — just enough to observe what sendSuccess does,
// without needing express installed.
const fakeRes = () => {
  const calls = { statusCode: undefined, json: undefined };
  return {
    status(code) {
      calls.statusCode = code;
      return this;
    },
    json(payload) {
      calls.json = payload;
      return this;
    },
    calls,
  };
};

describe('sendSuccess', () => {
  test('defaults to 200 and success:true', () => {
    const res = fakeRes();
    sendSuccess(res);
    assert.equal(res.calls.statusCode, 200);
    assert.equal(res.calls.json.success, true);
    assert.equal(res.calls.json.message, 'Success');
  });

  test('respects a custom statusCode', () => {
    const res = fakeRes();
    sendSuccess(res, { statusCode: 201, message: 'Created' });
    assert.equal(res.calls.statusCode, 201);
    assert.equal(res.calls.json.message, 'Created');
  });

  test('spreads extra fields at the top level (backward-compatible response shape)', () => {
    const res = fakeRes();
    sendSuccess(res, { token: 'abc123', user: { id: 1 } });
    assert.equal(res.calls.json.token, 'abc123');
    assert.deepEqual(res.calls.json.user, { id: 1 });
    // Must NOT be nested under a `data` envelope — existing clients expect
    // top-level fields.
    assert.equal(res.calls.json.data, undefined);
  });
});
