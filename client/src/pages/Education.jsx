import { Link } from "react-router-dom";
import { posts } from "../content/posts.js";
import { useSeo } from "../seo.js";

export default function Education() {
  useSeo({
    title: "Crypto Trading Education — Technical Analysis Guides",
    description:
      "Free guides on crypto technical analysis, candlestick patterns, futures risk management and trading strategy for BTC and ETH traders.",
    path: "/education",
  });
  return (
    <>
      <div className="page-head">
        <h1>Education Hub</h1>
        <p>Practical guides on technical analysis, futures, and risk management.</p>
      </div>
      <section className="section">
        <div className="grid">
          {posts.map((p) => (
            <Link key={p.slug} to={`/education/${p.slug}`} className="card post-card">
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <span className="read-time">{p.readTime} min read</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
