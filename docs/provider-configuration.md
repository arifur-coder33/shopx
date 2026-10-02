# Money Accounts and provider configuration

Money Accounts are client-managed business accounts with one of these types:
`CASH`, `BANK`, `MOBILE_FINANCIAL`, `PAYMENT_GATEWAY`, or `COURIER`. The
finance/provider seed creates the default Cash account and can be run safely more
than once:

```bash
npx prisma db seed
```

Payment gateways and couriers are registered in
`backend/services/providerCredentialService.js`. Each payment implementation has
its own readable adapter file under `backend/lib/payments/providers/`. Adding a
new integration means adding its adapter implementation and registry definition;
authorized users configure and enable registered integrations but cannot invent
or delete adapter records.
The seed creates enabled COD and Manual Delivery records. COD needs no Money
Account. Enabling an online gateway creates/reuses a `PAYMENT_GATEWAY` account.
Enabling a courier creates/reuses a `COURIER` account only when its configured
`supportsCod` value is true.

Payment gateway and courier credentials can be stored encrypted in the database.
Set one server-only master key before saving credentials from Admin:

```env
PROVIDER_CREDENTIAL_ENCRYPTION_KEY=<at-least-32-random-characters>
```

Generate a high-entropy value with a trusted secret manager or a command such as
`openssl rand -base64 32`, then store it in the local server environment and the
production/Vercel environment. Never prefix it with `NEXT_PUBLIC_`, commit it, or
paste it into provider configuration fields.

Client-specific credentials such as Store ID, API key, secret, username, and
password are accepted only through Admin and stored with AES-256-GCM encryption.
They are never loaded from ENV and are never returned to the browser. Payment and
courier API hosts for bKash, Nagad, SSLCommerz, Steadfast, and Pathao are kept in
`backend/config/providerEndpoints.js`. Update provider hosts there; the saved
Sandbox/Live setting selects the matching host where the provider has both
environments. Credentials remain in the encrypted database provider settings.

For SSLCommerz, configure the IPN listener in both the sandbox and live merchant
panels to the deployed site's `/api/py/sslc/ipn` URL. The listener validates each
notification against SSLCommerz before posting it, so a customer browser or
network disconnect after payment does not leave a successful transaction
unrecorded. A local `localhost` URL cannot receive provider-to-server IPNs.

Disabling a provider preserves its mapping, balance, transactions, payments,
refunds, settlements, and journals. Account-to-account transfers continue through
the Money Accounts page and use the central transaction/journal posting service.

## Provider authorization

Provider listing uses the `provider:view` permission. Changing enablement,
configuration, account mapping, or encrypted credentials—and revealing a saved
credential—requires `provider:update`. Run the master seed once after deploying
this change so the `provider` RBAC resource and registered providers exist, then
grant only the required provider permissions from the role permission screen.

## Direct MFS adapters

- `bkash.js` implements the official bKash hosted checkout create/execute flow.
- `nagad.js` implements Nagad v3.3 Initialize, Place Order, RSA response
  verification, hosted checkout, and server-side Check Payment Status.
- `rocket.js` is an intentionally disabled adapter boundary until the client's
  official DBBL Nexus/Rocket WSDL and merchant integration pack are supplied.

Nagad requires Merchant ID, optional merchant mobile number, merchant RSA private
key, Nagad gateway RSA public key, the merchant server IPv4, and the onboarding
live/test URL. Its callback never credits a Money Account from browser query
parameters; it first checks payment status directly with Nagad. Rocket remains
disabled until its provider-specific verification contract is available.
