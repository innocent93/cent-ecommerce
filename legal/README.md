# Legal documents — status: drafts, not reviewed by a lawyer

These three documents (`TERMS_OF_SERVICE.md`, `PRIVACY_POLICY.md`, `REFUND_AND_RETURNS_POLICY.md`)
are structured, marketplace-aware **starting points** — they specifically address the questions
generic templates miss (who's liable for what between the platform, sellers, and customers; what
data sellers vs. customers can see about each other; how a refund is actually paid for without
clawing money back from a seller).

**They are not legal advice and are not ready to publish as-is.** Before launch:

1. **A lawyer licensed in your operating jurisdiction needs to review all three**, especially the
   liability limitation, dispute resolution, and data protection sections — these vary
   significantly by country and by whether you have EU/UK/other regulated users.
2. **Fill in every `[bracketed placeholder]`** — company legal name, registered address, actual
   commission/payout schedule, actual return window, retention periods, etc.
3. **Confirm the commission rate and refund window stated here match what's actually configured**
   in the backend (`COMMISSION_RATE` in `backend/.env`) and communicated in the seller-facing
   pitch doc — inconsistency between what's promised in policy and what the system actually does
   is itself a legal risk.
4. Once finalized, link these from the storefront footer and the seller registration flow (a
   checkbox agreeing to the Seller Agreement / Terms at signup is standard practice).
