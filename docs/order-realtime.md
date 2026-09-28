# Order realtime and push setup

Order realtime uses a Vercel Socket.IO function backed by a MongoDB Change Stream. The stream is shared by all connected clients within each warm Function instance; each instance watches MongoDB directly, so no Redis service is required. Mobile/background notifications use Web Push and the service worker.

## Required Vercel environment variables

- `DATABASE_URL`: the existing MongoDB replica-set connection, with a database name in the path.
- `AUTH_SECRET`: the existing Auth.js secret.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: Web Push credentials. Generate a key pair with `npx web-push generate-vapid-keys`; use a `mailto:` value for `VAPID_SUBJECT`.

Keep all keys in Vercel project environment variables; do not commit them. After setting the VAPID variables, redeploy the project.

## Mobile notification setup

Install the site on the iPhone Home Screen from Safari (Share → Add to Home Screen), open the installed web app, sign in, and tap “নোটিফিকেশন চালু করুন”. iOS/iPadOS 16.4+ supports Web Push for Home Screen web apps. Android users can enable notifications in a supported browser after signing in.

Vercel WebSocket support is currently a beta feature. Enable WebSocket support for the Vercel project/deployment and use a Node.js Function with Fluid Compute. Socket.IO is configured for WebSocket transport only; it does not fall back to HTTP polling. MongoDB must be a replica set because Change Streams are unavailable on standalone MongoDB servers.

The Socket.IO connection updates Orders2 while the page is open. Web Push can show a system notification while the app is in the background or closed. Reconnects refresh the order list once to recover events received while disconnected. After deployment, open `/admin/orders2` in two signed-in browser sessions and create an order. The new order should appear without refreshing the page. If the socket is unavailable, the page falls back to a 30-second refresh. Push notifications require VAPID keys and a per-device subscription; while the page is open, in-page alerts use the live socket.
