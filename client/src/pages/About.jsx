import { Link } from "react-router-dom";

export default function About() {
  return (
    <article className="post-body">
      <h1>Why ChartPulse exists</h1>
      <p>
        Most crypto signal channels are noise: screenshots of wins, silence on
        losses, and "100x gem" hype designed to sell you a course. ChartPulse is
        the opposite — every signal is published in full (entry, target, stop
        loss, reasoning) and stays on the site whether it wins or loses.
      </p>
      <h2>Who's behind it</h2>
      <p>
        I'm a fintech developer and active BTC/ETH futures trader. I trade my
        own signals before posting them. My edge is boring: clean levels,
        confluence between timeframes, and risk management that keeps losers
        small. No indicators-soup, no astrology.
      </p>
      <h2>The rules every signal follows</h2>
      <ul>
        <li>Defined invalidation — every trade has a stop loss before entry.</li>
        <li>Minimum 1.5R reward-to-risk or the setup gets skipped.</li>
        <li>Full transparency — closed signals are marked win or loss publicly.</li>
        <li>No paid shilling — if a token appears here, nobody paid for it.</li>
      </ul>
      <h2>Not financial advice</h2>
      <p>
        Signals are educational. Crypto futures are leveraged products and most
        retail traders lose money. Trade small, use stops, and never risk money
        you can't afford to lose.
      </p>
      <p>
        Start with the <Link to="/education">free guides</Link> or check{" "}
        <Link to="/signals">today's signals</Link>.
      </p>
    </article>
  );
}
