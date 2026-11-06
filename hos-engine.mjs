// hos-engine.mjs — per-account HOS alert engine.
// Polls each account's Geotab, detects HOS risks at 60, 30 and 20 minutes
// remaining on any clock (break/driving/duty/cycle), and routes alerts to that
// account's users via push + Telegram. Each (account, driver, metric, threshold)
// fires once per cooldown window, so a clock winding down alerts at each tier.
// The 20-minute tier is also copied to the account's Telegram focus group.
import dotenv from "dotenv";
import { listAccounts, getAccountCredentials, getRecaps } from "./db.mjs";
import { computeReadiness } from "./geotab.mjs";
import { notifyAccount } from "./notify.mjs";
import { coverageForRows, coverageAlert, VERDICT } from "./hos-coverage.mjs";
import { primeReadiness } from "./readiness-cache.mjs";
dotenv.config();

const WARNING_MINUTES = 60;
const CRITICAL_MINUTES = 30;
// Last-chance tier: any clock at 20 minutes or less. Also goes to the focus group.
const URGENT_MINUTES = 20;
// Don't re-send the same (driver, metric, threshold) within this window. Lower it
// (e.g. HOS_RESEND_COOLDOWN_MS=0) to see every poll's alerts while testing.
const RESEND_COOLDOWN_MS = Number(process.env.HOS_RESEND_COOLDOWN_MS ?? 30 * 60 * 1000);

// key -> last-sent timestamp
const sentAt = new Map();
// `${account}:${driver}` -> last seen duty status (for status-change alerts)
const prevStatus = new Map();

const DUTY_STATUSES = new Set(["OFF", "SB", "ON", "D", "PC", "YM"]);
function statusText(s) {
  return ({ OFF: "Off Duty", SB: "Sleeper", ON: "On Duty", D: "Driving", PC: "Personal Conveyance", YM: "Yard Move" })[s] || s;
}

