import { sendPushToAll } from "./push.mjs";

const HOS_WARNING_MINUTES = 60;
const HOS_CRITICAL_MINUTES = 30;
const TELEGRAM_COOLDOWN_MS = 20 * 60 * 1000;

const telegramSent = new Map();

function parseDisplayToMinutes(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text === "--" || text === "-") return null;
  if (text.toLowerCase() === "completed") return 0;

  let total = 0;
  const isNegative = text.startsWith("-");
  const hrs = text.match(/(\d+)\s*hrs?/i);
  const mins = text.match(/(\d+)\s*mins?/i);
  if (hrs) total += Number(hrs[1]) * 60;
  if (mins) total += Number(mins[1]);

  const hhmm = text.match(/^-?(\d+):(\d{2})$/);
  if (!hrs && !mins && hhmm) total += Number(hhmm[1]) * 60 + Number(hhmm[2]);

  if (!total && total !== 0) return null;
  return isNegative ? -total : total;
}

function isOnDutyStatus(status) {
  const normalized = String(status || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return normalized === "d" || normalized === "driving" || normalized === "on" || normalized === "onduty";
}

function metricDefs(driver) {
  return [
    ["break", "Break", driver.breakDisplay || driver.breakTime],
    ["driving", "Driving", driver.drivingDisplay || driver.driving],
    ["duty", "Duty", driver.dutyDisplay || driver.duty],
    ["cycle", "Cycle", driver.cycleRemainingDisplay || driver.cycle],
  ];
}

export function collectHosRisks(driver, maxMinutes = HOS_WARNING_MINUTES) {
  const status = driver.currentStatus || driver.status;
  if (!isOnDutyStatus(status)) return [];

  return metricDefs(driver)
    .map(([metric, label, value]) => {
      const minutes = parseDisplayToMinutes(value);
      return { metric, label, value: value || "--", minutes };
    })
    .filter((risk) => risk.minutes !== null && risk.minutes >= 0 && risk.minutes <= maxMinutes)
    .map((risk) => ({
      ...risk,
      tier: risk.minutes <= HOS_CRITICAL_MINUTES ? "critical" : "warning",
      driverId: driver.id,
      driverName: driver.driverName || driver.name || "Unknown driver",
      status,
    }))
    .sort((a, b) => a.minutes - b.minutes);
}

export function collectAllHosRisks(drivers) {
  const alerts = [];
  for (const driver of drivers || []) {
    for (const risk of collectHosRisks(driver, HOS_WARNING_MINUTES)) {
      alerts.push({ driver, risk });
    }
  }
  return alerts.sort((a, b) => a.risk.minutes - b.risk.minutes);
}

function telegramKey(risk) {
  const bucket = Math.floor(risk.minutes / 5);
  return `${risk.driverId}:${risk.metric}:critical:${bucket}`;
}

export async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, skipped: true, reason: "not_configured" };

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Telegram API error ${response.status}: ${body}`);
  }
  return { ok: true };
}

export async function processHosTelegramAlerts(drivers) {
  const telegramOn = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

  let sent = 0;
  let pushed = 0;
  const now = Date.now();

  for (const { driver, risk } of collectAllHosRisks(drivers)) {
    if (risk.tier !== "critical") continue;

    const key = telegramKey(risk);
    const lastSent = telegramSent.get(key) || 0;
    if (now - lastSent < TELEGRAM_COOLDOWN_MS) continue;

    const status = driver.currentStatus || driver.status || "Unknown";
    const lines = [
      "⚠️ HOS CRITICAL",
      `Driver: ${risk.driverName}`,
      `${risk.label}: ${risk.value} remaining (${risk.minutes} min)`,
      `Status: ${status}`,
      `Time: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`,
    ];

    // Web Push to installed PWAs (works with the app closed)
    try {
      const result = await sendPushToAll({
        title: `HOS CRITICAL — ${risk.driverName}`,
        body: `${risk.label}: ${risk.value} left (${risk.minutes} min) · ${status}`,
        tag: `hos-${risk.driverId}-${risk.metric}`,
        requireInteraction: true,
        url: "/index.html",
      });
      pushed += result.sent || 0;
    } catch (error) {
      console.warn("HOS push failed:", error.message || error);
    }

    if (telegramOn) {
      await sendTelegramMessage(lines.join("\n"));
      sent += 1;
    }

    telegramSent.set(key, now);
  }

  return { sent, pushed };
}

export { HOS_WARNING_MINUTES, HOS_CRITICAL_MINUTES };
