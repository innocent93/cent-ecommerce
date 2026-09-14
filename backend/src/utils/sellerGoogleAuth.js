// Pure decision logic extracted out of seller.service.js so the trickiest
// (and most security-sensitive) branching in the Google auth flow can be
// unit-tested without a database — same philosophy as orderSplit.js for
// checkout. Two things live here:
//
//  1. decideGoogleAuthOutcome — given what lookups found, which of the
//     three outcomes (existing/link/new) applies.
//  2. resolveSellerRegistrationFields — given a registration payload and an
//     optional verified Google payload, what the Seller document should
//     actually contain. The critical property this protects: when a
//     Google payload is present, its email ALWAYS wins over anything the
//     client typed in the form — a client can't register an account under
//     someone else's email just by typing it alongside a valid token for
//     a different address.

export const decideGoogleAuthOutcome = ({ sellerByGoogleId, sellerByEmail }) => {
  if (sellerByGoogleId) return { action: 'login', seller: sellerByGoogleId };
  if (sellerByEmail) return { action: 'link_and_login', seller: sellerByEmail };
  return { action: 'new' };
};

export const resolveSellerRegistrationFields = ({ businessName, ownerName, email, phone, googlePayload }) => {
  const normalizedEmail = googlePayload ? googlePayload.email.toLowerCase() : String(email || '').toLowerCase();

  return {
    businessName,
    ownerName: ownerName || googlePayload?.name || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    phone,
    authFields: googlePayload
      ? { authProvider: 'google', googleId: googlePayload.sub, isEmailVerified: true }
      : null, // null means: caller is responsible for hashing+setting a password
  };
};
