import { useEffect, useState } from "react";

const parseNum = (s) => {
  const m = String(s).replace(/,/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : NaN;
};
const fmt = (n) =>
  isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: n > 1000 ? 0 : 2 }) : "—";
const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function Login({ onOk }) {
  const [key, setKey] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Login failed");
      sessionStorage.setItem("cp_admin", key);
      onOk();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section" style={{ maxWidth: 420, margin: "60px auto" }}>
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Admin login</h3>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            className="admin-input" type="password" placeholder="Admin key"
            value={key} onChange={(e) => setKey(e.target.value)} required
          />
          <button className="btn" disabled={busy}>{busy ? "Checking…" : "Sign in"}</button>
        </form>
        {err && <p className="form-msg err">{err}</p>}
      </div>
    </section>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [signals, setSignals] = useState(null);
  const [prices, setPrices] = useState({});

  // Re-verify the stored key on mount
  useEffect(() => {
    const k = sessionStorage.getItem("cp_admin");
    if (!k) return;
    fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: k }),
    }).then((r) => r.ok && setAuthed(true));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch("/api/signals?limit=100").then((r) => r.json()).then(setSignals).catch(() => setSignals([]));
    fetch("/api/prices")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const map = {};
        for (const p of list || []) map[p.symbol.split("/")[0]] = p.price;
        setPrices(map);
      })
      .catch(() => {});
  }, [authed]);

  if (!authed) return <Login onOk={() => setAuthed(true)} />;
  if (!signals) return <p className="loading">Loading signals…</p>;

  const trades = signals.filter((s) => s.direction === "LONG" || s.direction === "SHORT");
  const stats = (list) => {
    const wins = list.filter((s) => s.status === "closed-win").length;
    const losses = list.filter((s) => s.status === "closed-loss").length;
    const open = list.filter((s) => ["active", "expired"].includes(s.status)).length;
    const decided = wins + losses;
    return { wins, losses, open, decided, accuracy: decided ? ((wins / decided) * 100).toFixed(1) : null };
  };
  const all = stats(trades);
  const fut = stats(trades.filter((s) => (s.market || "futures") === "futures"));
  const spot = stats(trades.filter((s) => s.market === "spot"));
  const { wins, losses, open, decided, accuracy } = all;

  const livePrice = (s) => prices[s.symbol.split("/")[0]];
  const unrealized = (s) => {
    const p = livePrice(s);
    const e = parseNum(s.entry);
    if (!isFinite(p) || !isFinite(e)) return null;
    const pct = ((p - e) / e) * 100 * (s.direction === "SHORT" ? -1 : 1);
    return pct;
  };

  return (
    <>
      <div className="page-head">
        <h1>Admin · Signal Performance</h1>
        <p>Outcomes are resolved automatically every 4h by the signal engine (target vs stop, candle by candle).</p>
      </div>

      <section className="section">
        <div className="grid stats-grid">
          <div className="card stat"><div className="stat-num">{accuracy !== null ? `${accuracy}%` : "—"}</div><p>Accuracy (wins / decided)</p></div>
          <div className="card stat"><div className="stat-num win-c">{wins}</div><p>Wins</p></div>
          <div className="card stat"><div className="stat-num loss-c">{losses}</div><p>Losses</p></div>
          <div className="card stat"><div className="stat-num">{open}</div><p>Open / running</p></div>
        </div>
        <div className="grid stats-grid" style={{ marginTop: 14 }}>
          <div className="card stat">
            <div className="stat-num">{fut.accuracy !== null ? `${fut.accuracy}%` : "—"}</div>
            <p>Futures accuracy ({fut.wins}W / {fut.losses}L / {fut.open} open)</p>
          </div>
          <div className="card stat">
            <div className="stat-num">{spot.accuracy !== null ? `${spot.accuracy}%` : "—"}</div>
            <p>Spot accuracy ({spot.wins}W / {spot.losses}L / {spot.open} open)</p>
          </div>
        </div>
        {decided < 10 && (
          <p className="sub" style={{ marginTop: 14 }}>
            ⚠ Only {decided} decided trade{decided === 1 ? "" : "s"} so far — accuracy isn't statistically meaningful until ~30+.
          </p>
        )}
      </section>

      <section className="section">
        <h2>All signals</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Posted</th><th>Symbol</th><th>Market</th><th>Dir</th><th>Entry</th><th>Target</th>
                <th>Stop</th><th>Live price</th><th>Open P/L</th><th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((s) => {
                const pl = ["active", "expired"].includes(s.status) ? unrealized(s) : null;
                return (
                  <tr key={s.id}>
                    <td>{fmtDate(s.postedAt)}</td>
                    <td>{s.symbol}</td>
                    <td>{(s.market || "futures").toUpperCase()}</td>
                    <td className={s.direction === "LONG" ? "win-c" : "loss-c"}>{s.direction}</td>
                    <td>{s.entry}</td>
                    <td>{s.target}</td>
                    <td>{s.stopLoss}</td>
                    <td>{fmt(livePrice(s))}</td>
                    <td className={pl > 0 ? "win-c" : pl < 0 ? "loss-c" : ""}>
                      {pl === null ? "—" : `${pl > 0 ? "+" : ""}${pl.toFixed(2)}%`}
                    </td>
                    <td>
                      {s.status === "closed-win" && <span className="tag win">WIN</span>}
                      {s.status === "closed-loss" && <span className="tag short">LOSS</span>}
                      {["active", "expired"].includes(s.status) && <span className="tag auto">OPEN</span>}
                      {s.closedAt && <span className="news-meta"> {fmtDate(s.closedAt)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <button className="btn btn-outline" onClick={() => { sessionStorage.removeItem("cp_admin"); setAuthed(false); }}>
          Sign out
        </button>
      </section>
    </>
  );
}
