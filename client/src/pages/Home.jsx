import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SignalCard from "../components/SignalCard.jsx";
import WaitlistForm from "../components/WaitlistForm.jsx";
import { posts } from "../content/posts.js";
import { useSeo, SITE_URL, SITE_NAME } from "../seo.js";

export default function Home() {
  const [signals, setSignals] = useState([]);

  useSeo({
    description:
      "Free BTC/ETH trading signals every 4 hours with entry, target and stop loss. Spot and futures technical analysis plus no-BS trading education.",
    path: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: "Crypto trading signals and education platform",
    },
  });

  useEffect(() => {
    fetch("/api/signals?limit=2")
      .then((r) => r.json())
      .then(setSignals)
      .catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <span className="badge">Premium alerts launching July 2026</span>
        <h1>
          Daily BTC/ETH Trading Signals. <em>No hype, just levels.</em>
        </h1>
        <p>
          Entry, target, and stop loss on every call — backed by real technical
          analysis from an active futures trader. Free signals 3x a week.
        </p>
        <div className="cta-row">
          <Link to="/signals" className="btn">View Today's Signals</Link>
          <Link to="/education" className="btn btn-outline">Learn Trading Free</Link>
        </div>
      </section>

      <section className="section">
        <h2>Latest signals</h2>
        <p className="sub">Every signal published with full reasoning — judge us by the track record.</p>
        <div className="grid">
          {signals.map((s) => <SignalCard key={s.id} s={s} />)}
        </div>
      </section>

      <section className="section">
        <h2>Learn before you trade</h2>
        <p className="sub">No-BS guides on technical analysis and risk management.</p>
        <div className="grid">
          {posts.slice(0, 3).map((p) => (
            <Link key={p.slug} to={`/education/${p.slug}`} className="card post-card">
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <span className="read-time">{p.readTime} min read</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section" style={{ textAlign: "center" }}>
        <h2>Get premium signals first</h2>
        <p className="sub">7 signals/week, real-time alerts, and private Discord. Join the waitlist for launch pricing.</p>
        <WaitlistForm />
      </section>
    </>
  );
}
