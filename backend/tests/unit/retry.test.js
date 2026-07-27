import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { retryWithBackoff } from '../../src/utils/retry.js';

describe('retryWithBackoff', () => {
  test('returns the result immediately on first success, no retries needed', async () => {
    let calls = 0;
    const result = await retryWithBackoff(async () => { calls += 1; return 'ok'; });
    assert.equal(result, 'ok');
    assert.equal(calls, 1);
  });

  test('retries after a failure and succeeds on a later attempt', async () => {
    let calls = 0;
    const result = await retryWithBackoff(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error('transient');
        return 'recovered';
      },
      { attempts: 3, baseDelayMs: 1 }
    );
    assert.equal(result, 'recovered');
    assert.equal(calls, 3);
  });

  test('throws the last error after exhausting all attempts', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        retryWithBackoff(
          async () => {
            calls += 1;
            throw new Error('always fails');
          },
          { attempts: 3, baseDelayMs: 1 }
        ),
      /always fails/
    );
    assert.equal(calls, 3);
  });

  test('defaults to 3 attempts when not specified', async () => {
    let calls = 0;
    await assert.rejects(() =>
      retryWithBackoff(async () => {
        calls += 1;
        throw new Error('fail');
      }, { baseDelayMs: 1 })
    );
    assert.equal(calls, 3);
  });
});
