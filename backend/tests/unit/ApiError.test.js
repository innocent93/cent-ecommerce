import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../src/utils/ApiError.js';

describe('ApiError', () => {
  test('base constructor sets statusCode, message, isOperational', () => {
    const err = new ApiError(418, "I'm a teapot");
    assert.equal(err.statusCode, 418);
    assert.equal(err.message, "I'm a teapot");
    assert.equal(err.isOperational, true);
    assert.ok(err instanceof Error);
  });

  test('carries optional details', () => {
    const details = [{ field: 'email', message: 'invalid' }];
    const err = new ApiError(400, 'Validation failed', details);
    assert.deepEqual(err.details, details);
  });

  describe('factory helpers use the correct status codes', () => {
    test('badRequest -> 400', () => assert.equal(ApiError.badRequest('x').statusCode, 400));
    test('unauthorized -> 401 with default message', () => {
      const err = ApiError.unauthorized();
      assert.equal(err.statusCode, 401);
      assert.equal(err.message, 'Not authorized, please login again');
    });
    test('forbidden -> 403', () => assert.equal(ApiError.forbidden().statusCode, 403));
    test('notFound -> 404', () => assert.equal(ApiError.notFound().statusCode, 404));
    test('conflict -> 409', () => assert.equal(ApiError.conflict('dup').statusCode, 409));
    test('tooManyRequests -> 429', () => assert.equal(ApiError.tooManyRequests().statusCode, 429));
    test('internal -> 500', () => assert.equal(ApiError.internal().statusCode, 500));
  });

  test('custom messages override defaults', () => {
    const err = ApiError.notFound('Order not found');
    assert.equal(err.message, 'Order not found');
  });
});
