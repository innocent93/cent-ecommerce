# Running This on Free Tiers — What's Actually Free, and What Isn't

I can't generate or hand you real API keys — every service below requires *your own* account (that's inherent to how OAuth/payments/email security works; a key I invented wouldn't function). What I can do is tell you exactly where to get each one, and be straight about which are genuinely free indefinitely vs. free-with-limits vs. pay-as-you-go with no monthly minimum. This is the full list of external services this app touches.

## Genuinely free, indefinitely, for a launch at your scale

| Service | What it's for | Free tier | Get it here |
|---|---|---|---|
| **MongoDB Atlas** | Database | M0 cluster: 512MB storage, shared CPU, forever free (not a trial) | [cloud.mongodb.com](https://cloud.mongodb.com) → Create free cluster |
| **Cloudinary** | Product image storage/hosting | 25 credits/month forever free (roughly 25GB combined storage+bandwidth — plenty for hundreds of products) | [cloudinary.com](https://cloudinary.com) → free signup |
| **Google OAuth (Sign-In)** | "Continue with Google" login | Completely free, no meaningful limit for this use case | [console.cloud.google.com](https://console.cloud.google.com) — see README's "Google Login" section for exact steps |
| **Upstash Redis** | Caching + shared rate limiting | 500,000 commands/month free forever | [upstash.com](https://upstash.com) → free Redis database |
| **Brevo (formerly Sendinblue)** | Transactional email (order confirmations, password resets) | 300 emails/day forever free | [brevo.com](https://www.brevo.com) → free plan, use their SMTP credentials as `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` |
| **Vercel / Netlify / Cloudflare Pages** | Hosting the frontend + admin (static builds) | Generous free tiers, effectively unlimited for a store your size | Any of the three — Cloudflare Pages has the least restrictive free bandwidth |

## Free to start, but genuinely costs money as you grow (be aware, not alarmed)

| Service | What it's for | The honest deal |
|---|---|---|
| **Paystack** | Payments | No monthly fee ever — Paystack only takes a percentage per successful transaction (~1.5%+₦100 local cards). Test mode (fake cards, real flow) is 100% free for as long as you want to develop against it. |
| **Render / Railway / Fly.io** | Hosting the backend | Render's free web service tier exists but **spins down after 15 minutes of inactivity** and takes ~30-60s to wake up on the next request — fine for a demo, bad for a real store where a customer's first request might time out. Budget for their cheapest paid tier (~$5-7/month) once you're accepting real orders. This is the one place I'd actually recommend spending a small amount rather than fighting a free tier's limitations. |
| **Redis/MongoDB at higher volume** | Once you outgrow the free tier caps above | Both providers' next paid tier is usage-based, not a big jump — you'll see it coming in their dashboards before you hit a wall. |

## No free tier exists (all providers charge per message) — budget for this when you're ready

- **SMS** (Termii, Africa's Talking, Twilio): every provider charges per SMS sent. Termii and Africa's Talking both give small free trial credits (a few hundred messages) to test with, not an ongoing free tier. This is genuinely fine to skip entirely at launch — the SMS integration in this codebase (`sms.service.js`) is fully wired but safely does nothing (logs instead of sends) until you add a paid `SMS_API_KEY`. Add it when order volume justifies the cost, not before.
- **A custom domain** (e.g. `urbanstep.ng` instead of a `.onrender.com`/`.vercel.app` subdomain): domains cost ~$10-15/year regardless of registrar. Not required to launch and test — only matters for how professional your final public URL looks.

## Recommended free-tier launch stack (zero recurring cost except hosting the backend)

```
Database:        MongoDB Atlas (free M0)
Cache/rate-limit: Upstash Redis (free)
Images:           Cloudinary (free)
Email:            Brevo SMTP (free, 300/day)
Payments:         Paystack (free until you actually sell — then it's a % of real revenue, not a bill)
Google Login:     Google Cloud Console (free)
Frontend/Admin:   Vercel or Cloudflare Pages (free)
Backend:          Render free tier for testing → upgrade to ~$5-7/mo paid tier before real launch (avoid the cold-start problem)
SMS:              Skip until you have order volume to justify it
```

This gets you a fully functional, real store for effectively $0/month during development and testing, with the only recommended real spend being a few dollars/month for backend hosting once you're taking real customer orders (so a real customer's first request never hits a 60-second cold-start delay).
