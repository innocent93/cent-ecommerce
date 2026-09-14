# Postman Collection

58 requests covering every endpoint: customer auth (including Google Sign-In), staff auth + RBAC, products, cart, checkout (COD + Paystack), coupons, refunds, reviews, wishlist, currency, and health/SEO endpoints.

## Setup

1. Import both files into Postman: **UrbanStep.postman_collection.json** and **UrbanStep.postman_environment.json**.
2. Select the "UrbanStep - Local" environment (top-right dropdown).
3. Set `baseUrl` if your backend isn't at `http://localhost:5000`.
4. Set `adminEmail`/`adminPassword` to match your `backend/.env` values (these seed the superadmin on first server boot).
5. Run **Auth (Customer) → Register** or **Login** — the response's tokens are automatically saved into the environment via a test script, so every other authenticated request just works with no manual copying.
6. Run **Staff Auth & Management → Staff Login** the same way for admin/support-gated endpoints.

## Notes

- `productId`, `orderId`, `couponId`, etc. are auto-captured from create/list responses into environment variables for use in later requests in the same folder — run folders top-to-bottom for a coherent flow (e.g. Products: Add → List → Single → Update).
- **Paystack webhook** and **Google login** requests are included for documentation but can't be meaningfully triggered directly from Postman — see the description on each request for exactly why and how to test them properly (Paystack's test-webhook feature via a tunneled URL; Google's ID token captured from a real browser sign-in).
- The `Add Product` request uses `multipart/form-data` — Postman requires you to manually attach real image files to the `image1`/etc. fields in its form-data editor; the collection defines the fields but can't attach files on your behalf.
