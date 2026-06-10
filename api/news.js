// Live crypto market news from Cointelegraph + CoinDesk RSS (free, no keys).
let cache = { data: null, at: 0 };

const FEEDS = [
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

export default async function handler(_req, res) {
  const now = Date.now();
  if (cache.data && now - cache.at < 10 * 60_000) {
    return res.status(200).json(cache.data);
  }
  try {
    const results = await Promise.allSettled(
      FEEDS.map(async (f) => {
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
    cache = { data: items, at: now };
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    res.status(200).json(items);
  } catch {
    if (cache.data) return res.status(200).json(cache.data);
    res.status(503).json({ error: "News feed unavailable" });
  }
}
