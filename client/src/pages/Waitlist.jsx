import WaitlistForm from "../components/WaitlistForm.jsx";
import { useSeo } from "../seo.js";

const tiers = [
  {
    name: "Free",
    price: "$0",
    items: ["3 signals per week", "All education content", "Public Discord access"],
  },
  {
    name: "Premium",
    price: "$29",
    per: "/month",
    featured: true,
    items: [
      "7 signals per week",
      "Real-time alerts (email + Discord)",
      "Advanced analysis on every call",
      "Private Discord channel",
      "Monthly strategy call",
    ],
  },
  {
    name: "Ultra",
    price: "$99",
    per: "/month",
    items: [
      "Everything in Premium",
      "1-on-1 trading coaching",
      "Customized signal setup",
      "Priority support",
    ],
  },
];

export default function Waitlist() {
  useSeo({
    title: "Premium Crypto Signals — Join the Waitlist",
    description:
      "Get real-time BTC/ETH signal alerts, advanced analysis and private Discord access. Waitlist members lock in 30% off launch pricing.",
    path: "/waitlist",
  });
  return (
    <>
      <div className="page-head" style={{ textAlign: "center" }}>
        <h1>Premium launches July 2026</h1>
        <p>Waitlist members lock in launch pricing — 30% off forever.</p>
      </div>

      <section className="section" style={{ textAlign: "center" }}>
        <WaitlistForm />
      </section>

      <section className="section">
        <div className="grid">
          {tiers.map((t) => (
            <div key={t.name} className={`card price-card ${t.featured ? "featured" : ""}`}>
              {t.featured && <span className="popular">MOST POPULAR</span>}
              <h3>{t.name}</h3>
              <div className="price">
                {t.price}
                {t.per && <small>{t.per}</small>}
              </div>
              <ul>
                {t.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
