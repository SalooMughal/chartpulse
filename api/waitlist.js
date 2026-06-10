// Waitlist storage on Vercel: uses Upstash Redis (free) via REST.
// Setup (one time): Vercel dashboard → Storage/Marketplace → Upstash Redis →
// connect to this project. That auto-adds UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN env vars. Until then this returns a friendly error.

const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  return j.result;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    if (!URL_) return res.status(200).json({ count: 0 });
    const count = await redis("SCARD", "waitlist");
    return res.status(200).json({ count: count || 0 });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body || {};
  const valid = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!valid) return res.status(400).json({ error: "Valid email required" });

  if (!URL_ || !TOKEN) {
    return res.status(503).json({
      error: "Waitlist storage not configured yet — try again soon!",
    });
  }

  try {
    const added = await redis("SADD", "waitlist", email.toLowerCase());
    if (added === 0) {
      return res.status(200).json({ ok: true, message: "You're already on the list!" });
    }
    // TODO: send welcome email via Resend once RESEND_API_KEY is set
    res.status(201).json({ ok: true, message: "You're on the waitlist. Watch your inbox!" });
  } catch {
    res.status(500).json({ error: "Could not save right now — please try again." });
  }
}
