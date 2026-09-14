import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { decideGoogleAuthOutcome, resolveSellerRegistrationFields } from '../../src/utils/sellerGoogleAuth.js';

describe('decideGoogleAuthOutcome', () => {
  test('an existing Google-linked seller logs straight in', () => {
    const seller = { _id: 'seller-1' };
    const outcome = decideGoogleAuthOutcome({ sellerByGoogleId: seller, sellerByEmail: null });
    assert.equal(outcome.action, 'login');
    assert.equal(outcome.seller, seller);
  });

  test('a password-registered seller with a matching email gets linked, not duplicated', () => {
    const seller = { _id: 'seller-2', email: 'owner@shop.com' };
    const outcome = decideGoogleAuthOutcome({ sellerByGoogleId: null, sellerByEmail: seller });
    assert.equal(outcome.action, 'link_and_login');
    assert.equal(outcome.seller, seller);
  });

  test('no match by googleId or email means a brand-new seller', () => {
    const outcome = decideGoogleAuthOutcome({ sellerByGoogleId: null, sellerByEmail: null });
    assert.equal(outcome.action, 'new');
    assert.equal(outcome.seller, undefined);
  });

  test('a googleId match wins even if an (unrelated) email match also exists', () => {
    // Shouldn't happen in practice (email is unique), but the googleId
    // lookup must take priority if it ever does — it's the stronger signal.
    const byGoogleId = { _id: 'seller-1' };
    const byEmail = { _id: 'seller-3' };
    const outcome = decideGoogleAuthOutcome({ sellerByGoogleId: byGoogleId, sellerByEmail: byEmail });
    assert.equal(outcome.action, 'login');
    assert.equal(outcome.seller, byGoogleId);
  });
});

describe('resolveSellerRegistrationFields', () => {
  test('local (password) registration: uses the submitted email as-is (lowercased)', () => {
    const result = resolveSellerRegistrationFields({
      businessName: 'Lagos Leather Co.',
      ownerName: 'Ada Obi',
      email: 'Ada@Shop.COM',
      phone: '08012345678',
      googlePayload: null,
    });
    assert.equal(result.email, 'ada@shop.com');
    assert.equal(result.ownerName, 'Ada Obi');
    assert.equal(result.authFields, null);
  });

  test('Google registration: the verified Google email overrides ANY email the client submitted', () => {
    // This is the security-critical case: a malicious client could submit
    // a different `email` field alongside a valid idToken for their own
    // address. The Google payload's email must always win.
    const result = resolveSellerRegistrationFields({
      businessName: 'Lagos Leather Co.',
      ownerName: 'Ada Obi',
      email: 'someone-elses-address@victim.com',
      phone: undefined,
      googlePayload: { email: 'ada@gmail.com', sub: 'google-sub-123', name: 'Ada Obi' },
    });
    assert.equal(result.email, 'ada@gmail.com');
    assert.deepEqual(result.authFields, {
      authProvider: 'google',
      googleId: 'google-sub-123',
      isEmailVerified: true,
    });
  });

  test('Google registration: falls back to the Google profile name when ownerName is omitted', () => {
    const result = resolveSellerRegistrationFields({
      businessName: 'Lagos Leather Co.',
      ownerName: '',
      email: undefined,
      phone: undefined,
      googlePayload: { email: 'ada@gmail.com', sub: 'google-sub-123', name: 'Ada Obi' },
    });
    assert.equal(result.ownerName, 'Ada Obi');
  });

  test('falls back to the email\'s local part when neither ownerName nor a Google name is available', () => {
    const result = resolveSellerRegistrationFields({
      businessName: 'Lagos Leather Co.',
      ownerName: '',
      email: undefined,
      phone: undefined,
      googlePayload: { email: 'ada@gmail.com', sub: 'google-sub-123', name: '' },
    });
    assert.equal(result.ownerName, 'ada');
  });

  test('an explicitly provided ownerName always wins over the Google profile name', () => {
    const result = resolveSellerRegistrationFields({
      businessName: 'Lagos Leather Co.',
      ownerName: 'Preferred Display Name',
      email: undefined,
      phone: undefined,
      googlePayload: { email: 'ada@gmail.com', sub: 'google-sub-123', name: 'Ada Obi' },
    });
    assert.equal(result.ownerName, 'Preferred Display Name');
  });
});
