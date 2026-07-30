// hos-engine.mjs — per-account HOS alert engine.
// Polls each account's Geotab, detects HOS risks at 60 and 30 minutes remaining
// on any clock (break/driving/duty/cycle), and routes alerts to that account's
// users via push + Telegram. Each (account, driver, metric, threshold) fires once
// per cooldown window.
import dotenv from "dotenv";
import { listAccounts, getAccountCredentials } from "./db.mjs";
import { computeReadiness } from "./geotab.mjs";
import { notifyAccount } from "./notify.mjs";
dotenv.config();

const WARNING_MINUTES = 60;
const CRITICAL_MINUTES = 30;
// Don't re-send the same (driver, metric, threshold) within this window. Lower it
// (e.g. HOS_RESEND_COOLDOWN_MS=0) to see every poll's alerts while testing.
const RESEND_COOLDOWN_MS = Number(process.env.HOS_RESEND_COOLDOWN_MS ?? 30 * 60 * 1000);

// key -> last-sent timestamp
const sentAt = new Map();

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

// Return the risks for one driver at the 60/30 thresholds.
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
    if (minutes <= CRITICAL_MINUTES) {
      risks.push({ metric, label, display: display || "--", minutes, threshold: 30, tier: "critical" });
    } else if (minutes <= WARNING_MINUTES) {
      risks.push({ metric, label, display: display || "--", minutes, threshold: 60, tier: "warning" });
    }
  }
  return risks;
}

async function pollAccount(account) {
  const creds = getAccountCredentials(account.id);
  if (!creds || !creds.geotab.database || !creds.geotab.username) return { skipped: "no_geotab" };

  const readiness = await computeReadiness(creds.geotab);
  const now = Date.now();
  let alerts = 0;

  for (const driver of readiness.drivers) {
    for (const risk of driverRisks(driver)) {
      const key = `${account.id}:${driver.id}:${risk.metric}:${risk.threshold}`;
      if (now - (sentAt.get(key) || 0) < RESEND_COOLDOWN_MS) continue;
      sentAt.set(key, now);

      const isCritical = risk.tier === "critical";
      const title = isCritical
        ? `🚨 HOS CRITICAL — ${driver.driverName}`
        : `⏰ HOS Warning — ${driver.driverName}`;
      const body = isCritical
        ? `${risk.label} runs out in ${risk.minutes} min (${risk.display} left). Act now.`
        : `${risk.label}: ${risk.display} left (~${risk.minutes} min).`;
      const telegramText = [
        `${isCritical ? "🚨 HOS CRITICAL" : "⏰ HOS Warning"}`,
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
  console.log(`HOS alert engine started (randomized ${Math.round(minMs / 1000)}–${Math.round(maxMs / 1000)}s; thresholds 60 & 30 min)`);
}
