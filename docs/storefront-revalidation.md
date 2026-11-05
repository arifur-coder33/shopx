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

## Timer removal prerequisites

The layout-level 60-second setting was removed earlier. Page-level 60-second
settings and timed data caches still exist. This patch does not claim to
eliminate periodic ISR writes.

- Product stock now loads separately after the static page hydrates, from
  `/api/products/[id]/stock` with no-store on both request and response.
  Purchase controls render immediately, including the static preview. Stock
  refresh runs silently in the background; a small availability label appears
  after success and Buy Now disables for unavailable stock unless out-of-stock
  ordering is enabled. Selected variations resolve against the fresh stock
  values. Checkout still validates current
  stock in orderActions. Static SEO availability remains a generation-time snapshot.
- Campaign start/end and notice start/end use server time. They change without
  an admin edit. Keep bounded timed refresh until boundary-triggered invalidation
  or client display logic is implemented. Notice is in shared navigation, so
  this affects pages beyond the campaign routes.
- Shared 300-second data caches and the 60-second checkout-provider cache can
  also shorten static route freshness. Changing only the page export to false
  will not make the entire route event-only.
- Inventory mutations/POS/delivery/returns need either targeted stock-related
  SEO invalidation or a bounded freshness policy for static availability metadata,
  even after the interactive stock display fetches live values.

Route invalidation marks output stale; regeneration happens on a subsequent
request. It does not rebuild every catalog URL immediately.
