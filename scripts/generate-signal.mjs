// Automated TA signal generator. Runs every 4h via GitHub Actions.
// Fetches real 4H candles from Coinbase, computes EMA20/50 + RSI14 + swing levels,
// and prepends a signal (or a no-trade note) to the data files.
// Usage: node scripts/generate-signal.mjs            (live data)
//        node scripts/generate-signal.mjs --mock      (canned data, for testing)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_FILE = path.join(ROOT, "api", "_signals.json");
const SERVER_FILE = path.join(ROOT, "server", "data", "signals.json");
const MOCK = process.argv.includes("--mock");

const PRODUCTS = [
  { id: "BTC-USD", symbol: "BTC/USDT" },
  { id: "ETH-USD", symbol: "ETH/USDT" },
];

// ---- indicators -----------------------------------------------------------
const ema = (values, period) => {
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
};

const rsi = (closes, period = 14) => {
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
};

// ---- data -----------------------------------------------------------------
async function getCandles(productId) {
  if (MOCK) {
    // Uptrending series for testing the math.
    const closes = Array.from({ length: 100 }, (_, i) => 60000 + i * 45 + (i % 7) * 120);
    return closes.map((c, i) => ({ close: c, low: c - 300, high: c + 300, t: i }));
  }
  // Coinbase Exchange public API: granularity 14400 = 4H. Returns [time, low, high, open, close, volume], newest first.
  const url = `https://api.exchange.coinbase.com/products/${productId}/candles?granularity=14400`;
  const r = await fetch(url, { headers: { "User-Agent": "ChartPulse/1.0" } });
  if (!r.ok) throw new Error(`Coinbase ${productId}: HTTP ${r.status}`);
  const raw = await r.json();
  return raw
    .slice(0, 100)
    .reverse()
    .map(([t, low, high, , close]) => ({ t, low, high, close }));
}

