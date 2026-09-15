# UrbanStep Operational Maturity Gate

## Purpose

The current release focuses on the marketplace foundation, authentication/session controls, seller compliance, admin operations, soft-delete/ban lifecycle, analytics foundation, UI/UX and deployment structure.

The next level is operational maturity. These controls should be implemented and verified in staging before UrbanStep is treated as a high-volume production marketplace.

## Maturity checklist

| Control | Current release | Next gate |
|---|---|---|
| Immutable admin audit logs | Not fully implemented | Record actor, action, target, before/after, reason, request ID and timestamp; make records append-only |
| MFA / WebAuthn for admin & superadmin | Not implemented | WebAuthn/passkeys or TOTP with recovery controls; enforce for privileged roles |
| Fine-grained RBAC | Foundation present | Resource/action policies, least privilege, deny-by-default and permission tests |
| Maker/checker approval | Not implemented | Require independent approval for large payouts/refunds and other high-risk financial actions |
| Fraud/risk scoring | Not implemented | Velocity, device/IP reputation, payment/order signals and manual review queue |
| Inventory reservation with expiry | Not implemented | Atomic reservation, expiry worker, release-on-failure and oversell tests |
| Automated backups + restore drills | Deployment checklist only | Scheduled backups, retention policy, encrypted storage and recurring restore verification |
| Sentry + metrics + alerting | Configuration target only | Error tracking, API latency/error metrics, queue health, payment/webhook alerts and uptime alerts |
| CDN/image optimization | Foundation via Cloudinary target | Responsive variants, WebP/AVIF, cache policy, lazy loading and signed/private assets where required |
| Search engine | MongoDB/application search foundation | Move to dedicated search when relevance, scale or latency requires it |
| Seller ratings + verified reviews | Not implemented | Verified-purchase reviews, seller rating aggregation, moderation and abuse controls |
| CI/CD security scanning | CI/CD foundation present | Secret scanning, dependency audit, SAST and deployment gates |
| Dependency vulnerability scanning | Not yet a release gate | Dependabot/Renovate/npm audit or equivalent with severity policy |
| Accessibility / WCAG audit | Not yet formally audited | Keyboard, focus, contrast, semantics, forms, reduced motion and screen-reader testing |
| Privacy/data-retention workflows | Policy foundation present | Retention jobs, export/delete requests, consent records and audit trail |
| Revenue/GMV/take-rate/conversion analytics | Dashboard foundation present | Event-based funnel, GMV, net revenue, take rate, seller/customer cohorts and reconciliation |
| Paystack sandbox integration tests | Staging checklist | Automated payment, callback/webhook replay, idempotency, refund and failure-path tests |
| Load testing | Load-test tooling/checklist present | Baseline p95/p99, throughput, DB saturation and realistic marketplace traffic scenarios |
| Disaster recovery runbook | Partially documented | RTO/RPO targets, restore steps, failover ownership and regular game-day drills |
| Separate staging environment | Required before live | Isolated database, storage, payment keys, email and domains; no production data by default |

## Recommended implementation order

### Gate 1 — Security and financial control

1. Immutable audit logs
2. MFA/WebAuthn for privileged staff
3. Fine-grained RBAC
4. Maker/checker payout/refund approval
5. Secret/dependency/security scanning

### Gate 2 — Data and transaction resilience

1. Automated backups
2. Restore drills
3. Inventory reservation with expiry
4. Payment sandbox integration suite
5. Disaster recovery runbook

### Gate 3 — Observability and abuse prevention

1. Sentry
2. Metrics and alerting
3. Fraud/risk scoring
4. Payment/webhook anomaly alerts
5. Operational dashboards

### Gate 4 — Scale and customer trust

1. CDN/image optimization
2. Search engine when required by measured catalog scale
3. Seller ratings and verified-purchase reviews
4. Load testing and capacity baselines

### Gate 5 — Governance and growth

1. Privacy/data-retention automation
2. Accessibility/WCAG audit
3. Revenue/GMV/take-rate/conversion analytics
4. Staging-to-production release gates

## Release rule

Do not describe the roadmap controls above as "implemented" merely because the codebase contains a placeholder, checklist item or configuration target. Each control should have:

- implementation evidence;
- automated or repeatable tests where practical;
- staging verification;
- owner and rollback procedure for operational controls; and
- documentation/runbook coverage.
