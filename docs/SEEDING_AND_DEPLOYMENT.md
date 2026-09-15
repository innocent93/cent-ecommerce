# UrbanStep staging seed and deployment checklist

## Seed the catalog

1. Copy `backend/.env.example` to `backend/.env`.
2. Fill in the required MongoDB and security variables.
3. Run:

```bash
npm install --prefix backend
npm run seed --prefix backend
```

The seed is repeatable: it upserts products by SKU and does not delete existing records. Run it against a staging database first. The image URLs are optimized Unsplash demo assets; replace them with Cloudinary-hosted product images before commercial launch.

## Vercel SPA routes

The frontend and admin apps include `vercel.json` rewrites so direct requests such as `/contact` resolve to the SPA entry point. Configure each Vercel project with the correct root directory (`frontend` or `admin`).

## Production gates before launch

- Run frontend, admin, and seller builds in CI.
- Run backend unit/integration tests against a disposable database.
- Configure exact CORS origins and `withCredentials` for refresh cookies.
- Configure Paystack webhook signature verification and replay protection.
- Verify coupon, refund, payout, and seller settlement flows in staging.
- Replace demo images and placeholder contact details.
- Enable backups, monitoring, alerting, and error tracking.
