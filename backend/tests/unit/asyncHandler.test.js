import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { asyncHandler } from '../../src/utils/asyncHandler.js';

describe('asyncHandler', () => {
  test('does NOT call next() when the wrapped function resolves successfully', async () => {
    // Correct Express behavior: a handler that successfully sent a response
    // shouldn't call next() at all (that would incorrectly fall through to
    // the next middleware / a 404). asyncHandler only wires next() for the
    // error path via .catch(next).
    let nextCalled = false;
    const handler = asyncHandler(async (req, res) => {
      res.done = true;
    });

    await handler({}, {}, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
  });

  test('forwards a thrown error to next() instead of letting it crash the process', async () => {
    const boom = new Error('boom');
    const handler = asyncHandler(async () => {
      throw boom;
    });

    let caught;
    await handler({}, {}, (err) => { caught = err; });
    assert.equal(caught, boom);
  });

  test('forwards a rejected promise to next()', async () => {
    const handler = asyncHandler(() => Promise.reject(new Error('rejected')));

    let caught;
    await handler({}, {}, (err) => { caught = err; });
    assert.equal(caught.message, 'rejected');
  });

  test('does not swallow the return value / side effects on success', async () => {
    const res = { body: null };
    const handler = asyncHandler(async (req, r) => {
      r.body = 'ok';
    });
    await handler({}, res, () => {});
    assert.equal(res.body, 'ok');
  });
});
