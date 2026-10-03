// tour-watch.mjs — per-account driver compliance engine.
//
// Entirely live: it reads duty status from Geotab and stop events from the
// browser extension. Nothing comes from the imported recap/Trips CSV, so a
// dispatcher's import schedule can never make these alerts wrong or stale.
//
// Two alerts, both to the account's MAIN Telegram group (never the focus group):
//
//   1. OFF DUTY AT A STOP — the extension saw the driver arrive at or depart from
//      a stop within the previous 15 minutes, and Geotab says he is not on duty
//      and not driving. He is clearly working a tour, so the duty log is wrong or
//      he has gone off duty mid-tour.
//
//   2. STOPPED OUTSIDE A SITE — Geotab shows the driver parked (On Duty / Off
//      Duty / Sleeper) for 5 minutes or more, and his last stop event was a
//      DEPARTURE, so he is between stops rather than inside a site.
//
// A driver is "inside a site" once he has checked in and his next event is a
// departure. A driver the extension reports no events for at all is UNKNOWN and
// is skipped — never guessed at.
import dotenv from "dotenv";
import { listAccounts, getAccountCredentials } from "./db.mjs";
import { computeReadiness } from "./geotab.mjs";
import { notifyAccount } from "./notify.mjs";
import { getSiteState, getSiteUpdatedAt } from "./ingest-store.mjs";
import { findByName, isPlaceholderName } from "./name-match.mjs";
dotenv.config();

// A stop event counts as "just happened" for this long.
const EVENT_WINDOW_MINUTES = Number(process.env.TOUR_EVENT_WINDOW_MINUTES || 15);
// A stopped driver outside a site is reported once he has been stopped this long.
const STOPPED_MINUTES = Number(process.env.TOUR_STOPPED_MINUTES || 5);
// Site state older than this is treated as unknown (extension down / tab closed).
const SITE_STALE_MINUTES = Number(process.env.TOUR_SITE_STALE_MINUTES || 20);
// Don't nag about the same thing inside this window.
const RESEND_COOLDOWN_MS = Number(process.env.TOUR_RESEND_COOLDOWN_MS ?? 30 * 60 * 1000);

const TIMEZONE = process.env.PORTAL_TIMEZONE || "America/New_York";

// Working = on duty, driving, or moving in a yard. PC (personal conveyance) is
// NOT working: the truck moves but the driver is off the clock.
const WORKING_STATUSES = new Set(["ON", "D", "YM"]);
// Stopped = parked, as far as the duty log is concerned.
const STOPPED_STATUSES = new Set(["ON", "OFF", "SB"]);

// key -> last-sent timestamp
const sentAt = new Map();

