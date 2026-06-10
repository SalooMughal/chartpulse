import { Routes, Route, Link, NavLink } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Signals from "./pages/Signals.jsx";
import Education from "./pages/Education.jsx";
import Post from "./pages/Post.jsx";
import Waitlist from "./pages/Waitlist.jsx";
import About from "./pages/About.jsx";
import News from "./pages/News.jsx";
import Admin from "./pages/Admin.jsx";
import PriceTicker from "./components/PriceTicker.jsx";

export default function App() {
  return (
    <div className="app">
      <PriceTicker />
      <header className="nav">
        <Link to="/" className="logo">
          Chart<span>Pulse</span>
        </Link>
        <nav>
          <NavLink to="/signals">Signals</NavLink>
          <NavLink to="/news">News</NavLink>
          <NavLink to="/education">Education</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/waitlist" className="btn btn-sm">
            Join Premium Waitlist
          </NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/education" element={<Education />} />
          <Route path="/education/:slug" element={<Post />} />
          <Route path="/news" element={<News />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>
          © {new Date().getFullYear()} ChartPulse. Not financial advice. Trading
          crypto futures involves substantial risk of loss — never trade with
          money you can't afford to lose.
        </p>
        <p className="footer-links">
          <Link to="/signals">Signals</Link> · <Link to="/education">Education</Link> ·{" "}
          <Link to="/waitlist">Waitlist</Link>
        </p>
      </footer>
    </div>
  );
}
