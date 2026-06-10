export default function SignalCard({ s }) {
  const dirClass = s.direction === "SHORT" ? "short" : "long";
  return (
    <div className="card signal">
      <div className="signal-head">
        <span className="sym">{s.symbol}</span>
        <span>
          {s.status === "closed-win" && <span className="tag win">WIN ✓ </span>}
          <span className={`tag ${dirClass}`}>{s.direction}</span>
        </span>
      </div>
      <div className="signal-rows">
        <div><div className="label">Entry</div>{s.entry}</div>
        <div><div className="label">Target</div>{s.target}</div>
        <div><div className="label">Stop Loss</div>{s.stopLoss}</div>
        <div><div className="label">Timeframe</div>{s.timeframe} · {s.confidence} confidence</div>
      </div>
      {s.analysis && <p className="analysis">{s.analysis}</p>}
      <span className="meta">
        Posted {new Date(s.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </span>
    </div>
  );
}