// ---- outcome tracking -------------------------------------------------------
const parseNum = (s) => {
  const m = String(s).replace(/,/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : NaN;
};
const entryMid = (entry) => {
  const nums = String(entry).replace(/,/g, "").match(/[\d.]+/g) || [];
  if (!nums.length) return NaN;
  const a = parseFloat(nums[0]), b = nums[1] ? parseFloat(nums[1]) : parseFloat(nums[0]);
  return (a + b) / 2;
};

// Resolve open signals against candles since they were posted:
// LONG: stop hit first = loss, target hit first = win (same candle → conservative loss).
function resolveOutcomes(signals, candlesBySymbol) {
  let resolved = 0;
  for (const s of signals) {
    if (!["active", "expired"].includes(s.status)) continue;
    if (s.direction !== "LONG" && s.direction !== "SHORT") continue;
    const candles = candlesBySymbol[s.symbol];
    if (!candles) continue;
    const target = parseNum(s.target), stop = parseNum(s.stopLoss);
    if (!isFinite(target) || !isFinite(stop)) continue;
    const postedSec = new Date(s.postedAt).getTime() / 1000;
    for (const c of candles) {
      if (c.t <= postedSec) continue;
      const stopHit = s.direction === "LONG" ? c.low <= stop : c.high >= stop;
      const targetHit = s.direction === "LONG" ? c.high >= target : c.low <= target;
      if (stopHit) { s.status = "closed-loss"; }
      else if (targetHit) { s.status = "closed-win"; }
      else continue;
      s.closedAt = new Date(c.t * 1000).toISOString();
      resolved++;
      break;
    }
  }
  return resolved;
}

// ---- strategy -------------------------------------------------------------
const fmt = (n) => n.toLocaleString("en-US", { maximumFractionDigits: n > 1000 ? 0 : 2 });

// SPOT: long-only (you can't short spot). Buys pullbacks in uptrends with wider
// stops (24-candle swing) and bigger targets (2.5R) — slower, position-style trades.
function evaluateSpot(candles, symbol) {
  const closes = candles.map((c) => c.close);
  const price = closes.at(-1);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const r = rsi(closes);
  const swingLow = Math.min(...candles.slice(-24).map((c) => c.low));

  const uptrend = ema20 > ema50 && price > ema50;
  const pullback = price < ema20 * 1.015; // at or below the value zone
  if (!uptrend || !pullback || r > 60) {
    return {
      direction: null,
      reason: `${symbol} spot: ${!uptrend ? "no confirmed uptrend — spot buys only in uptrends" : r > 60 ? `RSI ${r.toFixed(0)} too hot for accumulation` : "price extended above the buy zone"}. Waiting.`,
    };
  }

  const stop = Math.min(swingLow * 0.995, price * 0.94);
  const risk = price - stop;
  const target = price + 2.5 * risk;
  return {
    direction: "LONG",
    entry: `${fmt(price * 0.995)} - ${fmt(price * 1.005)}`,
    target: fmt(target),
    stopLoss: fmt(stop),
    confidence: r < 50 ? "High" : "Medium",
    analysis:
      `Automated spot analysis (4H): uptrend intact (price above EMA50 at ${fmt(ema50)}), pullback to the EMA20 value zone, RSI ${r.toFixed(0)}. ` +
      `Accumulation buy — invalidation below the 24-candle swing low (${fmt(swingLow)}), target 2.5R. No leverage; size as a position, not a trade.`,
  };
}

// FUTURES: LONG/SHORT with tight stops and 1.8R targets (leverage-friendly).
function evaluate(candles, symbol) {
  const closes = candles.map((c) => c.close);
  const price = closes.at(-1);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const r = rsi(closes);
  const recent = candles.slice(-12);
  const swingLow = Math.min(...recent.map((c) => c.low));
  const swingHigh = Math.max(...recent.map((c) => c.high));

  const uptrend = ema20 > ema50;
  const nearEma20 = Math.abs(price - ema20) / price < 0.02;

  let direction = null;
  if (uptrend && nearEma20 && r >= 38 && r <= 65) direction = "LONG";
  else if (!uptrend && nearEma20 && r >= 35 && r <= 62) direction = "SHORT";
  if (!direction) {
    return {
      direction: null,
      reason: `${symbol}: ${uptrend ? "up" : "down"}trend (EMA20 ${uptrend ? ">" : "<"} EMA50) but price ${nearEma20 ? `RSI ${r.toFixed(0)} out of range` : "extended away from the EMA20 value zone"} — no edge, standing aside.`,
    };
  }

  const entryLo = price * 0.997, entryHi = price * 1.003;
  let stop, target, risk;
  if (direction === "LONG") {
    stop = Math.min(swingLow * 0.997, price * 0.985);
    risk = price - stop;
    target = price + 1.8 * risk;
  } else {
    stop = Math.max(swingHigh * 1.003, price * 1.015);
    risk = stop - price;
    target = price - 1.8 * risk;
  }

  const confluences = [
    uptrend === (direction === "LONG"),
    direction === "LONG" ? r < 55 : r > 45,
    Math.abs(price - ema20) / price < 0.01,
  ].filter(Boolean).length;

  return {
    direction,
    entry: `${fmt(entryLo)} - ${fmt(entryHi)}`,
    target: fmt(target),
    stopLoss: fmt(stop),
    confidence: confluences >= 3 ? "High" : "Medium",
    analysis:
      `Automated 4H analysis: ${direction === "LONG" ? "uptrend" : "downtrend"} confirmed (EMA20 ${direction === "LONG" ? "above" : "below"} EMA50), ` +
      `price in the EMA20 value zone at ${fmt(ema20)}, RSI ${r.toFixed(0)}. ` +
      `Stop beyond the 12-candle swing ${direction === "LONG" ? "low" : "high"} (${direction === "LONG" ? fmt(swingLow) : fmt(swingHigh)}), target 1.8R.`,
  };
}

// ---- main -----------------------------------------------------------------
const now = new Date();
const validUntil = new Date(now.getTime() + 4 * 3600_000);
const newSignals = [];
const notes = [];
const candlesBySymbol = {};

for (const p of PRODUCTS) {
  try {
    const candles = await getCandles(p.id);
    candlesBySymbol[p.symbol] = candles;
    const evals = [
      { market: "futures", result: evaluate(candles, p.symbol) },
      { market: "spot", result: evaluateSpot(candles, p.symbol) },
    ];
    for (const { market, result } of evals) {
      if (result.direction) {
        newSignals.push({
          id: `auto-${market}-${p.id}-${now.getTime().toString(36)}`,
          symbol: p.symbol,
          market,
          direction: result.direction,
          entry: result.entry,
          target: result.target,
          stopLoss: result.stopLoss,
          timeframe: "4H",
          confidence: result.confidence,
          analysis: result.analysis,
          postedAt: now.toISOString(),
          entryValidUntil: validUntil.toISOString(),
          generatedBy: "auto",
          status: "active",
        });
      } else {
        notes.push(result.reason);
      }
    }
  } catch (e) {
    console.error(`Skipping ${p.id}: ${e.message}`);
  }
}

// If no setups anywhere, publish one honest no-trade note.
if (newSignals.length === 0 && notes.length > 0) {
  newSignals.push({
    id: `auto-notrade-${now.getTime().toString(36)}`,
    symbol: "BTC/USDT + ETH/USDT",
    market: "all",
    direction: "NO TRADE",
    entry: "—",
    target: "—",
    stopLoss: "—",
    timeframe: "4H",
    confidence: "—",
    analysis: notes.join(" "),
    postedAt: now.toISOString(),
    entryValidUntil: validUntil.toISOString(),
    generatedBy: "auto",
    status: "no-trade",
  });
}

const read = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return []; } };
const existing = read(API_FILE); // canonical history
// 1. Expire entry windows on old auto signals (trade keeps running until win/loss)
for (const s of existing) {
  if (s.generatedBy === "auto" && s.status === "active" && s.entryValidUntil && s.entryValidUntil < now.toISOString()) {
    s.status = "expired";
  }
}
// 2. Resolve outcomes against candles since posting
const resolved = resolveOutcomes(existing, candlesBySymbol);
if (resolved) console.log(`Resolved ${resolved} signal outcome(s)`);
// 3. Prepend new signals, keep last 50
const merged = [...newSignals, ...existing].slice(0, 50);
for (const file of [API_FILE, SERVER_FILE]) {
  fs.writeFileSync(file, JSON.stringify(merged, null, 2) + "\n");
}

console.log(`Generated ${newSignals.length} signal(s) at ${now.toISOString()}${MOCK ? " [MOCK]" : ""}`);
newSignals.forEach((s) => console.log(` - ${s.symbol} ${s.direction} (${s.confidence})`));