function clockText(ts) {
  return new Date(ts).toLocaleString("en-US", {
    timeZone: TIMEZONE, month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function minutesSince(ts, now) {
  return Math.floor((now - ts) / 60000);
}

function statusLabel(status) {
  return ({
    OFF: "Off Duty", SB: "Sleeper", ON: "On Duty", D: "Driving",
    PC: "Personal Conveyance", YM: "Yard Move",
  })[status] || status || "unknown";
}

// Is the extension's site state recent enough to act on?
export function siteStateFreshness(accountId, now) {
  const updatedAt = getSiteUpdatedAt(accountId);
  if (!updatedAt) return { fresh: false, reason: "the extension has never pushed site state" };
  const age = now - new Date(updatedAt).getTime();
  if (!Number.isFinite(age)) return { fresh: false, reason: "site state timestamp is unreadable" };
  if (age > SITE_STALE_MINUTES * 60000) {
    return { fresh: false, reason: `site state is stale (last push ${clockText(now - age)})` };
  }
  return { fresh: true, ageMinutes: Math.floor(age / 60000) };
}

// A stop event inside the window, or null.
export function recentEvent(entry, now, windowMs) {
  if (!entry || !entry.lastEventAt || !entry.lastEvent) return null;
  const age = now - entry.lastEventAt;
  if (age < 0 || age > windowMs) return null;
  return { kind: entry.lastEvent, at: entry.lastEventAt, minutesAgo: Math.floor(age / 60000) };
}

export async function checkAccount(account) {
  const creds = getAccountCredentials(account.id);
  if (!creds || !creds.geotab.database || !creds.geotab.username) return { skipped: "no_geotab" };

  const now = Date.now();
  const freshness = siteStateFreshness(account.id, now);
  if (!freshness.fresh) return { skipped: "no_site_state", reason: freshness.reason };

  const roster = getSiteState(account.id).filter((d) => !isPlaceholderName(d.driverName));
  if (!roster.length) return { drivers: 0, alerts: 0, unmatched: [] };

  const readiness = await computeReadiness(creds.geotab);
  const hosDrivers = readiness.drivers || [];
  const windowMs = EVENT_WINDOW_MINUTES * 60000;

  let alerts = 0;
  let matched = 0;
  const unmatched = [];

  for (const entry of roster) {
    const driver = findByName(entry.driverName, hosDrivers);
    if (!driver) {
      unmatched.push(entry.driverName);
      continue;
    }
    matched += 1;

    const status = String(driver.currentStatus || "").toUpperCase();
    const working = WORKING_STATUSES.has(status);
    const where = entry.siteName ? ` ${entry.siteName}` : "";
    const tour = entry.blockId || entry.tripId || "";
    const tourLine = tour ? [`Block/Trip: ${tour}`] : [];

    // --- 1. a stop event in the last 15 minutes, but not on duty ---
    const event = recentEvent(entry, now, windowMs);
    if (event && !working) {
      const key = `${account.id}:${driver.id}:offduty:${event.at}`;
      if (now - (sentAt.get(key) || 0) >= RESEND_COOLDOWN_MS) {
        sentAt.set(key, now);
        const did = event.kind === "arrival" ? `arrived at${where || " a stop"}` : `departed${where || " a stop"}`;
        await notifyAccount(account.id, {
          title: `\u{1f7e5} Off duty at a stop — ${driver.driverName}`,
          body: `${did} ${event.minutesAgo} min ago but Geotab shows ${statusLabel(status)}.`,
          tag: `tour-offduty-${driver.id}-${event.at}`,
          critical: true,
          url: "/index.html",
          telegramText: [
            "\u{1f7e5} Driver off duty at a stop",
            `Driver: ${driver.driverName}`,
            `Stop event: ${did} at ${clockText(event.at)} (${event.minutesAgo} min ago)`,
            `Geotab status: ${statusLabel(status)}`,
            ...tourLine,
            `Account: ${account.name}`,
          ].join("\n"),
        });
        alerts += 1;
      }
    }

    // --- 2. stopped, and his last event was a departure (so: between stops) ---
    const stoppedSince = driver.lastStatusChange ? new Date(driver.lastStatusChange).getTime() : NaN;
    const stoppedFor = Number.isFinite(stoppedSince) ? minutesSince(stoppedSince, now) : null;
    const stoppedLongEnough = stoppedFor != null && stoppedFor >= STOPPED_MINUTES;

    if (STOPPED_STATUSES.has(status) && stoppedLongEnough && entry.state === "out") {
      const key = `${account.id}:${driver.id}:stopped:${stoppedSince}`;
      if (now - (sentAt.get(key) || 0) >= RESEND_COOLDOWN_MS) {
        sentAt.set(key, now);
        const lastSeen = entry.departedAt
          ? `departed${where || " its last stop"} at ${clockText(Date.parse(entry.departedAt))}`
          : "between stops";
        await notifyAccount(account.id, {
          title: `\u{1f6d1} Stopped outside a site — ${driver.driverName}`,
          body: `${statusLabel(status)} for ${stoppedFor} min and not inside a site.`,
          tag: `tour-stopped-${driver.id}-${stoppedSince}`,
          critical: true,
          url: "/index.html",
          telegramText: [
            "\u{1f6d1} Stopped outside a site",
            `Driver: ${driver.driverName}`,
            `Status: ${statusLabel(status)} since ${clockText(stoppedSince)} (${stoppedFor} min)`,
            `Last stop event: ${lastSeen}`,
            ...tourLine,
            `Account: ${account.name}`,
          ].join("\n"),
        });
        alerts += 1;
      }
    }
  }

  return { drivers: roster.length, matched, alerts, unmatched: [...new Set(unmatched)] };
}

export function startTourWatch() {
  const minMs = Number(process.env.TOUR_WATCH_MIN_POLL_MS || 90000);
  const maxMs = Number(process.env.TOUR_WATCH_MAX_POLL_MS || 180000);
  const nextDelay = () => Math.floor(minMs + Math.random() * Math.max(0, maxMs - minMs));

  let warnedNoSiteState = false;

  const run = async () => {
    for (const account of listAccounts()) {
      try {
        const r = await checkAccount(account);
        if (r && r.skipped === "no_site_state") {
          // Say this once, not every 90 seconds.
          if (!warnedNoSiteState) {
            console.warn(`Tour watch [${account.name}]: idle - ${r.reason}. Waiting for POST /api/ingest/site-state.`);
            warnedNoSiteState = true;
          }
          continue;
        }
        warnedNoSiteState = false;
        if (r && r.alerts) {
          console.log(`Tour watch [${account.name}]: ${r.alerts} alert(s) across ${r.matched}/${r.drivers} driver(s)`);
        }
        if (r && r.unmatched && r.unmatched.length) {
          console.warn(`Tour watch [${account.name}]: no Geotab driver matched ${r.unmatched.join(", ")}`);
        }
      } catch (error) {
        console.warn(`Tour watch [${account.name || account.id}] failed:`, error.message || error);
      }
    }
  };

  const loop = async () => {
    await run();
    setTimeout(loop, nextDelay());
  };
  loop();
  console.log(`Tour watch started (randomized ${Math.round(minMs / 1000)}-${Math.round(maxMs / 1000)}s; ${EVENT_WINDOW_MINUTES} min stop-event window, ${STOPPED_MINUTES} min stopped)`);
}
