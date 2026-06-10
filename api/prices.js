// Live spot prices via Coinbase public API (no key). Cached per warm function instance.
let cache = { data: null, at: 0 };

export default async function handler(_req, res) {
  const now = Date.now();
  if (cache.data && now - cache.at < 60_000) {
    return res.status(200).json(cache.data);
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
    cache = { data, at: now };
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(data);
  } catch {
    if (cache.data) return res.status(200).json(cache.data);
    res.status(503).json({ error: "Price feed unavailable" });
  }
}
