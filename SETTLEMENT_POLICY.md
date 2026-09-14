# Marketplace seller settlement policy

UrbanStep uses **delayed seller settlement** as the default marketplace policy. Customer payment is recorded by the platform, while the seller entitlement remains pending until the order is delivered and the configured return/dispute window has elapsed.

Recommended lifecycle:

1. `pending_settlement` — payment captured, seller entitlement recorded but not payable.
2. `eligible_for_payout` — delivery confirmed and the return/dispute window has expired.
3. `settled` — payout created, processed, and reconciled.
4. `held`/`reversed` — dispute, refund, chargeback, or fraud review.

This policy can later be changed to an alternative settlement strategy through a versioned business-policy/configuration change. Do not describe the balance as regulated escrow unless the applicable legal and financial requirements have been satisfied.
