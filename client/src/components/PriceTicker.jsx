import { useEffect, useState } from "react";

export default function PriceTicker() {
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/prices")
        .then((r) => (r.ok ? r.json() : null))
        .then(setPrices)
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000); // refresh every minute
    return () => clearInterval(t);
  }, []);

  if (!prices) return null;

  return (
    <div className="ticker">
      <span className="ticker-label">LIVE</span>
      {prices.map((p) => (
        <span key={p.symbol} className="ticker-item">
          <strong>{p.symbol}</strong>{" "}
          ${p.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      ))}
    </div>
  );
}
