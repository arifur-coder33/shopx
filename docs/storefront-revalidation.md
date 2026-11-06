# Storefront revalidation audit

Product detail remains `force-static`. A Prisma query inside that page runs
when the page is generated/regenerated, not for every visitor.

| Page/data | Changes that should invalidate it | Current coverage |
| --- | --- | --- |
| Home | Banners, featured/regular products, categories, campaign display/prices, published site photos, product review aggregates, site identity/SEO/contact | Existing path/tags; customer reviews now invalidate home aggregates too |
| Product | Product details, images/videos, variation prices/options, specifications, category breadcrumb, published reviews, campaign offers, EMI provider availability | Product/category/campaign mutation branches now also invalidate direct catalog routes |
| Category | Category name/path/banner, descendant/category product membership, product prices/images/status, campaign pricing, review summaries | Catalog mutation route invalidation plus customer review invalidation |
| Campaign list/detail | Campaign details/status/targets, associated product/category content, start/end time | Catalog routes invalidated on catalog edits; all campaign mutation branches invalidate catalog routes |
| Buy Now | Product/variation/pricing/payment restrictions, category breadcrumb, delivery rates, gateways, campaign offers | Catalog and provider mutations now invalidate Buy Now |
| Checkout | Gateway/courier configuration, delivery rates, campaign offers | Provider changes invalidate checkout; campaign display still has timed refresh |
| Contact/privacy/return policy/terms | Page content/SEO, shared contact/identity/footer data | Content actions invalidate paths/tags; shared settings actions invalidate root layout |
| Shared navigation/footer | Categories, notice, identity/logo, footer content, tracking settings | Existing categories/notice/settings/content/tracking tags and layout invalidation |
| Account/order/tracking/payment results | User/order/payment state | Request/client data; do not cache personal data with public ISR |

## Changes made

- Added a shared catalog route invalidator for product, Buy Now, category and
  campaign detail pages. These read Prisma directly, so a products tag alone
  does not invalidate all their rendered output. Pattern invalidation also
  covers old URLs when product/category slugs change.
- Called it from product/category/campaign mutation branches. This includes
  product activation and campaign pause/delete, which previously missed routes.
- Added provider invalidation for product EMI display and Buy Now delivery and
  gateway data.
- Customer product reviews now invalidate home's cached review aggregates and
  category summaries.
- Corrected product-status invalidation to use the slug-based product tag.

## On-demand and scheduled refresh

Home, product, Buy Now, checkout, category, campaign, contact, privacy and return
pages now export `revalidate = false`. Product and catalog routes keep their
existing `force-static` configuration. Site appearance, contact information,
navigation categories, content pages, public tracking settings, notices and
checkout providers also use on-demand data caches with their existing tags.

Admin add/edit/delete actions invalidate the relevant routes and data tags.
The shared catalog invalidator includes campaign listing and checkout, in
addition to product/Buy Now/category/campaign detail pages.

### Scheduled campaigns and notices

`storefrontScheduleService.js` reads the published campaign schedule through an
on-demand cache. It registers a cached marker with a lifetime calculated from
the nearest future start/end boundary. Notice data registers its own schedule
marker in the shared navigation. This marker allows Next's Full Route Cache to
expire at the relevant transition without a fixed one-minute/five-minute poll.

Campaign display caches, including home product batches, include the most
recent schedule boundary in their cache keys. Once a boundary passes, the next
generation uses a different key, preventing reuse of the previous campaign
display result. Coupon-free product pricing and public campaign highlights
retain their existing selection rules.

No future boundary means `revalidate: false`: only explicit invalidation
refreshes the output. Admin schedule edits invalidate schedule/data tags and
routes. Campaign pages, category pages, Buy Now and checkout register their
schedule dependency directly; home/product also register it through their
campaign display readers.

This retains normal ISR behavior: after expiry, a request triggers regeneration.
The first request can receive the stale page while regeneration finishes.
There is no background scheduler that rebuilds pages without traffic.
Live order validation remains authoritative for stock, pricing and campaigns.

### Stock and failures

Product stock still loads from the no-store stock API after the static page
hydrates. Purchase controls render immediately; successful stock results update
availability. Static SEO stock availability remains a generation-time snapshot;
it does not become live simply by changing the cache policy.

Database failures are not cached as empty payment options/navigation/home data
or false product/category 404s. Failed regeneration can retain the last
successful page rather than permanently saving a failure as on-demand output.

### Scope and checks

The hourly sitemap and six-hour external analytics cache were retained; these
are separate from storefront page/settings caching.

`node --test lib/storefrontSchedule.test.mjs` checks no-schedule behavior,
the nearest future start, inclusive end boundaries, cache epoch changes and
multiple campaigns. Modified source files pass ESLint. Production Vercel ISR
headers/cache behavior has not been measured in this workspace.

Route invalidation marks output stale; regeneration happens on a subsequent
request. It does not rebuild every catalog URL immediately.
