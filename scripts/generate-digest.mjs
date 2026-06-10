// Daily market recap generator. Runs once a day via GitHub Actions.
// Assembles a digest from real data: prices + 24h change (Coinbase), top
// headlines (RSS, headlines + links only — never article text), upcoming
// events, and the latest signals. If ANTHROPIC_API_KEY is set, Claude writes
// the summary prose; otherwise a solid template version is used.
// Usage: node scripts/generate-digest.mjs [--mock]

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIGEST_FILES = [
  path.join(ROOT, "api", "_digests.json"),
  path.join(ROOT, "server", "data", "digests.json"),
];
const SIGNALS_FILE = path.join(ROOT, "api", "_signals.json");
const MOCK = process.argv.includes("--mock");

const COINS = [
  { id: "BTC-USD", name: "Bitcoin", sym: "BTC" },
  { id: "ETH-USD", name: "Ethereum", sym: "ETH" },
  { id: "SOL-USD", name: "Solana", sym: "SOL" },
];
const FEEDS = [
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
];

const fmt = (n) => n.toLocaleString("en-US", { maximumFractionDigits: n > 1000 ? 0 : 2 });

// ---- data ------------------------------------------------------------------
async function getPrices() {
  if (MOCK) return COINS.map((c, i) => ({ ...c, price: [63200, 2380, 86][i], change: [1.8, -0.6, 3.2][i] }));
  const out = [];
  for (const c of COINS) {
    // daily candles: [time, low, high, open, close, volume], newest first
    const r = await fetch(`https://api.exchange.coinbase.com/products/${c.id}/candles?granularity=86400`, {
      headers: { "User-Agent": "ChartPulse/1.0" },
    });
    const candles = await r.json();
    const price = candles[0][4];
    const prevClose = candles[1][4];
    out.push({ ...c, price, change: ((price - prevClose) / prevClose) * 100 });
  }
  return out;
}

function parseRss(xml, source) {
  const items = [];
  for (const block of xml.match(/<item[\s\S]*?<\/item>/g) || []) {
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim() : "";
    };
    const title = get("title"), link = get("link");
    if (title && link) items.push({ title, link, source });
    if (items.length >= 10) break;
  }
  return items;
}

async function getHeadlines() {
  if (MOCK) return [{ title: "Mock headline about BTC", link: "https://example.com", source: "Cointelegraph" }];
  const results = await Promise.allSettled(
    FEEDS.map(async (f) => parseRss(await (await fetch(f.url, { headers: { "User-Agent": "ChartPulse/1.0" } })).text(), f.source))
  );
  return results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value).slice(0, 8);
}

async function getEvents() {
  const { events } = await import("../api/_events.js");
  const today = new Date().toISOString().slice(0, 10);
  return events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
}

function getOpenSignals() {
  try {
    return JSON.parse(fs.readFileSync(SIGNALS_FILE, "utf8"))
      .filter((s) => s.status === "active" && (s.direction === "LONG" || s.direction === "SHORT"))
      .slice(0, 4);
  } catch {
    return [];
  }
}

// ---- summary ---------------------------------------------------------------
function templateSummary(prices, events) {
  const lines = prices.map(
    (p) => `${p.name} is trading at $${fmt(p.price)}, ${p.change >= 0 ? "up" : "down"} ${Math.abs(p.change).toFixed(1)}% over the last 24 hours`
  );
  const eventLine = events.length
    ? ` Looking ahead, traders are watching ${events.map((e) => `${e.title} on ${new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}`).join(" and ")}.`
    : "";
  return `${lines.join(". ")}.${eventLine} As always, manage risk: size positions from your stop loss, not from conviction.`;
}

async function aiSummary(prices, headlines, events) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{
          role: "user",
          content:
            `Write a 120-160 word crypto market recap paragraph for traders. Plain prose, no headers or bullets, no hype, no price predictions. Mention the price moves and the most relevant headline themes, and end with one sentence on upcoming events. Data:\n` +
            `Prices: ${prices.map((p) => `${p.name} $${fmt(p.price)} (${p.change >= 0 ? "+" : ""}${p.change.toFixed(1)}% 24h)`).join(", ")}\n` +
            `Headlines: ${headlines.map((h) => h.title).join(" | ")}\n` +
            `Upcoming: ${events.map((e) => `${e.title} (${e.date})`).join(", ") || "none"}`,
        }],
      }),
    });
    const j = await r.json();
    return j.content?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

// ---- main --------------------------------------------------------------------
const now = new Date();
const dateStr = now.toISOString().slice(0, 10);
const prices = await getPrices();
const headlines = await getHeadlines();
const events = await getEvents();
const signals = getOpenSignals();
const summary = (await aiSummary(prices, headlines, events)) || templateSummary(prices, events);

const digest = {
  id: `digest-${dateStr}`,
  date: dateStr,
  title: `Crypto Market Recap — ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
  summary,
  summarySource: process.env.ANTHROPIC_API_KEY ? "ai" : "template",
  prices: prices.map((p) => ({ sym: p.sym, name: p.name, price: p.price, change: +p.change.toFixed(2) })),
  headlines,
  events,
  openSignals: signals.map((s) => ({ symbol: s.symbol, market: s.market || "futures", direction: s.direction, entry: s.entry })),
  generatedAt: now.toISOString(),
};

const read = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return []; } };
for (const file of DIGEST_FILES) {
  const existing = read(file).filter((d) => d.date !== dateStr); // replace same-day rerun
  fs.writeFileSync(file, JSON.stringify([digest, ...existing].slice(0, 30), null, 2) + "\n");
}
console.log(`Digest written for ${dateStr} (summary: ${digest.summarySource})${MOCK ? " [MOCK]" : ""}`);
