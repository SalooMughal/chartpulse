import { useEffect, useState } from "react";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const fmtTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  return fmtDate(iso);
};

export default function News() {
  const [news, setNews] = useState(null);
  const [events, setEvents] = useState(null);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => (r.ok ? r.json() : []))
      .then(setNews)
      .catch(() => setNews([]));
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : []))
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Market News</h1>
        <p>Live headlines + the events that move crypto. Check before you trade.</p>
      </div>

      <section className="section">
        <h2>Upcoming events</h2>
        <p className="sub">High-impact macro dates — expect volatility around these.</p>
        {!events && <p className="loading">Loading events…</p>}
        {events && events.length === 0 && <p className="loading">No upcoming events listed.</p>}
        {events && events.length > 0 && (
          <div className="grid">
            {events.map((e) => (
              <div key={e.date + e.title} className="card event">
                <div className="event-head">
                  <span className="event-date">
                    {new Date(e.date + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </span>
                  <span className={`tag ${e.impact === "High" ? "short" : "long"}`}>
                    {e.impact.toUpperCase()} IMPACT
                  </span>
                </div>
                <h3>{e.title}</h3>
                <p>{e.note}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Latest headlines</h2>
        <p className="sub">From Cointelegraph and CoinDesk, refreshed every 10 minutes.</p>
        {!news && <p className="loading">Loading news…</p>}
        {news && news.length === 0 && (
          <p className="loading">News feed temporarily unavailable — try again shortly.</p>
        )}
        {news && news.length > 0 && (
          <ul className="news-list">
            {news.map((n) => (
              <li key={n.link} className="news-item">
                <a href={n.link} target="_blank" rel="noopener noreferrer">
                  {n.title}
                </a>
                <span className="news-meta">
                  {n.source}{n.publishedAt ? ` · ${fmtTime(n.publishedAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
