# Order realtime and push setup

Order realtime uses a WebSocket Route Handler at app/api/order-socket/route.js, backed by MongoDB Change Streams. Each connected browser receives order inserts; the abandoned-checkout page subscribes to lead changes as well. Mobile/background notifications use Web Push and the service worker.

## Required environment variables

- DATABASE_URL: the existing MongoDB replica-set connection, with a database name in the path.
- AUTH_SECRET: the existing Auth.js secret.
- VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT: Web Push credentials. Generate a key pair with npx web-push generate-vapid-keys; use a mailto: value for VAPID_SUBJECT.

Keep keys in Vercel project environment variables; do not commit them. After setting VAPID variables, redeploy.

## Mobile notification setup

Install the site on the iPhone Home Screen from Safari (Share → Add to Home Screen), open the installed web app, sign in, and tap “নোটিফিকেশন চালু করুন”. iOS/iPadOS 16.4+ supports Web Push for Home Screen web apps. Android users can enable notifications in a supported browser after signing in.

## Realtime behavior

The App Router endpoint uses Vercel's experimental_upgradeWebSocket API. Vercel WebSocket support requires Fluid Compute. MongoDB must be a replica set because Change Streams are unavailable on standalone MongoDB servers.

The browser reconnects with backoff when a Function reaches its duration limit, then reloads the current order list to recover missed events. If the socket is unavailable, Orders2 syncs every 30 seconds while visible; abandoned checkouts sync every 60 seconds while visible.

For local development, run the app through Vercel CLI (vercel dev), not npm run dev. Plain next dev does not provide Vercel's WebSocket upgrade runtime. Use a recent Vercel CLI version and the project's local environment variables.

After deployment, open /admin/orders2 in two signed-in browser sessions and create an order. The new order should appear without refreshing the page. Push notifications require VAPID keys and a per-device subscription.
