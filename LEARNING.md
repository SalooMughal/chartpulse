# LEARNING.md — Project Journal & Resume Point

> Pick up here next session. Last updated: **June 10, 2026**

## What this project is

Crypto Trading Signal & Education Platform (Phase 1 MVP from `Crypto_Trading_Signal_Platform_Roadmap.docx`). Goal: $500/mo by month 3 via ads, affiliates, and a $29/mo premium signal tier. Working brand name: **ChartPulse** (placeholder — no domain bought yet).

## Current status: MVP code complete, not yet run on this machine

### Done ✅
- **Backend** (`server/`) — zero-dependency Node.js API (no npm install needed). All endpoints tested and passing:
  - `GET /api/signals` (public), `POST /api/signals` (needs `X-Admin-Key` header, default `dev-key`)
  - `POST /api/waitlist` (email capture w/ validation + dedupe), `GET /api/waitlist/count`, `GET /api/health`
  - Data lives in JSON files: `server/data/signals.json` (3 seed signals with realistic prices as of Jun 10, 2026: BTC ~$63K, ETH ~$2.4K, SOL ~$86), `server/data/waitlist.json`
  - `GET /api/prices` — live BTC/ETH/SOL spot prices from Coinbase public API (no key needed), cached 60s, serves stale cache if Coinbase is down
- **Live price ticker** — `client/src/components/PriceTicker.jsx`, shown at top of every page, auto-refreshes every 60s
- **News page (/news)** — two parts: (1) live headlines from Cointelegraph + CoinDesk RSS (free, no keys, cached 10 min) via `/api/news`; (2) curated upcoming events (FOMC, CPI dates) via `/api/events` — edit `api/_events.js` (prod) and `server/data/events.json` (local) to update. Remove past events occasionally.
- **GitHub repo**: https://github.com/SalooMughal/pulse (branch `main`). Deployed on Vercel free tier.
- **Admin dashboard (/admin, not in nav)** — login with the admin key (verified server-side via POST /api/admin against ADMIN_KEY env var, default `dev-key`; SET A REAL ONE IN VERCEL → Settings → Environment Variables). Shows accuracy % (wins/decided), win/loss/open counts, and a table of every signal vs live price with open P/L. Outcomes resolve automatically in the 4h engine run: candle-by-candle, stop hit = loss, target hit = win, same candle = conservative loss. Accuracy needs ~30 decided trades to mean anything.
- **Spot vs Futures segregation** — every signal has `market: "spot" | "futures"`. Futures = LONG/SHORT, tight stops, 1.8R (existing engine). Spot = long-only accumulation buys in uptrends only, 24-candle swing stop, 2.5R targets, no leverage. API filter: `/api/signals?market=spot|futures`. Signals page has All/Futures/Spot tabs; cards show SPOT (yellow) / FUTURES (purple) badges; admin shows separate accuracy per market.
- **Auto-signal engine** — `scripts/generate-signal.mjs` runs every 4h via GitHub Actions (`.github/workflows/signals.yml`). Fetches real 4H candles from Coinbase, computes EMA20/50 + RSI14 + swing levels, generates LONG/SHORT signals with a 4-hour entry window (`entryValidUntil`), or an honest "NO TRADE" when there's no setup. Commits to `api/_signals.json` + `server/data/signals.json` → Vercel auto-redeploys. Cards show an AUTO TA badge + entry-window banner; disclosure text on /signals. Old auto signals auto-expire. Test locally: `node scripts/generate-signal.mjs --mock`. Trigger manually: GitHub → Actions → "Generate trading signal" → Run workflow. Note: `api/_signals.js` is deprecated, can be `git rm`'d.
- **Frontend** (`client/`) — React 18 + Vite + React Router, dark theme:
  - Pages: Home (hero + latest signals + waitlist CTA), /signals, /education, /education/:slug, /waitlist (3 pricing tiers), /about
  - 5 starter blog posts in `client/src/content/posts.js` (~600 words each — skeletons, need expanding)
- **README.md** — run instructions + Railway/Vercel deploy guide
- **Vercel free deployment prepared** — `api/` folder has serverless versions of the API (signals, prices, waitlist), `vercel.json` configures the build. Full steps in **DEPLOY.md**. Waitlist in prod needs free Upstash Redis (2 clicks in Vercel dashboard). In prod you post signals by editing `api/_signals.js` + git push.
- Hosting decision: **all-Vercel free for now**; move backend to Railway ($5/mo) + Postgres when git-push publishing gets annoying. Domain: buy a .com (~$11/yr at Porkbun), skip .io ($37+/yr).

### Not done yet ⬜ (in order)
1. **Deploy**: push to GitHub → import on Vercel → follow DEPLOY.md (incl. Upstash Redis for waitlist)
2. Pick + register domain (.com ideas: chartpulse.com, getchartpulse.com) → point at Vercel
3. Google Analytics 4 snippet in `client/index.html`
5. Resend email integration for waitlist welcome (TODOs marked in `server/src/index.js` and `api/waitlist.js`)
6. Expand the 5 blog posts to 1,500–2,000 words for SEO
7. Create Discord server, embed widget on landing page
8. Add Binance/OKX affiliate links to education posts
9. Week 6 (per roadmap): Stripe checkout for $29 Premium tier
10. Later: swap JSON storage → Postgres (Railway/Supabase free tier)

## Key decisions made (and why)

- **React + Node split** (your choice) instead of single Next.js app — matches roadmap's Vercel + Railway plan.
- **Zero-dependency backend** (plain `node:http`, no Express) — nothing to install, identical deploy, easy to add Express later if wanted.
- **JSON file storage** for now — fine until real traffic; on Railway add a volume at `server/data` or it wipes on redeploy.
- **Admin key auth** for posting signals — set a strong `ADMIN_KEY` env var in production (default is `dev-key`!).
- Every signal carries entry/target/stopLoss/timeframe/confidence/analysis + win/loss status → transparency is the marketing angle.

## How to post a daily signal

```bash
curl -X POST http://localhost:4000/api/signals \
  -H "Content-Type: application/json" -H "X-Admin-Key: dev-key" \
  -d '{"symbol":"BTC/USDT","direction":"LONG","entry":"104,200 - 104,800","target":"108,500","stopLoss":"102,900","timeframe":"4H","confidence":"High","analysis":"reasoning here"}'
```

## Concepts touched (for learning)

- REST API design, CORS, request body parsing without frameworks
- React Router v6 routes/params, fetch + useState/useEffect data loading
- Vite dev proxy (`/api` → :4000) so frontend and backend feel like one app locally
- Env-var config (`PORT`, `ADMIN_KEY`, `ALLOWED_ORIGIN`)

## Roadmap milestones (from the docx)

| Week | Target |
|---|---|
| 1 | Content + infra (blogs, domain, analytics, email) ← **we're here, mid-week** |
| 2–3 | Build MVP site ← **done early** |
| 4 | Launch: Reddit/Discord/Twitter push, lead-magnet PDF |
| 6 | Launch $29 Premium tier (need ~500 visitors/week first) |
| 12 | ~$700/mo target |
