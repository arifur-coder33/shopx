# Shopz Platform Admin

The Platform console is available at `/platform/login` on the configured
`PLATFORM_DOMAIN` in `DEPLOYMENT_MODE=SAAS`. It uses a separate PlatformMember
Auth.js session; legacy User and StoreMember credentials do not grant access.

The public Platform landing page is `/pricing`. On the Platform hostname,
`/` redirects there instead of rendering a Store storefront. Pricing displays
active Plan records but does not yet accept signups or subscription payments.
Store storefronts continue to resolve only through verified Store domains.

To bootstrap the first real Platform SUPER_ADMIN, set these server-only values
in the deployment environment and run the existing seed once:

```text
PLATFORM_SUPER_ADMIN_EMAIL=<your platform admin email>
PLATFORM_SUPER_ADMIN_PASSWORD=<unique strong password, at least 12 characters>
```

```sh
npx prisma db seed
```

The seed creates this PlatformMember only if no Platform SUPER_ADMIN exists. It
does not overwrite an existing member or copy legacy User credentials. Remove
both `PLATFORM_SUPER_ADMIN_EMAIL` and `PLATFORM_SUPER_ADMIN_PASSWORD` from the
environment after successful creation; keep `PLATFORM_AUTH_SECRET` configured
for sessions.

Store creation provisions a real OWNER and starts on the existing Free Plan
fallback without a paid subscription. Store domains are visible in the Platform
console but cannot be activated there until a separate verified-domain flow is
implemented. Subscription records are read-only until billing is integrated.
