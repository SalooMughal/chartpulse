// Lightweight SEO hook — sets per-page title, description, canonical, OG tags
// and optional JSON-LD without any dependency.
// UPDATE SITE_URL when you buy a custom domain.
import { useEffect } from "react";

export const SITE_URL = "https://chartpulse.vercel.app";
export const SITE_NAME = "ChartPulse";

const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

export function useSeo({ title, description, path = "/", jsonLd = null, noindex = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Daily BTC/ETH Trading Signals`;
    document.title = fullTitle;
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }
    setMeta("property", "og:title", fullTitle);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("property", "og:url", SITE_URL + path);
    setMeta("property", "og:type", path.startsWith("/education/") ? "article" : "website");
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    // canonical
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", SITE_URL + path);

    // JSON-LD
    const old = document.getElementById("page-jsonld");
    if (old) old.remove();
    if (jsonLd) {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.id = "page-jsonld";
      s.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(s);
    }
  }, [title, description, path, noindex]); // eslint-disable-line
}