function isOnDuty(status) {
  const n = String(status || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return n === "d" || n === "driving" || n === "on" || n === "onduty";
}

// Parse "8:00", "0:42", "-1:30", "Completed", "--" into minutes (or null).
function parseDisplayToMinutes(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text === "--" || text === "-") return null;
  if (text.toLowerCase() === "completed") return 0;
  const hhmm = text.match(/^(-?)(\d+):(\d{2})$/);
  if (hhmm) {
    const sign = hhmm[1] ? -1 : 1;
    return sign * (Number(hhmm[2]) * 60 + Number(hhmm[3]));
  }
  const n = Number(text.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Return the risks for one driver at the 60/30/20 thresholds.
function driverRisks(driver) {
  if (!isOnDuty(driver.currentStatus || driver.status)) return [];
  const metrics = [
    ["break", "Break", driver.breakDisplay ?? driver.breakTime],
    ["driving", "Driving", driver.drivingDisplay ?? driver.driving],
    ["duty", "Duty", driver.dutyDisplay ?? driver.duty],
    ["cycle", "Cycle", driver.cycleRemainingDisplay ?? driver.cycle],
  ];
  const risks = [];
  for (const [metric, label, display] of metrics) {
    const minutes = parseDisplayToMinutes(display);
    if (minutes == null || minutes < 0) continue;
    if (minutes <= URGENT_MINUTES) {
      risks.push({ metric, label, display: display || "--", minutes, threshold: 20, tier: "urgent" });
    } else if (minutes <= CRITICAL_MINUTES) {
      risks.push({ metric, label, display: display || "--", minutes, threshold: 30, tier: "critical" });
    } else if (minutes <= WARNING_MINUTES) {
      risks.push({ metric, label, display: display || "--", minutes, threshold: 60, tier: "warning" });
    }
  }
  return risks;
}

// Drivers already assigned to a block today who cannot legally finish it.
// This is the one alert that does not depend on the Chrome extension: it runs
// here, on the server, off the poll the engine already makes.
//
// Deliberately quiet: only a driver whose shortfall is provable (SHORT) alerts.
// UNKNOWN — no Geotab match, no logs — is shown on the recap page but never
// paged, because a name we failed to match is not evidence of a problem and
// crying wolf is how an alert channel gets muted.
const COVERAGE_COOLDOWN_MS = Number(process.env.HOS_COVERAGE_COOLDOWN_MS ?? 2 * 60 * 60 * 1000);

function todayIso(now = new Date()) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

async function alertOnRecapCoverage(account, readiness, now) {
  if (process.env.HOS_COVERAGE_ALERTS === "0") return 0;
  const today = todayIso();
  const rows = getRecaps(account.id).filter((r) => r.dailyDate === today && String(r.driverAssigned || "").trim());
  if (!rows.length) return 0;

  const coverage = coverageForRows(rows, readiness.drivers || []);
  let sent = 0;

  for (const row of rows) {
    const result = coverage[row.id];
    if (!result || result.verdict !== VERDICT.SHORT) continue;

    // One alert per driver per block per cooldown, not per reason, so a driver
    // short on three clocks does not send three messages.
    const key = `${account.id}:coverage:${row.id}:${result.reasons.join("|")}`;
    if (now - (sentAt.get(key) || 0) < COVERAGE_COOLDOWN_MS) continue;
    sentAt.set(key, now);

    const { title, body, tag, telegramText } = coverageAlert(account.name, row, result);

    await notifyAccount(account.id, {
      title, body, tag,
      critical: true,
      url: "/index.html",
      telegramText,
      telegramFocus: true,
    });
    sent += 1;
  }
  return sent;
}

async function pollAccount(account) {
  const creds = getAccountCredentials(account.id);
  if (!creds || !creds.geotab.database || !creds.geotab.username) return { skipped: "no_geotab" };

  const readiness = await computeReadiness(creds.geotab);
  // Let the Daily Recap reuse this poll rather than start its own.
  primeReadiness(account.id, readiness);
  const now = Date.now();
  let alerts = 0;

  alerts += await alertOnRecapCoverage(account, readiness, now);

  for (const driver of readiness.drivers) {
    // HOS status change (any -> any) → dispatcher Telegram only (no push to owner).
    const cur = driver.currentStatus;
    if (DUTY_STATUSES.has(cur)) {
      const sKey = `${account.id}:${driver.id}`;
      const prev = prevStatus.get(sKey);
      if (prev && prev !== cur) {
        await notifyAccount(account.id, {
          title: `HOS status — ${driver.driverName}`,
          body: `${statusText(prev)} → ${statusText(cur)}`,
          tag: `hos-status-${driver.id}`,
          critical: false,
          push: false, // Telegram only
          url: "/index.html",
          telegramText: `🔄 HOS status change\nDriver: ${driver.driverName}\n${statusText(prev)} → ${statusText(cur)}\nAccount: ${account.name}`,
        });
        alerts += 1;
      }
      prevStatus.set(sKey, cur);
    }

    for (const risk of driverRisks(driver)) {
      const key = `${account.id}:${driver.id}:${risk.metric}:${risk.threshold}`;
      if (now - (sentAt.get(key) || 0) < RESEND_COOLDOWN_MS) continue;
      sentAt.set(key, now);

      const isUrgent = risk.tier === "urgent";
      const isCritical = isUrgent || risk.tier === "critical";
      const head = isUrgent
        ? "⛔ HOS 20 MIN"
        : (isCritical ? "🚨 HOS CRITICAL" : "⏰ HOS Warning");
      const title = `${head} — ${driver.driverName}`;
      const body = isCritical
        ? `${risk.label} runs out in ${risk.minutes} min (${risk.display} left). Act now.`
        : `${risk.label}: ${risk.display} left (~${risk.minutes} min).`;
      const telegramText = [
        head,
        `Driver: ${driver.driverName}`,
        `${risk.label}: ${risk.display} left (~${risk.minutes} min)`,
        `Duty status: ${driver.currentStatus}`,
        `Account: ${account.name}`,
      ].join("\n");

      await notifyAccount(account.id, {
        title, body,
        tag: `hos-${driver.id}-${risk.metric}`,
        critical: true, // all HOS alerts are high-urgency so no one misses them
        url: "/index.html",
        telegramText,
        // 20-minutes-left on any clock is also copied to the focus group.
        telegramFocus: isUrgent,
      });
      alerts += 1;
    }
  }
  return { drivers: readiness.totalDrivers, alerts };
}

export function startHosEngine() {
  // Randomized poll window so the cadence isn't a fixed pattern (default 60–150s).
  const minMs = Number(process.env.HOS_ENGINE_MIN_POLL_MS || 60000);
  const maxMs = Number(process.env.HOS_ENGINE_MAX_POLL_MS || 150000);
  const nextDelay = () => Math.floor(minMs + Math.random() * Math.max(0, maxMs - minMs));
  const run = async () => {
    for (const account of listAccounts()) {
      try {
        const r = await pollAccount(account);
        if (r && r.alerts) console.log(`HOS engine [${account.name}]: ${r.alerts} alert(s) across ${r.drivers} drivers`);
      } catch (error) {
        console.warn(`HOS engine [${account.name || account.id}] failed:`, error.message || error);
      }
    }
  };
  // Self-reschedule with a fresh random delay after each pass (avoids overlap too).
  const loop = async () => {
    await run();
    setTimeout(loop, nextDelay());
  };
  loop();
  console.log(`HOS alert engine started (randomized ${Math.round(minMs / 1000)}–${Math.round(maxMs / 1000)}s; thresholds 60, 30 & 20 min)`);
}
