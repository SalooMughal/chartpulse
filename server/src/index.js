// ChartPulse API — zero-dependency Node.js server (no npm install needed).
// Runs anywhere Node 18+ runs: Railway, Render, Fly.io, a VPS.
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const SIGNALS_FILE = path.join(DATA_DIR, "signals.json");
const WAITLIST_FILE = path.join(DATA_DIR, "waitlist.json");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");

const NEWS_FEEDS = [
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
];

function parseRss(xml, source) {
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const block of itemBlocks.slice(0, 15)) {
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      if (!m) return "";
      return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim();
    };
    const title = get("title");
    const link = get("link");
    const pubDate = get("pubDate");
    if (title && link) {
      items.push({ title, link, source, publishedAt: pubDate ? new Date(pubDate).toISOString() : null });
    }
  }
  return items;
}

// --- helpers -------------------------------------------------------------
const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};
const writeJson = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        resolve({});
      }
    });
  });

let priceCache = { data: null, at: 0 };
let newsCache = { data: null, at: 0 };

// --- routes --------------------------------------------------------------
const routes = {
  // GET /api/signals?limit=10 → latest first
  "GET /api/signals": (req, res, url) => {
    const limit = Math.min(parseInt(url.searchParams.get("limit")) || 20, 100);
    const signals = readJson(SIGNALS_FILE, []);
    signals.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    json(res, 200, signals.slice(0, limit));
  },

  // POST /api/signals → add a signal (requires X-Admin-Key header)
  "POST /api/signals": async (req, res) => {
    const adminKey = process.env.ADMIN_KEY || "dev-key";
    if (req.headers["x-admin-key"] !== adminKey) {
      return json(res, 401, { error: "Unauthorized" });
    }
    const b = await readBody(req);
    if (!b.symbol || !b.entry || !b.target || !b.stopLoss) {
      return json(res, 400, { error: "symbol, entry, target, stopLoss are required" });
    }
    const signals = readJson(SIGNALS_FILE, []);
    const signal = {
      id: Date.now().toString(36),
      symbol: b.symbol,
      direction: b.direction || "LONG",
      entry: b.entry,
      target: b.target,
      stopLoss: b.stopLoss,
      timeframe: b.timeframe || "4H",
      confidence: b.confidence || "Medium",
      analysis: b.analysis || "",
      postedAt: new Date().toISOString(),
      status: "active",
    };
    signals.push(signal);
    writeJson(SIGNALS_FILE, signals);
    json(res, 201, signal);
  },

  // POST /api/waitlist → email capture
  "POST /api/waitlist": async (req, res) => {
    const { email } = await readBody(req);
    const valid = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) return json(res, 400, { error: "Valid email required" });

    const waitlist = readJson(WAITLIST_FILE, []);
    if (waitlist.some((w) => w.email === email.toLowerCase())) {
      return json(res, 200, { ok: true, message: "You're already on the list!" });
    }
    waitlist.push({ email: email.toLowerCase(), joinedAt: new Date().toISOString() });
    writeJson(WAITLIST_FILE, waitlist);
    // TODO: send welcome email via Resend (https://resend.com) once API key is set
    json(res, 201, { ok: true, message: "You're on the waitlist. Watch your inbox!" });
  },

  // GET /api/waitlist/count → social proof number
  "GET /api/waitlist/count": (_req, res) => {
    json(res, 200, { count: readJson(WAITLIST_FILE, []).length });
  },

  // GET /api/prices → live spot prices via Coinbase public API (cached 60s, no key needed)
  "GET /api/prices": async (_req, res) => {
    const now = Date.now();
    if (priceCache.data && now - priceCache.at < 60_000) {
      return json(res, 200, priceCache.data);
    }
    try {
      const pairs = ["BTC-USD", "ETH-USD", "SOL-USD"];
      const results = await Promise.all(
        pairs.map((p) =>
          fetch(`https://api.coinbase.com/v2/prices/${p}/spot`).then((r) => r.json())
        )
      );
      const data = results.map((r) => ({
        symbol: `${r.data.base}/USD`,
        price: parseFloat(r.data.amount),
      }));
      priceCache = { data, at: now };
      json(res, 200, data);
    } catch {
      // Coinbase unreachable — serve stale cache if available
      if (priceCache.data) return json(res, 200, priceCache.data);
      json(res, 503, { error: "Price feed unavailable" });
    }
  },

  // GET /api/news → live headlines from crypto RSS feeds (cached 10 min)
  "GET /api/news": async (_req, res) => {
    const now = Date.now();
    if (newsCache.data && now - newsCache.at < 10 * 60_000) {
      return json(res, 200, newsCache.data);
    }
    try {
      const results = await Promise.allSettled(
        NEWS_FEEDS.map(async (f) => {
          const r = await fetch(f.url, { headers: { "User-Agent": "ChartPulse/1.0" } });
          return parseRss(await r.text(), f.source);
        })
      );
      const items = results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => r.value)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, 20);
      if (items.length === 0) throw new Error("no items");
      newsCache = { data: items, at: now };
      json(res, 200, items);
    } catch {
      if (newsCache.data) return json(res, 200, newsCache.data);
      json(res, 503, { error: "News feed unavailable" });
    }
  },

  // GET /api/events → curated upcoming market events (edit data/events.json)
  "GET /api/events": (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = readJson(EVENTS_FILE, [])
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    json(res, 200, upcoming);
  },

  "GET /api/health": (_req, res) => json(res, 200, { ok: true }),
};

// --- server --------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // CORS (set ALLOWED_ORIGIN in prod, e.g. https://yourdomain.com)
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) return json(res, 404, { error: "Not found" });

  try {
    await handler(req, res, url);
  } catch (err) {
    console.error(err);
    json(res, 500, { error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`ChartPulse API running on :${PORT}`));
