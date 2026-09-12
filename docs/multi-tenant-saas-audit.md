# Multi-tenant Ecommerce SaaS — Phase 1 Audit

Audit date: 2026-09-12

This document audits the existing application before any multi-tenant schema or
business-data change. The existing ecommerce application must remain the core;
the SaaS functionality should be added as a separate layer.

## Executive decision

Use one codebase with two explicit layers:

- `core ecommerce`: catalog, checkout, orders, inventory, procurement,
  accounting, providers, reports and the current customer admin.
- `SaaS layer`: tenants, domains, memberships, plans, subscriptions, platform
  billing and hostname resolution.

The central contract should be `getCurrentStore()`. In SaaS mode it resolves a
store from the normalized request hostname or an already-resolved internal route
context. In a future standalone mode it returns the default store. Core services
must receive this trusted store context and must never accept a client-supplied
`tenantId`.

Do not put a single `tenantId` directly on `User` as the primary authorization
design. A global user identity may need to own or work in more than one store.
Use `TenantMembership` to connect users, stores and tenant-specific roles.

## 1. Current architecture

- Next.js 16 App Router and React 19.
- MongoDB through Prisma 6.19.
- Public ecommerce routes live in `app/(user)` and currently map directly to
  `/`, `/product/[slug]`, `/category/[...slug]`, `/checkout` and related URLs.
- The customer admin lives in `app/admin` and maps to `/admin`; its layout is
  dynamic and uses the current RBAC UI.
- Business logic is concentrated in 39 server-action files, service modules and
  16 API route files.
- There are approximately 332 direct Prisma model operations across 59 files.
  Most are currently unscoped because the application is single-store.
- Payment and courier implementations already use adapter-style modules, which
  can be retained and made tenant-aware.
- The master seed is already consolidated in `prisma/seed.js` and seeds RBAC,
  the default cash account, providers, tracking settings and content pages.

## 2. Current Prisma schema

The schema contains identity/RBAC, catalog, sales, provider, content,
procurement, inventory and accounting models in a single database. No tenant or
domain model currently exists.

Important current assumptions:

- Product/category slugs and business document numbers are globally unique.
- Roles and permissions are global.
- `SiteSetting`, `SocialTrackingSetting`, payment gateways and couriers are
  effectively global single-store configuration.
- `SocialTrackingSetting` uses the fixed id `SOCIAL_TRACKING`.
- Site settings are read with `findFirst()`.
- Counters are global, so generated product/order/PO/GRN/delivery/accounting
  numbers cannot safely be reused by separate stores.
- Media has no ownership boundary, although it affects storage limits and must
  be tenant-owned.

## 3. Models requiring tenant ownership

### New global SaaS models

- `Tenant`
- `Domain`
- `Plan`
- `Feature`
- `PlanFeature`
- `Subscription`
- `TenantMembership`
- optionally `SubscriptionPayment` or a platform-billing payment reference
  model; store-order `Payment` must not be reused as SaaS billing without an
  explicit abstraction.

### Keep global

- `User` as the login identity
- Auth.js `Account`, `Session`, `VerificationToken`
- `Resource` and `Action` as the global permission vocabulary
- `Plan`, `Feature`, `PlanFeature`
- provider adapter definitions, which remain in code and contain no customer
  credentials

### Tenant-owned authorization

- `Role` and `RolePermission` should be tenant-owned for store roles.
- Platform super-admin authority should be explicit and separate from a tenant
  role. It may be represented by a platform role field/membership, but a tenant
  must not be able to create a role that grants platform administration.
- `TenantMembership` should connect `userId`, `tenantId` and `roleId`, with a
  unique membership per user/store.

### Tenant-owned ecommerce models

The following root records require `tenantId`; dependent child records should
also carry it where it improves enforcement, indexing and safe direct lookup:

