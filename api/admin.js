// Lightweight admin gate: verifies the admin key server-side.
// Set ADMIN_KEY in Vercel → Settings → Environment Variables (default: dev-key).
export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { key } = req.body || {};
  const ok = typeof key === "string" && key === (process.env.ADMIN_KEY || "dev-key");
  if (!ok) return res.status(401).json({ ok: false, error: "Wrong admin key" });
  res.status(200).json({ ok: true });
}
