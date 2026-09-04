# mqcart-web

A Next.js website for **mqcart**, sharing the same Firebase project
(`mqcart-prod`) as the existing Flutter mobile app. It reads and writes the
same Firestore collections (`users`, `societies`, `shops`, `products`,
`orders`, `seller_applications`, `analytics_*`) and reuses the same Cloud
Functions backend — no new backend was created.

## Who this is for

One codebase, three role-based experiences (routed by the signed-in user's
`role` field on their `users/{uid}` document):

| Area | Routes | Role |
|---|---|---|
| Buyer storefront | `/`, `/shops`, `/shop/[shopId]`, `/cart`, `/checkout`, `/orders`, `/sell` | `buyer` |
| Seller dashboard | `/seller`, `/seller/products`, `/seller/orders` | `seller` |
| Admin console | `/admin`, `/admin/sellers` | `admin` |

`RoleGuard` (`src/components/RoleGuard.tsx`) redirects unauthenticated users
to `/login` and blocks users from areas outside their role.

## Getting started

```bash
npm install
npm run dev
```

The Firebase web config is already baked into `src/lib/firebase.ts` (copied
from the Flutter app's `firebase_options.dart` web target — this is a public
web API key, not a secret; access is enforced by Firestore/Storage security
rules). You can override it per-environment with a `.env.local` — see
`.env.local.example`.

## Deploying to Firebase Hosting

This repo is already wired to the same project via `.firebaserc`
(`mqcart-prod`).

```bash
npm install -g firebase-tools   # if you don't have it
firebase login
npm run build
firebase deploy --only hosting
```

Firebase Hosting auto-detects the Next.js framework from `firebase.json`'s
`"source": "."` and builds/deploys the SSR app on Cloud Functions +
Cloud Run behind the scenes. No extra config needed as long as you're
authenticated against a Firebase account with access to `mqcart-prod`.

## Important gaps to close before going live

1. **Firestore/Storage security rules** — verify the existing rules permit
   these same reads/writes from a web client (they should, since rules key
   off `request.auth` + `role`, not platform, but worth confirming rules
   aren't scoped to the mobile app's App Check config).
2. **Buyer checkout payments** — the existing `createSellerOrder` /
   `razorpayWebhook` Cloud Functions only handle the **seller monthly
   subscription fee**, not buyer order payments. The checkout page here
   supports Cash on Delivery today; wiring "Pay online" for buyer orders
   needs a new callable function (same Razorpay pattern, keyed off order id
   instead of `paymentDocId`).
3. **Shop creation after seller approval** — `/admin/sellers` flips
   `sellerStatus` to `active` on approval, mirroring the mobile app, but
   creating the actual `shops/{shopId}` document for a newly approved seller
   isn't automated anywhere in the current codebase (mobile or web) — check
   whether that happens manually today.
4. **Image uploads** — product/shop images use Firebase Storage in the
   mobile app; the web product form currently only takes text fields. Add a
   Storage upload widget using the existing bucket
   (`mqcart-prod.firebasestorage.app`) when ready.

## Stack

Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Firebase JS SDK v12
(Auth, Firestore, Storage, Functions client). Cart state is client-side
(`localStorage`) since there's no cart collection in Firestore — mirrors the
mobile app's local `cart_storage_service`.