- Catalog: `Category`, `VariationName`, `VariationValue`,
  `ProductCodeCounter`, `Media`, `Product`, `ProductVideo`, `ProductGallery`,
  `ProductVariation`, `Combination`.
- Sales: `Order`, `OrderItem`, `OrderCounter`, `Counter`, `Shipping`, `Payment`,
  `Refund`, `Ledger`, `OrderTimeline`.
- Providers/configuration: `PaymentGateway`, `CourierProvider`,
  `CourierPickupPoint`, `SocialTrackingSetting`.
- Store content: `SiteSetting`, `ContentPage`, `Notice`, `banner`, `HeroSlide`.
- Procurement: `Supplier`, `SupplierDocument`, `PurchaseOrder`, `PurchaseItem`,
  `Warehouse`, `GoodsReceipt`, `GoodsReceiptItem`.
- Inventory/delivery: `Stock`, `InventoryTransaction`, `Delivery`,
  `DeliveryItem`.
- Money/accounting: `ExpenseCategory`, `Expense`, `SupplierPayment`,
  `FinancialAccount`, `MoneyAccount`, `MoneyTransaction`, `Shareholder`,
  `FinancialYear`, `AccountingPeriod`, `JournalEntry`, `JournalLine`.

`User` is currently also used as the customer account and has an `orders`
relation. Orders themselves must be tenant-owned. If store-specific customer
profiles, addresses or store-level status are needed, add `StoreCustomer`
(`tenantId`, `userId`) instead of duplicating login identities.

## 4. Existing authentication flow

- Auth.js uses credentials, JWT sessions and PrismaAdapter.
- Login looks up users globally by email.
- JWT contains `id`, `role`, `roleId`, `tokenVersion` and a permission list.
- `SUPER_ADMIN` receives wildcard `*` permissions.
- A process-memory permission cache is keyed by `roleId`.
- `proxy.js` protects `/admin` from unauthenticated/`USER` accounts and protects
  `/my-account` from unauthenticated access.
- Server actions inconsistently use `hasPermission()` or
  `requireProcurementPermission()`; authorization is not a single mandatory
  boundary.

Required change:

1. Keep authentication global.
2. Resolve the current tenant from the trusted hostname.
3. For `/admin`, require an active `TenantMembership` for that tenant and load
   permissions from its tenant role.
4. A platform-host `/admin` request may permit platform super-admin only; it
   must not silently become a customer admin context.
5. Include no client-selectable tenant authority in the JWT. A tenant hint may
   be cached, but every protected request must compare it with hostname and
   current membership.

## 5. Existing admin structure

- Customer administration is already rooted at `/admin` and should remain
  there.
- `AdminShell`, menu filtering and resource/action permissions can be reused.
- The admin layout is dynamic, which is appropriate for hostname/membership
  checks.
- The current menu combines store operations and administration. Add a distinct
  platform menu/shell for Tenants, Domains, Plans, Features, Subscriptions,
  package limits and platform settings.
- Do not add `admin.customer.com` in this phase.

## 6. Server actions and API routes

The audit found about 332 direct Prisma calls. High-risk patterns include:

- `findUnique({ where: { id } })`, update and delete by id without tenant.
- generic fetch/create utilities that accept model/where/select data.
- direct store-wide `findMany()` in storefront, admin, feeds and sitemap.
- order recovery by order number/phone without a tenant boundary.
- global user listing at `GET /api/register`; it currently returns full user
  records and must be removed or protected before SaaS launch.
- `GET /api/products` checks authentication but not tenant membership.
- public product search and merchant feeds query all products.
- invoice/PDF, tracking, POS, procurement and reports need explicit tenant
  context.

For every tenant-owned mutation, replace id-only access with a tenant-scoped
lookup before mutation. Composite unique inputs can be used after migration,
for example `tenantId_slug`. Client `tenantId` fields must be stripped rather
than merged into Prisma data.

## 7. Current payment architecture

