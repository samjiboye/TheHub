# TheHub Backend

A real API for the TheHub marketplace: users, salon listings, bookings with
automatic commission calculation, and reviews. Uses SQLite for zero-config local
development — swap `db/index.js` for a Postgres client later without touching the routes.

## Setup

```bash
cd backend
npm install
npm start
```

Server runs at `http://localhost:4000`. The SQLite file (`db/TheHub.db`) and all
tables are created automatically on first run.

Populate it with demo data (a demo owner account and 6 sample salons) so the app isn't
empty on first load:

```bash
npm run seed
```

This prints the demo owner's login (`owner@TheHub.demo` / `demo1234`).

Set a real `JWT_SECRET` in a `.env` file before deploying anywhere public:

```
JWT_SECRET=some-long-random-string
PORT=4000
```

## How money moves through the API

Every booking (`POST /bookings`) automatically calculates:
- `commission_amount` — 15% of the service price, taken by TheHub
- `payout_amount` — the remaining 85%, owed to the salon
- `booking_fee` — flat $2.50 charged to the customer on top of the service price

This mirrors the model from the product plan: TheHub only earns when a real
booking happens, so incentives stay aligned with salons and customers.

## API Reference

### Auth
| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/auth/signup` | `name, email, phone?, password, role?` | `role` is `customer` or `owner` |
| POST | `/auth/login` | `email, password` | Returns a JWT to send as `Authorization: Bearer <token>` |

### Salons
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/salons?category=&lat=&lng=&q=` | none | Search/filter, sorted by distance if lat/lng given |
| GET | `/salons/:id` | none | Full profile with services + reviews |
| POST | `/salons` | owner | Create a listing |
| POST | `/salons/:id/services` | owner (must own salon) | Add a bookable service |
| GET | `/salons/:id/dashboard` | owner (must own salon) | Gross, commission, payout, upcoming bookings |

### Bookings
| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/bookings` | any logged-in user | No-payment shortcut — see Payments below for the real flow |
| GET | `/bookings/me` | any logged-in user | Your booking history |
| PATCH | `/bookings/:id/cancel` | booking owner | Cancels a booking |

### Payments (Stripe)
| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/payments/connect` | owner (must own salon) | `salon_id` — creates/resumes Stripe Express onboarding, returns `url` |
| GET | `/payments/connect/status?salon_id=` | owner (must own salon) | Whether payouts are enabled yet |
| POST | `/payments/checkout` | any logged-in user | `salon_id, service_id, time_slot` — creates a booking + Checkout Session, returns `url` |
| POST | `/webhooks/stripe` | Stripe only (signed) | Confirms payment, updates account status |

### Reviews
| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/reviews` | any logged-in user | `salon_id, rating (1-5), comment?, booking_id?` |

## Next steps
- Swap SQLite → Postgres + PostGIS for production-grade geo search
- Add rate limiting and input validation (e.g. `zod`) before this touches the public internet
- Show payout status in the owner dashboard so it's clear when a salon can accept paid bookings

## Paystack (real payments)

This adds real money movement on top of the commission math that was already being calculated: salons connect a Paystack subaccount, customers pay through Paystack's hosted checkout, and Paystack splits the charge automatically — the salon's payout goes straight to their bank account, and your commission plus the booking fee stay with your platform account.

### One-time setup

1. Create a [Paystack account](https://paystack.com) (test mode is free, no business details needed to start).
2. Get your test secret key from Settings → API Keys & Webhooks and set `PAYSTACK_SECRET_KEY`.
3. In the Paystack dashboard, set your webhook URL to `https://<your-backend>/webhooks/paystack`.
4. Set `FRONTEND_URL` to wherever the frontend is running (`http://localhost:5173` locally).

### How the flow works

- **Owner side:** the owner fills in their business name, bank, and account number in the app. `POST /payments/connect` creates a Paystack subaccount for the salon (once). `GET /payments/connect/status` checks whether that's done.
- **Customer side:** `POST /payments/checkout` creates a `pending` booking and initializes a Paystack transaction in one call, splitting the charge via the subaccount's `percentage_charge` (commission) and a `transaction_charge` (commission + booking fee, kept by the platform) — the rest goes straight to the salon's subaccount. The response includes a `url` — redirect the browser there.
- **Webhook:** Paystack calls `/webhooks/paystack` on successful payment, which flips the booking to `payment_status: paid`. Only paid bookings count toward the owner dashboard's gross/commission/payout totals.

### Testing without real money

Paystack's test mode accepts fake bank details for subaccount setup — e.g. Zenith Bank, account number `0000000000` — and test card numbers for checkout, so you can test the entire flow without any real money changing hands.

### Next step once this is live
Switch from test keys to live keys, and add each salon's payout status to their
dashboard view so owners know at a glance whether they can accept bookings yet.

## Deploying this for real (Render)

This repo includes a `render.yaml` blueprint, so deployment is close to one click:

1. Push this `backend` folder to a GitHub repo.
2. Go to [render.com](https://render.com) → New → Blueprint → connect that repo.
   Render reads `render.yaml` and sets up the web service, a persistent disk for the
   SQLite file, and a random `JWT_SECRET` automatically.
3. Once it's live, run the seed script against production by opening the Render shell
   for the service and running `npm run seed`.
4. Note the URL Render gives you (e.g. `https://TheHub-api.onrender.com`) — the
   frontend needs this next.
5. After the frontend is deployed too, come back and set `CORS_ORIGIN` in Render's
   dashboard to that frontend's real URL instead of `*`.

Any host that runs Node and gives you a persistent disk works the same way (Railway,
Fly.io, a plain VPS) — the important part is that `DB_PATH` points at storage that
survives a redeploy, or every deploy wipes your bookings.
