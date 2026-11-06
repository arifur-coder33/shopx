# SSLCommerz EMI settings

## Deployment

Apply `prisma/migrations/20261106000100_provider_emi_configuration/migration.sql`
with the project's normal migration deployment (`npx prisma migrate deploy`)
before starting the updated application. Prisma Client must also be generated.
The first time an administrator opens EMI settings, the configuration is seeded
with the previous bank and tenure rate list. EMI remains disabled until an admin
explicitly enables it. The previous default product amount (৳132,000) is used
as the initial minimum and can be edited. Verify all bank rates and eligibility
against the current SSLCommerz merchant agreement before enabling.

## Administration

Open Settings → Payment Gateways → SSLCommerz → EMI settings.
Enable EMI, set the minimum payable amount, and add bank/tenure rows with the
total charge percentage for that tenure. Individual plans can be disabled.
Enabling EMI requires a positive minimum and at least one active plan. The
SSLCommerz provider must also be active and ready (credentials/account).
These actions require the existing provider view/update permissions.

`EmiConfiguration` belongs to one PaymentGateway; `EmiBankPlan` stores bank name,
months, charge percent and active status, unique per configuration/bank/tenure.

## Customer behavior

The product page stays static. Its plan estimate uses the selected variant's
effective price times quantity; before selection it uses the lowest configured
effective variant price. The widget appears only at or above the configured minimum.
The hardcoded product amount and bank-rate list have been removed.

Checkout eligibility uses the payable order total after discounts plus delivery.
Minimum-advance payments do not offer EMI. An EMI selection is cleared when
cart/rule changes make it ineligible. Order creation and payment initiation both
check the configured eligibility on the server, so stale page caches cannot
bypass it. Saving settings invalidates checkout providers and storefront routes.

Rates are informational estimates: total = amount × (1 + chargePercent / 100),
monthly = total / tenureMonths. These are total tenure charges, not APR.
They do not modify SSLCommerz or bank pricing. The hosted checkout determines
final issuer/card eligibility and charges. Its EMI maximum tenure is sent from
the largest active configured plan; this is a maximum, not a bank allowlist.
Only enter bank plans and tenures supported by your merchant agreement.

API reference: https://developer.sslcommerz.com/doc/v4/

## Validation

`node --test lib/emi.test.mjs` covers threshold boundaries, disabled/empty plans,
invalid rates/tenures and duplicate bank plans. ESLint and Prisma schema
validation passed; Prisma Client generation completed. No database migration,
live payment or browser checkout was executed during implementation.
