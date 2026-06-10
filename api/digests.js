import { createRequire } from "module";
const require = createRequire(import.meta.url);

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  let digests = [];
  try { digests = require("./_digests.json"); } catch {}
  const limit = Math.min(parseInt(req.query.limit) || 7, 30);
  res.status(200).json(digests.slice(0, limit));
}