- Configured gateway adapters: COD, SSLCommerz, bKash, Nagad and Rocket.
- Provider definitions and credential-field definitions live in code.
- Customer credentials are encrypted in `PaymentGateway.encryptedCredentials`.
- SSLCommerz validates with the provider validation API.
- bKash executes the payment server-side before posting it.
- Nagad verifies signatures/status server-side.
- Payment posting is centralized and creates money movements/accounting entries
  with duplicate guards.
- Gateway enablement can create/map a money account.

Tenant changes required:

- Gateway configuration, credentials, payment, money account and order must all
  have the same tenant.
- Callback lookup must start from an opaque globally safe payment attempt/id,
  then derive the tenant from the payment. It must never trust a callback
  `tenantId`.
- Success URLs must use the order tenant's verified primary domain, not one
  build-time site URL.
- Idempotency and transaction identifiers need suitable global or
  tenant-composite uniqueness.
- SaaS subscription billing must use a separate platform billing context while
  reusing the verified adapter interface where appropriate.

## 8. Current courier architecture

- Configured courier adapters: Manual, Steadfast and Pathao.
- Credentials/configuration are database-driven and encrypted.
- Pickup points support Pathao store ids.
- Courier booking updates the order to processing; delivery/COD posting is
  handled by status synchronization/webhook logic.
- Steadfast webhook currently locates a shipment globally by consignment id and
  does not visibly authenticate/signature-check the inbound request.

Tenant changes required:

- Courier providers, pickup points, shipments, orders and COD money accounts
  must share a tenant.
- Provider token caches must include tenant/provider identity; Pathao currently
  hashes base URL/client/user, which is useful but provider id should be part of
  the boundary.
- Webhooks need provider-specific authentication and an opaque route/config key
  or globally unique verified consignment mapping before any update.

## 9. Current caching

Current caches and invalidation keys are global:

- `site-setting`
- `content-pages`
- `contact-details`
- `social-tracking`
- `checkout-providers`
- `products` and `product-${slug}`
- React `cache()` for product-by-slug, categories and site settings
- global path revalidation such as `/` and `/product/[slug]`

Home, product, category and buy-now pages currently use `force-static`/ISR.
That is safe only for a single store. A custom-domain SaaS request cannot use a
single build-time version of `/` for every tenant.

Recommended routing/cache design:

1. Proxy normalizes the hostname and overwrites any incoming internal tenant
   headers.
2. Platform domains are served by platform routes.
3. Store domains are internally rewritten to a hidden route containing the
   hostname/domain key, such as `/_store/[domain]/...`; the browser continues to
   show `/product/...` and never sees `/store` or `/tenant`.
4. The internal domain parameter is resolved by `getCurrentStore()` through a
   verified `Domain` record.
5. ISR output is naturally separated by internal domain path, and data cache
   keys/tags include the immutable tenant id: `products:${tenantId}` and
   `product:${tenantId}:${slug}`.
6. Direct requests to the internal prefix are blocked.
7. Admin remains dynamic at the external `/admin` URL and resolves the same
   hostname context.

This keeps customer URLs clean and preserves fast ISR without mixing tenants.

## 10. Safe existing-data migration strategy

MongoDB/Prisma requires a staged migration. Do not make `tenantId` required in
the first schema push.

### Stage A — additive

1. Back up the production database and record collection/index counts.
2. Add SaaS models and an idempotent default tenant/domain seed.
3. Add nullable `tenantId` plus indexes to tenant-owned models.
4. Keep current global unique indexes temporarily.
5. Deploy code that can read the default tenant for legacy rows while writes
   always include the default/current tenant.

### Stage B — backfill and verify

1. Run one explicit, resumable backfill script that attaches every existing
   store record to the default tenant in dependency order.
2. Backfill fixed singleton/config rows and provider money accounts.
3. Verify parent/child tenant consistency, relation orphans, counts, balances,
   stock, journal totals and payment idempotency.
