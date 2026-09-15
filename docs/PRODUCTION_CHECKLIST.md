# UrbanStep Production Checklist

## Identity and access

- [x] Customer authentication
- [x] Seller authentication
- [x] Staff RBAC
- [x] Refresh-token sessions
- [x] Session revocation on logout/password change
- [x] Customer ban
- [x] Customer soft delete/restore
- [x] Seller ban
- [x] Seller soft delete/restore
- [x] Seller certificate gate before approval

## Seller compliance

- [x] Certificate upload at registration
- [x] Certificate upload later from seller profile
- [x] PDF/JPG/PNG/WEBP/AVIF
- [x] 5MB limit
- [x] Admin review link
- [x] Approval required before product listing

## Marketplace operations

- [x] Seller approval queue
- [x] Product CRUD
- [x] Order management
- [x] Coupons
- [x] Refund workflow
- [x] Payout model
- [x] Customer management
- [x] Seller management
- [x] Soft-delete lifecycle

## Before live deployment

- Run `npm ci` and builds for frontend/admin/seller.
- Run backend tests and lint.
- Run Flutter `flutter analyze` and tests.
- Configure production MongoDB and backups.
- Configure Cloudinary production folders and signed upload policy where applicable.
- Configure Paystack live keys and verify webhook signatures.
- Configure exact CORS origins.
- Verify HTTPS and secure refresh cookies.
- Configure Sentry/logging/alerts.
- Test direct Vercel routes including `/contact`.
- Replace seed/demo product assets with owned/licensed assets.
- Perform an end-to-end payment test in the provider's test environment before live mode.
- Perform a restore-from-backup drill.
