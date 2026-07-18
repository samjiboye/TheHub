# SalonConnect Frontend

The real, deployable version of the SalonConnect prototype — same app you saw in the
chat, now a standalone Vite + React project that builds to static files any static
host can serve.

## Local development

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173` and talks to a backend at `http://localhost:4000` by
default. Make sure the backend is running too (see `../backend/README.md`).

To point local dev at a *deployed* backend instead, copy `.env.example` to `.env.local`
and set `VITE_API_BASE` to that backend's URL.

## Deploying (Vercel)

1. Push this `frontend` folder to a GitHub repo (can be the same repo as the backend,
   in a subfolder, or its own repo — either works).
2. Go to [vercel.com](https://vercel.com) → New Project → import that repo.
   - If backend and frontend share a repo, set the project's **Root Directory** to `frontend`.
3. In the project's Environment Variables, add:
   - `VITE_API_BASE` = your deployed backend's URL (e.g. `https://salonconnect-api.onrender.com`)
4. Deploy. Vercel runs `npm run build` automatically and serves the result.
5. Copy the URL Vercel gives you (e.g. `https://salonconnect.vercel.app`) and set it as
   `CORS_ORIGIN` on the backend, so the API only accepts requests from your real site.

Netlify works the same way: import the repo, set the base directory to `frontend`,
build command `npm run build`, publish directory `dist`, and the same `VITE_API_BASE`
environment variable.

## What's still a shortcut here

- Sessions live only in React state — refreshing the page logs everyone out. Adding
  a persisted session (e.g. storing the JWT in an httpOnly cookie set by the backend)
  is the natural next step once this is live.
- No real payments yet — `commission_amount` and `payout_amount` are calculated and
  stored, but no money actually moves. That's the Stripe Connect step.
