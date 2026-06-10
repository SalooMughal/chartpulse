import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SignalCard from "../components/SignalCard.jsx";

export default function Signals() {
  const [signals, setSignals] = useState(null);

  useEffect(() => {
    fetch("/api/signals")
      .then((r) => r.json())
      .then(setSignals)
      .catch(() => setSignals([]));
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Free Signals</h1>
        <p>
          Updated 3x per week. Premium members get 7/week with real-time alerts —{" "}
          <Link to="/waitlist">join the waitlist</Link>.
        </p>
      </div>
      <section className="section">
        {!signals && <p className="loading">Loading signals…</p>}
        {signals && signals.length === 0 && (
          <p className="loading">No signals yet — first one drops today. Check back soon.</p>
        )}
        {signals && (
          <div className="grid">
            {signals.map((s) => <SignalCard key={s.id} s={s} />)}
          </div>
        )}
      </section>
    </>
  );
}
