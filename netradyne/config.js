import dotenv from 'dotenv';
dotenv.config();

export const NETRADYNE = {
  url: 'https://idms.netradyne.com/console/#/alerts',
  loginUrl: 'https://idms.netradyne.com',
  timeRange: 'Last 12 Hours',
  // The alerts board defaults to "calendar today", which drops last-night's events
  // early in the morning. We rewrite alertsDataLite to a rolling window this many
  // hours wide so the scrape always reflects the same span the UI's "Last 12 Hours".
  alertWindowHours: Number(process.env.NETRADYNE_ALERT_WINDOW_HOURS) || 12,
  maxRetries: 3,
  // Randomized poll window to avoid a fixed, bot-like pattern: each poll waits a
  // random time between minPollMs and maxPollMs (default 2–4 min).
  minPollMs: Number(process.env.NETRADYNE_MIN_POLL_MS) || 120000,
  maxPollMs: Number(process.env.NETRADYNE_MAX_POLL_MS) || 240000,
  // Skip the extra "is the session still valid?" page-load if we validated it
  // within this window — saves ~5s per poll.
  sessionRecheckMs: Number(process.env.NETRADYNE_SESSION_RECHECK_MS) || 10 * 60 * 1000,
};
