import { events } from "./_events.js";

export default function handler(_req, res) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  res.status(200).json(upcoming);
}
