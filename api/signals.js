import { signals } from "./_signals.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ error: "On Vercel, post signals by editing api/_signals.js and pushing to git." });
  }
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const sorted = [...signals].sort(
    (a, b) => new Date(b.postedAt) - new Date(a.postedAt)
  );
  res.status(200).json(sorted.slice(0, limit));
}
