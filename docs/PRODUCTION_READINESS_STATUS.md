# UrbanStep production-readiness status

This package contains a UI/authentication refactor and deployment notes. It is **not a claim that a live payment system is automatically production-certified**. Before launch, configure and verify all secrets, domains, database backups, payment-provider webhooks, email delivery, observability, and end-to-end flows in staging.

## Render/Vercel routing

- Vercel SPA fallback files are included in `frontend/public/_redirects` and `admin/public/_redirects`.
- Configure the frontend build root as `frontend` and the admin build root as `admin`.
- Configure the backend service root as `backend` only when the deployed repository contains that directory at the selected branch.
- Set `VITE_BACKEND_URL` to the complete HTTPS backend origin, without a trailing slash.

## Authentication verification checklist

- Confirm the login and register responses return `token` or `accessToken`.
- Confirm refresh-token cookies are sent with `HttpOnly`, `Secure`, correct `SameSite`, domain, and path settings.
- Confirm CORS contains the exact frontend, admin, and seller origins and `credentials: true` is enabled.
- Verify access-token expiry, refresh rotation, reuse detection, logout, and logout-all-sessions.
- Verify admin and seller role checks independently.
- Never place production secrets in Vite client environment variables.

## Required staging tests

1. Directly open `/contact`, `/login`, `/collection`, and `/cart` in a new browser tab.
2. Register, log in, refresh the page, let the access token expire, and verify silent refresh.
3. Log out and verify protected endpoints reject the old access token.
4. Complete a Paystack test payment and replay the webhook to verify idempotency.
5. Test partial refunds, coupon limits, seller settlement, and failed payment recovery.
6. Test the storefront, admin, and seller layouts at 320px, 390px, 768px, and desktop widths.
