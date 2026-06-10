import { createRequire } from "module";
const require = createRequire(import.meta.url);

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Signals are auto-generated every 4h (GitHub Actions) or added by editing api/_signals.json.",
    });
  }
  const signals = require("./_signals.json");
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const market = req.query.market; // "spot" | "futures" | undefined = all
  let list = [...signals];
  if (market === "spot" || market === "futures") {
    list = list.filter((s) => (s.market || "futures") === market || s.market === "all");
  }
  list.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  res.status(200).json(list.slice(0, limit));
}
