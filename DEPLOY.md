# Deploy to Vercel (free) — step by step

Everything (frontend + API) runs on Vercel's free Hobby plan. ~15 minutes.

## 1. Push to GitHub

```bash
cd ~/Mystuff/signalpulse
git init
git add .
git commit -m "ChartPulse MVP"
```

Create an empty repo at github.com/new (e.g. `chartpulse`, private is fine), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/chartpulse.git
git branch -M main
git push -u origin main
```

## 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → sign up with your GitHub account (free)
2. **Add New → Project** → import the `chartpulse` repo
3. Leave all settings as detected — `vercel.json` configures the build (root stays as repo root, do **not** set root directory to `client`)
4. Click **Deploy**

You get a live URL like `https://chartpulse.vercel.app`. Landing page, signals, education, and the live price ticker all work immediately.

## 3. Enable the waitlist (one time, free)

Serverless functions can't write files, so emails go to a free Redis:

1. Vercel dashboard → your project → **Storage** tab → **Create Database** → **Upstash Redis** (free plan)
2. Connect it to the project — this auto-adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy (Deployments → ⋯ → Redeploy)

Until you do this, the form shows "storage not configured" — everything else works.

## 4. Posting signals in production

Edit `api/_signals.js`, add your new signal object at the top of the array, then:

```bash
git add api/_signals.js && git commit -m "signal: BTC long" && git push
```

Vercel auto-redeploys in ~30 seconds. (When this gets annoying, that's the cue to move the backend to Railway + Postgres — `server/` is already built for that.)

## 5. Custom domain (later)

Vercel project → Settings → Domains → add your domain → set the DNS records they show at your registrar. Free SSL included.

## How the two backends relate

| | Local dev | Vercel production |
|---|---|---|
| API | `server/src/index.js` (run `npm start`) | `api/*.js` serverless functions |
| Signals data | `server/data/signals.json` | `api/_signals.js` |
| Waitlist | `server/data/waitlist.json` | Upstash Redis |

Keep both in sync when you add a signal during this phase. The `server/` folder is also your future Railway backend when you outgrow git-push publishing.