4. Refuse finalization while any required row has no tenant.

### Stage C — uniqueness conversion

Convert store-global business uniques to tenant composites, including at least:

- category/product slug and product code
- variation names where they are store-defined
- order/order-counter/counter identifiers
- gateway/courier code
- content-page slug
- supplier code, PO, warehouse, GRN, batch and delivery numbers
- expense category and chart-of-account codes
- money transaction, financial year/period and journal numbers
- stock uniqueness becomes `(tenantId, warehouseId, variationId)`

Only after duplicate validation should old global indexes be removed and new
compound indexes created.

### Stage D — enforce

1. Make tenant fields required in Prisma after every row is backfilled.
2. Remove legacy fallback reads.
3. Enable tenant-isolation regression tests and fail CI on unscoped access.

The seed remains one master seed. Data backfill is intentionally a separate
one-time migration command; silently running production backfills during every
seed is unsafe.

## 11. Potential breaking changes and security risks

- Changing `slug @unique` to a composite changes all `findUnique({slug})`
  calls and static parameter generation.
- `force-static` storefront pages can serve the wrong store unless routing is
  made domain-keyed first.
- Global cache tags can leak one tenant's theme, products, content or providers
  to another tenant.
- Existing role ids in JWTs will need a controlled session invalidation when
  memberships replace direct roles.
- Fixed `SOCIAL_TRACKING` id and `findFirst()` settings cannot support tenants.
- Business counters and codes will collide or remain unnecessarily global.
- Payment/courier callback URLs and provider lookup must derive tenant safely.
- File uploads need tenant-prefixed storage ownership and quota accounting.
- Generic Prisma helpers can bypass isolation unless restricted or replaced.
- Nested writes must validate that referenced category/product/warehouse/
  provider/account ids belong to the same tenant.
- MongoDB nullable unique indexes have previously caused null collisions in this
  project; optional unique fields must not be introduced without index review.
- The public `GET /api/register` user dump is a critical pre-SaaS exposure.
- The Steadfast webhook requires authentication/replay protection before
  multi-tenant production use.

## 12. Recommended implementation order

1. Add automated isolation test fixtures for two tenants before changing core
   queries.
2. Add `Tenant`, `Domain`, plans/features/subscriptions and membership models,
   all initially additive.
3. Add idempotent default tenant/domain creation and a dry-run capable backfill
   script.
4. Implement hostname normalization and `getCurrentStore()` with SaaS and
   future standalone adapters.
5. Add tenant-aware cache key/tag helpers.
6. Convert the storefront read path first: site identity, navigation, home,
   product, category, search, cart lookup, checkout providers, content, feeds,
   sitemap and tracking configuration.
7. Convert order creation/payment initiation/callbacks as one atomic vertical
   slice and test cross-tenant id tampering.
8. Convert customer `/admin` authorization to hostname + membership while
   retaining `/admin` and the current UI.
9. Convert catalog writes and media ownership.
10. Convert inventory/procurement/POS/delivery and accounting transactions.
11. Add platform UI/routes for tenant/domain/plan/feature/subscription
    administration.
12. Add pricing, platform registration, store creation, domain verification and
    server-verified subscription activation.
13. Enforce feature/limit checks through one entitlement service, not UI-only
    conditions.
14. Finalize compound uniques and required tenant fields only after production
    backfill verification.
15. Run security, accounting, payment, cache isolation and two-domain browser
    regression suites before enabling customer onboarding.

## Acceptance gates for every implementation phase

- Tenant A cannot read, update, delete or reference Tenant B records by changing
  an id, slug, query parameter or request body.
- A cache warmed by Tenant A never appears for Tenant B.
- Existing default-store flows continue to pass unchanged.
- Payment and courier callbacks identify the tenant from trusted server data.
- Platform super-admin and customer-admin permissions remain separate.
- No existing records are deleted and every migration has a dry-run/reporting
  mode.
