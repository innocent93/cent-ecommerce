import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ms } from '../../src/utils/ms.js';

describe('ms (duration parser)', () => {
  test('parses seconds', () => {
    assert.equal(ms('45s'), 45_000);
  });

  test('parses minutes', () => {
    assert.equal(ms('15m'), 15 * 60 * 1000);
  });

  test('parses hours', () => {
    assert.equal(ms('1h'), 60 * 60 * 1000);
  });

  test('parses days', () => {
    assert.equal(ms('30d'), 30 * 24 * 60 * 60 * 1000);
  });

  test('parses plain milliseconds string', () => {
    assert.equal(ms('500ms'), 500);
  });

  test('passes through a plain number unchanged', () => {
    assert.equal(ms(1234), 1234);
  });

  test('accepts decimal amounts', () => {
    assert.equal(ms('1.5h'), 1.5 * 60 * 60 * 1000);
  });

  test('throws on garbage input', () => {
    assert.throws(() => ms('not-a-duration'));
  });

  test('throws on an unrecognized unit', () => {
    assert.throws(() => ms('5y'));
  });
});
