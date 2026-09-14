# Data resilience — backups, restore drills, and index review

## 1. Backups

**If using MongoDB Atlas (recommended over self-hosting Mongo for this project):** Atlas gives you
continuous backups with point-in-time recovery on its paid tiers (M10+) — turn this on and most of
this document is handled for you. This section covers the manual/self-hosted path, and the restore
drill (Section 2), which you should do **regardless of which backup method you use** — an
unverified backup is not a backup.

### Automated daily dump (self-hosted Mongo)

```bash
#!/usr/bin/env bash
# backup.sh — run via cron, e.g. `0 3 * * * /path/to/backup.sh`
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/var/backups/mongo/${TIMESTAMP}"
RETENTION_DAYS=14

mongodump --uri="${MONGODB_URI}" --gzip --out="${BACKUP_DIR}"

# Ship off-box immediately — a backup that lives on the same disk as the
# database it's backing up doesn't survive the failure modes that actually
# take out a database (disk failure, host compromise, accidental `rm -rf`).
aws s3 sync "${BACKUP_DIR}" "s3://your-backup-bucket/mongo/${TIMESTAMP}/" --storage-class STANDARD_IA

# Prune local copies older than retention window (S3 lifecycle rule should
# separately handle bucket-side retention/expiry).
find /var/backups/mongo -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf {} \;
```

Run this nightly at minimum; hourly if order volume is high enough that losing a day of orders is
unacceptable (it almost certainly is, once real money is moving).

### What to back up alongside the database

- **Cloudinary** (product images): Cloudinary retains uploads independently — not your backup
  responsibility, but confirm your Cloudinary plan's own retention/deletion policy.
- **Environment variables / secrets**: back these up separately, encrypted (see Section 3) — a
  restored database is useless if you've lost the Paystack/Cloudinary/Google credentials needed
  to run against it.

## 2. Restore drills — do this before you need to, not during an incident

A backup you have never restored is a hypothesis, not a backup. Quarterly, at minimum:

```bash
# 1. Spin up a throwaway Mongo instance (Docker, a scratch Atlas cluster —
#    NEVER restore onto production while testing).
docker run -d --name restore-drill -p 27018:27017 mongo:7

# 2. Restore the most recent backup into it.
mongorestore --uri="mongodb://localhost:27018" --gzip --dir="/var/backups/mongo/<latest>"

# 3. Point a local copy of the backend at it and verify:
MONGODB_URI="mongodb://localhost:27018/ecommerce" npm run dev
#    - Can you log in as the seeded admin?
#    - Do product listings load?
#    - Spot-check a recent order's total against what you'd expect.

# 4. Tear it down.
docker rm -f restore-drill
```

**Time this.** Write down how long the restore actually took — that number is your real Recovery
Time Objective (RTO), not whatever number was assumed when nobody had tried it. If it's longer
than acceptable, that's a finding to act on (faster hardware, smaller backup windows, or a managed
Atlas restore instead of manual mongorestore).

## 3. Secrets: get them out of `.env` files before real launch

`.env` files are fine for local development (this is why every app in this repo ships an
`.env.example`, never a real `.env`) but are the wrong place for production secrets: they're
plaintext on disk, easy to accidentally commit, and have no access control or rotation history.

For production, use one of:

- **Your host's built-in secret manager** — Render (Environment Groups), AWS (Secrets Manager or
  Parameter Store), Railway/Fly.io's built-in secrets. Lowest effort, usually sufficient.
- **A dedicated vault** (Doppler, HashiCorp Vault, 1Password Secrets Automation) if you need audit
  logs of who accessed what secret when, or are managing secrets across many services/environments.

Either way: rotate the secret immediately if it's ever been in a `.env` file that touched a shared
machine, a screen-share, or (worst case) got committed to git history — changing the value in your
new vault doesn't retroactively un-expose the old one.

## 4. Index review under real query patterns

The indexes added in this pass (`Order`: `{seller,paymentStatus,status,payout}` and
`{seller,createdAt}`) were chosen from reading the actual query code, not from guessing. Once
there's real production traffic, re-verify with the query planner rather than continuing to guess:

```js
// In mongosh, against production (read-only — .explain() doesn't write anything):
db.orders.find({ seller: ObjectId("..."), paymentStatus: "paid", status: "delivered", payout: null })
  .explain("executionStats")
// Look for `stage: "IXSCAN"` (index used) not `"COLLSCAN"` (full collection
// scan), and check `totalDocsExamined` is close to `nReturned` — a big gap
// means the index isn't selective enough for how the data actually looks.
```

Also worth running periodically as the dataset grows:

```js
db.orders.aggregate([{ $indexStats: {} }])
// Any index with a near-zero `accesses.ops` after a few weeks of real
// traffic is a candidate to drop — every index has a write-cost, so an
// unused one is pure overhead, not a free safety net.
```
