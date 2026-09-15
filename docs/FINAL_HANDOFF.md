# UrbanStep Final Handoff

## Included in this release

- Approved UrbanStep reference design board only; stale preview images removed.
- Principal-style admin information architecture: overview, products, orders, sellers, customers, coupons, refunds and staff.
- Seller approval queue with business certificate review.
- Certificate upload at seller registration and later from seller profile.
- Certificate types: PDF/JPEG/PNG/WEBP/AVIF; max 5MB.
- Seller approval is blocked until a certificate is present.
- Customer and seller ban/unban.
- Customer and seller soft-delete/restore.
- Server-side session revocation when accounts are banned/archived.
- Product soft delete to preserve order history.
- Live admin analytics endpoint.
- Centralized admin API client.
- Refresh cookie scope corrected to `/api` so customer and seller refresh flows work from their respective API routes.
- All Markdown documentation consolidated under `docs/`.
- Prototype presentation guide and enterprise roadmap.

## Validation

Backend syntax: PASS.
Backend tests: 70 passed, 0 failed.

Frontend/admin/seller package installation and production builds should be run in the deployment environment because dependency installation can be constrained by the current execution environment.
