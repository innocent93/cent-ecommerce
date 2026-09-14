# Scaling This App — What "10 Million Requests" Actually Requires

Read this section first: **"10 million requests" means very different things depending on the timeframe.** 10 million requests *per day* is about 115 requests/second average (with peaks maybe 5-10x that) — a single well-optimized backend instance with the caching now in place can plausibly handle that. 10 million requests *per second* is a Amazon/Google-scale number that no single-region, single-database architecture handles — that requires a fundamentally different (and vastly more expensive) system than any e-commerce store needs, including large ones. This doc assumes you mean the former (a genuinely large, successful store), and tells you honestly what's already handled, what's one config change away, and what's a real architecture project.

## Already handled by this codebase

- **Stateless application servers**: no in-memory sessions, no local file storage — auth is JWT + a database-backed refresh token, uploads go straight to Cloudinary. This means you can run **N identical backend instances** behind a load balancer with zero code changes; any instance can serve any request.
- **Redis-backed caching and rate limiting**: product list/detail reads are cached (60s default TTL), and rate limits are enforced via a shared Redis store when `REDIS_URL` is set — critical, because without this, running multiple instances silently breaks rate limiting (each instance would enforce its own separate limit).
- **Atomic, transactional checkout**: stock reservation + order creation is a real MongoDB transaction (see `order.service.js`) — correct under concurrency without needing application-level locks.
- **Database indexes** on the fields that matter: `Product.category`, `Product.name`/`description` (text search), `Order.user`, `Order.status`, `Order.trackingNumber`, `User.email`, refresh token expiry (auto-cleanup via TTL index).
- **Fire-and-forget notifications** with retry — a slow email/SMS provider can never become a bottleneck for request-handling capacity.

## One infrastructure decision away (no code changes needed)

1. **Run multiple backend instances behind a load balancer.** Any platform (Render, Railway, ECS, k8s) supports this — set instance count > 1 and point them at the same MongoDB Atlas + Redis. This alone is the single biggest lever for handling more concurrent requests, and this codebase is already built to support it correctly (see the "already handled" list above).
2. **MongoDB Atlas, not self-hosted Mongo**, for anything beyond initial testing — it handles replica sets, backups, and (on paid tiers) read replicas and sharding for you. The local `docker-compose.yml` single-node replica set is correct for development and testing transactions, not for real production load.
3. **A CDN in front of the frontend/admin** (Cloudflare, or your static host's built-in CDN — Vercel/Netlify/Cloudflare Pages all include one free) — since the storefront is a static SPA build, this is close to free infinite scale for the actual page-load traffic; only API calls hit your backend.
4. **Redis at a paid tier** once you outgrow the free 500K-commands/month — this is a dashboard upgrade, not an architecture change.

## Real engineering work, if/when you actually reach this scale

Being honest about what's *not* a quick toggle:

- **Database read replicas / sharding**: MongoDB Atlas supports both on paid tiers, but sharding specifically requires choosing a shard key and is a real migration, not a checkbox — only relevant once a single primary can't keep up with write load, which is a genuinely large-store problem, not a launch-week one.
- **Horizontal scaling of MongoDB transactions specifically**: transactions have overhead (they're slower than non-transactional writes) and don't parallelize across shards trivially if the transaction spans documents on different shards. At true high scale, some teams move away from a single "atomic everything" checkout transaction toward an eventually-consistent, event-driven order pipeline (e.g., "reserve stock" and "create order" as separate steps coordinated by messages, with compensating actions for failure) — this is a legitimate future direction but a substantial rearchitecture, appropriate only once transaction latency is measurably a bottleneck, not preemptively.
- **CDN + image optimization at the edge**: Cloudinary's free tier CDN already covers this reasonably well up to real volume; a dedicated image CDN strategy only matters past that.
- **Search**: MongoDB's `$text` search (currently used for product search) works fine at moderate catalog sizes but doesn't scale like a dedicated search engine (Elasticsearch/Algolia/Meilisearch) for large catalogs with typo-tolerance, faceting, etc. — a real addition, not a config change, and only worth it once your catalog is large enough that `$text` search feels slow or limited.
- **Load testing**: `backend/load-test/checkout-race.k6.js` targets the highest-risk scenario specifically — many concurrent buyers racing to check out the same low-stock item, which is exactly what the atomic stock-decrement in `order.service.js` exists to protect against. Run it against a staging environment (see the file's header comment for setup) before trusting any deployment under real concurrent traffic; a passing unit test proves the logic is correct in isolation, not that it holds up under actual simultaneous requests.

## What to do right now, practically

For a launch-week store, don't build for 10 million requests/day on day one — build for correctness (which this codebase now has) and make sure scaling out is a *config change*, not a rewrite, when you need it (which it now is). The honest sequencing:

1. Launch on a single backend instance + MongoDB Atlas free tier + Redis free tier.
2. Watch your actual traffic. Most stores never come close to needing step 3.
3. When you do see real load (or before a planned traffic spike — a sale, a viral moment), scale horizontally (more instances) first — it's the cheapest, fastest lever, and this app already supports it correctly.
4. Only reach for read replicas, sharding, or a rearchitected checkout pipeline once horizontal scaling of stateless instances genuinely isn't enough — which, for the overwhelming majority of e-commerce stores, it will be.
