# ChartPulse — Crypto Trading Signal Platform MVP

Phase 1 MVP from the roadmap: landing page, free signals, education hub (5 SEO posts), and premium waitlist with email capture.

**Stack:** React (Vite) frontend + Node.js backend (zero dependencies — plain `http`, no Express needed). JSON file storage for now; swap to Postgres when you have real traffic.

## Run locally

```bash
# Terminal 1 — API (no install needed, Node 18+)
cd server && npm start          # → http://localhost:4000

# Terminal 2 — frontend
cd client && npm install && npm run dev   # → http://localhost:5173
```

The Vite dev server proxies `/api/*` to `:4000` automatically.

## Posting a daily signal

```bash
curl -X POST http://localhost:4000/api/signals \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: dev-key" \
  -d '{
    "symbol": "BTC/USDT",
    "direction": "LONG",
    "entry": "104,200 - 104,800",
    "target": "108,500",
    "stopLoss": "102,900",
    "timeframe": "4H",
    "confidence": "High",
    "analysis": "Your reasoning here"
  }'
```

Set a real `ADMIN_KEY` env var in production. Waitlist emails are stored in `server/data/waitlist.json`.

## API

| Method | Route | Notes |
|---|---|---|
| GET | `/api/signals?limit=20` | Latest signals first |
| POST | `/api/signals` | Requires `X-Admin-Key` header |
| POST | `/api/waitlist` | `{ "email": "..." }`, dedupes |
| GET | `/api/waitlist/count` | Social-proof counter |
| GET | `/api/health` | Health check |

## Deploy (~$0-5/month)

**Backend → Railway:** push repo to GitHub → New Project → Deploy from repo → root dir `server`, start command `npm start`. Set env vars `ADMIN_KEY` (strong random string) and `ALLOWED_ORIGIN` (your frontend URL). Note: Railway's filesystem is ephemeral — add a volume mounted at `server/data`, or move to Railway Postgres when ready.

**Frontend → Vercel:** import repo → root dir `client` → framework Vite. Add a rewrite in `vercel.json` so `/api/*` hits the Railway URL:

```json
{ "rewrites": [{ "source": "/api/:path*", "destination": "https://YOUR-APP.up.railway.app/api/:path*" }] }
```

## Next steps (per roadmap)

- [ ] Register domain, point Vercel at it
- [ ] Google Analytics 4 snippet in `client/index.html`
- [ ] Resend integration for waitlist welcome email (TODO marked in `server/src/index.js`)
- [ ] Expand the 5 starter posts in `client/src/content/posts.js` to 1,500-2,000 words
- [ ] Discord server + embed widget on landing page
- [ ] Binance/OKX affiliate links in education posts
- [ ] Week 6: Stripe for the $29 premium tier

## Disclaimer

Educational content only, not financial advice. If you operate this commercially, check the rules on promoting trading/affiliate products in your jurisdiction (e.g., ad network policies, financial promotions regulations).
