# Marketing This Store — A Practical Starting Playbook

This isn't a substitute for hiring a marketer once you have revenue to justify one, but it's enough to launch without wasting money on your first campaigns. Written for a Nigeria/Africa-first shoes-and-clothing store on a limited early budget.

## Before you spend a single naira on ads

1. **Have working checkout first.** Every step in this document assumes `BUSINESS_MODEL.md`'s deployment checklist is done — live Paystack, real SMTP, HTTPS. Sending paid traffic to a store where checkout might fail is the single most expensive mistake you can make; you pay for the click either way.
2. **Install tracking before your first ad, not after.** You cannot retroactively measure what you didn't track:
   - **Meta Pixel** (Facebook/Instagram ads): add the base pixel snippet to `frontend/index.html`, then fire `PageView` (automatic), `ViewContent` (on `Product.jsx` mount), `AddToCart` (in `ShopContext`'s `addToCart`), `InitiateCheckout` (on `PlaceOrder.jsx` mount), and `Purchase` (on `OrderConfirmation.jsx`, with the real order value) as custom events.
   - **Google Analytics 4 + Google Ads conversion tracking**: same event set, different snippet (`gtag.js`). GA4 also gives you free insight into where visitors drop off before you spend on ads.
   - Neither of these is built into the codebase yet — they're a small, well-defined addition (a few `<script>` tags + event calls at the points listed above) if you want them added.
3. **Decide your first-order economics before you set a budget.** You need to know: average order value, gross margin per order (from `BUSINESS_MODEL.md`), and therefore the maximum you can spend to acquire one paying customer (your break-even CAC) and still be profitable on the first order (ignoring repeat purchases, which you should treat as pure upside).

## Organic / free channels (do these first — they cost time, not money)

- **WhatsApp Status + Business catalog**: your highest-intent, zero-cost channel in Nigeria specifically. Post new arrivals to your WhatsApp Status daily; the floating WhatsApp button already on the storefront (`WhatsAppButton.jsx`) turns "I saw it on Status" into a direct conversation.
- **Instagram + TikTok organic**: product photos/short videos of shoes styled with outfits perform far better than plain product shots. Post consistently (3-5x/week) before spending on ads — an ad sending traffic to a dead-looking Instagram profile converts worse than one sending traffic to an active one.
- **Google Business Profile**: free, and matters for local search + Google Maps if you have any physical pickup point.
- **SEO**: already built into the codebase (dynamic sitemap, JSON-LD, meta tags — see the README's SEO section). This is a slow-burn channel (weeks to months to rank), but genuinely free traffic once it works. Don't expect it to matter for week-one sales.

## Paid channel #1: Meta Ads (Facebook + Instagram)

Best starting point for a fashion/footwear store — highly visual product, and Meta's targeting is strong for Nigeria.

**Campaign structure to start with:**
1. **Objective**: "Sales" (conversion campaign), optimizing for `Purchase` — requires the pixel from step 2 above to have fired at least ~15-25 purchase events before Meta's algorithm has enough data to optimize well. Below that, expect it to underperform; consider starting with "Traffic" or "Engagement" objectives for the first week to gather pixel data cheaply, then switching to "Sales."
2. **Audience**: start broad (18-45, Nigeria, interests in fashion/shoes brands you resemble) rather than over-narrowing — Meta's algorithm generally finds your buyer faster with more room to search, especially at a small daily budget.
3. **Creative**: 3-5 ad variations minimum (different product, different angle — video outperforms static images for footwear). Let Meta's delivery system find the winner rather than guessing.
4. **Budget**: start at ₦5,000-10,000/day for the first 3-5 days per campaign, purely to gather data — resist the urge to judge performance in the first 48 hours (Meta's own "learning phase").
5. **Retargeting** (set this up second, once you have any traffic): a separate campaign targeting `AddToCart` and `InitiateCheckout` events from the last 7-14 days who haven't purchased — this is usually your highest-ROI campaign once you have enough volume, since it's re-engaging people who already showed real intent.

**Common first-campaign mistakes to avoid**: changing the ad/budget every day (resets the learning phase), targeting too narrow an audience at a small budget, and running a campaign without the Purchase event actually verified as firing correctly (test this in Meta Events Manager before spending real budget).

## Paid channel #2: Google Ads

Two ad types worth considering, in priority order for a store your size:

1. **Google Shopping ads** (via a Merchant Center product feed) — shows your actual product photo + price directly in search results for people already searching "buy [product type] Nigeria." Higher intent than Search ads, and the product feed can be generated from your existing `Product` collection (name, price, image, category map cleanly to Merchant Center's required feed fields) — a genuinely small technical lift if you want it built.
2. **Search ads** targeting specific, high-intent keywords (e.g. "buy sneakers online Nigeria," not generic terms like "shoes," which are expensive and low-intent). Google Ads' broad match will burn budget fast on generic terms for a small account — start with phrase/exact match on specific terms.

Google Ads generally has a steeper learning curve to run well than Meta for a visual product like this — if you can only manage one paid channel well at launch, Meta is the better first choice for shoes/clothing specifically.

## What "good" looks like in the first month

Rough Nigeria-market e-commerce benchmarks to sanity-check your own numbers against (these vary a lot by product/price point — treat as a starting reference, not a target to hit exactly):
- Meta ROAS (return on ad spend) of 2-3x is a reasonable "this is working, scale it" signal for a new account; below 1x consistently after the learning phase means stop and fix the creative/audience/offer, not just add budget.
- Cart abandonment (people who `AddToCart` but never complete `Purchase`) of 60-80% is normal for e-commerce broadly — this is exactly what the retargeting campaign above exists to claw back, not a sign something is broken.

## Realistic sequencing for week one

1. Get checkout genuinely working end-to-end (real Paystack test transaction, confirm the webhook marks it paid).
2. Add Meta Pixel + GA4/Google Ads tracking, verify events fire correctly.
3. Post organically for a few days first — Status, Instagram, WhatsApp — to have *some* traffic/social proof before ads start.
4. Launch one small Meta campaign (₦5-10k/day), let it run 4-5 days untouched.
5. Once you have real Purchase data, decide: scale what's working, kill what isn't, and set up the retargeting campaign.
6. Consider Google Shopping only after Meta is stable — it's a second channel to layer on, not a first move.

Want the pixel/GA4 event wiring or the Google Merchant Center product feed actually built into the codebase? Both are concrete, scoped additions — say the word.
